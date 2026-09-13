import {isMainThread,Worker,workerData,parentPort} from 'node:worker_threads';
import {createCareer,applyCommand,validateCareer,requiresCallUp} from '../packages/simulation/src/engine.ts';
import {autoPick} from '../packages/simulation/src/selection.ts';
import {selectionPlayers} from '../packages/simulation/src/discipline.ts';
import {nextManagedFixture,seasonEnd} from '../packages/simulation/src/competition.ts';
import {nextFixtureDate} from '../packages/simulation/src/calendar.ts';
import {cash} from '../packages/simulation/src/economy.ts';
import type {Command,ClubId} from '../packages/contracts/src/index.ts';
type Action<T>=T extends Command?Omit<T,'careerId'|'commandId'|'expectedRevision'>:never;
const started=performance.now();
// Fixed v0.7 workload: three independent seeds, ten full country-world seasons each.
if(isMainThread){
 const workers=[2026,2027,2028].map(seed=>new Worker(new URL(import.meta.url),{workerData:seed}));
 for(const worker of workers)worker.on('message',(report:unknown)=>process.stdout.write(JSON.stringify(report)+'\n'));
 let timeout:ReturnType<typeof setTimeout>|undefined;
 try{await Promise.race([Promise.all(workers.map(worker=>new Promise<void>((resolve,reject)=>{worker.on('error',reject);worker.on('exit',code=>code===0?resolve():reject(Error('LONG_CAREER_WORKER')));}))),new Promise<never>((_resolve,reject)=>{timeout=setTimeout(()=>reject(Error('LONG_CAREER_BUDGET')),200000);})]);
 process.stdout.write(JSON.stringify({completedSeeds:3,seasonsEach:10,wallSeconds:(performance.now()-started)/1000,rssMB:Math.round(process.memoryUsage().rss/1048576)})+'\n');
 }finally{clearTimeout(timeout);await Promise.all(workers.map(worker=>worker.terminate()));}
}
const seedInput:unknown=workerData;
const seeds=isMainThread?[]:typeof seedInput==='number'&&[2026,2027,2028].includes(seedInput)?[seedInput]:[];
for(const seed of seeds){
 let s=createCareer(`00000000-0000-4000-8000-${seed.toString().padStart(12,'0')}`,seed,'club-01' as ClubId,'countries');
 let sequence=0,goals=0,games=0,managedGames=0,managedCards=0,managedInjuries=0,managedTrainingInjuries=0,managedForfeits=0;
 const act=(action:Action<Command>)=>{
  if(performance.now()-started>200000)throw Error('LONG_CAREER_BUDGET');
  const result=applyCommand(s,{...action,careerId:s.careerId,expectedRevision:s.revision,commandId:`00000000-0000-4000-8000-${(++sequence).toString().padStart(12,'0')}`});
  if(!result.ok)throw Error(`${seed} ${s.season} ${s.date} ${action.type} ${result.error}`);if(action.type==='AdvanceCalendar')managedTrainingInjuries+=result.value.players.filter(p=>p.clubId===s.clubId&&p.injuryUntil&&p.injuryUntil>s.date&&p.injuryUntil!==s.players.find(old=>old.id===p.id)?.injuryUntil).length;s=result.value;
 };
 const job=()=>{if(s.board.status==='dismissed'){const clubId=s.board.vacancies[0];if(!clubId)throw Error('NO_CAREER_JOB');act({type:'AcceptJob',clubId});}};
 for(let year=0;year<10;year++){
  while(nextManagedFixture(s)){
   job();while(s.date!==nextFixtureDate(s)){act({type:'AdvanceCalendar',target:'event'});job();}
   while(requiresCallUp(s)&&s.players.filter(p=>p.clubId===s.clubId&&p.academy).length<8)act({type:'CallUp'});
   const lineup=autoPick(selectionPlayers(s),s.clubId,s.tactics.formation,s.date);
   if(lineup.length<7)act({type:'ForfeitMatch'});
   else {act({type:'SelectLineup',lineup});act({type:'StartMatch'});while(s.match!.phase!=='finished'){if(s.match!.pendingDismissal||s.match!.pendingInjuries.length)act({type:'AcknowledgeMatch'});act({type:'AdvanceMatch',minutes:90});}}
   if(s.match){managedGames++;managedForfeits+=Number(s.match.forfeit!==null);managedCards+=s.match.events.filter(e=>e.type==='yellow'||e.type==='red'||e.type==='secondYellow').length;managedInjuries+=s.match.injuries.length;}
   job();
  }
  while(s.date<seasonEnd(s.season)){act({type:'AdvanceCalendar',target:'event'});job();}
  validateCareer(s);games+=s.fixtures.length;goals+=s.fixtures.reduce((n,f)=>n+(f.score?.[0]??0)+(f.score?.[1]??0),0);
  act({type:'CloseSeason'});job();validateCareer(s);
  const balances=s.clubs.map(c=>cash(s.economy,c.id)),wages=Object.values(s.economy.wages).sort((a,b)=>a-b);balances.sort((a,b)=>a-b);
  parentPort!.postMessage({seed,seasons:year+1,goalsPerMatch:goals/games,managedGames,managedForfeits,managedTrainingInjuries,managedCardsPerMatch:managedCards/managedGames,managedInjuriesPerMatch:managedInjuries/managedGames,population:s.players.length,retired:Object.values(s.personnel.players).filter(p=>p.retired!==null).length,injured:s.players.filter(p=>p.injuryUntil&&p.injuryUntil>s.date).length,wageMedian:wages[Math.floor(wages.length/2)],cashMedian:balances[Math.floor(balances.length/2)],wageMin:Math.min(...wages),wageMax:Math.max(...wages),cashMin:Math.min(...balances),cashMax:Math.max(...balances),memoryMB:Math.round(process.memoryUsage().heapUsed/1048576),elapsedSeconds:(performance.now()-started)/1000});
 }
}
