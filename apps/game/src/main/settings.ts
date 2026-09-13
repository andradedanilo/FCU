import {mkdir,open,readFile,rename,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {audioSettingsSchema,type AudioSettings} from '../../../../packages/contracts/src/index.ts';

const defaults:AudioSettings={schema:1,music:false,effects:true};
export function createSettingsStore(root:string){
 const path=join(root,'audio.json');let pending:Promise<unknown>=Promise.resolve();
 async function read():Promise<AudioSettings>{
  try{if((await stat(path)).size>4096)throw Error('INVALID_SAVE');return audioSettingsSchema.parse(JSON.parse(await readFile(path,'utf8')));}
  catch(error){if(error instanceof Error&&'code' in error&&error.code==='ENOENT')return {...defaults};throw error;}
 }
 async function save(input:unknown):Promise<AudioSettings>{
  const value=audioSettingsSchema.parse(input);
  const task=pending.then(async()=>{
   // Refuse to overwrite malformed or newer settings; the original remains available.
   await read();await mkdir(root,{recursive:true});
   const temporary=join(root,'audio.tmp'),file=await open(temporary,'w');
   try{await file.writeFile(JSON.stringify(value));await file.sync();}finally{await file.close();}
   await rename(temporary,path);return value;
  });
  pending=task.catch(()=>undefined);return task;
 }
 return {load:async()=>{await pending;return read();},save,idle:()=>pending};
}
