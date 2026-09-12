import type { MatchView } from './projector.ts';
import { visualOffset } from './projector.ts';
export type Position = { x:number; y:number; z:number };
const mix = (a:Position,b:Position,t:number):Position => ({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t});
const point = (x:number,z:number,y=0):Position => ({x,y,z});

// A sampled illustration of committed events, never an input to the match engine.
export function samplePlay(view:MatchView, progress:number) {
  const t=Math.max(0,Math.min(1,progress));
  const positions=Object.fromEntries(view.figures.map(f=>[f.id,point(f.x,f.z)]));
  const event=view.event;
  let ball=point(0,0,.6);
  let keeperDive=0;
  if(!event)return {positions,ball,keeperDive};
  const actor=view.figures.find(f=>f.id===event.playerId);
  if(!actor)return {positions,ball,keeperDive};
  const sign=event.clubId===view.home?1:-1;
  const variation=visualOffset(`${view.fixtureId}/${event.order}`);
  const lane=(variation-.5)*24;
  const receive=point(sign*19,lane);
  const strike=point(sign*35,lane*.55);
  const passer=view.figures.find(f=>f.id===view.passer);
  const origin=point(passer?.x??sign*-10,passer?.z??lane);
  const receiver=event.type==='pass'?view.figures.find(f=>f.team===actor.team&&f.id!==actor.id&&f.role==='FWD'):actor;
  const runner=receiver??actor;
  const runStart=point(runner.x,runner.z);
  const run=t<.35?mix(runStart,receive,t/.35):mix(receive,strike,Math.min(1,(t-.35)/.3));
  positions[runner.id]=run;
  // Supporting runs and tracking defenders return to their formation for the next clip.
  for(const f of view.figures)if(f.id!==runner.id&&f.id!==passer?.id&&f.role!=='GK') {
    const push=Math.sin(t*Math.PI)* (f.team===actor.team?7:4);
    positions[f.id]=point(f.x+sign*push,f.z+(lane-f.z)*.08*Math.sin(t*Math.PI));
  }
  if(t<.35)ball=mix({...origin,y:.6},{...receive,y:.6},t/.35);
  else if(t<.65||event.type==='pass')ball={...run,y:.6};
  else {
    const flight=(t-.65)/.35;
    const target=point(sign*(event.type==='goal'?54.3:event.type==='save'?49.5:57),event.type==='shot'?(variation>.5?1:-1)*10:(variation-.5)*6,.7);
    ball=mix({...strike,y:.6},target,flight);
    ball.y+=Math.sin(flight*Math.PI)*(event.type==='shot'?3:1.2);
    const keeper=view.figures.find(f=>f.role==='GK'&&f.team!==actor.team);
    if(keeper){
      const reach=Math.min(1,flight*1.4);
      positions[keeper.id]=mix(point(keeper.x,keeper.z),point(sign*49.5,target.z),reach);
      keeperDive=(target.z>=0?1:-1)*Math.sin(reach*Math.PI/2)*1.15;
    }
    if(event.type==='goal'&&t>.9)positions[runner.id]={...run,y:Math.sin((t-.9)*Math.PI*10)*1.2};
  }
  return {positions,ball,keeperDive};
}
