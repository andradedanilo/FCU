import {useRef,useState} from 'react';
import type {Career,Command,Player,Contract} from '../../../../packages/contracts/src/index.ts';
import {ageOn,contractEnd,desiredTerms,renewalError} from '../../../../packages/simulation/src/contracts.ts';
import {budgets} from '../../../../packages/simulation/src/economy.ts';
import {money,parseEuro} from '../../../../packages/presentation/src/money.ts';
import {text as t} from '../../../../packages/presentation/src/text.ts';
import {useModal} from './input.ts';
import s from './ContractsMenu.module.css';
type Renewal=Omit<Extract<Command,{type:'RenewContract'}>,'careerId'|'commandId'|'expectedRevision'>;
export function ContractsMenu({state,busy,confirm,close}:{state:Career;busy:boolean;confirm:(action:Renewal)=>Promise<boolean>;close:()=>void}){
 const players=state.players.filter(p=>p.clubId===state.clubId&&!p.academy);
 const draftFor=(p:Player)=>({id:p.id,wage:String(desiredTerms(state,p).wage/100),years:Math.min(5,Number(state.contracts[p.id]!.ends!.slice(0,4))-Number(state.date.slice(0,4))+1),role:state.contracts[p.id]!.role});
 const [draft,setDraft]=useState(()=>draftFor(players[0]!));const [review,setReview]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null);useModal(dialog);
 const player=players.find(p=>p.id===draft.id)!,contract=state.contracts[player.id]!,wage=parseEuro(draft.wage);
 const action:Renewal={type:'RenewContract',playerId:player.id,contractRevision:contract.revision,years:draft.years,wage:wage??0,bonus:4*(wage??0),role:draft.role};
 const error=wage===null?'PLAYER_TERMS':renewalError(state,action),bank=budgets(state,state.clubId);
 const weekly=bank.weekly-state.economy.wages[player.id]!+(wage??0);
 return <dialog ref={dialog} className={s.dialog} aria-label={t.contracts} onCancel={close}><header><h2>{t.contracts}</h2><button disabled={busy} onClick={close}>{t.close}</button></header>
  <div className={s.body}><div className={s.players} role="group" aria-label={t.contractPlayers}>{players.map(p=><button key={p.id} disabled={busy||review} aria-pressed={p.id===draft.id} onClick={()=>setDraft(draftFor(p))}><strong>{p.name}</strong><small>{p.role} / {state.contracts[p.id]!.ends}</small><span>{money(state.economy.wages[p.id]!)}</span></button>)}</div>
  <section className={s.terms}><h3>{player.name}</h3><p>{t.age}: {ageOn(contract.birthDate,state.date)} / {t.contractUntil}: {contract.ends}</p><p>{t.currentWage}: {money(state.economy.wages[player.id]!)}</p>
   <div className={s.fields}><label>{t.weeklyOffer}<input inputMode="decimal" disabled={busy||review} value={draft.wage} onChange={e=>setDraft({...draft,wage:e.target.value})}/></label>
   <label>{t.contractYears}<select disabled={busy||review} value={draft.years} onChange={e=>setDraft({...draft,years:Number(e.target.value)})}>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} / {contractEnd(state.date,n)}</option>)}</select></label>
   <label>{t.promisedRole}<select disabled={busy||review} value={draft.role} onChange={e=>setDraft({...draft,role:e.target.value as Contract['role']})}>{(['starter','rotation','prospect'] as const).map(role=><option key={role} value={role}>{t.contractRoles[role]}</option>)}</select></label></div>
   <div className={s.review}><p>{t.signingBonus}: <b>{money(action.bonus)}</b></p><p>{t.weeklyWages}: <b>{money(weekly)} / {money(bank.wage)}</b></p><p>{t.cashAfter}: <b>{money(bank.cash-action.bonus)}</b></p><p>{t.contractUntil}: <b>{contractEnd(state.date,draft.years)}</b></p></div>
   <p>{t.renewalHint}</p>{error&&<p role="status">{t.errors[error]}</p>}
   {review?<><strong>{t.renewalReview}</strong><div className={s.actions}><button disabled={busy} onClick={()=>setReview(false)}>{t.editTerms}</button><button disabled={busy||!!error} onClick={()=>void confirm(action).then(ok=>{if(ok)close();})}>{t.confirmRenewal}</button></div></>:<button disabled={busy||!!error} onClick={()=>setReview(true)}>{t.reviewRenewal}</button>}
  </section></div></dialog>;
}
