import {it,expect} from 'vitest';
import {createCareer,startMatch,applyCommand,validateCareer,substitutePlayer,autoPick} from '../packages/simulation/src/engine.ts';
import {incidents,activeLineup,needsDecision,settleAvailability,available,addDays} from '../packages/simulation/src/availability.ts';
import {clubs} from '../packages/contracts/src/identity.ts';
import {canonical,type Match,type Player} from '../packages/contracts/src/index.ts';
const initial=()=>createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id);
function incident(m:Match,players:Player[],rolls:number[]){incidents(m,players,()=>{const n=rolls.shift();if(n===undefined)throw Error('Unexpected incident draw');return n;},pool=>pool[0]!);expect(rolls).toEqual([]);}
it('separates second-yellow dismissal from future bans and serves an existing ban before adding a new one',()=>{
 const s=initial();const m=startMatch(s,s.fixtures[0]!);m.tick=1;incident(m,s.players,[0,0,9999,9999,9999]);const id=m.events.find(e=>e.type==='yellow')!.playerId;const p=s.players.find(p=>p.id===id)!;
 expect(activeLineup(m,s.clubId)).toHaveLength(11);m.tick=2;incident(m,s.players,[0,0,9999,9999,9999]);expect(m.events.filter(e=>e.type==='secondYellow')).toHaveLength(1);expect(m.events.filter(e=>e.type==='red')).toHaveLength(0);expect(activeLineup(m,s.clubId)).not.toContain(id);expect(needsDecision(m)).toBe(true);expect(substitutePlayer(m,s.players,s.clubId,id,m.homeBench[1]!)).toBe(false);
 const banned=settleAvailability(p,m);expect(banned.leagueBan).toBe(1);expect(available(banned,s.date)).toBe(false);expect(settleAvailability(banned,startMatch(s,s.fixtures[0]!)).leagueBan).toBe(0);
 const direct=startMatch(s,s.fixtures[0]!);direct.tick=1;incident(direct,s.players,[0,9999,0,9999,9999,9999]);expect(settleAvailability(p,direct).leagueBan).toBe(3);
 const five=settleAvailability({...p,leagueYellows:4},{...m,events:m.events.filter(e=>e.tick===1)});expect(five.leagueYellows).toBe(0);expect(five.leagueBan).toBe(1);
});
it('requires an injury decision, allows a goalkeeper replacement and preserves injury state in a checkpoint',()=>{
 const s=initial();const m=startMatch(s,s.fixtures[0]!);m.tick=1;incident(m,s.players,[9999,0,0,0,9999,9999]);s.match=m;const injured=m.injuries[0]!;expect(injured.until).toBe('2026-07-04');expect(needsDecision(m)).toBe(true);expect(activeLineup(m,s.clubId)).not.toContain(injured.playerId);
 const base={careerId:s.careerId,commandId:crypto.randomUUID(),expectedRevision:s.revision};expect(applyCommand(s,{...base,type:'AdvanceMatch',minutes:1})).toEqual({ok:false,error:'MATCH_DECISION'});
 const incoming=m.homeBench.find(id=>s.players.find(p=>p.id===id)!.role==='GK')!;const changed=applyCommand(s,{...base,type:'Substitute',out:injured.playerId,in:incoming});if(!changed.ok)throw Error(changed.error);expect(needsDecision(changed.value.match!)).toBe(false);expect(activeLineup(changed.value.match!,s.clubId)).toContain(incoming);expect(validateCareer(JSON.parse(canonical(changed.value)))).toEqual(changed.value);
 const p=settleAvailability(s.players.find(p=>p.id===injured.playerId)!,m);expect(available(p,'2026-07-03')).toBe(false);expect(available(p,'2026-07-04')).toBe(true);expect(addDays('2026-12-31',1)).toBe('2027-01-01');const bad=structuredClone(changed.value);bad.match!.injuries[0]!.until='2026-02-31';expect(()=>validateCareer(bad)).toThrow();
});
it('rejects unavailable selection and supplies bounded fictional academy cover without healing seniors',()=>{
 const s=initial();const eligible=s.players.filter(p=>p.clubId===s.clubId&&p.role!=='GK').slice(0,10).map(p=>p.id);s.players=s.players.map(p=>p.clubId===s.clubId&&!eligible.includes(p.id)?{...p,injuryUntil:'2026-10-01'}:p);
 const base={careerId:s.careerId,commandId:crypto.randomUUID(),expectedRevision:0};expect(applyCommand(s,{...base,type:'StartMatch'})).toEqual({ok:false,error:'UNAVAILABLE_PLAYER'});
 const called=applyCommand(s,{...base,type:'CallUp'});if(!called.ok)throw Error();const academy=called.value.players.find(p=>p.academy)!;expect(academy.role).toBe('GK');expect(academy.clubId).toBe(s.clubId);expect(called.value.players.filter(p=>p.injuryUntil)).toEqual(s.players.filter(p=>p.injuryUntil));expect(autoPick(called.value.players,s.clubId,'4-4-2',s.date)).toHaveLength(11);
 expect(applyCommand(called.value,{...base,expectedRevision:1,commandId:crypto.randomUUID(),type:'CallUp'})).toEqual({ok:false,error:'INVALID_COMMAND'});
 let crisis=initial();crisis.players=crisis.players.map(p=>p.clubId===crisis.clubId?{...p,injuryUntil:'2026-10-01'}:p);
 // One depleted squad exhausts its eight academy places, with each call-up also unavailable.
 for(let slot=0;slot<8;slot++){const result=applyCommand(crisis,{...base,careerId:crisis.careerId,expectedRevision:crisis.revision,commandId:crypto.randomUUID(),type:'CallUp'});if(!result.ok)throw Error(result.error);crisis=result.value;crisis.players=crisis.players.map(p=>p.clubId===crisis.clubId?{...p,injuryUntil:'2026-10-01'}:p);}
 const forfeited=applyCommand(crisis,{...base,expectedRevision:crisis.revision,commandId:crypto.randomUUID(),type:'ForfeitMatch'});if(!forfeited.ok)throw Error(forfeited.error);expect(forfeited.value.round).toBe(1);expect(forfeited.value.match!.forfeit).toBe(crisis.clubId);expect(forfeited.value.match!.awayGoals).toBe(3);expect(validateCareer(forfeited.value)).toEqual(forfeited.value);
});
