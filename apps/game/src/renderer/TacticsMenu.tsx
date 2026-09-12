import {useEffect,useRef,useState} from 'react';
import {formationSchema,type Career,type Tactics,type PlayerId} from '../../../../packages/contracts/src/index.ts';
import {arrangeLineup,validLineup} from '../../../../packages/simulation/src/engine.ts';
import {text as t} from '../../../../packages/presentation/src/text.ts';
import s from './TacticsMenu.module.css';
export function TacticsMenu({state,store,draftLineup,busy,confirm,close}:{state:Career;store:(slot:number,tactics:Tactics|null)=>Promise<boolean>;draftLineup:PlayerId[];busy:boolean;confirm:(tactics:Tactics)=>Promise<boolean>;close:()=>void}) {
 const match=state.match&&state.match.tick<90?state.match:null;const home=match?.home===state.clubId;
 const initial=match?(home?match.homeTactics:match.awayTactics):state.tactics;
 const [feedback,setFeedback]=useState('');
 const [draft,setDraft]=useState<Tactics>({...initial});const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{dialog.current?.showModal();},[]);
 const lineup=match?(home?match.homeLineup:match.awayLineup):validLineup(state.players,state.clubId,draftLineup)?draftLineup:state.lineup;
 const slots=arrangeLineup(state.players,lineup,draft.formation);
 const groups=[{key:'mentality',options:['cautious','balanced','attacking'],hint:t.mentalityHint},{key:'tempo',options:['slow','normal','fast'],hint:t.tempoHint},{key:'pressing',options:['low','normal','high'],hint:t.pressingHint}] as const;
 return <dialog ref={dialog} className={s.dialog} aria-label={t.tactics} onCancel={e=>{if(busy)e.preventDefault();else close();}}>
  <header><h2>{t.tactics}</h2><button disabled={busy} onClick={close}>{t.close}</button></header><p>{t.tacticsHint}</p>
  <div className={s.body}><section><h3>{t.formation}</h3><div className={s.options} role="group" aria-label={t.formation}>{formationSchema.options.map(formation=><button key={formation} disabled={busy} aria-pressed={draft.formation===formation} onClick={()=>setDraft({...draft,formation})}>{formation}</button>)}</div>
  <div className={s.pitch}>{(['FWD','MID','DEF','GK'] as const).map(role=><div key={role}>{slots.filter(slot=>slot.role===role).map(({player})=><span key={player.id} className={player.role===role?undefined:s.mismatch} title={`${player.name}: ${player.role}`}><b>{player.id.slice(-2)}</b><small>{player.name.split(' ')[0]}</small></span>)}</div>)}</div>
  {slots.some(slot=>slot.role!==slot.player.role)&&<p className={s.warning}>{t.positionWarning}: {slots.filter(slot=>slot.role!==slot.player.role).map(slot=>`${slot.player.name} (${slot.player.role} / ${slot.role})`).join(', ')}</p>}</section>
  <section>{groups.map(group=><div className={s.control} key={group.key}><h3>{t[group.key]}</h3><div className={s.options} role="group" aria-label={t[group.key]}>{group.options.map(value=><button key={value} disabled={busy} aria-pressed={draft[group.key]===value} onClick={()=>setDraft({...draft,[group.key]:value})}>{t.choices[value]}</button>)}</div><p>{group.hint}</p></div>)}</section></div>
  <section className={s.presets} aria-label={t.presets}><h3>{t.presets}</h3><p>{t.presetHint}</p><div>{state.presets.map((preset,slot)=><section key={slot}><strong>{t.preset} {slot+1}</strong><small>{preset?preset.formation+' / '+t.choices[preset.mentality]:t.presetEmpty}</small><div><button disabled={busy||!preset} onClick={()=>{if(preset)setDraft({...preset});}} aria-label={t.usePreset+' '+(slot+1)}>{t.usePreset}</button><button disabled={busy} onClick={()=>{void store(slot,draft).then(ok=>{if(ok)setFeedback(t.presetSaved);});}} aria-label={t.savePreset+' '+(slot+1)}>{t.savePreset}</button><button disabled={busy||!preset} onClick={()=>{void store(slot,null).then(ok=>{if(ok)setFeedback(t.presetEmpty);});}} aria-label={t.clearPreset+' '+(slot+1)}>{t.clearPreset}</button></div></section>)}</div><p role="status">{feedback}</p></section>
  <footer><button disabled={busy} onClick={()=>{void confirm(draft).then(ok=>{if(ok)close();});}}>{t.applyTactics}</button></footer>
 </dialog>;
}
