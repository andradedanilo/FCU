import {matchMinute} from '../../../../packages/presentation/src/highlights.ts';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Career } from '../../../../packages/contracts/src/index.ts';
import { projectHighlight, selectHighlight, highlightDuration, playbackSpeed, type Highlight, type HighlightKind } from '../../../../packages/presentation/src/highlights.ts';
import { highlightFrame, type HighlightFrame } from '../../../../packages/presentation/src/highlights.ts';
import { highlightArt } from './highlightArt.ts';
import { text as t, describeEvent } from '../../../../packages/presentation/src/text.ts';
import s from './MatchVisual.module.css';
export function MatchVisual({state,playing,onGoal,statistics}:{statistics:ReactNode;state:Career;playing:boolean;onGoal:(kind:HighlightKind)=>void}) {
  const [failed,setFailed]=useState(false);
  const [clip,setClip]=useState<{highlight:Highlight;preview:boolean}|null>(null);
  const [still,setStill]=useState<{frame:HighlightFrame;highlight:Highlight;preview:boolean}|null>(null);
  const elapsed=useRef(0);const sounded=useRef(false);
  const current=useRef({playing,onGoal});current.current={playing,onGoal};
  const seen=useRef(state.match!.events.at(-1)?.order??-1);
  const match=state.match!;const event=match.events.at(-1);
  useEffect(()=>{
    const next=selectHighlight(match.events,seen.current);
    seen.current=match.events.at(-1)?.order??-1;
    if(!next||!current.current.playing)return;
    const highlight=projectHighlight(state,next);
    elapsed.current=0;sounded.current=false;
    if(!failed&&highlight){setClip({highlight,preview:false});setStill({frame:'prepare',highlight,preview:false});}
    else if(highlight)current.current.onGoal(highlight.kind);
  },[match,state,failed]);
  useEffect(()=>{
    if(failed||!clip||(!clip.preview&&!playing))return;
    const active=clip;
    let last=performance.now();
    function advance(){
      const now=performance.now();
      if(!document.hidden)elapsed.current+=Math.min(100,now-last)*(active.preview?1:playbackSpeed);
      last=now;
      const progress=Math.min(1,elapsed.current/highlightDuration);
      const frame=highlightFrame(active.highlight.kind,progress);
      if(frame!=='prepare'&&!sounded.current){
        sounded.current=true;setStill({...active,frame});current.current.onGoal(active.highlight.kind);
      }
      if(progress===1)setClip(null);
    }
    function visibility(){last=performance.now();}
    // Only the two still-frame cuts update React. Nothing within an image moves.
    const timer=setInterval(advance,50);document.addEventListener('visibilitychange',visibility);
    return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visibility);};
  },[clip,failed,playing]);
  function preview(kind:HighlightKind){
    const player=state.players.find(p=>p.clubId===state.clubId&&p.role==='FWD')!;
    elapsed.current=0;sounded.current=false;
    const highlight={kind,player:player.name,color:state.clubs.find(c=>c.id===state.clubId)!.color,tick:0,score:''};
    setClip({preview:true,highlight});setStill({preview:true,highlight,frame:'prepare'});
  }
  const frame=still?.frame??'prepare';
  const caption=frame==='prepare'?t.prepareShot:frame==='goal'?t.goalBanner:frame==='save'?t.saveBanner:t.missBanner;
  const recent=event&&event.tick===match.tick?describeEvent(state,event):match.tick===0?t.noEvents:match.phase==='finished'?t.fullTime:playing?t.noChance:t.paused;
  return <section className={s.visual}>
    <div className={s.stage}>
      <div className={s.highlight} role="region" aria-label={t.highlights}><div className={s.picture}>{!failed?Object.entries(highlightArt).map(([key,src])=><img key={key} src={src} width={1672} height={941} hidden={key!==frame} alt={t.stillAlt[key as HighlightFrame]} onError={()=>{setFailed(true);setClip(null);}}/>):<p className={s.notice}>{t.artFailed}</p>}</div><div className={s.clipLabel}><span style={{borderLeft:still&&!still.preview?`4px solid ${still.highlight.color}`:undefined}}><strong>{caption}</strong><small>{still?still.preview?t.previewNote:still.highlight.player:t.highlightIllustration}</small></span>{clip&&<button onClick={()=>{setClip(null);setStill(null);}}>{t.skipHighlight}</button>}</div></div>
      <aside className={s.analysis}><div className={s.commentary}><header className={s.toolbar}><strong>{t.events}</strong><span>{match.phase==='finished'?t.fullTime:playing?t.live:t.paused}</span></header><p className={s.lead} aria-live="polite">{(!event||event.tick!==match.tick)&&<span>{matchMinute(match.tick,match.addedTime[0]??0,match.addedTime[1]??0,match.extraTime)}'</span>}{recent}</p><ol aria-label={t.events}>{match.penalties.map((kick,i)=><li key={'penalty-'+i}>{t.penalties} {i+1}: {state.players.find(p=>p.id===kick.playerId)!.name} / {kick.scored?t.penaltyScored:t.penaltyMissed}</li>)}{[...match.events].filter(e=>e.type!=='pass').reverse().map(e=><li key={e.order} className={e.type==='goal'?s.goal:e.type==='yellow'?s.yellow:e.type==='red'||e.type==='secondYellow'||e.type==='injury'?s.incident:undefined}>{describeEvent(state,e)}</li>)}</ol></div>{statistics}</aside>
    </div>
    {!failed&&<details className={s.previews}><summary>{t.artPreview}</summary><div role="group" aria-label={t.artPreview}><button disabled={playing} onClick={()=>preview('goal')}>{t.previewGoal}</button><button disabled={playing} onClick={()=>preview('save')}>{t.previewSave}</button><button disabled={playing} onClick={()=>preview('shot')}>{t.previewMiss}</button></div></details>}
  </section>;
}
