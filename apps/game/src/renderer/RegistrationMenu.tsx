import {useRef,useState} from 'react';
import {useModal} from './input.ts';
import type {Career,PlayerId} from '../../../../packages/contracts/src/index.ts';
import {text as t} from '../../../../packages/presentation/src/text.ts';
import {overall} from '../../../../packages/simulation/src/ratings.ts';
import s from './Substitutions.module.css';

export function RegistrationMenu({state,busy,confirm,close}:{state:Career;busy:boolean;confirm:(ids:PlayerId[])=>Promise<boolean>;close:()=>void}){
  const squad=state.players.filter(p=>p.clubId===state.clubId&&!p.academy);
  const [draft,setDraft]=useState(squad.filter(p=>p.registered).map(p=>p.id));const dialog=useRef<HTMLDialogElement>(null);useModal(dialog);
  const capacity=30-state.loans.filter(l=>l.parent===state.clubId&&l.status==='active').length;
  return <dialog ref={dialog} className={s.dialog} aria-label={t.registration} onCancel={e=>{if(busy)e.preventDefault();else close();}}><header><h2>{t.registration}</h2><button disabled={busy} onClick={close}>{t.close}</button></header><p>{t.registrationHint}</p><p>{draft.length}/{capacity} {t.activePlayers}</p><div className={s.lists}>{(['GK','outfield'] as const).map(role=><section key={role}><h3>{role==='GK'?t.keeper:t.outfield}</h3><div>{squad.filter(p=>role==='GK'?p.role==='GK':p.role!=='GK').map(p=><button key={p.id} disabled={busy} aria-pressed={draft.includes(p.id)} onClick={()=>setDraft(draft.includes(p.id)?draft.filter(id=>id!==p.id):[...draft,p.id])}><small>{p.role}</small><span>{p.name}</span><b>{overall(p)}</b></button>)}</div></section>)}</div><footer><button disabled={busy||draft.length>capacity||draft.length<12||squad.filter(p=>p.role==='GK'&&draft.includes(p.id)).length<2} onClick={()=>void confirm(draft).then(ok=>{if(ok)close();})}>{t.confirmRegistration}</button></footer></dialog>;
}
