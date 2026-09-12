import type {Career,ClubId} from '../../contracts/src/index.ts';
import {autoPick,pickBench} from './selection.ts';
import {validDate} from './availability.ts';
export function loanEnd(date:string){const year=Number(date.slice(0,4));return `${year+(date.slice(5)>='07-01'?1:0)}-06-30`;}
export function occupiedPlaces(state:Career,club:ClubId){return state.players.filter(p=>p.clubId===club&&!p.academy).length+state.loans.filter(l=>l.parent===club&&l.status==='active').length;}
export function nextLoanDate(state:Career){return state.loans.filter(l=>l.status==='active'&&l.ends>state.date).map(l=>l.ends).sort()[0]??null;}
export function returnLoans(state:Career){
 let changed=false,selection=false;
 for(const loan of state.loans){
  if(loan.status!=='active'||loan.ends>state.date)continue;
  const player=state.players.find(p=>p.id===loan.playerId)!;player.clubId=loan.parent;state.contracts[player.id]!.revision++;loan.status='returned';changed=true;
  if(loan.borrower===state.clubId)selection=true;
  for(const offer of state.offers)if(offer.playerId===player.id&&['submitted','countered','accepted','ready','queued'].includes(offer.status)){offer.status='rejected';offer.reason='ownership';offer.activation=null;}
 }
 if(selection){state.lineup=autoPick(state.players,state.clubId,state.tactics.formation,state.date);state.bench=pickBench(state.players,state.clubId,state.lineup,state.date);}
 return changed;
}
export function validateLoans(state:Career){
 const ids=new Set<string>(),active=new Set<string>();
 for(const loan of state.loans){
  const player=state.players.find(p=>p.id===loan.playerId),contract=state.contracts[loan.playerId],offer=state.offers.find(o=>o.id===loan.id);
  if(ids.has(loan.id)||!player||!contract||loan.parent===loan.borrower||![loan.parent,loan.borrower].every(id=>state.clubs.some(c=>c.id===id))||!validDate(loan.ends)||!offer||offer.status!=='completed'||offer.loanShare!==loan.share||offer.playerId!==loan.playerId||offer.buyerId!==loan.borrower||offer.sellerId!==loan.parent)throw Error('INVALID_SAVE');
  if(loan.status==='active'){
   if(active.has(player.id)||loan.ends<=state.date||contract.ownerId!==loan.parent||player.clubId!==loan.borrower||!contract.ends||contract.ends<loan.ends)throw Error('INVALID_SAVE');active.add(player.id);
  }else if(loan.ends>state.date)throw Error('INVALID_SAVE');
  ids.add(loan.id);
 }
 if(state.clubs.some(c=>occupiedPlaces(state,c.id)>30))throw Error('INVALID_SAVE');
}
