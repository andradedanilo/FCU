import {seasonComplete} from './competition.ts';
import type {Career,ClubId,Player,Role,Offer} from '../../contracts/src/index.ts';
import {marketCommand,affordability,askingPrice,activeOffer,dealError,register,windowOpen,nextWindow} from './market.ts';
import {desiredTerms,ageOn} from './contracts.ts';
import {estimate} from './scouting.ts';
import {monday,budgets} from './economy.ts';
import {stream} from './rng.ts';
const targetSquad={GK:2,DEF:8,MID:8,FWD:4} as const;
function rejection(error:string):Offer['reason'] {return error==='WAGE_BUDGET'?'wages':error==='INSUFFICIENT_FUNDS'?'funds':error==='REPUTATION'?'reputation':error==='OFFER_CHANGED'?'ownership':'squad';}
function terms(state:Career,player:Player){return {...desiredTerms(state,player),years:2,role:state.contracts[player.id]!.role};}
function identifier(state:Career,club:ClubId,index:number){
 const hex=[0,1,2,3].map(n=>stream(state.seed,`recruit/${state.date}/${club}/${index}/${n}`).toString(16).padStart(8,'0')).join('');
 return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-8${hex.slice(17,20)}-${hex.slice(20)}`;
}
export function recruit(state:Career){
 if(state.match&&state.match.phase!=='finished')return;
 // Daily responses use the same contract, wage, cash and registration boundary as human deals.
 for(const offer of state.offers){
  if(offer.buyerId===state.clubId||!['accepted','countered'].includes(offer.status))continue;
  const player=state.players.find(p=>p.id===offer.playerId)!;offer.terms=terms(state,player);
  const error=dealError(state,offer);
  if(error){offer.status='rejected';offer.reason=rejection(error);continue;}
  if(offer.sellerId!==null&&!windowOpen(state.date)){offer.status='queued';offer.activation=nextWindow(state.date);}else register(state,offer);
 }
 if(!monday(state.date)||seasonComplete(state)||!windowOpen(state.date))return;
 for(const club of [...state.clubs].sort((a,b)=>a.id<b.id?-1:1)){
  if(club.id===state.clubId)continue;
  const existing=state.offers.filter(o=>o.buyerId===club.id&&o.date===state.date).length;
  for(let slot=existing;slot<2;slot++){
   const squad=state.players.filter(p=>p.clubId===club.id&&!p.academy);
   const pending=state.offers.filter(o=>o.buyerId===club.id&&activeOffer(o));
   const deficits=(Object.keys(targetSquad) as Role[]).map(role=>({role,missing:targetSquad[role]-squad.filter(p=>p.role===role).length-pending.filter(o=>state.players.find(p=>p.id===o.playerId)!.role===role).length})).filter(d=>d.missing>0).sort((a,b)=>b.missing-a.missing);
   if(!deficits.length)break;
   const role=deficits[0]!.role,view={...state,clubId:club.id},bank=budgets(state,club.id);
   const candidates=state.players.filter(p=>p.clubId!==club.id&&p.clubId!==state.clubId&&!p.academy&&p.role===role&&ageOn(state.contracts[p.id]!.birthDate,state.date)<34&&!pending.some(o=>o.playerId===p.id)).map(player=>{const ability=estimate(view,player,3);return {player,ability:ability.low+ability.high,age:ageOn(state.contracts[player.id]!.birthDate,state.date)};}).sort((a,b)=>b.ability-a.ability||a.age-b.age||(a.player.id<b.player.id?-1:1)).map(entry=>entry.player);
   const id=identifier(state,club.id,slot);
   let selected:Player|undefined;
   for(const player of candidates){const proposed:Offer={id:id as Offer['id'],playerId:player.id,buyerId:club.id,sellerId:player.clubId,contractRevision:state.contracts[player.id]!.revision,fee:askingPrice(state,player),loanShare:null,date:state.date,responseDate:state.date,expires:state.date,activation:null,buyerCounters:0,sellerCounters:0,status:'accepted',reason:null,terms:terms(state,player)};if(!affordability(proposed,bank)&&!dealError(state,proposed,bank)){selected=player;break;}}
   if(!selected)break;
   const error=marketCommand(state,{type:'SubmitOffer',playerId:selected.id,fee:askingPrice(state,selected),careerId:state.careerId,expectedRevision:state.revision,commandId:id},club.id);
   if(error)break;
   const offer=state.offers.at(-1)!;
   if(offer.status==='accepted'){offer.terms=terms(state,selected);register(state,offer);}
  }
 }
}
