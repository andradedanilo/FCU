import {open,readdir,mkdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {type InstalledRoster} from '../../../../packages/contracts/src/index.ts';
import {openArchive} from '../../../../packages/roster-pipeline/src/archive.ts';
import {writeArchive} from '../../../../packages/roster-pipeline/src/store.ts';
import {rosterClubs,createPackedCareer} from '../../../../packages/simulation/src/roster.ts';

export function createRosterStore(directory:string,allowDevelopment:boolean){
  const trust={allowDevelopment,trustedKeys:new Map()};
  const decode=(bytes:Uint8Array):InstalledRoster=>{
    const {manifest,roster}=openArchive(bytes,trust);
    if(manifest.compatibleSaveSchemaMin>18||manifest.compatibleSaveSchemaMax<18||roster.identityProfileId!=='fcu-city-v1')throw Error('INCOMPATIBLE_ROSTER');
    const pack={snapshotId:manifest.snapshotId,contentHash:manifest.contentHash,observedAt:manifest.extractionCompletedAt,development:manifest.permittedDistribution==='development',roster};
    const clubs=rosterClubs(pack);
    createPackedCareer('00000000-0000-4000-8000-000000000001',1,clubs[0]!.id,pack);
    return pack;
  };
  async function read(path:string){const handle=await open(path,'r');try{if((await handle.stat()).size>50*1024*1024)throw Error('PACK_SIZE_LIMIT');return await handle.readFile();}finally{await handle.close();}}
  async function list():Promise<InstalledRoster[]>{
    await mkdir(directory,{recursive:true});const names=(await readdir(directory)).filter(n=>/^roster-\d{4}-\d{2}\.\d{8}\.r[1-9]\d{0,5}\.zip$/.test(n)).sort();
    if(names.length>20)throw Error('TOO_MANY_ROSTERS');
    const result:InstalledRoster[]=[];for(const name of names)result.push(decode(await read(join(directory,name))));return result;
  }
  async function install(path:string):Promise<InstalledRoster>{
    const bytes=await read(path),pack=decode(bytes);
    try{await writeArchive(directory,bytes,trust);}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;const existing=decode(await readFile(join(directory,pack.snapshotId+'.zip')));if(existing.contentHash!==pack.contentHash)throw Error('ROSTER_ID_CONFLICT');return existing;}
    return pack;
  }
  return {list,install};
}
