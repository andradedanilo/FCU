import {useState} from 'react';
import type {Career,Command,Player,Contract} from '../../../../packages/contracts/src/index.ts';
import {askingPrice,activeOffer,dealError,nextWindow,windowOpen} from '../../../../packages/simulation/src/market.ts';
import {desiredTerms,contractEnd} from '../../../../packages/simulation/src/contracts.ts';
import {budgets} from '../../../../packages/simulation/src/economy.ts';
import {money,parseEuro} from '../../../../packages/presentation/src/money.ts';
import {text as t} from '../../../../packages/presentation/src/text.ts';
import s from './ContractsMenu.module.css';
type Payload<T>=T extends Command?Omit<T,'careerId'|'commandId'|'expectedRevision'>:never;
export type MarketAction=Payload<Extract<Command,{type:'SubmitOffer'|'CounterOffer'|'AcceptOffer'|'OfferTerms'|'ConfirmDeal'|'WithdrawOffer'}>>;
export function OfferPanel({state,player,busy,command}:{state:Career;player:Player;busy:boolean;command:(action:MarketAction)=>Promise<boolean>}){
 const offer=state.offers.filter(o=>o.playerId===player.id&&o.buyerId===state.clubId).at(-1);
 const [fee,setFee]=useState(String(askingPrice(state,player)/100)),[wage,setWage]=useState(String(desiredTerms(state,player).wage/100)),[years,setYears]=useState(2),[role,setRole]=useState<Contract['role']>(state.contracts[player.id]!.role);
 const cents=parseEuro(fee),salary=parseEuro(wage),bank=budgets(state,state.clubId);
 const terms={years,wage:salary??0,bonus:4*(salary??0),role};
 const error=offer&&offer.status==='accepted'?(salary===null?'PLAYER_TERMS':dealError(state,{...offer,terms})):offer?.status==='ready'?dealError(state,offer):null;
 return <><h3>{player.name}</h3><p>{t.askingPrice}: {money(askingPrice(state,player))}</p>
 {offer&&<div className={s.review} role="status"><strong>{t.offerStatuses[offer.status]}</strong><span>{offer.reason?t.offerReasons[offer.reason]:offer.status==='completed'?t.signedHint:offer.status==='queued'?`${t.queuedHint} ${offer.activation}`:`${t.expires}: ${offer.expires}`}</span></div>}
 {(!offer||!activeOffer(offer))&&player.clubId!==state.clubId&&<><label>{t.offerFee}<input disabled={busy||player.clubId===null} inputMode="decimal" value={fee} onChange={e=>setFee(e.target.value)}/></label><button disabled={busy||cents===null} onClick={()=>void command({type:'SubmitOffer',playerId:player.id,fee:cents??0})}>{player.clubId===null?t.startTerms:t.submitOffer}</button></>}
 {offer?.status==='submitted'&&<p>{t.responds}: {offer.responseDate}</p>}
 {offer?.status==='countered'&&<><p>{t.transferFee}: {money(offer.fee)}</p><button disabled={busy} onClick={()=>void command({type:'AcceptOffer',offerId:offer.id})}>{t.acceptFee}</button>{offer.buyerCounters<2&&<><label>{t.offerFee}<input disabled={busy} inputMode="decimal" value={fee} onChange={e=>setFee(e.target.value)}/></label><button disabled={busy||cents===null} onClick={()=>void command({type:'CounterOffer',offerId:offer.id,fee:cents??0})}>{t.counterOffer}</button></>}</>}
 {offer?.status==='accepted'&&<><div className={s.fields}><label>{t.weeklyOffer}<input disabled={busy} inputMode="decimal" value={wage} onChange={e=>setWage(e.target.value)}/></label><label>{t.contractYears}<select disabled={busy} value={years} onChange={e=>setYears(Number(e.target.value))}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} / {contractEnd(state.date,n)}</option>)}</select></label><label>{t.promisedRole}<select disabled={busy} value={role} onChange={e=>setRole(e.target.value as Contract['role'])}>{(['starter','rotation','prospect'] as const).map(r=><option key={r} value={r}>{t.contractRoles[r]}</option>)}</select></label></div><p>{t.signingBonus}: {money(terms.bonus)}</p><button disabled={busy||!!error} onClick={()=>void command({type:'OfferTerms',offerId:offer.id,terms})}>{t.reviewDeal}</button></>}
 {offer?.status==='ready'&&<><div className={s.review}><p>{t.transferFee}<b>{money(offer.fee)}</b></p><p>{t.signingBonus}<b>{money(offer.terms!.bonus)}</b></p><p>{t.weeklyWages}<b>{money(bank.weekly+offer.terms!.wage)} / {money(bank.wage)}</b></p><p>{t.cashAfter}<b>{money(bank.cash-offer.fee-offer.terms!.bonus)}</b></p><p>{t.reservedCash}<b>{money(13*(bank.weekly+offer.terms!.wage)+4*bank.overhead)}</b></p><p>{t.contractUntil}<b>{contractEnd(offer.sellerId!==null&&!windowOpen(state.date)?nextWindow(state.date):state.date,offer.terms!.years)}</b></p><p>{t.promisedRole}<b>{t.contractRoles[offer.terms!.role]}</b></p></div>{offer.sellerId!==null&&!windowOpen(state.date)&&<p>{t.queuedHint} {nextWindow(state.date)}</p>}<button disabled={busy||!!error} onClick={()=>void command({type:'ConfirmDeal',offerId:offer.id})}>{t.confirmDeal}</button></>}
 {error&&<p role="status">{t.errors[error]}</p>}
 {offer&&activeOffer(offer)&&<button disabled={busy} onClick={()=>void command({type:'WithdrawOffer',offerId:offer.id})}>{t.withdrawOffer}</button>}
 <p>{t.transferHint}</p></>;
}
