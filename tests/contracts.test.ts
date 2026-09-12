import {it,expect} from 'vitest';
import {createCareer,applyCommand,validateCareer,migrateFinancialCareer} from '../packages/simulation/src/engine.ts';
import {desiredTerms} from '../packages/simulation/src/contracts.ts';
import {cash,budgets} from '../packages/simulation/src/economy.ts';
import {clubs} from '../packages/contracts/src/identity.ts';
import {canonical,commandSchema,type Career,type Command} from '../packages/contracts/src/index.ts';
import {parseEuro} from '../packages/presentation/src/money.ts';
const initial=()=>createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id);
function renewal(s:Career):Extract<Command,{type:'RenewContract'}>{const p=s.players[0]!;return {type:'RenewContract',careerId:s.careerId,commandId:crypto.randomUUID(),expectedRevision:s.revision,playerId:p.id,contractRevision:0,years:4,role:'rotation',...desiredTerms(s,p)};}
it('renews a player atomically with one signing bonus and rejects repeated contract confirmation',()=>{
 const s=initial(),action=renewal(s),before=canonical(s),balance=cash(s.economy,s.clubId);
 const result=applyCommand(s,action);if(!result.ok)throw Error(result.error);const next=result.value;
 expect(cash(next.economy,s.clubId)).toBe(balance-action.bonus);expect(next.economy.wages[action.playerId]).toBe(action.wage);
 expect(next.contracts[action.playerId]).toMatchObject({ends:'2030-06-30',revision:1,ownerId:s.clubId});expect(next.economy.ledger.at(-1)!.postings.map(p=>p.amount)).toEqual([-action.bonus,action.bonus]);
 expect(validateCareer(JSON.parse(canonical(next)))).toEqual(next);expect(canonical(s)).toBe(before);
 expect(applyCommand(next,{...action,commandId:crypto.randomUUID(),expectedRevision:next.revision})).toEqual({ok:false,error:'CONTRACT_CHANGED'});
});
it('rejects unaffordable or inadequate terms and parses cent-accurate offers at the command boundary',()=>{
 const s=initial(),action=renewal(s),before=canonical(s);
 expect(applyCommand(s,{...action,wage:budgets(s,s.clubId).wage,bonus:4*budgets(s,s.clubId).wage})).toEqual({ok:false,error:'WAGE_BUDGET'});
 expect(applyCommand(s,{...action,bonus:cash(s.economy,s.clubId)})).toEqual({ok:false,error:'INSUFFICIENT_FUNDS'});
 expect(applyCommand(s,{...action,wage:0})).toEqual({ok:false,error:'PLAYER_TERMS'});
 expect(applyCommand(s,{...action,years:1})).toEqual({ok:false,error:'PLAYER_TERMS'});
 expect(applyCommand(s,{...action,playerId:s.players[22]!.id})).toEqual({ok:false,error:'INVALID_COMMAND'});
 expect(commandSchema.safeParse({...action,wage:Infinity}).success).toBe(false);expect(parseEuro('123.45')).toBe(12345);expect(parseEuro('123.456')).toBeNull();expect(parseEuro('9007199254740991')).toBeNull();expect(canonical(s)).toBe(before);
});
it('migrates financial saves without repricing wages or fabricating past signing costs',()=>{
 const s=initial(),old={...s,engineVersion:'0.4.0',rulesetVersion:'exhibition-7'};const migrated=migrateFinancialCareer(old);
 expect(migrated.economy).toEqual(s.economy);expect(migrated.match).toEqual(s.match);expect(migrated.contracts).toEqual(s.contracts);
 const broken=structuredClone(migrated);broken.contracts[s.players[0]!.id]!.ownerId=clubs[1]!.id;expect(()=>validateCareer(broken)).toThrow();
});
