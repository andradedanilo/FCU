import {it,expect} from 'vitest';
import {createCareer,startMatch,advanceMatch} from '../packages/simulation/src/engine.ts';
import {resolveAttack,validateAttackEvents} from '../packages/simulation/src/attacks.ts';
import {clubs} from '../packages/contracts/src/identity.ts';
import {canonical,type MatchEvent} from '../packages/contracts/src/index.ts';
import {projectHighlight,selectHighlight} from '../packages/presentation/src/highlights.ts';
const setup=()=>{const career=createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id);const match=startMatch(career,career.fixtures[0]!);match.tick=1;career.match=match;return {career,match,home:career.players.filter(p=>match.homeLineup.includes(p.id)),away:career.players.filter(p=>match.awayLineup.includes(p.id))};};
it.each([
 {name:'offside',draws:[0],types:['pass','offside'],shots:0,target:0,goals:0},
 {name:'goal disallowed for offside',draws:[9999,0,0,0,0],types:['pass','disallowedOffside'],shots:0,target:0,goals:0},
 {name:'goal disallowed for attacking foul',draws:[9999,0,0,0,9999],types:['pass','disallowedFoul'],shots:0,target:0,goals:0},
 {name:'woodwork stays out',draws:[9999,9999,0],types:['pass','post'],shots:1,target:0,goals:0},
 {name:'corner cleared',draws:[9999,9999,9999,0,9999],types:['pass','shot','corner','clearance'],shots:1,target:0,goals:0},
 {name:'corner converted without offside',draws:[9999,9999,9999,0,0,0,0,0],types:['pass','shot','corner','goal'],shots:2,target:1,goals:1}
])('accounts for $name without a phantom goal',({draws,types,shots,target,goals})=>{
 const {match,home,away}=setup();let i=0;
 resolveAttack(match,0,home,away,{D:60,K:60},()=>{const value=draws[i++];if(value===undefined)throw Error('Unexpected random draw');return value;},players=>players[0]!);
 expect(match.events.map(e=>e.type)).toEqual(types);expect(match.homeStats).toMatchObject({shots,onTarget:target});expect(match.homeGoals).toBe(goals);expect(match.events.filter(e=>e.type.startsWith('disallowed')).every(e=>e.homeGoals===0)).toBe(true);validateAttackEvents(match);
});
it.each([{name:'scores',draws:[0],result:'goal',target:1,goals:1,highlight:'penaltyGoal'},{name:'is saved',draws:[9999,0],result:'save',target:1,goals:0,highlight:'penaltySave'},{name:'misses',draws:[9999,9999],result:'shot',target:0,goals:0,highlight:'penaltyMiss'}])('resolves an awarded penalty that $name separately from a shootout',({draws,result,target,goals,highlight})=>{
 const {career,match,home,away}=setup();const foul:MatchEvent={tick:1,order:0,type:'foul',clubId:match.away,playerId:away[1]!.id,assistId:null,homeGoals:0,awayGoals:0};match.events.push(foul);let i=0;
 resolveAttack(match,0,home,away,{D:60,K:60},()=>draws[i++]!,players=>players[0]!,true);
 expect(match.events.map(e=>e.type)).toEqual(['foul','penalty',result]);expect(match.homeStats).toMatchObject({shots:1,onTarget:target});expect(match.homeGoals).toBe(goals);expect(match.penalties).toEqual([]);expect(projectHighlight(career,selectHighlight(match.events,0)!)?.kind).toBe(highlight);validateAttackEvents(match);
 const broken=structuredClone(match);broken.events.splice(0,1);broken.events.forEach((e,index)=>e.order=index);expect(()=>validateAttackEvents(broken)).toThrow('INVALID_SAVE');
});
it('replays the expanded event stream exactly across a serialized midpoint and rejects false scores',()=>{
 const {career}=setup();const original=startMatch(career,career.fixtures[0]!);
 const until=(m:typeof original,stop:number)=>{while(m.tick<stop&&m.phase!=='finished'){m.pendingDismissal=false;m.pendingInjuries=[];m=advanceMatch(m,career.players,1);}return m;};
 const split=until(original,23),end=until(structuredClone(original),130),restored=until(JSON.parse(canonical(split)),130);
 expect(restored).toEqual(end);validateAttackEvents(end);
 const invalid=structuredClone(end);invalid.homeStats.shots++;expect(()=>validateAttackEvents(invalid)).toThrow('INVALID_SAVE');
});
