import {mkdir,open,link,unlink,readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID,type KeyObject} from 'node:crypto';
import {openArchive,type Manifest} from './archive.ts';

export async function writeArchive(directory:string,bytes:Uint8Array,trust:{allowDevelopment:boolean;trustedKeys:ReadonlyMap<string,KeyObject>}):Promise<string> {
  const pack=openArchive(bytes,trust);
  await mkdir(directory,{recursive:true});
  const destination=join(directory,pack.manifest.snapshotId+'.zip');
  const temporary=join(directory,randomUUID()+'.tmp');
  const file=await open(temporary,'wx');
  try{await file.writeFile(bytes);await file.sync();}finally{await file.close();}
  openArchive(await readFile(temporary),trust);
  // Linking publishes the verified bytes atomically and refuses an existing ID.
  await link(temporary,destination);
  await unlink(temporary);
  return destination;
}
export async function listArchives(directory:string,trust:{allowDevelopment:boolean;trustedKeys:ReadonlyMap<string,KeyObject>}):Promise<Manifest[]> {
  let names:string[];try{names=await readdir(directory);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return [];throw error;}
  const manifests:Manifest[]=[];
  for(const name of names.filter(n=>/^roster-\d{4}-\d{2}\.\d{8}\.r[1-9]\d{0,5}\.zip$/.test(n)).sort()){
    const file=await open(join(directory,name),'r');
    try{if((await file.stat()).size>50*1024*1024)throw Error('PACK_SIZE_LIMIT');manifests.push(openArchive(await file.readFile(),trust).manifest);}finally{await file.close();}
  }
  return manifests;
}
