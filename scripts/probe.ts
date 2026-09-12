import { createCareer, startMatch, advanceMatch } from '../packages/simulation/src/engine.ts';
import { clubs } from '../packages/contracts/src/identity.ts';
let goals=0,draws=0,shots=0;
const started=performance.now();
for(let seed=1;seed<=500;seed++) {
  const s=createCareer('00000000-0000-4000-8000-000000000001',seed,clubs[0]!.id);
  let m=startMatch(s,s.fixtures[0]!);m=advanceMatch(m,s.players,90);m=advanceMatch(m,s.players,90);
  goals+=m.homeGoals+m.awayGoals;draws+=Number(m.homeGoals===m.awayGoals);shots+=m.homeStats.shots+m.awayStats.shots;
}
console.log(JSON.stringify({workload:'500 matches, seeds 1..500, fixture-00-0',goalsPerMatch:goals/500,drawPercent:draws/5,shotsPerMatch:shots/500,runtimeMs:Math.round(performance.now()-started),cards:'not implemented in v0.1',injuries:'not implemented in v0.1'}));
