import type {SaveEntry} from '../../contracts/src/index.ts';
// Only mark surviving heads with a known shared ancestor, never decide by timestamps.
export function alternateSaveHeads(entries:readonly SaveEntry[]):ReadonlySet<string>{
 const result=new Set<string>(),careers=new Map<string,SaveEntry[]>();
 for(const entry of entries){if(entry.valid){const group=careers.get(entry.careerId)??[];group.push(entry);careers.set(entry.careerId,group);}}
 for(const group of careers.values()){
  const byId=new Map(group.map(entry=>[entry.commitId,entry])),parents=new Set(group.map(entry=>entry.parentCommitId));
  const heads=group.filter(entry=>!parents.has(entry.commitId));
  const ancestors=new Map<string,Set<string>>();
  for(const head of heads){const chain=new Set<string>();let id:string|null=head.commitId;while(id&&!chain.has(id)){chain.add(id);id=byId.get(id)?.parentCommitId??null;}ancestors.set(head.commitId,chain);}
  for(let i=0;i<heads.length;i++){for(let j=i+1;j<heads.length;j++){const first=heads[i]!,second=heads[j]!;if([...ancestors.get(first.commitId)!].some(id=>ancestors.get(second.commitId)!.has(id))){result.add(first.commitId);result.add(second.commitId);}}}
 }
 return result;
}
