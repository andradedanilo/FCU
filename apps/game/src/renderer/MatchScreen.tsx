import type { Career } from '../../../../packages/contracts/src/index.ts';
import { text as t } from '../../../../packages/presentation/src/text.ts';
import {minuteDuration} from '../../../../packages/presentation/src/highlights.ts';
import { ClubBadge } from './GameArt.tsx';
import { MatchVisual } from './MatchVisual.tsx';
import {MatchClock} from './MatchClock.tsx';
import s from './App.module.css';
export function MatchScreen({state,busy,playing,play,continuousHalf,changeContinuous,done,goal}:{state:Career;busy:boolean;playing:boolean;play:()=>void;continuousHalf:boolean;changeContinuous:(value:boolean)=>void;done:()=>void;goal:(kind:'goal'|'save'|'shot')=>void}) {
 const match=state.match!;const home=state.clubs.find(c=>c.id===match.home)!;const away=state.clubs.find(c=>c.id===match.away)!;
 return <section className={s.matchScreen}>
  <div className={s.scoreboard}><div className={s.teamName}><ClubBadge color={home.color} short={home.short}/><h2>{home.name}</h2></div><div className={s.score}><span className={s.broadcast}>{t.broadcast}</span><strong data-testid="score">{match.homeGoals} - {match.awayGoals}</strong><MatchClock tick={match.tick} playing={playing} duration={minuteDuration(match.events,match.tick)}/></div><div className={s.teamName}><h2>{away.name}</h2><ClubBadge color={away.color} short={away.short}/></div></div>
  <div className={s.matchBody}><MatchVisual state={state} playing={playing} onGoal={goal}/><div className={s.matchStats} aria-label={t.matchStats}>{([['shots',t.shots],['onTarget',t.onTarget],['possession',t.possession],['quality',t.quality]] as const).map(([key,label])=>{const format=(n:number)=>key==='quality'?(n/10000).toFixed(2):key==='possession'?`${match.tick?Math.round(n/match.tick/100):50}%`:n;return <div key={key}><b>{format(match.homeStats[key])}</b><span>{label}</span><b>{format(match.awayStats[key])}</b></div>;})}</div></div>
  <div className={s.matchControls}>{match.tick<90?<><div className={s.playControls}><button className={s.primary} disabled={busy} onClick={play}>{playing?t.pause:match.tick===45?t.continue:t.play}</button><label><input type="checkbox" checked={continuousHalf} onChange={event=>changeContinuous(event.target.checked)}/>{t.continuousHalf}</label></div><span>{match.tick===45?t.halfTime:t.fixedSpeed}</span></>:<button className={s.primary} onClick={done}>{t.continue} <span aria-hidden="true">▶</span></button>}</div>
 </section>;
}
