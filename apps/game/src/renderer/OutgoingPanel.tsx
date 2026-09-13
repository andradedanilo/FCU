import {useState} from 'react';
import type {Career,Player,Command} from '../../../../packages/contracts/src/index.ts';
import {askingPrice,activeOffer} from '../../../../packages/simulation/src/market.ts';
import {incomingBidError} from '../../../../packages/simulation/src/outgoing.ts';
import {money,parseEuro} from '../../../../packages/presentation/src/money.ts';
import {text as t} from '../../../../packages/presentation/src/text.ts';
export type OutgoingAction=Omit<Extract<Command,{type:'SetTransferListing'}>,'commandId'|'careerId'|'expectedRevision'>|Omit<Extract<Command,{type:'RespondBid'}>,'commandId'|'careerId'|'expectedRevision'>;
export function OutgoingPanel({state,player,busy,command}:{state:Career;player:Player;busy:boolean;command:(action:OutgoingAction)=>Promise<boolean>}){
 const [kind,setKind]=useState<'sale'|'loan'>(player.transferListing?.kind??'sale'),[fee,setFee]=useState(String(askingPrice(state,player)/100)),[share,setShare]=useState<0|50|100>(player.transferListing?.share??100);
 if(player.academy)return null;
 const offers=state.offers.filter(o=>o.playerId===player.id&&o.sellerId===state.clubId&&activeOffer(o)),amount=parseEuro(fee);
 return <section aria-label={t.outgoingMarket}><h3>{t.outgoingMarket}</h3><p>{t.outgoingHint}</p>
 <label>{t.listingKind}<select disabled={busy} value={kind} onChange={e=>setKind(e.target.value as 'sale'|'loan')}><option value="sale">{t.sellPlayer}</option><option value="loan">{t.loanPlayer}</option></select></label>
 {kind==='sale'?<label>{t.askingFee}<input inputMode="decimal" disabled={busy} value={fee} onChange={e=>setFee(e.target.value)}/></label>:<label>{t.borrowerShare}<select disabled={busy} value={share} onChange={e=>setShare(Number(e.target.value) as 0|50|100)}>{[0,50,100].map(n=><option key={n} value={n}>{n}%</option>)}</select></label>}
 <button disabled={busy||(kind==='sale'&&amount===null)} onClick={()=>void command({type:'SetTransferListing',playerId:player.id,listing:{kind,fee:kind==='sale'?amount!:0,share}})}>{t.listPlayer}</button>
 {player.transferListing&&<><p>{t.listedFor}: {player.transferListing.kind==='sale'?`${t.sellPlayer} / ${money(player.transferListing.fee)}`:`${t.loanPlayer} / ${player.transferListing.share}%`}</p><button disabled={busy} onClick={()=>void command({type:'SetTransferListing',playerId:player.id,listing:null})}>{t.removeListing}</button></>}
 <h4>{t.incomingBids}</h4>{!offers.length&&<p>{t.noIncomingBids}</p>}{offers.map(offer=>{
  const action={type:'RespondBid' as const,offerId:offer.id,accept:true};
  const error=incomingBidError(state,offer);
  return <article key={offer.id}><strong>{state.clubs.find(c=>c.id===offer.buyerId)!.name}</strong><p>{offer.loanShare===null?`${t.fee}: ${money(offer.fee)}`:`${t.loanPlayer} / ${t.borrowerShare}: ${offer.loanShare}%`} / {t.offerExpires}: {offer.expires}</p>{offer.terms&&<p>{t.weeklyWage}: {money(offer.terms.wage)} / {t.contractRoles[offer.terms.role]}</p>}{offer.status==='queued'?<p>{t.dealQueued}: {offer.activation}</p>:<>{error&&<p>{t.errors[error]}</p>}<button disabled={busy||!!error} onClick={()=>void command(action)}>{t.acceptSale}</button><button disabled={busy||offer.responseDate>state.date} onClick={()=>void command({...action,accept:false})}>{t.rejectBid}</button></>}</article>;
 })}</section>;
}
