import {it,expect} from 'vitest';
import {createCareer,applyCommand,validateCareer,migrateTimedCareer} from '../packages/simulation/src/engine.ts';
import {budgets,cash,settleDay,settleGate,validateEconomy} from '../packages/simulation/src/economy.ts';
import {clubs} from '../packages/contracts/src/identity.ts';
import {canonical} from '../packages/contracts/src/index.ts';
const initial=()=>createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id);
it('balances dated operating transactions once and keeps initial wage commitments affordable',()=>{
 const s=initial(),club=s.clubId;const before=budgets(s,club);
 expect(before.weekly).toBeLessThanOrEqual(Math.floor(before.wage*.8));expect(before.cash).toBe(250000000+Math.floor(500000000/12));
 expect(before.transfer).toBe(before.cash-13*before.weekly-4*before.overhead);
 settleDay(s,'2026-07-06');settleGate(s,club,'fixture-00-0','2026-07-01');s.date='2026-07-08';
 expect(cash(s.economy,club)).toBe(before.cash-before.weekly-before.overhead+28000000);
 const after=canonical(s);settleDay(s,'2026-07-06');settleGate(s,club,'fixture-00-0','2026-07-01');expect(canonical(s)).toBe(after);
 expect(s.economy.ledger.every(e=>e.postings[0].amount+e.postings[1].amount===0)).toBe(true);expect(()=>validateEconomy(s)).not.toThrow();
 const broken=structuredClone(s);broken.economy.ledger[0]!.postings[0].amount++;expect(()=>validateEconomy(broken)).toThrow();
});
it('preserves operating cash through save validation and gives older careers only an opening ledger',()=>{
 const s=initial();const command={type:'StartMatch' as const,careerId:s.careerId,commandId:crypto.randomUUID(),expectedRevision:s.revision};const result=applyCommand(s,command);if(!result.ok)throw Error(result.error);
 expect(validateCareer(JSON.parse(canonical(result.value)))).toEqual(result.value);
 expect(applyCommand(result.value,command)).toEqual({ok:false,error:'STALE_STATE'});expect(result.value.economy).toEqual(s.economy);
 const old={...s,players:s.players.filter(p=>p.clubId!==null),engineVersion:'0.3.2',rulesetVersion:'exhibition-6'};const migrated=migrateTimedCareer(old);
 expect(migrated.economy.ledger).toHaveLength(8);expect(cash(migrated.economy,s.clubId)).toBe(250000000);expect(migrated.players).toEqual(s.players);
 const broken=structuredClone(result.value);delete broken.economy.wages[s.players[0]!.id];expect(()=>validateCareer(broken)).toThrow();
});
