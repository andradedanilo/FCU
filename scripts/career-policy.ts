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
