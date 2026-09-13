import type {Career} from '../../../../packages/contracts/src/index.ts';
import {text as t} from '../../../../packages/presentation/src/text.ts';
import {overall} from '../../../../packages/simulation/src/ratings.ts';
import s from './App.module.css';
export function DevelopmentPanel({state,focus,busy}:{state:Career;focus:(value:Career['personnel']['focus'])=>void;busy:boolean}){
 const players=state.players.filter(p=>p.clubId===state.clubId),reports=state.personnel.reports.filter(r=>r.clubId===state.clubId);
 return <details className={s.development}><summary>{t.development}</summary><p>{t.developmentHint}</p><div role="group" aria-label={t.trainingFocus}>{(['balanced','defence','attack','fitness'] as const).map(value=><button key={value} disabled={busy} aria-pressed={state.personnel.focus===value} onClick={()=>focus(value)}>{t.focusNames[value]}</button>)}</div><table><thead><tr><th>{t.player}</th><th>{t.ability}</th><th>{t.potential}</th><th>{t.seniorMinutes}</th></tr></thead><tbody>{players.map(p=><tr key={p.id}><td>{p.name}</td><td>{overall(p)}</td><td>{state.personnel.players[p.id]!.potential}</td><td>{state.personnel.players[p.id]!.minutes}</td></tr>)}</tbody></table><ul>{reports.map((r,i)=><li key={i}>{r.date} / {state.players.find(p=>p.id===r.playerId)?.name}: {t.developmentKinds[r.kind]} {r.change>0?'+':''}{r.change!==0?r.change:''}</li>)}</ul></details>;
}
