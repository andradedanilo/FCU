import {it,expect} from 'vitest';
import {createCareer,applyCommand,validateCareer} from '../packages/simulation/src/engine.ts';
import {knownAbility} from '../packages/simulation/src/scouting.ts';
import {nextFixtureDate} from '../packages/simulation/src/calendar.ts';
import {canonical,type Career,type Command} from '../packages/contracts/src/index.ts';
import {clubs} from '../packages/contracts/src/identity.ts';
const initial=()=>createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id);
type Payload<T>=T extends Command?Omit<T,'careerId'|'commandId'|'expectedRevision'>:never;
function act(s:Career,action:Payload<Command>):Career {const result=applyCommand(s,{...action,careerId:s.careerId,expectedRevision:s.revision,commandId:crypto.randomUUID()});if(!result.ok)throw Error(result.error);return result.value;}
function fixture(s:Career){s=act(s,{type:'StartMatch'});while(s.match!.phase!=='finished'){if(s.match!.pendingDismissal||s.match!.pendingInjuries.length)s=act(s,{type:'AcknowledgeMatch'});s=act(s,{type:'AdvanceMatch',minutes:90});}return s;}
it('keeps estimates stable and delivers one dated report without simulating the next fixture',()=>{
 let s=initial();const player=s.players[22]!,estimate=knownAbility(s,player),before=canonical(s);
 expect(knownAbility(validateCareer(JSON.parse(before)),player)).toEqual(estimate);expect(canonical(s)).toBe(before);
 s=act(s,{type:'SetShortlist',playerId:player.id,listed:true});s=act(s,{type:'SetShortlist',playerId:player.id,listed:true});expect(s.scouting.shortlist).toEqual([player.id]);s=act(s,{type:'ScoutPlayer',playerId:player.id});
 expect(()=>act(s,{type:'ScoutPlayer',playerId:s.players[23]!.id})).toThrow('SCOUT_BUSY');expect(()=>act(s,{type:'AdvanceCalendar',target:'event'})).toThrow('INVALID_COMMAND');
 s=fixture(s);expect(s.date).toBe('2026-07-01');const games=canonical(s.fixtures),tick=s.match!.tick,condition=s.players.find(p=>p.id===s.lineup[0])!.condition;
 s=act(s,{type:'AdvanceCalendar',target:'day'});expect(s.date).toBe('2026-07-02');expect(s.players.find(p=>p.id===s.lineup[0])!.condition).toBeGreaterThan(condition);expect(s.scouting.reports[player.id]).toBeUndefined();expect(()=>act(s,{type:'StartMatch'})).toThrow('NOT_MATCH_DAY');
 s=act(s,{type:'AdvanceCalendar',target:'event'});expect(s.date).toBe(nextFixtureDate(s));expect(s.scouting.active).toBeNull();expect(s.scouting.reports[player.id]?.date).toBe('2026-07-08');expect(s.scouting.reports[player.id]!.high-s.scouting.reports[player.id]!.low).toBeLessThanOrEqual(6);expect(canonical(s.fixtures)).toBe(games);expect(s.match!.tick).toBe(tick);expect(validateCareer(JSON.parse(canonical(s)))).toEqual(s);
});
it('stops at a report due before kickoff and rejects malformed saved scouting identities',()=>{
 let s=fixture(initial());s=act(s,{type:'AdvanceCalendar',target:'day'});s=act(s,{type:'AdvanceCalendar',target:'day'});s=act(s,{type:'ScoutPlayer',playerId:s.players[22]!.id});s=act(s,{type:'AdvanceCalendar',target:'event'});expect(s.date).toBe('2026-07-08');
 expect(s.scouting.active?.due).toBe('2026-07-10');s=fixture(s);const matches=s.fixtures.filter(f=>f.score).length;
 s=act(s,{type:'AdvanceCalendar',target:'event'});expect(s.date).toBe('2026-07-10');expect(s.fixtures.filter(f=>f.score)).toHaveLength(matches);
 const broken=structuredClone(s);broken.scouting.shortlist=[s.players[22]!.id,s.players[22]!.id];expect(()=>validateCareer(broken)).toThrow();
});
it('retains a large-world shortlist through commands and save validation',()=>{
 let s=createCareer('00000000-0000-4000-8000-000000000006',2026,clubs[0]!.id,'countries');
 const candidates=s.players.filter(p=>p.clubId!==s.clubId).slice(0,300).map(p=>p.id);
 s.scouting.shortlist=candidates.slice(0,299);s=act(s,{type:'SetShortlist',playerId:candidates[299]!,listed:true});
 expect(validateCareer(JSON.parse(canonical(s))).scouting.shortlist).toEqual([...candidates].sort());
 s=act(s,{type:'SetShortlist',playerId:candidates[299]!,listed:false});expect(s.scouting.shortlist).toHaveLength(299);
});
