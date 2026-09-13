import {it,expect} from 'vitest';
import {createCareer,arrangeLineup,autoPick,pickBench,validateCareer} from '../packages/simulation/src/engine.ts';
import {clubs} from '../packages/contracts/src/identity.ts';
import {effectiveRating} from '../packages/simulation/src/ratings.ts';
it('uses a secondary position to fill a shortage without the out-of-position penalty',()=>{
 const state=createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id);
 const squad=state.players.filter(p=>p.clubId===state.clubId),defenders=squad.filter(p=>p.role==='DEF');
 for(const p of defenders.slice(3))p.registered=false;
 const cover=squad.filter(p=>p.role==='MID').at(-1)!;cover.secondaryRoles=['DEF'];cover.tackling=99;cover.passing=99;
 const lineup=autoPick(state.players,state.clubId),slots=arrangeLineup(state.players,lineup,'4-4-2');
 expect(new Set(lineup).size).toBe(11);expect(slots.find(s=>s.player.id===cover.id)?.role).toBe('DEF');
 expect(effectiveRating(cover,'DEF')).toBe(effectiveRating({...cover,role:'DEF',secondaryRoles:[]},'DEF'));
 expect(effectiveRating({...cover,secondaryRoles:[]},'DEF')).toBeLessThan(effectiveRating(cover,'DEF'));
 state.lineup=lineup;state.bench=pickBench(state.players,state.clubId,lineup);expect(validateCareer(JSON.parse(JSON.stringify(state))).players.find(p=>p.id===cover.id)?.secondaryRoles).toEqual(['DEF']);
});
it('rejects duplicate and primary roles in secondary position data',()=>{
 const state=createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id);
 state.players[0]!.secondaryRoles=[state.players[0]!.role];expect(()=>validateCareer(state)).toThrow();
 state.players[0]!.secondaryRoles=['DEF','DEF'];expect(()=>validateCareer(state)).toThrow();
});
import {applyCommand} from '../packages/simulation/src/engine.ts';
import {youthIntake} from '../packages/simulation/src/personnel.ts';
import {desiredTerms} from '../packages/simulation/src/contracts.ts';
import {canonical} from '../packages/contracts/src/index.ts';
it('promotes an academy player with a paid senior contract once and preserves development',()=>{
 const state=createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id);youthIntake(state);
 const player=state.players.find(p=>p.clubId===state.clubId&&p.academy)!;
 const action={type:'PromoteAcademy' as const,playerId:player.id,contractRevision:0,years:2,role:'prospect' as const,...desiredTerms(state,player),careerId:state.careerId,expectedRevision:state.revision,commandId:'00000000-0000-4000-8000-000000000002'};
 const before=canonical(state),result=applyCommand(state,action);expect(result.ok).toBe(true);if(!result.ok)throw Error(result.error);
 const next=result.value;expect(canonical(state)).toBe(before);expect(next.players.find(p=>p.id===player.id)?.academy).toBe(false);expect(next.personnel.players[player.id]).toEqual(state.personnel.players[player.id]);expect(next.economy.wages[player.id]).toBe(action.wage);validateCareer(next);
 expect(applyCommand(next,{...action,expectedRevision:next.revision})).toEqual({ok:false,error:'DUPLICATE_COMMAND'});
 expect(applyCommand(next,{...action,expectedRevision:next.revision,commandId:'00000000-0000-4000-8000-000000000003'})).toEqual({ok:false,error:'INVALID_COMMAND'});
 expect(applyCommand(state,{...action,bonus:Number.MAX_SAFE_INTEGER})).toEqual({ok:false,error:'INSUFFICIENT_FUNDS'});
});
import {marketCommand,processMarket} from '../packages/simulation/src/market.ts';
import {recruit} from '../packages/simulation/src/recruitment.ts';
import {returnLoans} from '../packages/simulation/src/loans.ts';
import {cash} from '../packages/simulation/src/economy.ts';
import type {Career,Command} from '../packages/contracts/src/index.ts';
type Action<T=Command>=T extends Command?Omit<T,'careerId'|'expectedRevision'|'commandId'>:never;
function managementAct(state:Career,action:Action){const result=applyCommand(state,{...action,careerId:state.careerId,expectedRevision:state.revision,commandId:crypto.randomUUID()});if(!result.ok)throw Error(result.error);return result.value;}
function incoming(kind:'sale'|'loan'){
 let state=createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id,'countries');const player=state.players.find(p=>p.clubId===state.clubId&&p.role==='MID')!,buyer=clubs[1]!.id;
 state=managementAct(state,{type:'SetTransferListing',playerId:player.id,listing:{kind,fee:kind==='sale'?10000000:0,share:50}});
 const common={playerId:player.id,careerId:state.careerId,expectedRevision:state.revision,commandId:crypto.randomUUID()};
 expect(marketCommand(state,kind==='sale'?{...common,type:'SubmitOffer',fee:10000000}:{...common,type:'SubmitLoan',share:50},buyer)).toBeNull();
 const offer=state.offers.at(-1)!;offer.terms={...(kind==='sale'?desiredTerms(state,player):{wage:state.economy.wages[player.id]!,bonus:0}),years:2,role:'rotation'};
 state.date='2026-07-02';processMarket(state);return {state,player,offer};
}
it('requires the manager to accept a sale and repairs selection without duplicate proceeds',()=>{
 const {state,player,offer}=incoming('sale');expect(offer.status).toBe('submitted');recruit(state);expect(player.clubId).toBe(state.clubId);
 const money=cash(state.economy,state.clubId),next=managementAct(state,{type:'RespondBid',offerId:offer.id,accept:true});
 expect(next.players.find(p=>p.id===player.id)?.clubId).toBe(offer.buyerId);expect(cash(next.economy,next.clubId)-money).toBe(offer.fee);expect(next.lineup).not.toContain(player.id);expect(next.bench).not.toContain(player.id);validateCareer(next);
 expect(()=>managementAct(next,{type:'RespondBid',offerId:offer.id,accept:true})).toThrow('OFFER_CHANGED');
});
it('loans out with retained ownership and returns the player to the parent',()=>{
 const {state,player,offer}=incoming('loan');const next=managementAct(state,{type:'RespondBid',offerId:offer.id,accept:true});
 expect(next.contracts[player.id]!.ownerId).toBe(next.clubId);expect(next.loans.at(-1)?.share).toBe(50);expect(cash(next.economy,next.clubId)).toBe(cash(state.economy,state.clubId));validateCareer(next);
 next.date=next.loans.at(-1)!.ends;returnLoans(next);expect(next.players.find(p=>p.id===player.id)?.clubId).toBe(next.clubId);expect(next.loans.at(-1)?.status).toBe('returned');
});
it('rejects or expires unaccepted bids without selling and requires affordable current terms',()=>{
 const {state,player,offer}=incoming('sale');const rejected=managementAct(state,{type:'RespondBid',offerId:offer.id,accept:false});expect(rejected.players.find(p=>p.id===player.id)?.clubId).toBe(state.clubId);expect(rejected.offers.at(-1)?.status).toBe('rejected');
 offer.terms!.wage=1000000000;offer.terms!.bonus=4000000000;expect(()=>managementAct(state,{type:'RespondBid',offerId:offer.id,accept:true})).toThrow('WAGE_BUDGET');
 state.date=offer.expires;processMarket(state);expect(offer.status).toBe('expired');expect(player.clubId).toBe(state.clubId);
});
it('AI bids on a listed upgrade but never completes the sale without owner acceptance',()=>{
 let state=createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id,'countries');
 const player=state.players.find(p=>p.clubId===state.clubId&&p.role==='MID')!;player.passing=90;player.stamina=90;player.tackling=90;state.personnel.players[player.id]!.potential=95;
 state=managementAct(state,{type:'SetTransferListing',playerId:player.id,listing:{kind:'sale',fee:10000000,share:100}});
 state.date='2026-07-06';recruit(state);const offer=state.offers.find(o=>o.playerId===player.id&&o.sellerId===state.clubId);expect(offer).toBeDefined();expect(offer?.terms).not.toBeNull();
 state.date='2026-07-07';processMarket(state);recruit(state);expect(state.players.find(p=>p.id===player.id)?.clubId).toBe(state.clubId);expect(offer?.status).toBe('submitted');validateCareer(state);
});
import {performanceTotals,recordPerformance,validatePerformance} from '../packages/simulation/src/playerRecords.ts';
it('records played minutes goals assists and cards once at match settlement',()=>{
 let state=createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id);state=managementAct(state,{type:'StartMatch'});
 while(state.match!.phase!=='finished'){if(state.match!.pendingDismissal||state.match!.pendingInjuries.length)state=managementAct(state,{type:'AcknowledgeMatch'});state=managementAct(state,{type:'AdvanceMatch',minutes:90});}
 const match=state.match!,totals=state.players.filter(p=>p.clubId===match.home||p.clubId===match.away).map(p=>performanceTotals(p));
 expect(totals.reduce((n,p)=>n+p.goals,0)).toBe(match.events.filter(e=>e.type==='goal').length);
 expect(totals.reduce((n,p)=>n+p.assists,0)).toBe(match.events.filter(e=>e.type==='goal'&&e.assistId!==null).length);
 expect(totals.reduce((n,p)=>n+p.starts,0)).toBe(22);
 expect(totals.reduce((n,p)=>n+p.yellows,0)).toBe(match.events.filter(e=>e.type==='yellow'||e.type==='secondYellow').length);
 expect(totals.every(p=>p.minutes<=130*p.appearances)).toBe(true);
 const encoded=canonical(state);expect(canonical(validateCareer(JSON.parse(encoded)))).toBe(encoded);expect(()=>managementAct(state,{type:'AdvanceMatch',minutes:1})).toThrow('INVALID_COMMAND');expect(canonical(state)).toBe(encoded);
 const player=state.players.find(p=>p.performance?.length)!;const past=canonical(player.performance);const next=structuredClone(state);next.season++;next.date=`${next.season}-07-01`;const replay={...match,date:next.date};recordPerformance(next,replay);validatePerformance(next);expect(next.players.find(p=>p.id===player.id)!.performance).toHaveLength(2);expect(canonical(player.performance)).toBe(past);
 const corrupt=structuredClone(state);corrupt.players.find(p=>p.id===player.id)!.performance![0]!.starts=300;expect(()=>validateCareer(corrupt)).toThrow();
});
