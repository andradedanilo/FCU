import { useEffect, useRef, useState } from 'react';
import type { Career } from '../../../../packages/contracts/src/index.ts';
import { projectHighlight, selectHighlight, highlightDuration, type Highlight, type HighlightKind } from '../../../../packages/presentation/src/highlights.ts';
import { paintHighlight } from '../../../../packages/presentation/src/pixel.ts';
import { text as t, describeEvent } from '../../../../packages/presentation/src/text.ts';
import s from './MatchVisual.module.css';
export function MatchVisual({state,playing,speed,onGoal}:{state:Career;playing:boolean;speed:number;onGoal:(kind:HighlightKind)=>void}) {
  const [mode,setMode]=useState<'pixel'|'text'>(()=>matchMedia('(prefers-reduced-motion: reduce)').matches?'text':'pixel');
  const [failed,setFailed]=useState(false);
  const [clip,setClip]=useState<{highlight:Highlight;preview:boolean}|null>(null);
  const canvas=useRef<HTMLCanvasElement>(null);
  const elapsed=useRef(0);const sounded=useRef(false);
  const current=useRef({playing,speed,onGoal});current.current={playing,speed,onGoal};
  const seen=useRef(state.match!.events.at(-1)?.order??-1);
  const match=state.match!;const event=match.events.at(-1);
  useEffect(()=>{
    const next=selectHighlight(match.events,seen.current);
    seen.current=match.events.at(-1)?.order??-1;
    if(!next||!current.current.playing)return;
    const highlight=projectHighlight(state,next);
    elapsed.current=0;sounded.current=false;
    if(mode==='pixel'&&highlight)setClip({highlight,preview:false});
    else if(highlight)current.current.onGoal(highlight.kind);
  },[match,state,mode]);
  useEffect(()=>{
    if(mode!=='pixel'||!canvas.current)return;
    const context=canvas.current.getContext('2d');
    if(!context){setFailed(true);setMode('text');return;}
    const c=context;
    let frame=0,last=0;
    function draw(time:number){
      const moving=clip&&(clip.preview||current.current.playing)&&!document.hidden;
      if(last&&moving)elapsed.current+=Math.min(100,time-last)*(clip.preview?1:current.current.speed);
      last=time;
      const progress=Math.min(1,elapsed.current/highlightDuration);
      paintHighlight(c,clip?.highlight??null,progress,elapsed.current/1000);
      if(clip&&progress>=.6&&!sounded.current){sounded.current=true;current.current.onGoal(clip.highlight.kind);}
      if(clip&&progress===1){setClip(null);return;}
      if(moving)frame=requestAnimationFrame(draw);
    }
    function visibility(){cancelAnimationFrame(frame);last=0;if(!document.hidden)frame=requestAnimationFrame(draw);}
    frame=requestAnimationFrame(draw);document.addEventListener('visibilitychange',visibility);
    return()=>{cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',visibility);};
  },[clip,mode,playing]);
  function preview(kind:HighlightKind){
    const player=state.players.find(p=>p.clubId===state.clubId&&p.role==='FWD')!;
    elapsed.current=0;sounded.current=false;
    setClip({preview:true,highlight:{kind,player:player.name,color:state.clubs.find(c=>c.id===state.clubId)!.color,opponentColor:state.clubs.find(c=>c.id!==state.clubId)!.color,tick:0,score:''}});
  }
  return <section className={s.visual}>
    <div className={s.toolbar}><strong>{t.highlights}</strong><div><button disabled={failed} aria-pressed={mode==='pixel'} onClick={()=>{setClip(null);setMode('pixel');}}>{t.pixelMode}</button><button aria-pressed={mode==='text'} onClick={()=>{setClip(null);setMode('text');}}>{t.textMode}</button></div></div>
    <div className={s.stage}>{mode==='pixel'?<canvas ref={canvas} width={320} height={180} aria-label={clip?.preview?t.previewNote:t.highlights}/>:<div className={s.text}><strong>{match.tick}'</strong><p>{event?describeEvent(state,event):t.noEvents}</p></div>}
      {clip&&mode==='pixel'&&<div className={s.clipLabel}><span>{clip.preview?t.previewNote:`${clip.highlight.tick}' / ${clip.highlight.player}`}</span><button onClick={()=>setClip(null)}>{t.skipHighlight}</button></div>}
    </div>
    <div className={s.caption}>{failed?t.canvasFailed:event?describeEvent(state,event):t.visualNote}</div>
    {mode==='pixel'&&<div className={s.previews} role="group" aria-label={t.artPreview}><span>{t.artPreview}</span><button disabled={playing} onClick={()=>preview('goal')}>{t.previewGoal}</button><button disabled={playing} onClick={()=>preview('save')}>{t.previewSave}</button><button disabled={playing} onClick={()=>preview('shot')}>{t.previewMiss}</button></div>}
  </section>;
}
