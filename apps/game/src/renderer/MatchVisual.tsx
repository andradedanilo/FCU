import { useEffect, useRef, useState } from 'react';
import type { Career } from '../../../../packages/contracts/src/index.ts';
import { projectMatch } from '../../../../packages/presentation/src/projector.ts';
import { text as t, describeEvent } from '../../../../packages/presentation/src/text.ts';
import type { createThreePresenter } from '../../../../packages/presentation/src/three.ts';
import styles from './MatchVisual.module.css';
type Presenter=ReturnType<typeof createThreePresenter>;
export function MatchVisual({state,playing,speed}:{state:Career;playing:boolean;speed:number}) {
  const [mode,setMode]=useState<'three'|'text'>(()=>matchMedia('(prefers-reduced-motion: reduce)').matches?'text':'three');
  const [failed,setFailed]=useState(false);const [shadows,setShadows]=useState(false);const [fps,setFps]=useState(30);
  const host=useRef<HTMLDivElement>(null);const presenter=useRef<Presenter|null>(null);const latest=useRef({state,playing,speed,shadows,fps});latest.current={state,playing,speed,shadows,fps};
  useEffect(()=>{
    if(mode!=='three'||!host.current)return;let disposed=false;
    void import('../../../../packages/presentation/src/three.ts').then(({createThreePresenter})=>{
      if(disposed||!host.current)return;const p=createThreePresenter(()=>{setFailed(true);setMode('text');});presenter.current=p;p.mount(host.current);const current=latest.current;p.setSpeed(current.speed);p.shadows(current.shadows);p.fps(current.fps);p.render(projectMatch(current.state),current.state.match!.events);if(!current.playing)p.pause();
    }).catch(()=>{if(!disposed){setFailed(true);setMode('text');}});
    return()=>{disposed=true;presenter.current?.dispose();presenter.current=null;};
  },[mode,state.match?.fixtureId]);
  useEffect(()=>{const p=presenter.current;if(p){p.setSpeed(speed);p.shadows(shadows);p.fps(fps);p.render(projectMatch(state),state.match!.events);if(!playing)p.pause();}},[state,playing,speed,shadows,fps]);
  const event=state.match!.events.at(-1);
  return <section className={styles.visual}><div className={styles.toolbar}><strong>{t.highlights}</strong><div><button aria-pressed={mode==='three'} disabled={failed} onClick={()=>setMode('three')}>{t.threeMode}</button><button aria-pressed={mode==='text'} onClick={()=>setMode('text')}>{t.textMode}</button>{mode==='three'&&<><label><input type="checkbox" checked={shadows} onChange={e=>setShadows(e.target.checked)}/>{t.shadows}</label><select aria-label="Frame rate" value={fps} onChange={e=>setFps(Number(e.target.value))}><option value={30}>30 fps</option><option value={60}>60 fps</option></select></>}</div></div>{mode==='three'?<div className={styles.pitch} ref={host} data-testid="pitch"/>:<div className={styles.text}><span>{state.match!.tick}'</span><p>{event?describeEvent(state,event):t.noEvents}</p></div>}<div className={styles.caption}>{failed?t.graphicsFailed:event?describeEvent(state,event):t.visualNote}</div></section>;
}
