import type {Match} from '../../contracts/src/index.ts';
export function halfBoundary(m:Match){return 45+(m.addedTime[0]??0);}
export function regulationBoundary(m:Match){return 90+(m.addedTime[0]??0)+(m.addedTime[1]??0);}
export function validateMatchTiming(m:Match){
 const half=halfBoundary(m),end=regulationBoundary(m);
 if(m.forfeit!==null){if(m.phase!=='finished'||![m.home,m.away].includes(m.forfeit))throw Error('INVALID_SAVE');return;}
 if(m.extraTime){
  if(!m.decider||m.addedTime.some(n=>n===null))throw Error('INVALID_SAVE');
  const valid=m.phase==='extraFirst'?m.tick>=end&&m.tick<end+15:m.phase==='extraInterval'?m.tick===end+15:m.phase==='extraSecond'?m.tick>=end+15&&m.tick<end+30:m.phase==='finished'&&m.tick===end+30;
  if(!valid)throw Error('INVALID_SAVE');return;
 }
 const invalid=m.phase==='first'?(m.tick>=half&&m.addedTime[0]!==null)||m.tick>49||m.addedTime[1]!==null||((m.tick<45)!==(m.addedTime[0]===null)):m.phase==='interval'?m.addedTime[0]===null||m.addedTime[1]!==null||m.tick!==half:m.phase==='second'?m.addedTime[0]===null||m.tick<half||m.tick>=end||((m.tick<90+m.addedTime[0])!==(m.addedTime[1]===null)):m.phase!=='finished'||m.addedTime.some(n=>n===null)||m.tick!==end;
 if(invalid)throw Error('INVALID_SAVE');
 if(m.phase==='finished'&&m.decider&&m.homeGoals+m.aggregate[0]===m.awayGoals+m.aggregate[1])throw Error('INVALID_SAVE');
}
export function completeMinute(m:Match):boolean {
 if(m.phase==='extraFirst'||m.phase==='extraSecond'){
  if(m.tick===regulationBoundary(m)+(m.phase==='extraFirst'?15:30)){m.phase=m.phase==='extraFirst'?'extraInterval':'finished';return true;}return false;
 }
 const first=m.phase==='first';const end=first?45:90+(m.addedTime[0]??0);const index=first?0:1;
 if(m.tick===end&&m.addedTime[index]===null){
  const start=first?0:halfBoundary(m);
  const events=m.events.filter(e=>e.tick>start&&(e.type==='goal'||e.type==='injury'||e.type==='penalty'||e.type==='disallowedOffside'||e.type==='disallowedFoul')).length;
  const substitutions=m.substitutions.filter(s=>s.tick>start).length;
  m.addedTime[index]=Math.min(5,Math.floor((events+substitutions)/2));
 }
 if(m.addedTime[index]!==null&&m.tick===end+m.addedTime[index]){
  if(!first&&m.decider&&m.homeGoals+m.aggregate[0]===m.awayGoals+m.aggregate[1]){m.extraTime=true;m.phase='extraFirst';}
  else m.phase=first?'interval':'finished';return true;
 }
 return false;
}
