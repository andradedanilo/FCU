import {it,expect} from 'vitest';
import {createCareer,applyCommand,validateCareer} from '../packages/simulation/src/engine.ts';
import {clubs} from '../packages/contracts/src/identity.ts';
import {canonical} from '../packages/contracts/src/index.ts';
import {budgets,cash,post} from '../packages/simulation/src/economy.ts';
import {maintainSquad,type PolicyAction} from '../scripts/career-policy.ts';
it('maintains a squad through affordable commands and does not repeat completed spending',()=>{
 let state=createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id);const actions={renewals:0,signings:0,upgrades:0,substitutions:0};
 const act=(action:PolicyAction)=>{const result=applyCommand(state,{...action,careerId:state.careerId,expectedRevision:state.revision,commandId:`00000000-0000-4000-8000-${String(state.revision+1).padStart(12,'0')}`});if(!result.ok)throw Error(result.error);state=result.value;};
 maintainSquad(()=>state,act,actions);expect(actions.renewals).toBeGreaterThan(0);expect(actions.upgrades).toBe(1);validateCareer(state);
 const bank=budgets(state,state.clubId);expect(bank.committed).toBeLessThanOrEqual(bank.wage);expect(bank.cash).toBeGreaterThanOrEqual(13*bank.committed+4*bank.overhead);
 const before=canonical(state);maintainSquad(()=>state,act,actions);expect(canonical(state)).toBe(before);
});
it('does not manufacture money or bypass reserves when the policy cannot afford contracts',()=>{
 const state=createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id),balance=cash(state.economy,state.clubId);
 post(state.economy,{id:'validation/expense',date:state.date,kind:'overhead',postings:[{account:state.clubId,amount:-balance},{account:'external',amount:balance}]});
 const before=canonical(state),actions={renewals:0,signings:0,upgrades:0,substitutions:0};maintainSquad(()=>state,()=>{throw Error('Unaffordable action');},actions);expect(canonical(state)).toBe(before);expect(actions).toEqual({renewals:0,signings:0,upgrades:0,substitutions:0});
});
