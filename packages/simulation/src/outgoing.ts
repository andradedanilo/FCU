import type {Career,Command,FailureCode,Offer} from '../../contracts/src/index.ts';
import {activeOffer,dealError,register,nextWindow,windowOpen} from './market.ts';
import {loanEnd} from './loans.ts';
export function incomingBidError(state:Career,offer:Offer):FailureCode|null{
 if(offer.sellerId!==state.clubId||offer.status!=='submitted'||offer.expires<=state.date||offer.responseDate>state.date)return 'OFFER_CHANGED';
 return dealError(state,offer);
}
type Outgoing=Extract<Command,{type:'SetTransferListing'|'RespondBid'}>;
export function outgoingCommand(state:Career,action:Outgoing):FailureCode|null{
 if(state.match&&state.match.phase!=='finished')return 'INVALID_COMMAND';
 if(action.type==='SetTransferListing'){
  const player=state.players.find(p=>p.id===action.playerId),contract=state.contracts[action.playerId];
  if(!player||player.academy||player.clubId!==state.clubId||contract?.ownerId!==state.clubId||state.personnel.players[player.id]!.retired!==null||state.loans.some(l=>l.playerId===player.id&&l.status==='active'))return 'INVALID_COMMAND';
  if(action.listing?.kind==='loan'&&(!contract.ends||contract.ends<loanEnd(state.date)||loanEnd(state.date)<=state.date))return 'PLAYER_TERMS';
  if(action.listing)player.transferListing={...action.listing};else delete player.transferListing;
  // Changing the listing withdraws unaccepted bids; an already confirmed queued deal remains binding.
  for(const offer of state.offers)if(offer.playerId===player.id&&offer.sellerId===state.clubId&&activeOffer(offer)&&offer.status!=='queued'){offer.status='rejected';offer.reason='price';}
  return null;
 }
 const offer=state.offers.find(o=>o.id===action.offerId&&o.sellerId===state.clubId);
 if(!offer||offer.status!=='submitted'||offer.expires<=state.date||offer.responseDate>state.date)return 'OFFER_CHANGED';
 if(!action.accept){offer.status='rejected';offer.reason='price';return null;}
 const error=incomingBidError(state,offer);if(error)return error;
 if(!windowOpen(state.date)){offer.status='queued';offer.activation=nextWindow(state.date);return null;}
 return register(state,offer);
}
