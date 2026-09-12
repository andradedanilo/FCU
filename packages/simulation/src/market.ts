import type {Career,ClubId,Player,PlayerId,Offer,OfferId,Command,FailureCode} from '../../contracts/src/index.ts';
import {addDays,validDate} from './availability.ts';
import {marketValue,desiredTerms,contractEnd} from './contracts.ts';
import {budgets,post} from './economy.ts';

export function freePlayers():Player[]{
 return (['GK','GK','DEF','DEF','DEF','DEF','MID','MID','MID','MID','FWD','FWD'] as const).map((role,i)=>({id:`player-00-${String(i+1).padStart(2,'0')}` as PlayerId,clubId:null,name:`${['Alex','Robin','Sam','Jamie','Morgan','Casey','Drew','Ellis','Jules','Riley','Taylor','Noel'][i]} Westbrook`,role,academy:false,condition:100000,morale:70,injuryUntil:null,leagueYellows:0,leagueBan:0,goalkeeping:role==='GK'?55+i:15,tackling:50+i,passing:50+i,shooting:50+i,pace:60,stamina:60,discipline:65}));
}
export const activeOffer=(offer:Offer)=>['submitted','countered','accepted','ready','queued'].includes(offer.status);
export function askingPrice(state:Career,player:Player){return player.clubId===null?0:Math.round(marketValue(state,player)*(state.contracts[player.id]!.role==='starter'?1.2:1));}
export function windowOpen(date:string){const md=date.slice(5);return md>='07-01'&&md<='08-31'||md>='01-01'&&md<='01-31';}
export function nextWindow(date:string){const year=Number(date.slice(0,4)),md=date.slice(5);return md<'07-01'?`${year}-07-01`:`${year+1}-01-01`;}
function ownership(state:Career,offer:Offer){return state.players.find(p=>p.id===offer.playerId)?.clubId===offer.sellerId&&state.contracts[offer.playerId]?.revision===offer.contractRevision;}
function sellerNeeds(state:Career,offer:Offer){
 if(offer.sellerId===null)return false;
 const others=state.players.filter(p=>p.clubId===offer.sellerId&&p.id!==offer.playerId&&!p.academy);
 return others.length<18||others.filter(p=>p.role==='GK').length<2;
}
export function dealError(state:Career,offer:Offer):FailureCode|null {
 if(!ownership(state,offer))return 'OFFER_CHANGED';
 if(sellerNeeds(state,offer))return 'SQUAD_NEED';
 if(state.match&&state.match.phase!=='finished')return 'INVALID_COMMAND';
 if(state.players.filter(p=>p.clubId===offer.buyerId&&!p.academy).length>=30)return 'SQUAD_FULL';
 const terms=offer.terms;if(!terms)return 'PLAYER_TERMS';
 const player=state.players.find(p=>p.id===offer.playerId)!;
 const roles={prospect:0,rotation:1,starter:2};
 if(terms.wage<desiredTerms(state,player).wage||terms.bonus<4*terms.wage||roles[terms.role]<roles[state.contracts[player.id]!.role])return 'PLAYER_TERMS';
 if(offer.sellerId!==null&&state.economy.clubs.find(c=>c.clubId===offer.buyerId)!.reputation*100<80*state.economy.clubs.find(c=>c.clubId===offer.sellerId)!.reputation)return 'REPUTATION';
 const bank=budgets(state,offer.buyerId),weekly=bank.weekly+terms.wage;
 if(weekly>bank.wage)return 'WAGE_BUDGET';
 if(bank.cash-offer.fee-terms.bonus<13*weekly+4*bank.overhead)return 'INSUFFICIENT_FUNDS';
 return null;
}
export function register(state:Career,offer:Offer):FailureCode|null {
 const error=dealError(state,offer);if(error)return error;
 const feeId=`transfer/${offer.id}`,bonusId=`signing/${offer.id}`;
 if(state.economy.ledger.some(e=>e.id===feeId||e.id===bonusId))return 'OFFER_CHANGED';
 if(offer.sellerId!==null&&offer.fee>0)post(state.economy,{id:feeId,date:state.date,kind:'transferFee',postings:[{account:offer.buyerId,amount:-offer.fee},{account:offer.sellerId,amount:offer.fee}]});
 post(state.economy,{id:bonusId,date:state.date,kind:'signingBonus',postings:[{account:offer.buyerId,amount:-offer.terms!.bonus},{account:'external',amount:offer.terms!.bonus}]});
 const player=state.players.find(p=>p.id===offer.playerId)!;player.clubId=offer.buyerId;
 state.economy.wages[player.id]=offer.terms!.wage;
 state.contracts[player.id]={...state.contracts[player.id]!,ownerId:offer.buyerId,ends:contractEnd(state.date,offer.terms!.years),role:offer.terms!.role,revision:offer.contractRevision+1};
 offer.status='completed';offer.activation=null;
 for(const rival of state.offers)if(rival.id!==offer.id&&rival.playerId===offer.playerId&&activeOffer(rival)){rival.status='rejected';rival.reason='competing';rival.activation=null;}
 return null;
}
type MarketCommand=Extract<Command,{type:'SubmitOffer'|'CounterOffer'|'AcceptOffer'|'OfferTerms'|'ConfirmDeal'|'WithdrawOffer'}>;
export function marketCommand(state:Career,action:MarketCommand,buyer:ClubId=state.clubId):FailureCode|null {
 if(action.type==='SubmitOffer'){
  const player=state.players.find(p=>p.id===action.playerId);
  if(!player||player.clubId===buyer||player.academy||state.offers.length>=5000||state.offers.some(o=>o.playerId===player.id&&o.buyerId===buyer&&activeOffer(o))||(player.clubId===null&&action.fee!==0))return 'INVALID_COMMAND';
  state.offers.push({id:action.commandId as OfferId,playerId:player.id,buyerId:buyer,sellerId:player.clubId,contractRevision:state.contracts[player.id]!.revision,fee:action.fee,date:state.date,responseDate:addDays(state.date,1),expires:addDays(state.date,7),activation:null,buyerCounters:0,sellerCounters:0,status:player.clubId===null?'accepted':'submitted',reason:null,terms:null});return null;
 }
 const offer=state.offers.find(o=>o.id===action.offerId&&o.buyerId===buyer);
 if(!offer||!activeOffer(offer)||!ownership(state,offer)||(offer.status!=='queued'&&state.date>=offer.expires))return 'OFFER_CHANGED';
 if(action.type==='WithdrawOffer'){offer.status='withdrawn';offer.activation=null;return null;}
 if(action.type==='CounterOffer'){
  if(offer.status!=='countered'||offer.buyerCounters>=2)return 'OFFER_CHANGED';
  offer.fee=action.fee;offer.buyerCounters++;offer.status='submitted';offer.responseDate=addDays(state.date,1);offer.expires=addDays(state.date,7);return null;
 }
 if(action.type==='AcceptOffer'){if(offer.status!=='countered')return 'OFFER_CHANGED';offer.status='accepted';return null;}
 if(action.type==='OfferTerms'){
  if(offer.status!=='accepted'&&offer.status!=='ready')return 'OFFER_CHANGED';
  offer.terms=action.terms;
  const error=dealError(state,offer);if(error)return error;
  offer.status='ready';return null;
 }
 if(offer.status!=='ready')return 'OFFER_CHANGED';
 const error=dealError(state,offer);if(error)return error;
 if(offer.sellerId!==null&&!windowOpen(state.date)){offer.status='queued';offer.activation=nextWindow(state.date);return null;}
 return register(state,offer);
}
export function nextMarketDate(state:Career){return state.offers.filter(activeOffer).flatMap(o=>o.status==='queued'?[o.activation!]:o.status==='submitted'?[o.responseDate,o.expires]:[o.expires]).filter(d=>d>state.date).sort()[0]??null;}
export function processMarket(state:Career){
 let changed=false;
 for(const offer of state.offers){
  if(!activeOffer(offer))continue;
  if(!ownership(state,offer)){offer.status='rejected';offer.reason='ownership';offer.activation=null;changed=true;continue;}
  if(offer.status==='queued'){
   if(offer.activation!<=state.date){const error=register(state,offer);if(error){offer.status='rejected';offer.activation=null;offer.reason=error==='WAGE_BUDGET'?'wages':error==='INSUFFICIENT_FUNDS'?'funds':error==='REPUTATION'?'reputation':'squad';}changed=true;}continue;
  }
  if(state.date>=offer.expires){offer.status='expired';changed=true;continue;}
  if(offer.status!=='submitted'||offer.responseDate>state.date)continue;
  changed=true;
  if(sellerNeeds(state,offer)){offer.status='rejected';offer.reason='squad';continue;}
  const asking=askingPrice(state,state.players.find(p=>p.id===offer.playerId)!);
  if(offer.fee>=asking)offer.status='accepted';
  else if(offer.sellerCounters<2){offer.fee=asking;offer.sellerCounters++;offer.status='countered';offer.expires=addDays(state.date,7);}
  else {offer.status='rejected';offer.reason='price';}
 }
 return changed;
}
export function validateMarket(state:Career){
 const clubs=state.clubs.map(c=>c.id),ids=new Set<string>();
 for(const offer of state.offers){
  if(ids.has(offer.id)||!state.players.some(p=>p.id===offer.playerId)||!clubs.includes(offer.buyerId)||(offer.sellerId!==null&&!clubs.includes(offer.sellerId))||offer.sellerId===offer.buyerId||[offer.date,offer.responseDate,offer.expires,...offer.activation?[offer.activation]:[]].some(d=>!validDate(d))||offer.date>state.date||offer.responseDate<=offer.date||offer.expires<=offer.date||(offer.sellerId===null&&offer.fee!==0))throw Error('INVALID_SAVE');
  if(activeOffer(offer)&&(!ownership(state,offer)||(offer.status!=='queued'&&offer.expires<=state.date)))throw Error('INVALID_SAVE');
  if((offer.status==='queued')!==(offer.activation!==null)||(offer.status==='queued'&&(!windowOpen(offer.activation!)||offer.activation!<=state.date))||(['ready','queued','completed'].includes(offer.status)&&!offer.terms))throw Error('INVALID_SAVE');
  if(activeOffer(offer)&&state.offers.some(other=>other.id!==offer.id&&other.playerId===offer.playerId&&other.buyerId===offer.buyerId&&activeOffer(other)))throw Error('INVALID_SAVE');
  if(offer.status==='completed'){
   const fee=state.economy.ledger.find(e=>e.id===`transfer/${offer.id}`),bonus=state.economy.ledger.find(e=>e.id===`signing/${offer.id}`);
   if(!bonus||bonus.kind!=='signingBonus'||bonus.postings[0].account!==offer.buyerId||bonus.postings[0].amount!==-offer.terms!.bonus||bonus.postings[1].account!=='external'||bonus.postings[1].amount!==offer.terms!.bonus||(offer.sellerId!==null&&offer.fee>0&&(!fee||fee.kind!=='transferFee'||fee.postings[0].account!==offer.buyerId||fee.postings[0].amount!==-offer.fee||fee.postings[1].account!==offer.sellerId||fee.postings[1].amount!==offer.fee)))throw Error('INVALID_SAVE');
  }
  ids.add(offer.id);
 }
}
