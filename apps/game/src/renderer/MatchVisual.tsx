import { useEffect, useRef, useState } from 'react';
import type { Career } from '../../../../packages/contracts/src/index.ts';
import { projectHighlight, selectHighlight, highlightDuration, playbackSpeed, type Highlight, type HighlightKind } from '../../../../packages/presentation/src/highlights.ts';
import { paintHighlight } from '../../../../packages/presentation/src/pixel.ts';
import { text as t, describeEvent } from '../../../../packages/presentation/src/text.ts';
import s from './MatchVisual.module.css';
export function MatchVisual({state,playing,onGoal}:{state:Career;playing:boolean;onGoal:(kind:HighlightKind)=>void}) {
  const [reduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [failed,setFailed]=useState(false);
  const [clip,setClip]=useState<{highlight:Highlight;preview:boolean}|null>(null);
  const canvas=useRef<HTMLCanvasElement>(null);
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
    if(!failed&&!reduced&&highlight)setClip({highlight,preview:false});
    else if(highlight)current.current.onGoal(highlight.kind);
  },[match,state,failed,reduced]);
  useEffect(()=>{
    if(!clip||failed||reduced||!canvas.current)return;
    const context=canvas.current.getContext('2d');
    if(!context){setFailed(true);setClip(null);return;}
    const c=context;
    let frame=0,last=0;
    function draw(time:number){
      const moving=clip&&(clip.preview||current.current.playing)&&!document.hidden;
      if(last&&moving)elapsed.current+=Math.min(100,time-last)*(clip.preview?1:playbackSpeed);
      last=time;
      const progress=Math.min(1,elapsed.current/highlightDuration);
      if(clip)paintHighlight(c,clip.highlight,progress,elapsed.current/1000);
      if(clip&&progress>=.6&&!sounded.current){sounded.current=true;current.current.onGoal(clip.highlight.kind);}
      if(clip&&progress===1){setClip(null);return;}
      if(moving)frame=requestAnimationFrame(draw);
    }
    function visibility(){cancelAnimationFrame(frame);last=0;if(!document.hidden)frame=requestAnimationFrame(draw);}
    frame=requestAnimationFrame(draw);document.addEventListener('visibilitychange',visibility);
    return()=>{cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',visibility);};
  },[clip,failed,reduced,playing]);
  function preview(kind:HighlightKind){
    const player=state.players.find(p=>p.clubId===state.clubId&&p.role==='FWD')!;
    elapsed.current=0;sounded.current=false;
    setClip({preview:true,highlight:{kind,player:player.name,color:state.clubs.find(c=>c.id===state.clubId)!.color,opponentColor:state.clubs.find(c=>c.id!==state.clubId)!.color,tick:0,score:''}});
  }
  const recent=event&&event.tick===match.tick?describeEvent(state,event):match.tick===0?t.noEvents:match.tick===90?t.fullTime:playing?t.noChance:t.paused;
  return <section className={s.visual}>
    <header className={s.toolbar}><strong>{t.events}</strong><span>{playing?t.live:t.paused}</span></header>
    <div className={s.stage}>
      <div className={s.commentary}><p className={s.lead} aria-live="polite"><span>{match.tick}'</span>{recent}</p><ol aria-label={t.events}>{[...match.events].filter(e=>e.type!=='pass').reverse().map(e=><li key={e.order} className={e.type==='goal'?s.goal:undefined}>{describeEvent(state,e)}</li>)}</ol></div>
      {clip&&!failed&&!reduced&&<div className={s.highlight} role="region" aria-label={t.highlights}><canvas ref={canvas} width={320} height={180} aria-label={clip.preview?t.previewNote:t.highlights}/><div className={s.clipLabel}><span>{clip.preview?t.previewNote:clip.highlight.player}</span><button onClick={()=>setClip(null)}>{t.skipHighlight}</button></div></div>}
    </div>
    {failed&&<p className={s.notice}>{t.canvasFailed}</p>}
    {!failed&&!reduced&&<details className={s.previews}><summary>{t.artPreview}</summary><div role="group" aria-label={t.artPreview}><button disabled={playing} onClick={()=>preview('goal')}>{t.previewGoal}</button><button disabled={playing} onClick={()=>preview('save')}>{t.previewSave}</button><button disabled={playing} onClick={()=>preview('shot')}>{t.previewMiss}</button></div></details>}
  </section>;
}
