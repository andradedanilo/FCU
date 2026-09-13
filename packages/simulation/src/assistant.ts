import type {Career,Offer,Role} from '../../contracts/src/index.ts';
import {knownAbility} from './scouting.ts';
import {overall} from './ratings.ts';
import {desiredTerms} from './contracts.ts';
import {askingPrice,dealError,activeOffer} from './market.ts';
import {budgets} from './economy.ts';

// Derived advice uses current known information and never advances a random stream.
export function assistantReport(state:Career){
 const targets={GK:2,DEF:8,MID:8,FWD:4};
 const weaknesses=(Object.keys(targets) as Role[]).map(role=>{
  const players=state.players.filter(p=>p.clubId===state.clubId&&p.registered&&!p.academy&&p.role===role);
  return {role,count:players.length,target:targets[role],ability:Math.round(players.reduce((n,p)=>n+overall(p),0)/Math.max(1,players.length))};
 }).sort((a,b)=>(b.target-b.count)-(a.target-a.count)||a.ability-b.ability||a.role.localeCompare(b.role)).slice(0,2);
 const bank=budgets(state,state.clubId);
 const candidates=state.players.filter(p=>p.clubId!==state.clubId&&!p.academy&&state.personnel.players[p.id]!.retired===null&&!state.offers.some(o=>o.buyerId===state.clubId&&o.playerId===p.id&&activeOffer(o))).map(player=>({player,ability:knownAbility(state,player)})).sort((a,b)=>Number(weaknesses.some(w=>w.role===b.player.role))-Number(weaknesses.some(w=>w.role===a.player.role))||b.ability.low+b.ability.high-a.ability.low-a.ability.high||a.player.id.localeCompare(b.player.id));
 const suggestions: {playerId:Career['players'][number]['id'];fee:number;wage:number;low:number;high:number}[]=[];
 for(const {player,ability} of candidates){
  const terms={...desiredTerms(state,player),years:2,role:state.contracts[player.id]!.role};
  const proposal:Offer={id:'00000000-0000-4000-8000-000000000000' as Offer['id'],playerId:player.id,buyerId:state.clubId,sellerId:player.clubId,contractRevision:state.contracts[player.id]!.revision,fee:askingPrice(state,player),loanShare:null,date:state.date,responseDate:state.date,expires:state.date,activation:null,buyerCounters:0,sellerCounters:0,status:'accepted',reason:null,terms};
  if(!dealError(state,proposal,bank))suggestions.push({playerId:player.id,fee:proposal.fee,wage:terms.wage,...ability});
  if(suggestions.length===3)break;
 }
 return {date:state.date,weaknesses,suggestions};
}
