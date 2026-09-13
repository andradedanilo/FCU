import {createCareer,applyCommand,validateCareer,requiresCallUp} from '../packages/simulation/src/engine.ts';
import {autoPick} from '../packages/simulation/src/selection.ts';
import {selectionPlayers} from '../packages/simulation/src/discipline.ts';
import {nextManagedFixture,seasonEnd} from '../packages/simulation/src/competition.ts';
import {nextFixtureDate} from '../packages/simulation/src/calendar.ts';
import {cash} from '../packages/simulation/src/economy.ts';
import type {Command,ClubId} from '../packages/contracts/src/index.ts';
type Action<T>=T extends Command?Omit<T,'careerId'|'commandId'|'expectedRevision'>:never;
const started=performance.now();
// Fixed v0.7 workload: three seeds, ten full country-world seasons each.
for(const seed of [2026,2027,2028]){
 let s=createCareer(`00000000-0000-4000-8000-${seed.toString().padStart(12,'0')}`,seed,'club-01' as ClubId,'countries');
 let sequence=0,goals=0,games=0;
 const act=(action:Action<Command>)=>{
  if(performance.now()-started>200000)throw Error('LONG_CAREER_BUDGET');
  const result=applyCommand(s,{...action,careerId:s.careerId,expectedRevision:s.revision,commandId:`00000000-0000-4000-8000-${(++sequence).toString().padStart(12,'0')}`});
  if(!result.ok)throw Error(`${seed} ${s.season} ${s.date} ${action.type} ${result.error}`);s=result.value;
 };
 const job=()=>{if(s.board.status==='dismissed'){const clubId=s.board.vacancies[0];if(!clubId)throw Error('NO_CAREER_JOB');act({type:'AcceptJob',clubId});}};
 for(let year=0;year<10;year++){
  while(nextManagedFixture(s)){
   job();while(s.date!==nextFixtureDate(s)){act({type:'AdvanceCalendar',target:'event'});job();}
   while(requiresCallUp(s)&&s.players.filter(p=>p.clubId===s.clubId&&p.academy).length<8)act({type:'CallUp'});
   const lineup=autoPick(selectionPlayers(s),s.clubId,s.tactics.formation,s.date);
   if(lineup.length<7)act({type:'ForfeitMatch'});
   else {act({type:'SelectLineup',lineup});act({type:'StartMatch'});while(s.match!.phase!=='finished'){if(s.match!.pendingDismissal||s.match!.pendingInjuries.length)act({type:'AcknowledgeMatch'});act({type:'AdvanceMatch',minutes:90});}}
   job();
  }
  while(s.date<seasonEnd(s.season)){act({type:'AdvanceCalendar',target:'event'});job();}
  validateCareer(s);games+=s.fixtures.length;goals+=s.fixtures.reduce((n,f)=>n+(f.score?.[0]??0)+(f.score?.[1]??0),0);
  act({type:'CloseSeason'});job();validateCareer(s);
  const balances=s.clubs.map(c=>cash(s.economy,c.id)),wages=Object.values(s.economy.wages);
  process.stdout.write(JSON.stringify({seed,seasons:year+1,goalsPerMatch:goals/games,population:s.players.length,retired:Object.values(s.personnel.players).filter(p=>p.retired!==null).length,injured:s.players.filter(p=>p.injuryUntil&&p.injuryUntil>s.date).length,wageMin:Math.min(...wages),wageMax:Math.max(...wages),cashMin:Math.min(...balances),cashMax:Math.max(...balances),memoryMB:Math.round(process.memoryUsage().heapUsed/1048576),elapsedSeconds:(performance.now()-started)/1000})+'\n');
 }
}
