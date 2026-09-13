import assert from 'node:assert/strict';
import {validateAttackEvents} from '../packages/simulation/src/attacks.ts';
import { createCareer, startMatch, advanceMatch,autoPick,pickBench } from '../packages/simulation/src/engine.ts';
import { clubs } from '../packages/contracts/src/identity.ts';
import {defaultTactics,type Tactics} from '../packages/contracts/src/index.ts';
const eventTotals:Record<string,number>={};let penalties=0,penaltyGoals=0;
const profiles:Tactics[]=[defaultTactics,{formation:'4-4-2',mentality:'cautious',tempo:'slow',pressing:'low'},{formation:'4-4-2',mentality:'attacking',tempo:'fast',pressing:'high'},{formation:'4-3-3',mentality:'attacking',tempo:'normal',pressing:'normal'},{formation:'4-2-3-1',mentality:'balanced',tempo:'slow',pressing:'high'}];
const totals=profiles.map(tactics=>({tactics,matches:0,goals:0,draws:0,shots:0,yellows:0,dismissals:0,injuries:0}));const started=performance.now();
for(let seed=1;seed<=500;seed++) {
 const s=createCareer('00000000-0000-4000-8000-000000000001',seed,clubs[0]!.id);const bucket=totals[(seed-1)%5]!;s.tactics={...bucket.tactics};s.lineup=autoPick(s.players,s.clubId,s.tactics.formation);s.bench=pickBench(s.players,s.clubId,s.lineup,s.date);
 let m=startMatch(s,s.fixtures[0]!);while(m.phase!=='finished'){m.pendingInjuries=[];m.pendingDismissal=false;m=advanceMatch(m,s.players,90);}
 validateAttackEvents(m);for(const e of m.events){eventTotals[e.type]=(eventTotals[e.type]??0)+1;if(e.type==='penalty'){penalties++;penaltyGoals+=Number(m.events[e.order+1]?.type==='goal');}}
 bucket.yellows+=m.events.filter(e=>e.type==='yellow'||e.type==='secondYellow').length;bucket.dismissals+=m.dismissed.length;bucket.injuries+=m.injuries.length;bucket.matches++;bucket.goals+=m.homeGoals+m.awayGoals;bucket.draws+=Number(m.homeGoals===m.awayGoals);bucket.shots+=m.homeStats.shots+m.awayStats.shots;
}
const goalsPerMatch=totals.reduce((n,b)=>n+b.goals,0)/500;assert(goalsPerMatch>=1.5&&goalsPerMatch<=4.5,'Goals outside broad design guardrail');for(const type of ['offside','disallowedOffside','disallowedFoul','corner','post','penalty'])assert((eventTotals[type]??0)>0,'Missing event in fixed batch: '+type);assert(penalties>=30&&penalties<=250,'Penalty frequency outside broad design guardrail');assert(penaltyGoals/penalties>=.5&&penaltyGoals/penalties<=.95,'Penalty conversion outside guardrail');
console.log(JSON.stringify({eventTotals,penalties,penaltyConversion:penaltyGoals/penalties,workload:'500 matches, seeds 1..500, fixture-00-0, home profiles cycle by (seed-1)%5; away starts balanced 4-4-2 and applies AI policy; home acknowledges removals without replacements',goalsPerMatch:totals.reduce((n,b)=>n+b.goals,0)/500,drawPercent:totals.reduce((n,b)=>n+b.draws,0)/5,shotsPerMatch:totals.reduce((n,b)=>n+b.shots,0)/500,profiles:totals,runtimeMs:Math.round(performance.now()-started),cards:totals.reduce((n,b)=>n+b.yellows,0)/500,dismissals:totals.reduce((n,b)=>n+b.dismissals,0)/500,injuries:totals.reduce((n,b)=>n+b.injuries,0)/500}));
