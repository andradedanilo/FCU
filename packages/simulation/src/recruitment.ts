import {seasonComplete} from './competition.ts';
import type {Career,ClubId,Player,PlayerId,Role,Offer} from '../../contracts/src/index.ts';
import {marketCommand,affordability,askingPrice,activeOffer,dealError,register,windowOpen,nextWindow} from './market.ts';
import {desiredTerms,ageOn} from './contracts.ts';
import {estimate} from './scouting.ts';
import {monday,budgets,budgetBook} from './economy.ts';
import {stream} from './rng.ts';
import {occupiedPlaces} from './loans.ts';
import {overall} from './ratings.ts';
// One transient ranking cache per worker. Its full key covers every ranking input;
// ownership and pending offers are filtered from current state after lookup.
let rankingKey='';
const rankings=new Map<ClubId,PlayerId[]>();
const targetSquad={GK:2,DEF:8,MID:8,FWD:4} as const;
function rejection(error:string):Offer['reason'] {return error==='WAGE_BUDGET'?'wages':error==='INSUFFICIENT_FUNDS'?'funds':error==='REPUTATION'?'reputation':error==='OFFER_CHANGED'?'ownership':'squad';}
function terms(state:Career,player:Player){if(player.transferListing?.kind==='loan')return {wage:state.economy.wages[player.id]!,bonus:0,years:1,role:state.contracts[player.id]!.role};return {...desiredTerms(state,player),years:2,role:state.contracts[player.id]!.role};}
function identifier(state:Career,club:ClubId,index:number){
 const hex=[0,1,2,3].map(n=>stream(state.seed,`recruit/${state.date}/${club}/${index}/${n}`).toString(16).padStart(8,'0')).join('');
 return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-8${hex.slice(17,20)}-${hex.slice(20)}`;
}
export function recruit(state:Career){
 if(state.match&&state.match.phase!=='finished')return;
 // Daily responses use the same contract, wage, cash and registration boundary as human deals.
 for(const offer of state.offers){
  if(offer.buyerId===state.clubId||offer.sellerId===state.clubId||!['accepted','countered'].includes(offer.status))continue;
  const player=state.players.find(p=>p.id===offer.playerId)!;offer.terms=terms(state,player);
  const error=dealError(state,offer);
  if(error){offer.status='rejected';offer.reason=rejection(error);continue;}
  if(offer.sellerId!==null&&!windowOpen(state.date)){offer.status='queued';offer.activation=nextWindow(state.date);}else register(state,offer);
 }
 if(!monday(state.date)||seasonComplete(state)||!windowOpen(state.date))return;
 const eligible=state.players.filter(p=>!p.academy&&state.personnel.players[p.id]!.retired===null&&ageOn(state.contracts[p.id]!.birthDate,state.date)<34);
 const listed=eligible.filter(p=>p.clubId===state.clubId&&p.transferListing);
 const key=`${state.seed}/${state.date.slice(0,4)}/`+eligible.map(p=>`${p.id}:${overall(p)}:${ageOn(state.contracts[p.id]!.birthDate,state.date)}`).join(',');
 if(key!==rankingKey){rankingKey=key;rankings.clear();}
 const banks=budgetBook(state);
 const current=new Map(eligible.map(p=>[p.id,p]));
 // Club transfers settle before this scan; only free agents register immediately below.
 const depth=new Map<ClubId,{size:number;keepers:number}>();
 for(const p of state.players)if(p.clubId&&!p.academy){const count=depth.get(p.clubId)??{size:0,keepers:0};count.size++;count.keepers+=Number(p.role==='GK');depth.set(p.clubId,count);}
 for(const club of [...state.clubs].sort((a,b)=>a.id<b.id?-1:1)){
  if(club.id===state.clubId)continue;
  let bank=banks.get(club.id)!;
  const existing=state.offers.filter(o=>o.buyerId===club.id&&o.date===state.date).length;
  for(let slot=existing;slot<2;slot++){
   const squad=state.players.filter(p=>p.clubId===club.id&&!p.academy);
   const pending=state.offers.filter(o=>o.buyerId===club.id&&activeOffer(o));
   const deficits=(Object.keys(targetSquad) as Role[]).map(role=>({role,missing:targetSquad[role]-squad.filter(p=>p.role===role).length-pending.filter(o=>state.players.find(p=>p.id===o.playerId)!.role===role).length})).filter(d=>d.missing>0).sort((a,b)=>b.missing-a.missing);
   if(!deficits.length){for(const role of Object.keys(targetSquad) as Role[]){const group=squad.filter(p=>p.role===role);if(group.length>=targetSquad[role]+1||pending.some(o=>state.players.find(p=>p.id===o.playerId)?.role===role))continue;const weakest=Math.min(...group.map(overall));if(listed.some(p=>p.role===role&&overall(p)>=weakest+3))deficits.push({role,missing:0});}}
   if(!deficits.length)break;
   const role=deficits[0]!.role,view={...state,clubId:club.id},occupied=occupiedPlaces(state,club.id);
   let ranked=rankings.get(club.id);
   if(!ranked){ranked=eligible.map(player=>{const ability=estimate(view,player,3);return {player,ability:ability.low+ability.high,age:ageOn(state.contracts[player.id]!.birthDate,state.date)};}).sort((a,b)=>b.ability-a.ability||a.age-b.age||(a.player.id<b.player.id?-1:1)).map(entry=>entry.player.id);rankings.set(club.id,ranked);}
   const candidates=ranked.map(id=>current.get(id)!).filter(p=>p.clubId!==club.id&&(p.clubId!==state.clubId||!!p.transferListing)&&p.role===role&&!pending.some(o=>o.playerId===p.id)&&(deficits[0]!.missing>0||(!!p.transferListing&&overall(p)>=Math.min(...squad.filter(q=>q.role===role).map(overall))+3)));
   const id=identifier(state,club.id,slot);
   let selected:Player|undefined;
   for(const player of candidates){const proposed:Offer={id:id as Offer['id'],playerId:player.id,buyerId:club.id,sellerId:player.clubId,contractRevision:state.contracts[player.id]!.revision,fee:player.transferListing?.kind==='loan'?0:askingPrice(state,player),loanShare:player.transferListing?.kind==='loan'?player.transferListing.share:null,date:state.date,responseDate:state.date,expires:state.date,activation:null,buyerCounters:0,sellerCounters:0,status:'accepted',reason:null,terms:terms(state,player)};if(!affordability(proposed,bank)&&!dealError(state,proposed,bank,{player,occupied,seller:player.clubId?depth.get(player.clubId)??null:null})){selected=player;break;}}
   if(!selected)break;
   const common={playerId:selected.id,careerId:state.careerId,expectedRevision:state.revision,commandId:id};
   const error=marketCommand(state,selected.transferListing?.kind==='loan'?{...common,type:'SubmitLoan',share:selected.transferListing.share}:{...common,type:'SubmitOffer',fee:askingPrice(state,selected)},club.id);
   if(error)break;
   const offer=state.offers.at(-1)!;
   if(offer.sellerId===state.clubId)offer.terms=terms(state,selected);
   if(offer.status==='accepted'){offer.terms=terms(state,selected);if(!register(state,offer)){bank=budgets(state,club.id);const count=depth.get(club.id)??{size:0,keepers:0};count.size++;count.keepers+=Number(selected.role==='GK');depth.set(club.id,count);}}
  }
 }
}
