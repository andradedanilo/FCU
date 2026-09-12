import {useEffect,useRef,useState} from 'react';
import type {Career,PlayerId} from '../../../../packages/contracts/src/index.ts';
import {overall,validBench} from '../../../../packages/simulation/src/engine.ts';
import {text as t} from '../../../../packages/presentation/src/text.ts';
import s from './Substitutions.module.css';
export function BenchMenu({state,busy,confirm,close}:{state:Career;busy:boolean;confirm:(ids:PlayerId[])=>Promise<boolean>;close:()=>void}){
 const [draft,setDraft]=useState(state.bench);const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{dialog.current?.showModal();},[]);
 const available=state.players.filter(p=>p.clubId===state.clubId&&!state.lineup.includes(p.id));
 return <dialog ref={dialog} className={s.dialog} aria-label={t.chooseBench} onCancel={e=>{if(busy)e.preventDefault();else close();}}><header><h2>{t.chooseBench}</h2><button disabled={busy} onClick={close}>{t.close}</button></header><p>{t.benchHint}</p><p className={s.counts}>{draft.length}/9 {t.selection}</p><div className={s.lists}>{(['GK','outfield'] as const).map(role=><section key={role}><h3>{role==='GK'?t.keeper:t.outfield}</h3><div>{available.filter(p=>role==='GK'?p.role==='GK':p.role!=='GK').map(p=><button key={p.id} disabled={busy} aria-pressed={draft.includes(p.id)} onClick={()=>setDraft(draft.includes(p.id)?draft.filter(id=>id!==p.id):[...draft,p.id])}><small>{p.role}</small><span>{p.name}</span><b>{overall(p)}</b></button>)}</div></section>)}</div><footer><button disabled={busy||!validBench(state.players,state.clubId,state.lineup,draft)} onClick={()=>{void confirm(draft).then(ok=>{if(ok)close();});}}>{t.confirmBench}</button></footer></dialog>;
}
