import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Career, MatchEvent } from '../../../../packages/contracts/src/index.ts';
import { projectMatch } from '../../../../packages/presentation/src/projector.ts';
import { text as t, describeEvent } from '../../../../packages/presentation/src/text.ts';
import type { createThreePresenter } from '../../../../packages/presentation/src/three.ts';
import s from './MatchVisual.module.css';
type Presenter=ReturnType<typeof createThreePresenter>;
export function MatchVisual({state,playing,speed,onGoal}:{state:Career;playing:boolean;speed:number;onGoal:()=>void}) {
  const [mode,setMode]=useState<'three'|'text'>(()=>matchMedia('(prefers-reduced-motion: reduce)').matches?'text':'three');
  const [failed,setFailed]=useState(false);
  const [shadows,setShadows]=useState(false);
  const [fps,setFps]=useState(30);
  const [celebration,setCelebration]=useState<MatchEvent|null>(null);
  const host=useRef<HTMLDivElement>(null);
  const presenter=useRef<Presenter|null>(null);
  const latest=useRef({state,playing,speed,shadows,fps});latest.current={state,playing,speed,shadows,fps};
  const goalCallback=useRef(onGoal);goalCallback.current=onGoal;
  const seen=useRef({fixture:state.match!.fixtureId,order:state.match!.events.at(-1)?.order??-1});
  const celebrationTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>{
    const match=state.match!;
    if(seen.current.fixture!==match.fixtureId)seen.current={fixture:match.fixtureId,order:-1};
    const goal=match.events.find(e=>e.order>seen.current.order&&e.type==='goal');
    seen.current.order=match.events.at(-1)?.order??-1;
    if(goal){setCelebration(goal);goalCallback.current();if(celebrationTimer.current)clearTimeout(celebrationTimer.current);celebrationTimer.current=setTimeout(()=>setCelebration(null),2400);}
  },[state.match]);
  useEffect(()=>()=>{if(celebrationTimer.current)clearTimeout(celebrationTimer.current);},[]);
  useEffect(()=>{
    if(mode!=='three'||!host.current)return;let disposed=false;
    void import('../../../../packages/presentation/src/three.ts').then(({createThreePresenter})=>{
      if(disposed||!host.current)return;
      const p=createThreePresenter(()=>{setFailed(true);setMode('text');});presenter.current=p;p.mount(host.current);
      const current=latest.current;p.setSpeed(current.speed);p.shadows(current.shadows);p.fps(current.fps);p.render(projectMatch(current.state),current.state.match!.events);if(!current.playing)p.pause();
    }).catch(()=>{if(!disposed){setFailed(true);setMode('text');}});
    return()=>{disposed=true;presenter.current?.dispose();presenter.current=null;};
  },[mode,state.match?.fixtureId]);
  useEffect(()=>{const p=presenter.current;if(p){p.setSpeed(speed);p.shadows(shadows);p.fps(fps);p.render(projectMatch(state),state.match!.events);if(!playing)p.pause();}},[state,playing,speed,shadows,fps]);
  const event=state.match!.events.at(-1);
  return <section className={s.visual}>
    <div className={s.toolbar}><strong>{t.highlights}</strong><div><button aria-pressed={mode==='three'} disabled={failed} onClick={()=>setMode('three')}>{t.threeMode}</button><button aria-pressed={mode==='text'} onClick={()=>setMode('text')}>{t.textMode}</button>{mode==='three'&&<><button aria-pressed={shadows} onClick={()=>setShadows(!shadows)}>{t.shadows}</button><button aria-label={t.fps} onClick={()=>setFps(fps===30?60:30)}>{fps} fps</button></>}</div></div>
    <div className={s.stage}>{mode==='three'?<div className={s.pitch} ref={host} data-testid="pitch"/>:<div className={s.text}><span>{state.match!.tick}'</span><p>{event?describeEvent(state,event):t.noEvents}</p></div>}
      {celebration&&<div className={s.celebration} aria-label={t.replayLabel}><div className={s.sparkles} aria-hidden="true">★ ★ ★</div><strong>{t.goalBanner}</strong><div className={s.celebratingPlayer} aria-hidden="true" style={{'--kit':state.clubs.find(c=>c.id===celebration.clubId)!.color} as CSSProperties}><i/><b/><span/><em/><small/></div><p>{state.players.find(p=>p.id===celebration.playerId)!.name}</p><small>{celebration.tick}' / {celebration.homeGoals} - {celebration.awayGoals}</small><button onClick={()=>setCelebration(null)}>{t.skip}</button></div>}
    </div><div className={s.caption}>{failed?t.graphicsFailed:event?describeEvent(state,event):t.visualNote}</div>
  </section>;
}
