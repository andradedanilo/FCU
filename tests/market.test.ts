import {commitments,budgets} from '../packages/simulation/src/economy.ts';
import {autoPick} from '../packages/simulation/src/selection.ts';
import {available} from '../packages/simulation/src/availability.ts';
import {nextFixtureDate} from '../packages/simulation/src/calendar.ts';
import {recruit} from '../packages/simulation/src/recruitment.ts';
import {it,expect} from 'vitest';
import {createCareer,applyCommand,validateCareer,migrateScoutingCareer} from '../packages/simulation/src/engine.ts';
import {askingPrice,processMarket,windowOpen} from '../packages/simulation/src/market.ts';
import {desiredTerms} from '../packages/simulation/src/contracts.ts';
import {cash,post} from '../packages/simulation/src/economy.ts';
import {clubs} from '../packages/contracts/src/identity.ts';
import {canonical,type Career,type Command,type Offer} from '../packages/contracts/src/index.ts';
const initial=()=>createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id);
type Payload<T>=T extends Command?Omit<T,'careerId'|'commandId'|'expectedRevision'>:never;
function act(s:Career,action:Payload<Command>):Career {const result=applyCommand(s,{...action,careerId:s.careerId,expectedRevision:s.revision,commandId:crypto.randomUUID()});if(!result.ok)throw Error(result.error);return result.value;}
function fixture(s:Career){s=act(s,{type:'StartMatch'});while(s.match!.phase!=='finished'){if(s.match!.pendingDismissal||s.match!.pendingInjuries.length)s=act(s,{type:'AcknowledgeMatch'});s=act(s,{type:'AdvanceMatch',minutes:90});}return s;}
function terms(s:Career,offer:Offer){return {type:'OfferTerms' as const,offerId:offer.id,terms:{...desiredTerms(s,s.players.find(p=>p.id===offer.playerId)!),years:2,role:'rotation' as const}};}
it('negotiates both stages, preserves a played match and charges a transfer exactly once',()=>{
 let s=fixture(initial());const historic=canonical(s.match),seller=s.match!.away;
 const player=s.players.filter(p=>p.clubId===seller&&p.role!=='GK').sort((a,b)=>askingPrice(s,a)-askingPrice(s,b))[0]!;
 s=act(s,{type:'SubmitOffer',playerId:player.id,fee:0});const id=s.offers[0]!.id;
 const cashBefore=cash(s.economy,s.clubId);s=act(s,{type:'AdvanceCalendar',target:'event'});expect(s.date).toBe('2026-07-02');expect(s.offers[0]!.status).toBe('countered');expect(cash(s.economy,s.clubId)).toBe(cashBefore);
 s=act(s,{type:'CounterOffer',offerId:id,fee:1});s=act(s,{type:'AdvanceCalendar',target:'event'});expect(s.offers[0]!.sellerCounters).toBe(2);
 s=act(s,{type:'AcceptOffer',offerId:id});const before=canonical(s);
 expect(()=>act(s,{type:'OfferTerms',offerId:id,terms:{...terms(s,s.offers[0]!).terms,bonus:cashBefore}})).toThrow('INSUFFICIENT_FUNDS');expect(canonical(s)).toBe(before);
 s=act(s,terms(s,s.offers[0]!));expect(cash(s.economy,s.clubId)).toBe(cashBefore);const fee=s.offers[0]!.fee,bonus=s.offers[0]!.terms!.bonus,sellerCash=cash(s.economy,seller);
 const original=validateCareer(JSON.parse(canonical(s))),command={type:'ConfirmDeal' as const,offerId:id,careerId:s.careerId,expectedRevision:s.revision,commandId:crypto.randomUUID()};
 const a=applyCommand(s,command),b=applyCommand(original,command);expect(canonical(a)).toBe(canonical(b));if(!a.ok)throw Error(a.error);s=a.value;
 expect(cash(s.economy,s.clubId)).toBe(cashBefore-fee-bonus);expect(cash(s.economy,seller)).toBe(sellerCash+fee);expect(s.players.find(p=>p.id===player.id)!.clubId).toBe(s.clubId);expect(canonical(s.match)).toBe(historic);expect(validateCareer(JSON.parse(canonical(s)))).toEqual(s);
 expect(()=>act(s,{type:'ConfirmDeal',offerId:id})).toThrow('OFFER_CHANGED');expect(s.economy.ledger.filter(e=>e.id.includes(id))).toHaveLength(2);
 const broken=structuredClone(s);delete broken.match!.participants[player.id];expect(()=>validateCareer(broken)).toThrow();
});
it('signs free agents year-round and expires unanswered negotiations without charging',()=>{
 let s=fixture(initial());const player=s.players.find(p=>p.clubId===null)!;
 s=act(s,{type:'SubmitOffer',playerId:player.id,fee:0});expect(s.offers[0]!.status).toBe('accepted');s=act(s,terms(s,s.offers[0]!));const bonus=s.offers[0]!.terms!.bonus,before=cash(s.economy,s.clubId);
 s=act(s,{type:'ConfirmDeal',offerId:s.offers[0]!.id});expect(cash(s.economy,s.clubId)).toBe(before-bonus);expect(s.economy.ledger.filter(e=>e.kind==='transferFee')).toHaveLength(0);expect(validateCareer(s)).toEqual(s);
 const other=s.players.find(p=>p.clubId===null)!;s=act(s,{type:'SubmitOffer',playerId:other.id,fee:0});s=act(s,{type:'AdvanceCalendar',target:'event'});expect(s.date).toBe('2026-07-08');expect(s.offers[1]!.status).toBe('expired');expect(s.players.find(p=>p.id===other.id)!.clubId).toBeNull();expect(()=>act(s,{type:'ConfirmDeal',offerId:s.offers[1]!.id})).toThrow('OFFER_CHANGED');
 const malformed=structuredClone(s);malformed.offers[0]!.expires='2026-02-30';expect(()=>validateCareer(malformed)).toThrow();
});
it('queues outside the window, rechecks reserves on opening and migrates match membership',()=>{
 const initialState=initial(),old={...initialState,engineVersion:'0.4.2',rulesetVersion:'exhibition-9',players:initialState.players.filter(p=>p.clubId!==null),contracts:Object.fromEntries(Object.entries(initialState.contracts).filter(([,c])=>c.ownerId!==null)),economy:{...initialState.economy,wages:Object.fromEntries(initialState.players.filter(p=>p.clubId!==null).map(p=>[p.id,initialState.economy.wages[p.id]]))}};
 expect(migrateScoutingCareer(old)).toEqual(initialState);
 let s=initialState;s.date='2026-10-01';s.round=14;s.fixtures.forEach(f=>{f.score=[0,0];});
 const player=s.players.filter(p=>p.clubId===clubs[1]!.id&&p.role!=='GK').sort((a,b)=>askingPrice(s,a)-askingPrice(s,b))[0]!;
 s=act(s,{type:'SubmitOffer',playerId:player.id,fee:askingPrice(s,player)});s=act(s,{type:'AdvanceCalendar',target:'event'});s=act(s,terms(s,s.offers[0]!));s=act(s,{type:'ConfirmDeal',offerId:s.offers[0]!.id});expect(s.offers[0]!.activation).toBe('2027-01-01');expect(s.players.find(p=>p.id===player.id)!.clubId).toBe(clubs[1]!.id);expect(validateCareer(s)).toEqual(s);
 const drained=structuredClone(s);post(drained.economy,{id:'test-cost',date:drained.date,kind:'overhead',postings:[{account:drained.clubId,amount:-cash(drained.economy,drained.clubId)},{account:'external',amount:cash(drained.economy,drained.clubId)}]});drained.date='2027-01-01';processMarket(drained);expect(drained.offers[0]!.status).toBe('rejected');expect(drained.offers[0]!.reason).toBe('funds');
 s.date='2027-01-01';processMarket(s);expect(s.offers[0]!.status).toBe('completed');expect(validateCareer(s)).toEqual(s);
 expect(windowOpen('2026-08-31')).toBe(true);expect(windowOpen('2026-09-01')).toBe(false);expect(windowOpen('2027-01-31')).toBe(true);expect(windowOpen('2027-02-01')).toBe(false);
});

it('recruits deterministically within weekly limits and protects the managed squad',()=>{
 const s=fixture(initial());s.date='2026-07-06';const club=clubs[1]!.id;
 const released=s.players.filter(p=>p.clubId===club&&p.role==='DEF').slice(0,2);
 for(const p of released){p.clubId=null;s.contracts[p.id]={...s.contracts[p.id]!,ownerId:null,ends:null,revision:1};s.economy.wages[p.id]=0;}
 const original=validateCareer(structuredClone(s)),human=s.players.filter(p=>p.clubId===s.clubId).map(p=>p.id),history=canonical(s.match),before=canonical(s.economy.ledger);
 recruit(s);recruit(original);expect(canonical(s)).toBe(canonical(original));expect(s.offers.length).toBeGreaterThan(0);expect(s.offers.filter(o=>o.buyerId===club).length).toBeLessThanOrEqual(2);expect(s.offers.some(o=>o.sellerId===s.clubId||o.buyerId===s.clubId)).toBe(false);
 const changed=structuredClone(original);changed.date='2026-07-13';changed.players[0]!.shooting=Math.min(100,changed.players[0]!.shooting+20);changed.contracts[changed.players[0]!.id]!.birthDate='1997-07-10';const cold=structuredClone(changed);recruit(changed);recruit({...structuredClone(original),seed:2027});recruit(cold);expect(canonical(changed)).toBe(canonical(cold));
 const repeated=canonical(s);recruit(s);expect(canonical(s)).toBe(repeated);expect(s.players.filter(p=>p.clubId===s.clubId).map(p=>p.id)).toEqual(human);expect(canonical(s.match)).toBe(history);expect(validateCareer(s)).toEqual(s);
 s.date='2026-07-07';processMarket(s);recruit(s);expect(s.offers.some(o=>o.status==='completed')).toBe(true);expect(canonical(s.economy.ledger)).not.toBe(before);expect(validateCareer(s)).toEqual(s);
});

it('splits loan wages, preserves ownership and returns a selected player at the dated calendar event',()=>{
 let s=fixture(initial());const parent=clubs[7]!.id,player=s.players.find(p=>p.clubId===parent&&p.role==='DEF'&&available(p,'2026-07-02'))!,wage=s.economy.wages[player.id]!;
 const parentWeekly=commitments(s,parent),ownWeekly=commitments(s,s.clubId);
 s=act(s,{type:'SubmitLoan',playerId:player.id,share:50});s=act(s,{type:'AdvanceCalendar',target:'event'});const offer=s.offers.at(-1)!;
 s=act(s,{type:'OfferTerms',offerId:offer.id,terms:{wage,bonus:0,years:1,role:'rotation'}});const ledger=canonical(s.economy.ledger);s=act(s,{type:'ConfirmDeal',offerId:offer.id});
 expect(canonical(s.economy.ledger)).toBe(ledger);expect(s.contracts[player.id]!.ownerId).toBe(parent);expect(s.players.find(p=>p.id===player.id)!.clubId).toBe(s.clubId);expect(commitments(s,s.clubId)).toBe(ownWeekly+Math.floor(wage/2));expect(commitments(s,parent)).toBe(parentWeekly-Math.floor(wage/2));expect(budgets(s,parent).committed).toBe(parentWeekly);expect(validateCareer(s)).toEqual(s);
 expect(()=>act(s,{type:'ConfirmDeal',offerId:offer.id})).toThrow('OFFER_CHANGED');expect(()=>act({...s,clubId:clubs[1]!.id},{type:'SubmitOffer',playerId:player.id,fee:0})).toThrow('INVALID_COMMAND');
 while(s.round<14){while(s.date!==nextFixtureDate(s))s=act(s,{type:'AdvanceCalendar',target:'event'});let lineup=autoPick(s.players,s.clubId,s.tactics.formation,s.date);if(s.round===1&&!lineup.includes(player.id)){lineup=lineup.filter(id=>id!==lineup.find(id=>s.players.find(p=>p.id===id)!.role==='DEF'));lineup.push(player.id);}s=act(s,{type:'SelectLineup',lineup});s=fixture(s);}
 let loaded=validateCareer(JSON.parse(canonical(s)));const history=canonical(s.match);
 while(s.loans[0]!.status==='active'){const command={type:'AdvanceCalendar' as const,target:'event' as const,careerId:s.careerId,expectedRevision:s.revision,commandId:crypto.randomUUID()};const a=applyCommand(s,command),b=applyCommand(loaded,command);expect(canonical(a)).toBe(canonical(b));if(!a.ok||!b.ok)throw Error();s=a.value;loaded=b.value;}
 expect(s.date).toBe('2027-06-30');expect(s.loans[0]!.status).toBe('returned');expect(s.players.find(p=>p.id===player.id)!.clubId).toBe(parent);expect(s.lineup).not.toContain(player.id);expect(s.bench).not.toContain(player.id);expect(canonical(s.match)).toBe(history);expect(validateCareer(s)).toEqual(s);expect(canonical(loaded)).toBe(canonical(s));expect(()=>act(s,{type:'AdvanceCalendar',target:'event'})).toThrow('INVALID_COMMAND');expect(()=>act(s,{type:'SubmitOffer',playerId:player.id,fee:0})).toThrow('INVALID_COMMAND');
});
it('supports zero-contribution loans and refuses inconsistent ownership or altered loan fees',()=>{
 let s=fixture(initial());const player=s.players.find(p=>p.clubId===clubs[1]!.id&&p.role==='DEF')!;
 s=act(s,{type:'SubmitLoan',playerId:player.id,share:0});s=act(s,{type:'AdvanceCalendar',target:'event'});const offer=s.offers[0]!,wage=s.economy.wages[player.id]!,before=commitments(s,s.clubId);
 expect(()=>act(s,{type:'OfferTerms',offerId:offer.id,terms:{wage:wage+1,bonus:0,years:1,role:'rotation'}})).toThrow('PLAYER_TERMS');
 s=act(s,{type:'OfferTerms',offerId:offer.id,terms:{wage,bonus:0,years:1,role:'rotation'}});s=act(s,{type:'ConfirmDeal',offerId:offer.id});expect(commitments(s,s.clubId)).toBe(before);
 const broken=structuredClone(s);broken.contracts[player.id]!.ownerId=s.clubId;expect(()=>validateCareer(broken)).toThrow();const fee=structuredClone(s);fee.offers[0]!.fee=1;expect(()=>validateCareer(fee)).toThrow();
});
