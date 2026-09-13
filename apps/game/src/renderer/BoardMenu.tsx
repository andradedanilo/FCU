import {useRef} from 'react';
import type {Career} from '../../../../packages/contracts/src/index.ts';
import {money} from '../../../../packages/presentation/src/money.ts';
import {text as t} from '../../../../packages/presentation/src/text.ts';
import {useModal} from './input.ts';
import s from './FinanceMenu.module.css';
export function BoardMenu({state,busy,close,assisted,job,retire,newCareer}:{state:Career;busy:boolean;close:()=>void;assisted:(enabled:boolean)=>void;job:(club:Career['clubId'])=>void;retire:()=>void;newCareer:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);useModal(dialog);const board=state.board,club=board.clubs[state.clubId]!;
 return <dialog ref={dialog} className={s.dialog} aria-label={t.board} onCancel={e=>{if(board.status!=='employed')e.preventDefault();else close();}}><header><h2>{t.board}</h2>{board.status==='employed'&&<button onClick={close}>{t.close}</button>}</header><div className={s.metrics}><div><span>{t.confidence}</span><strong>{club.confidence}/100</strong></div><div><span>{t.seasonObjective}</span><strong>{t.finishTop} {club.target}</strong></div></div><p>{t.boardHint}</p>{club.negativeSince&&<p>{t.debtWarning} {club.negativeSince}</p>}{club.loan&&<p>{t.boardLoan}: {money(club.loan.remaining)} / {52-club.loan.paid} {t.paymentsLeft}</p>}
 {board.status==='employed'?<label><input type="checkbox" checked={board.assisted} disabled={busy} onChange={e=>assisted(e.target.checked)}/>{t.assistedMode}</label>:board.status==='dismissed'?<section><h3>{t.dismissedManager}</h3><p>{t.jobHint}</p>{board.vacancies.map(id=><button key={id} disabled={busy} onClick={()=>job(id)}>{t.acceptJob} / {state.clubs.find(c=>c.id===id)!.name}</button>)}<button disabled={busy} onClick={retire}>{t.retireManager}</button></section>:<section><h3>{t.retiredManager}</h3><button onClick={newCareer}>{t.startGame}</button></section>}
 <h3>{t.managerHistory}</h3><ul>{board.history.map((h,i)=><li key={i}>{state.clubs.find(c=>c.id===h.clubId)!.name} / {h.from} - {h.to} / {t.managerReasons[h.reason]}</li>)}</ul></dialog>;
}
