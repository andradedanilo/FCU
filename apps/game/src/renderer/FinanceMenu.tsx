import {money} from '../../../../packages/presentation/src/money.ts';
import {useRef,useState} from 'react';
import type {Career} from '../../../../packages/contracts/src/index.ts';
import {budgets} from '../../../../packages/simulation/src/economy.ts';
import {facilityCosts} from '../../../../packages/simulation/src/facilities.ts';
import {text as t} from '../../../../packages/presentation/src/text.ts';
import {useModal} from './input.ts';
import s from './FinanceMenu.module.css';
export function FinanceMenu({state,close,upgrade,busy}:{state:Career;close:()=>void;upgrade:(kind:'academy'|'recovery')=>void;busy:boolean}){
 const dialog=useRef<HTMLDialogElement>(null);useModal(dialog);
 const [page,setPage]=useState(0);const bank=budgets(state,state.clubId);
 const entries=state.economy.ledger.flatMap(entry=>{const posting=entry.postings.find(p=>p.account===state.clubId);return posting?[{...entry,amount:posting.amount}]:[];});
 let balance=0;const history=entries.map(entry=>({...entry,balance:balance+=entry.amount})).reverse();
 return <dialog ref={dialog} className={s.dialog} aria-label={t.finances} onCancel={close}>
  <header><div><p>{state.clubs.find(c=>c.id===state.clubId)!.name}</p><h2>{t.finances}</h2></div><button onClick={close}>{t.close}</button></header>
  <div className={s.metrics}>{[[t.cash,bank.cash],[t.transferBudget,bank.transfer],[t.weeklyWages,bank.weekly],[t.wageBudget,bank.wage]].map(([label,value])=><div key={label}><span>{label}</span><strong>{money(Number(value))}</strong></div>)}</div>
  <p className={s.explanation}>{t.financeEstimate}</p><p>{t.reserveFormula}: {money(bank.cash)} - 13 x {money(bank.committed)} - 4 x {money(bank.overhead)}.</p><p>{t.loanReserve}</p>
  <section><h3>{t.facilities}</h3><p>{t.facilityHint}</p><div className={s.metrics}>{(['academy','recovery'] as const).map(kind=>{const facility=state.facilities[state.clubId]!,cost=facilityCosts[facility[kind]];return <div key={kind}><h4>{t.facilityNames[kind]} / {t.level} {facility[kind]}</h4><p>{t.facilityEffects[kind]}</p>{facility.construction?.kind===kind?<strong>{t.readyOn} {facility.construction.due}</strong>:cost===undefined?<p>{t.maximumLevel}</p>:<button disabled={busy||!!facility.construction||bank.transfer<cost||!!(state.match&&state.match.phase!=='finished')} onClick={()=>upgrade(kind)}>{t.buildUpgrade} {money(cost)}</button>}</div>;})}</div></section>
  <section className={s.history}><h3>{t.ledger} / {state.season}-{state.season+1}</h3><p>{t.ledgerArchive}</p><nav aria-label={t.ledger}><button disabled={page===0} onClick={()=>setPage(page-1)}>{t.previousPage}</button> {page+1} / {Math.max(1,Math.ceil(history.length/50))} <button disabled={(page+1)*50>=history.length} onClick={()=>setPage(page+1)}>{t.nextPage}</button></nav><table><thead><tr><th>{t.date}</th><th>{t.transaction}</th><th>{t.amount}</th><th>{t.balance}</th></tr></thead><tbody>{history.slice(page*50,(page+1)*50).map(entry=><tr key={entry.id}><td>{entry.date}</td><td>{t.ledgerKind[entry.kind]}</td><td className={entry.amount<0?s.cost:s.income}>{money(entry.amount)}</td><td>{money(entry.balance)}</td></tr>)}</tbody></table></section>
 </dialog>;
}
