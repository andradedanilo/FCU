import {occupiedPlaces} from '../packages/simulation/src/loans.ts';
import type {Career,Command,Role} from '../packages/contracts/src/index.ts';
import {desiredTerms,renewalError,ageOn} from '../packages/simulation/src/contracts.ts';
import {budgets} from '../packages/simulation/src/economy.ts';
import {overall} from '../packages/simulation/src/ratings.ts';
import {facilityCosts} from '../packages/simulation/src/facilities.ts';
export type PolicyAction<T=Command>=T extends Command?Omit<T,'careerId'|'commandId'|'expectedRevision'>:never;
export type PolicyMetrics={renewals:number;signings:number;upgrades:number;substitutions:number};
// A reproducible public-command manager, not privileged AI or an optimal strategy.
export function maintainSquad(current:()=>Career,act:(action:PolicyAction)=>void,metrics:PolicyMetrics){
 let state=current();if(state.match&&state.match.phase!=='finished')return;
 const club=state.clubId;
 for(const player of state.players.filter(p=>p.clubId===club&&!p.academy).sort((a,b)=>overall(b)-overall(a)||a.id.localeCompare(b.id))){
  state=current();const contract=state.contracts[player.id]!;
  if(contract.ownerId!==club||!contract.ends||contract.ends>`${state.season+1}-06-30`||ageOn(contract.birthDate,state.date)>=33)continue;
  const terms=desiredTerms(state,player),action={type:'RenewContract' as const,playerId:player.id,contractRevision:contract.revision,years:2,role:contract.role,...terms};
  if(!renewalError(state,action)){act(action);metrics.renewals++;}
 }
 const targets:Record<Role,number>={GK:2,DEF:8,MID:8,FWD:4};
 // Re-evaluate affordability after every signing; never bypass the registration boundary.
 for(const role of ['GK','DEF','MID','FWD'] as const){
  while(true){
   state=current();const squad=state.players.filter(p=>p.clubId===club&&!p.academy);
   if(squad.length>=30||squad.filter(p=>p.role===role).length>=targets[role]||state.date>=`${state.season+1}-06-30`)break;
   const bank=budgets(state,club);
   const player=state.players.filter(p=>p.clubId===null&&!p.academy&&p.role===role&&state.personnel.players[p.id]!.retired===null&&ageOn(state.contracts[p.id]!.birthDate,state.date)<32).sort((a,b)=>overall(b)-overall(a)||a.id.localeCompare(b.id)).find(p=>{const terms=desiredTerms(state,p);return bank.committed+terms.wage<=bank.wage&&bank.cash-terms.bonus>=13*(bank.committed+terms.wage)+4*bank.overhead;});
   if(!player)break;
   const terms={...desiredTerms(state,player),years:2,role:state.contracts[player.id]!.role};
   act({type:'SubmitOffer',playerId:player.id,fee:0});const offer=current().offers.at(-1)!;
   act({type:'OfferTerms',offerId:offer.id,terms});act({type:'ConfirmDeal',offerId:offer.id});metrics.signings++;
  }
 }
 state=current();const own=state.players.filter(p=>p.clubId===club),average=own.reduce((n,p)=>n+p.condition,0)/own.length;
 const training=average<85000?'light':'balanced';if(state.training!==training)act({type:'SetTraining',training});
 state=current();const facilities=state.facilities[club]!;
 if(state.date.slice(5)==='07-01'&&!facilities.construction){const kind=facilities.recovery<facilities.academy?'recovery':'academy',cost=facilityCosts[facilities[kind]];if(cost!==undefined&&budgets(state,club).transfer>=cost*2){act({type:'UpgradeFacility',kind});metrics.upgrades++;}}
}
export function respondToInjuries(current:()=>Career,act:(action:PolicyAction)=>void,metrics:PolicyMetrics){
 let state=current();const match=state.match;if(!match||match.phase==='finished')return;
 for(const out of [...match.pendingInjuries]){
  state=current();const live=state.match!,bench=live.home===state.clubId?live.homeBench:live.awayBench,outgoing=state.players.find(p=>p.id===out)!;
  const incoming=bench.map(id=>state.players.find(p=>p.id===id)!).filter(p=>(p.role==='GK')===(outgoing.role==='GK')&&!live.substitutions.some(change=>change.in===p.id||change.out===p.id)&&!live.injuries.some(injury=>injury.playerId===p.id)).sort((a,b)=>Number(b.role===outgoing.role)-Number(a.role===outgoing.role)||overall(b)-overall(a)||a.id.localeCompare(b.id))[0];
  if(!incoming)continue;
  // A failed command is still a policy bug unless the legal windows are exhausted.
  const changes=live.substitutions.filter(change=>change.clubId===state.clubId);if(changes.length>=5||new Set(changes.map(change=>change.tick)).size>=3)continue;
  act({type:'Substitute',out,in:incoming.id});metrics.substitutions++;
 }
 if(current().match!.pendingDismissal||current().match!.pendingInjuries.length)act({type:'AcknowledgeMatch'});
}
import {activeOffer,askingPrice,dealError,affordability,windowOpen} from '../packages/simulation/src/market.ts';
import {incomingBidError} from '../packages/simulation/src/outgoing.ts';
import type {Offer} from '../packages/contracts/src/index.ts';
export type TradingMetrics={promotions:number;paidSignings:number;sales:number;loanIns:number;loanOuts:number;feesPaid:number;feesReceived:number;attempted:string[]};
export function tradingMetrics():TradingMetrics{return {promotions:0,paidSignings:0,sales:0,loanIns:0,loanOuts:0,feesPaid:0,feesReceived:0,attempted:[]};}
export function manageMarket(current:()=>Career,act:(action:PolicyAction)=>void,metrics:TradingMetrics){
 let state=current();if(state.match&&state.match.phase!=='finished'||state.date>=`${state.season+1}-06-30`)return;
 for(const id of state.offers.filter(o=>activeOffer(o)&&(o.buyerId===state.clubId||o.sellerId===state.clubId)).map(o=>o.id)){
  state=current();const offer=state.offers.find(o=>o.id===id)!;
  if(offer.sellerId===state.clubId&&offer.status==='submitted'&&offer.responseDate<=state.date){const accept=!incomingBidError(state,offer);act({type:'RespondBid',offerId:id,accept});if(accept){if(offer.loanShare===null){metrics.sales++;metrics.feesReceived+=offer.fee;}else metrics.loanOuts++;}continue;}
  if(offer.buyerId!==state.clubId||!['accepted','countered'].includes(offer.status))continue;
  const player=state.players.find(p=>p.id===offer.playerId)!,terms={...(offer.loanShare===null?desiredTerms(state,player):{wage:state.economy.wages[player.id]!,bonus:0}),years:2,role:state.contracts[player.id]!.role};
  if(dealError(state,{...offer,terms})){act({type:'WithdrawOffer',offerId:id});continue;}
  if(offer.status==='countered')act({type:'AcceptOffer',offerId:id});act({type:'OfferTerms',offerId:id,terms});act({type:'ConfirmDeal',offerId:id});
  if(offer.loanShare===null){metrics.paidSignings++;metrics.feesPaid+=offer.fee;}else metrics.loanIns++;
 }
 state=current();const key=`${state.season}/${state.clubId}`;
 if(!metrics.attempted.includes(key+'/promote')){
  const player=state.players.filter(p=>p.clubId===state.clubId&&p.academy&&state.personnel.players[p.id]!.potential>=60).sort((a,b)=>overall(b)-overall(a)||a.id.localeCompare(b.id))[0];
  if(player){const action={type:'PromoteAcademy' as const,playerId:player.id,contractRevision:state.contracts[player.id]!.revision,years:3,role:'prospect' as const,...desiredTerms(state,player)};if(!renewalError(state,action)){act(action);metrics.promotions++;metrics.attempted.push(key+'/promote');}}
 }
 state=current();if(!windowOpen(state.date))return;
 const review=key+'/review/'+state.date.slice(0,7)+'/'+Math.floor((Number(state.date.slice(8))-1)/7);
 if(metrics.attempted.includes(review))return;metrics.attempted.push(review);
 for(const kind of ['sale','loan'] as const){
  if(metrics.attempted.includes(key+'/'+kind))continue;
  state=current();const role=kind==='sale'?'MID':'DEF',group=state.players.filter(p=>p.clubId===state.clubId&&!p.academy&&p.role===role&&state.contracts[p.id]!.ownerId===state.clubId&&!p.transferListing&&!state.loans.some(l=>l.playerId===p.id&&l.status==='active'));
  const player=group.sort((a,b)=>overall(b)-overall(a)||a.id.localeCompare(b.id)).find(p=>kind==='sale'||state.contracts[p.id]!.ends!>=`${state.season+1}-06-30`);
  if(group.length>4&&player){act({type:'SetTransferListing',playerId:player.id,listing:{kind,fee:kind==='sale'?Math.round(askingPrice(state,player)/2):0,share:50}});metrics.attempted.push(key+'/'+kind);}
 }
 for(const kind of ['buy','borrow'] as const){
  if(metrics.attempted.includes(key+'/'+kind))continue;
  state=current();const bank=budgets(state,state.clubId),occupied=occupiedPlaces(state,state.clubId);if(occupied>=30)continue;
  const depth=new Map<Career['clubId'],{size:number;keepers:number}>();for(const p of state.players)if(p.clubId&&!p.academy){const row=depth.get(p.clubId)??{size:0,keepers:0};row.size++;row.keepers+=Number(p.role==='GK');depth.set(p.clubId,row);}
  const candidates=state.players.filter(p=>p.clubId!==null&&p.clubId!==state.clubId&&!p.academy&&p.role!=='GK'&&state.personnel.players[p.id]!.retired===null&&!state.loans.some(l=>l.playerId===p.id&&l.status==='active')&&!state.offers.some(o=>o.playerId===p.id&&o.buyerId===state.clubId&&activeOffer(o))).sort((a,b)=>overall(b)-overall(a)||a.id.localeCompare(b.id));
  for(const player of candidates){
   const fee=kind==='buy'?askingPrice(state,player):0;if(fee>bank.transfer/3)continue;
   const terms={...(kind==='buy'?desiredTerms(state,player):{wage:state.economy.wages[player.id]!,bonus:0}),years:2,role:state.contracts[player.id]!.role};
   const proposed:Offer={id:'00000000-0000-4000-8000-000000000001' as Offer['id'],playerId:player.id,buyerId:state.clubId,sellerId:player.clubId,contractRevision:state.contracts[player.id]!.revision,fee,loanShare:kind==='buy'?null:50,date:state.date,responseDate:state.date,expires:state.date,activation:null,buyerCounters:0,sellerCounters:0,status:'accepted',reason:null,terms};
   if(affordability(proposed,bank)||dealError(state,proposed,bank,{player,occupied,seller:player.clubId?depth.get(player.clubId)??null:null}))continue;
   act(kind==='buy'?{type:'SubmitOffer',playerId:player.id,fee}:{type:'SubmitLoan',playerId:player.id,share:50});metrics.attempted.push(key+'/'+kind);break;
  }
 }
}
