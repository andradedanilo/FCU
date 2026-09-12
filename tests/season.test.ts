import {it,expect} from 'vitest';
import {createCareer,applyCommand,validateCareer} from '../packages/simulation/src/engine.ts';
import {autoPick} from '../packages/simulation/src/selection.ts';
import {nextFixtureDate} from '../packages/simulation/src/calendar.ts';
import {seasonEnd,schedule} from '../packages/simulation/src/competition.ts';
import {clubs} from '../packages/contracts/src/identity.ts';
import {canonical,type Career,type Command} from '../packages/contracts/src/index.ts';
const initial=()=>createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id);
type Action<T>=T extends Command?Omit<T,'careerId'|'commandId'|'expectedRevision'>:never;
function act(s:Career,action:Action<Command>):Career{const r=applyCommand(s,{...action,careerId:s.careerId,expectedRevision:s.revision,commandId:crypto.randomUUID()});if(!r.ok)throw Error(r.error);return r.value;}
function finish(s:Career){while(s.round<14){while(s.date!==nextFixtureDate(s))s=act(s,{type:'AdvanceCalendar',target:'event'});s=act(s,{type:'SelectLineup',lineup:autoPick(s.players,s.clubId,s.tactics.formation,s.date)});s=act(s,{type:'StartMatch'});while(s.match!.phase!=='finished'){if(s.match!.pendingDismissal||s.match!.pendingInjuries.length)s=act(s,{type:'AcknowledgeMatch'});s=act(s,{type:'AdvanceMatch',minutes:90});}}while(s.date<seasonEnd(s.season))s=act(s,{type:'AdvanceCalendar',target:'event'});return s;}
it('closes a season atomically with prizes, expiry, preserved history and deterministic restart',()=>{
 let s=finish(initial());const expired=s.players.filter(p=>s.contracts[p.id]!.ends==='2027-06-30').map(p=>p.id),results=canonical(s.fixtures),before=canonical(s);
 const keeper=s.players.find(p=>p.clubId===s.clubId&&p.role==='GK')!;keeper.leagueBan=2;keeper.leagueYellows=4;
 const loaded=validateCareer(JSON.parse(canonical(s))),command={type:'CloseSeason' as const,careerId:s.careerId,expectedRevision:s.revision,commandId:crypto.randomUUID()};const a=applyCommand(s,command),b=applyCommand(loaded,command);expect(canonical(a)).toBe(canonical(b));if(!a.ok)throw Error(a.error);s=a.value;
 expect(s.date).toBe('2027-07-01');expect(s.season).toBe(2027);expect(s.round).toBe(0);expect(s.match).toBeNull();expect(canonical(s.history[0]!.fixtures)).toBe(results);expect(s.economy.ledger.filter(e=>e.kind==='prize')).toHaveLength(8);expect(s.economy.ledger.filter(e=>e.kind==='prize').reduce((sum,e)=>sum+e.postings[0].amount,0)).toBe(360000000);
 expect(s.players.filter(p=>expired.includes(p.id)).every(p=>p.clubId===null&&s.economy.wages[p.id]===0&&s.contracts[p.id]!.ownerId===null)).toBe(true);expect(s.players.find(p=>p.id===keeper.id)).toMatchObject({leagueBan:2,leagueYellows:0});expect(validateCareer(s)).toEqual(s);expect(canonical(s)).not.toBe(before);expect(()=>act(s,{type:'CloseSeason'})).toThrow('INVALID_COMMAND');
 expect(nextFixtureDate(s)).toBe('2027-08-14');s=act(s,{type:'AdvanceCalendar',target:'event'});while(s.date!==nextFixtureDate(s))s=act(s,{type:'AdvanceCalendar',target:'event'});s=act(s,{type:'SelectLineup',lineup:autoPick(s.players,s.clubId,s.tactics.formation,s.date)});s=act(s,{type:'StartMatch'});expect(s.match!.fixtureId).toContain('2027');expect(validateCareer(s)).toEqual(s);
});
it('retains two seasons of unique fixtures and refuses corrupted history or early closing',()=>{
 let s=initial();expect(()=>act(s,{type:'CloseSeason'})).toThrow('INVALID_COMMAND');s=act(finish(s),{type:'CloseSeason'});s=act(finish(s),{type:'CloseSeason'});expect(s.history.map(h=>h.year)).toEqual([2026,2027]);expect(new Set([...s.history.flatMap(h=>h.fixtures),...s.fixtures].map(f=>f.id)).size).toBe(168);expect(s.fixtures).toEqual(schedule(s.clubs.map(c=>c.id),2028));expect(validateCareer(s)).toEqual(s);
 const corrupt=structuredClone(s);corrupt.history[0]!.table[0]!.points++;expect(()=>validateCareer(corrupt)).toThrow();const missing=structuredClone(s);missing.history[0]!.fixtures.pop();expect(()=>validateCareer(missing)).toThrow();
});
