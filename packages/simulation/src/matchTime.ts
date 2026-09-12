import type {Match} from '../../contracts/src/index.ts';
export function halfBoundary(m:Match){return 45+(m.addedTime[0]??0);}
export function completeMinute(m:Match):boolean {
 const first=m.phase==='first';const end=first?45:90+(m.addedTime[0]??0);const index=first?0:1;
 if(m.tick===end&&m.addedTime[index]===null){
  const start=first?0:halfBoundary(m);
  const events=m.events.filter(e=>e.tick>start&&(e.type==='goal'||e.type==='injury')).length;
  const substitutions=m.substitutions.filter(s=>s.tick>start).length;
  m.addedTime[index]=Math.min(5,Math.floor((events+substitutions)/2));
 }
 if(m.addedTime[index]!==null&&m.tick===end+m.addedTime[index]){m.phase=first?'interval':'finished';return true;}
 return false;
}
