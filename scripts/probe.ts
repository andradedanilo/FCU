import { createCareer, startMatch, advanceMatch,autoPick } from '../packages/simulation/src/engine.ts';
import { clubs } from '../packages/contracts/src/identity.ts';
import {defaultTactics,type Tactics} from '../packages/contracts/src/index.ts';
const profiles:Tactics[]=[defaultTactics,{formation:'4-4-2',mentality:'cautious',tempo:'slow',pressing:'low'},{formation:'4-4-2',mentality:'attacking',tempo:'fast',pressing:'high'},{formation:'4-3-3',mentality:'attacking',tempo:'normal',pressing:'normal'},{formation:'4-2-3-1',mentality:'balanced',tempo:'slow',pressing:'high'}];
const totals=profiles.map(tactics=>({tactics,matches:0,goals:0,draws:0,shots:0}));const started=performance.now();
for(let seed=1;seed<=500;seed++) {
 const s=createCareer('00000000-0000-4000-8000-000000000001',seed,clubs[0]!.id);const bucket=totals[(seed-1)%5]!;s.tactics={...bucket.tactics};s.lineup=autoPick(s.players,s.clubId,s.tactics.formation);
 let m=startMatch(s,s.fixtures[0]!);m=advanceMatch(m,s.players,90);m=advanceMatch(m,s.players,90);
 bucket.matches++;bucket.goals+=m.homeGoals+m.awayGoals;bucket.draws+=Number(m.homeGoals===m.awayGoals);bucket.shots+=m.homeStats.shots+m.awayStats.shots;
}
console.log(JSON.stringify({workload:'500 matches, seeds 1..500, fixture-00-0, home profiles cycle by (seed-1)%5; away balanced 4-4-2',goalsPerMatch:totals.reduce((n,b)=>n+b.goals,0)/500,drawPercent:totals.reduce((n,b)=>n+b.draws,0)/5,shotsPerMatch:totals.reduce((n,b)=>n+b.shots,0)/500,profiles:totals,runtimeMs:Math.round(performance.now()-started),cards:'not implemented',injuries:'not implemented'}));
