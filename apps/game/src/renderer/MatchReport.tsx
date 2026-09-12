import {penaltyScore} from '../../../../packages/simulation/src/penalties.ts';
import {useModal} from './input.ts';
import {useRef} from 'react';
import type {Career} from '../../../../packages/contracts/src/index.ts';
import {matchReport} from '../../../../packages/presentation/src/report.ts';
import {text as t} from '../../../../packages/presentation/src/text.ts';
import s from './MatchReport.module.css';
export function MatchReport({state,close}:{state:Career;close:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);useModal(dialog);
 const report=matchReport(state);if(!report)return null;const m=state.match!,shootout=penaltyScore(m);
 return <dialog ref={dialog} className={s.dialog} aria-label={t.matchReport} onCancel={close}><header><h2>{t.matchReport}</h2><button onClick={close}>{t.close}</button></header><p className={s.result}>{m.forfeit?t.forfeited:t[report.outcome]} <b>{m.homeGoals} - {m.awayGoals}</b></p><p>{state.clubs.find(c=>c.id===m.home)!.name} / {state.clubs.find(c=>c.id===m.away)!.name}</p>{shootout&&<p>{t.penalties}: {shootout.join(' - ')}</p>}{m.competitionClass==='league'?<div className={s.metrics}><div><b>+{report.earned}</b><span>{t.pointsEarned}</span></div><div><b>#{report.position}</b><span>{t.currentPosition}</span></div><div><b>{report.points}</b><span>{t.totalPoints}</span></div></div>:<p>{report.tieWinner?`${t.tieWinner}: ${state.clubs.find(c=>c.id===report.tieWinner)!.name}`:t.cupMatch} / {t.aggregate}: {m.homeGoals+m.aggregate[0]} - {m.awayGoals+m.aggregate[1]}</p>}<div className={s.body}><section><h3>{t.scorers}</h3>{report.scorers.length?<ul>{report.scorers.map((goal,i)=><li key={i}><b>{goal.tick}'</b><span>{goal.player}<small>{goal.club}</small></span></li>)}</ul>:<p>{t.noGoals}</p>}</section><section><h3>{t.yourPerformance}</h3><p><b>{report.own.onTarget}/{report.own.shots}</b> {t.attemptsOnTarget}</p><p><b>{(report.own.quality/10000).toFixed(2)} / {(report.other.quality/10000).toFixed(2)}</b> {t.qualityComparison}</p><p>{t.reportHint}</p></section></div></dialog>;
}
