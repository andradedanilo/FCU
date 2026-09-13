import {createSaveSummaries} from './saveSummaries.ts';
import manifest from '../../../../package.json' with {type:'json'};
import {mkdir,open,readFile,readdir,rename,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {canonical,prePositionCareerSchema,preAttackCareerSchema,archivedCareerSchema,boardCareerSchema,type SaveEntry} from '../../../../packages/contracts/src/index.ts';
import {validateDream} from '../../../../packages/simulation/src/dreamSeason.ts';
import {checksum} from './saves.ts';
const limit=32*1024*1024;
const envelope=z.strictObject({schema:z.number().int().min(1).max(6),appVersion:z.string().regex(/^\d+\.\d+\.\d+$/).max(20).optional(),gameMode:z.literal('dreamClub'),commit:z.string().uuid(),parent:z.string().uuid().nullable(),date:z.iso.datetime(),checksum:z.string().regex(/^[a-f0-9]{64}$/),payload:z.unknown()});
export function decodeDream(bytes:Uint8Array){
 if(bytes.length>limit)throw Error('INVALID_SAVE');
 const raw:unknown=JSON.parse(gunzipSync(bytes,{maxOutputLength:limit}).toString('utf8'));
 if(typeof raw==='object'&&raw!==null&&'schema' in raw&&typeof raw.schema==='number'&&raw.schema>6)throw Error('FUTURE_SAVE');
 const e=envelope.parse(raw);if(e.schema>=4&&!e.appVersion)throw Error('INVALID_SAVE');if(checksum(e.payload)!==e.checksum)throw Error('INVALID_SAVE');
 let payload=e.payload;
 if(e.schema===1){const old=z.object({game:boardCareerSchema}).passthrough().parse(payload);payload={...old,game:{...old.game,engineVersion:'0.7.4',marketArchive:[]}};}
 if(e.schema===2){const old=z.object({game:archivedCareerSchema}).passthrough().parse(payload);payload={...old,game:{...old.game,engineVersion:'0.7.4'}};}
 if(e.schema<=4){const old=z.object({game:preAttackCareerSchema}).passthrough().parse(payload);payload={...old,game:{...old.game,engineVersion:'0.7.5'}};}
 if(e.schema<=5){const old=z.object({game:prePositionCareerSchema}).passthrough().parse(payload);payload={...old,game:{...old.game,engineVersion:'0.7.6'}};}
 return {e,state:validateDream(payload)};
}
export function createDreamStore(root:string){
 let pending:Promise<unknown>=Promise.resolve();const parents=new Map<string,string>(),summary=createSaveSummaries();
 const folder=(id:string)=>join(root,z.string().uuid().parse(id));
 const file=(id:string,commit:string)=>join(folder(id),`${z.string().uuid().parse(commit)}.dream`);
 async function read(id:string,commit:string){const path=file(id,commit);if((await stat(path)).size>limit)throw Error('INVALID_SAVE');const decoded=decodeDream(await readFile(path));if(decoded.state.game.careerId!==id||decoded.e.commit!==commit)throw Error('INVALID_SAVE');return decoded;}
 async function load(id:string,commit:string){const decoded=await read(id,commit);parents.set(id,commit);return decoded.state;}
 function describe(id:string,commit:string,bytes:Uint8Array):SaveEntry{
  return summary(id+'/'+commit,bytes,()=>{
   const {e,state}=decodeDream(bytes);if(state.game.careerId!==id||e.commit!==commit)throw Error('INVALID_SAVE');
   return {careerId:id,commitId:commit,parentCommitId:e.parent,appVersion:e.appVersion??null,season:state.game.season,club:state.game.clubs[0]!.name,round:state.game.round,tick:state.game.match?.tick??0,savedAtUTC:e.date,kind:'auto',valid:true,engineVersion:state.game.engineVersion,error:null};
  });
 }
 async function list():Promise<SaveEntry[]>{
  await mkdir(root,{recursive:true});const entries:SaveEntry[]=[];
  for(const dir of await readdir(root,{withFileTypes:true})){
   if(!dir.isDirectory()||!z.string().uuid().safeParse(dir.name).success)continue;
   for(const name of await readdir(folder(dir.name))){if(!name.endsWith('.dream'))continue;const commit=name.slice(0,-6);if(!z.string().uuid().safeParse(commit).success)continue;
    try{const path=file(dir.name,commit);if((await stat(path)).size>limit)throw Error('INVALID_SAVE');entries.push(describe(dir.name,commit,await readFile(path)));}
    catch(error){entries.push({careerId:dir.name,commitId:commit,parentCommitId:null,appVersion:null,season:null,club:'',round:0,tick:0,savedAtUTC:'',kind:'auto',valid:false,engineVersion:null,error:error instanceof Error&&error.message==='FUTURE_SAVE'?'FUTURE_SAVE':'INVALID_SAVE'});}
   }
  }return entries.sort((a,b)=>b.savedAtUTC.localeCompare(a.savedAtUTC)||a.commitId.localeCompare(b.commitId));
 }
 function save(input:unknown):Promise<string>{
  const task=pending.then(async()=>{const state=validateDream(input),id=state.game.careerId,commit=randomUUID();await mkdir(folder(id),{recursive:true});
   const e={schema:6,appVersion:manifest.version,gameMode:'dreamClub',commit,parent:parents.get(id)??null,date:new Date().toISOString(),checksum:checksum(state),payload:state};
   const temp=join(folder(id),`${commit}.tmp`),handle=await open(temp,'wx');try{await handle.writeFile(gzipSync(canonical(e)));await handle.sync();}finally{await handle.close();}
   decodeDream(await readFile(temp));await rename(temp,file(id,commit));describe(id,commit,await readFile(file(id,commit)));parents.set(id,commit);return commit;
  });pending=task.catch(()=>undefined);return task;
 }
 return {save,load,list,idle:()=>pending};
}
