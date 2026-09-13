import {createSaveSummaries} from './saveSummaries.ts';
import manifest from '../../../../package.json' with {type:'json'};
import { mkdir, open, readFile, readdir, rename, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { z } from 'zod';
import { canonical, type SaveEntry } from '../../../../packages/contracts/src/index.ts';
import { migrateRecordsCareer, migrateOutgoingCareer, migratePositionCareer, migratePreAttackCareer, migrateArchivedCareer, migrateBoardCareer, migratePersonnelCareer, migrateFacilitiesCareer, migrateRegistrationCareer, migrateRosterCareer, migrateCompetitionCareer, validateCareer, migrateLegacyCareer, migratePreviousCareer, migrateTacticalCareer, migratePlanningCareer, migrateConditionCareer, migrateAvailabilityCareer, migrateTimedCareer, migrateFinancialCareer, migrateRenewalCareer, migrateScoutingCareer, migrateTransferCareer, migrateRecruitingCareer, migrateExhibitionCareer, migrateRepeatingCareer, migrateCountryCareer } from '../../../../packages/simulation/src/engine.ts';

const MAX_BYTES=32*1024*1024;
export const checksum=(value:unknown)=>createHash('sha256').update(canonical(value)).digest('hex');
const formats=[
 {app:'0.1.0',rules:'exhibition-1',read:migrateLegacyCareer},
 {app:'0.2.0',rules:'exhibition-1',read:migratePreviousCareer},
 {app:'0.2.1',rules:'exhibition-2',read:migrateTacticalCareer},
 {app:'0.2.2',rules:'exhibition-3',read:migratePlanningCareer},
 {app:'0.3.0',rules:'exhibition-4',read:migrateConditionCareer},
 {app:'0.3.1',rules:'exhibition-5',read:migrateAvailabilityCareer},
 {app:'0.3.2',rules:'exhibition-6',read:migrateTimedCareer},
 {app:'0.4.0',rules:'exhibition-7',read:migrateFinancialCareer},
 {app:'0.4.1',rules:'exhibition-8',read:migrateRenewalCareer},
 {app:'0.4.2',rules:'exhibition-9',read:migrateScoutingCareer},
 {app:'0.4.3',rules:'exhibition-10',read:migrateTransferCareer},
 {app:'0.4.4',rules:'exhibition-11',read:migrateRecruitingCareer},
 {app:'0.4.5',rules:'exhibition-12',read:migrateExhibitionCareer},
 {app:'0.5.0',rules:'exhibition-13',read:migrateRepeatingCareer},
 {app:'0.5.1',rules:'world-1',read:migrateCountryCareer},
 {app:'0.5.2',rules:'world-2',read:migrateCompetitionCareer},
 {app:'0.6.0',rules:'world-2',read:migrateRosterCareer},
 {app:'0.6.1',rules:'world-2',read:migrateRegistrationCareer},
 {app:'0.7.0',rules:'world-2',read:migrateFacilitiesCareer},
 {app:'0.7.1',rules:'world-2',read:migratePersonnelCareer},
 {app:'0.7.2',rules:'world-2',read:migrateBoardCareer},
 {app:'0.7.3',rules:'world-2',read:migrateArchivedCareer},
 {app:'0.7.4',rules:'world-2',read:migratePreAttackCareer},
 {app:null,engine:'0.7.4',rules:'world-2',read:migratePreAttackCareer},
 {app:null,engine:'0.7.5',rules:'world-2',read:migratePositionCareer},
 {app:null,engine:'0.7.6',rules:'world-2',read:migrateOutgoingCareer},
 {app:null,engine:'0.7.7',rules:'world-2',read:migrateRecordsCareer},
 {app:null,engine:'0.7.8',rules:'world-2',read:validateCareer}
] as const;
const envelopeSchema=z.object({schema:z.number().int().min(1).max(formats.length),appVersion:z.string().regex(/^\d+\.\d+\.\d+$/).max(20),engineVersion:z.string().max(20),rulesetVersion:z.string().max(40),careerId:z.string().uuid(),saveCommitId:z.string().uuid(),parentCommitId:z.string().uuid().nullable(),stateRevision:z.number().int().nonnegative(),savedAtUTC:z.string().datetime(),snapshotId:z.string().min(1).max(100),kind:z.enum(['manual','auto']),checksum:z.string().regex(/^[a-f0-9]{64}$/),payload:z.unknown()});
export function decode(bytes:Uint8Array) {
  if(bytes.length>MAX_BYTES)throw new Error('INVALID_SAVE');
  const raw:unknown=JSON.parse(gunzipSync(bytes,{maxOutputLength:MAX_BYTES}).toString('utf8'));
  if(typeof raw==='object'&&raw!==null&&'schema' in raw&&typeof raw.schema==='number'&&raw.schema>formats.length)throw new Error('FUTURE_SAVE');
  const e=envelopeSchema.parse(raw);
  if(checksum(e.payload)!==e.checksum)throw new Error('INVALID_SAVE');
  const format=formats[e.schema-1]!;
  if(e.engineVersion!==('engine' in format?format.engine:format.app)||format.app!==null&&e.appVersion!==format.app||e.rulesetVersion!==format.rules)throw new Error('INVALID_SAVE');
  const state=format.read(e.payload);
  if(state.careerId!==e.careerId||state.revision!==e.stateRevision||state.snapshotId!==e.snapshotId)throw new Error('INVALID_SAVE');
  return {envelope:e,state};
}
export function createSaveStore(root:string) {
  const parents=new Map<string,string>(),summary=createSaveSummaries();
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
  function describe(careerId:string,commitId:string,bytes:Uint8Array):SaveEntry{
    return summary(careerId+'/'+commitId,bytes,()=>{
      const {envelope:e,state:s}=decode(bytes);if(e.saveCommitId!==commitId||s.careerId!==careerId)throw Error('INVALID_SAVE');
      return {careerId,commitId,parentCommitId:e.parentCommitId,appVersion:e.appVersion,season:s.season,club:s.clubs.find(c=>c.id===s.clubId)!.name,round:s.round,tick:s.match?.tick??0,savedAtUTC:e.savedAtUTC,kind:e.kind,valid:true,engineVersion:e.engineVersion,error:null};
    });
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
          entries.push(describe(dir.name,commitId,await readFile(path)));
        } catch(error) {entries.push({careerId:dir.name,commitId,parentCommitId:null,appVersion:null,season:null,club:'',round:0,tick:0,savedAtUTC:'',kind:'manual',valid:false,engineVersion:null,error:error instanceof Error&&error.message==='FUTURE_SAVE'?'FUTURE_SAVE':'INVALID_SAVE'});}
      }
    }
    return entries.sort((a,b)=>b.savedAtUTC.localeCompare(a.savedAtUTC)||a.commitId.localeCompare(b.commitId));
  }
  function save(input:unknown,kind:'manual'|'auto'):Promise<string> {
    const action=pending.then(async()=>{
      const state=validateCareer(input);const saveCommitId=randomUUID();const folder=directory(state.careerId);
      await mkdir(folder,{recursive:true});
      const envelope={schema:formats.length,appVersion:manifest.version,engineVersion:state.engineVersion,rulesetVersion:state.rulesetVersion,careerId:state.careerId,saveCommitId,parentCommitId:parents.get(state.careerId)??null,stateRevision:state.revision,savedAtUTC:new Date().toISOString(),snapshotId:state.snapshotId,kind,checksum:checksum(state),payload:state};
      const temp=join(folder,`${saveCommitId}.tmp`);const handle=await open(temp,'wx');
      try {await handle.writeFile(gzipSync(canonical(envelope)));await handle.sync();}finally{await handle.close();}
      decode(await readFile(temp));await rename(temp,filename(state.careerId,saveCommitId));
      describe(state.careerId,saveCommitId,await readFile(filename(state.careerId,saveCommitId)));parents.set(state.careerId,saveCommitId);return saveCommitId;
    });
    pending=action.catch(()=>undefined);return action;
  }
  return {save,load,list,idle:()=>pending};
}
