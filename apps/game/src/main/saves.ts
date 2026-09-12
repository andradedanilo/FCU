import { mkdir, open, readFile, readdir, rename, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { z } from 'zod';
import { canonical, type SaveEntry } from '../../../../packages/contracts/src/index.ts';
import { validateCareer, migrateLegacyCareer } from '../../../../packages/simulation/src/engine.ts';

const MAX_BYTES=4*1024*1024;
export const checksum=(value:unknown)=>createHash('sha256').update(canonical(value)).digest('hex');
const envelopeSchema=z.object({schema:z.union([z.literal(1),z.literal(2)]),appVersion:z.enum(['0.1.0','0.2.0']),engineVersion:z.enum(['0.1.0','0.2.0']),rulesetVersion:z.literal('exhibition-1'),careerId:z.string().uuid(),saveCommitId:z.string().uuid(),parentCommitId:z.string().uuid().nullable(),stateRevision:z.number().int().nonnegative(),savedAtUTC:z.string().datetime(),snapshotId:z.literal('fictional-2026-v1'),kind:z.enum(['manual','auto']),checksum:z.string().regex(/^[a-f0-9]{64}$/),payload:z.unknown()});
export function decode(bytes:Uint8Array) {
  if(bytes.length>MAX_BYTES)throw new Error('INVALID_SAVE');
  const raw:unknown=JSON.parse(gunzipSync(bytes,{maxOutputLength:MAX_BYTES}).toString('utf8'));
  if(typeof raw==='object'&&raw!==null&&'schema' in raw&&typeof raw.schema==='number'&&raw.schema>2)throw new Error('FUTURE_SAVE');
  const e=envelopeSchema.parse(raw);
  if(checksum(e.payload)!==e.checksum)throw new Error('INVALID_SAVE');
  if((e.schema===1&&(e.engineVersion!=='0.1.0'||e.appVersion!=='0.1.0'))||(e.schema===2&&(e.engineVersion!=='0.2.0'||e.appVersion!=='0.2.0')))throw new Error('INVALID_SAVE');
  const state=e.schema===1?migrateLegacyCareer(e.payload):validateCareer(e.payload);
  if(state.careerId!==e.careerId||state.revision!==e.stateRevision)throw new Error('INVALID_SAVE');
  return {envelope:e,state};
}
export function createSaveStore(root:string) {
  const parents=new Map<string,string>();
  let pending:Promise<unknown>=Promise.resolve();
  const directory=(careerId:string)=>join(root,z.string().uuid().parse(careerId));
  const filename=(careerId:string,commitId:string)=>join(directory(careerId),`${z.string().uuid().parse(commitId)}.save`);
  async function load(careerId:string,commitId:string) {
    const file=filename(careerId,commitId);
    if((await stat(file)).size>MAX_BYTES)throw new Error('INVALID_SAVE');
    const decoded=decode(await readFile(file));
    if(decoded.state.careerId!==careerId||decoded.envelope.saveCommitId!==commitId)throw new Error('INVALID_SAVE');
    parents.set(careerId,commitId);return decoded.state;
  }
  async function list():Promise<SaveEntry[]> {
    await mkdir(root,{recursive:true});const entries:SaveEntry[]=[];
    for(const dir of await readdir(root,{withFileTypes:true})) {
      if(!dir.isDirectory()||!z.string().uuid().safeParse(dir.name).success)continue;
      for(const file of await readdir(join(root,dir.name))) {
        if(!file.endsWith('.save'))continue;const commitId=file.slice(0,-5);
        if(!z.string().uuid().safeParse(commitId).success)continue;
        try {
          const path=filename(dir.name,commitId);if((await stat(path)).size>MAX_BYTES)throw new Error('INVALID_SAVE');
          const {envelope:e,state:s}=decode(await readFile(path));
          if(e.saveCommitId!==commitId||s.careerId!==dir.name)throw new Error('INVALID_SAVE');
          entries.push({careerId:s.careerId,commitId,club:s.clubs.find(c=>c.id===s.clubId)!.name,round:s.round,tick:s.match?.tick??0,savedAtUTC:e.savedAtUTC,kind:e.kind,valid:true,error:null});
        } catch(error) {entries.push({careerId:dir.name,commitId,club:'',round:0,tick:0,savedAtUTC:'',kind:'manual',valid:false,error:error instanceof Error&&error.message==='FUTURE_SAVE'?'FUTURE_SAVE':'INVALID_SAVE'});}
      }
    }
    return entries.sort((a,b)=>b.savedAtUTC.localeCompare(a.savedAtUTC)||a.commitId.localeCompare(b.commitId));
  }
  function save(input:unknown,kind:'manual'|'auto'):Promise<string> {
    const action=pending.then(async()=>{
      const state=validateCareer(input);const saveCommitId=randomUUID();const folder=directory(state.careerId);
      await mkdir(folder,{recursive:true});
      const envelope={schema:2,appVersion:'0.2.0',engineVersion:state.engineVersion,rulesetVersion:state.rulesetVersion,careerId:state.careerId,saveCommitId,parentCommitId:parents.get(state.careerId)??null,stateRevision:state.revision,savedAtUTC:new Date().toISOString(),snapshotId:state.snapshotId,kind,checksum:checksum(state),payload:state};
      const temp=join(folder,`${saveCommitId}.tmp`);const handle=await open(temp,'wx');
      try {await handle.writeFile(gzipSync(canonical(envelope)));await handle.sync();}finally{await handle.close();}
      decode(await readFile(temp));await rename(temp,filename(state.careerId,saveCommitId));
      decode(await readFile(filename(state.careerId,saveCommitId)));parents.set(state.careerId,saveCommitId);return saveCommitId;
    });
    pending=action.catch(()=>undefined);return action;
  }
  return {save,load,list,idle:()=>pending};
}
