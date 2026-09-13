import {createHash} from 'node:crypto';
import type {SaveEntry} from '../../../../packages/contracts/src/index.ts';
// Keep only summaries, never full careers. Disk bytes still identify each cached result.
export function createSaveSummaries(){
 const entries=new Map<string,{hash:string;entry:SaveEntry}>();
 return (key:string,bytes:Uint8Array,read:()=>SaveEntry):SaveEntry=>{
  const hash=createHash('sha256').update(bytes).digest('hex'),cached=entries.get(key);
  if(cached?.hash===hash)return {...cached.entry};
  const entry=read();entries.delete(key);entries.set(key,{hash,entry:{...entry}});
  if(entries.size>1000)entries.delete(entries.keys().next().value!);
  return {...entry};
 };
}
