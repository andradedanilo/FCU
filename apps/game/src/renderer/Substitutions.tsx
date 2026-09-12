import {useModal} from './input.ts';
import {useRef,useState} from 'react';
import type {Career,PlayerId} from '../../../../packages/contracts/src/index.ts';
import {overall,substitutionWindows} from '../../../../packages/simulation/src/engine.ts';
import {text as t} from '../../../../packages/presentation/src/text.ts';
import s from './Substitutions.module.css';
export function Substitutions({state,busy,confirm,close}:{state:Career;busy:boolean;confirm:(out:PlayerId,incoming:PlayerId)=>Promise<boolean>;close:()=>void}) {
 const dialog=useRef<HTMLDialogElement>(null);
 const [out,setOut]=useState<PlayerId|null>(null);const [incoming,setIncoming]=useState<PlayerId|null>(null);
 useModal(dialog);
 const match=state.match!;const home=match.home===state.clubId;
 const lineup=home?match.homeLineup:match.awayLineup;const bench=home?match.homeBench:match.awayBench;
 const changes=match.substitutions.filter(c=>c.clubId===state.clubId);
 const available=bench.filter(id=>!lineup.includes(id)&&!changes.some(c=>c.out===id)&&!match.injuries.some(i=>i.playerId===id));
 const usedWindows=substitutionWindows(match,state.clubId);
 const allowed=changes.length<5&&(match.tick===45||changes.some(c=>c.tick===match.tick)||usedWindows<3);
 const outgoing=state.players.find(p=>p.id===out);
 async function submit(){if(out&&incoming&&await confirm(out,incoming)){setOut(null);setIncoming(null);}}
 return <dialog ref={dialog} className={s.dialog} onCancel={event=>{if(busy)event.preventDefault();else close();}} aria-label={t.substitutions}>
  <header><h2>{t.substitutions}</h2><button disabled={busy} onClick={close}>{t.close}</button></header>
  <p>{t.subHint}</p><div className={s.counts}><strong>{t.subCount}: {changes.length}/5</strong><strong>{t.windows}: {usedWindows}/3</strong><span>{match.tick}'</span></div>
  <div className={s.lists}>{([{title:t.onPitch,ids:lineup,selected:out,choose:(id:PlayerId)=>{setOut(id);setIncoming(null);},bench:false},{title:t.matchBench,ids:available,selected:incoming,choose:setIncoming,bench:true}]).map(group=><section key={group.title}><h3>{group.title}</h3><div role="group" aria-label={group.title}>{group.ids.map(id=>{const p=state.players.find(p=>p.id===id)!;const eligible=!group.bench||(outgoing&&(outgoing.role==='GK')===(p.role==='GK'));return <button key={id} aria-pressed={id===group.selected} disabled={busy||!allowed||!eligible||match.dismissed.includes(id)} onClick={()=>group.choose(id)}><small>{p.role}</small><span>{p.name}{match.dismissed.includes(id)?` / ${t.dismissed}`:match.injuries.some(i=>i.playerId===id)?` / ${t.unavailable}`:""}</span><b title={t.ability}>{overall(p)}</b><small title={t.condition}>{Math.round(match.condition[id]!/1000)}%</small></button>;})}</div></section>)}</div>
  <footer><button disabled={busy||!allowed||!out||!incoming} onClick={()=>void submit()}>{t.makeChange}</button></footer>
  {changes.length>0&&<ol className={s.log}>{changes.map(c=><li key={c.out}>{c.tick}' {state.players.find(p=>p.id===c.out)!.name} / {state.players.find(p=>p.id===c.in)!.name}</li>)}</ol>}
 </dialog>;
}
