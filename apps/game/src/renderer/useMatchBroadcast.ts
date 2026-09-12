import {useEffect,useRef,useState} from 'react';
import type {Career} from '../../../../packages/contracts/src/index.ts';
import {nextHighlight,penaltyHighlights,penaltyView,highlightDuration,highlightFrame,playbackSpeed,type Highlight,type HighlightFrame,type HighlightKind,type HighlightSide} from '../../../../packages/presentation/src/highlights.ts';
export type MatchCue=HighlightKind|'anticipation'|'kick'|'whistle'|'tackle';
export type BroadcastScene={highlight:Highlight;preview:boolean;frame:HighlightFrame};
type Sequence={highlight:Highlight;preview:boolean;before:Career;frame:HighlightFrame;remaining:Highlight[]};

export function useMatchBroadcast(state:Career,playing:boolean,cue:(kind:MatchCue)=>void){
 const [received,setReceived]=useState(state);
 const [sequence,setSequence]=useState<Sequence|null>(null);
 const [failed,setFailed]=useState(false);
 const playback=useRef({elapsed:0,started:false});
 const sound=useRef(cue);sound.current=cue;
 // Derive a presentation boundary before paint; authoritative state never changes.
 if(received!==state){
  const penalties=penaltyHighlights(received,state);
  const highlight=penalties[0]??nextHighlight(received,state);
  setReceived(state);
  if(highlight&&!failed){playback.current={elapsed:0,started:false};setSequence({highlight,remaining:penalties.slice(1),preview:false,before:received,frame:highlightFrame(highlight.kind,0)});}
  else if(state.match?.fixtureId!==received.match?.fixtureId||state.match!.tick<received.match!.tick||state.match!.tick>received.match!.tick)setSequence(null);
 }
 useEffect(()=>{
  if(!sequence)return;
  const match=state.match!;
  if(!sequence.preview&&!playing&&!match.pendingDismissal&&!match.pendingInjuries.length&&!['interval','extraInterval','finished'].includes(match.phase))return;
  if(!playback.current.started){sound.current(sequence.frame==='tackle'?'tackle':sequence.frame==='prepare'||sequence.frame==='penalty'?'anticipation':sequence.highlight.kind);playback.current.started=true;}
  let last=performance.now();const clock=playback.current;
  const timer=setInterval(()=>{
   const now=performance.now();if(!document.hidden)clock.elapsed+=Math.max(0,now-last)*(sequence.preview?1:playbackSpeed);last=now;
   const frame=highlightFrame(sequence.highlight.kind,clock.elapsed/highlightDuration);
   if(frame!==sequence.frame){if(sequence.frame==='prepare'||sequence.frame==='penalty')sound.current('kick');sound.current(sequence.highlight.kind);}
   if(clock.elapsed>=highlightDuration){
    const next=sequence.remaining[0];playback.current={elapsed:0,started:false};
    setSequence(next?{...sequence,highlight:next,frame:highlightFrame(next.kind,0),remaining:sequence.remaining.slice(1)}:null);
   }
   else if(frame!==sequence.frame)setSequence({...sequence,frame});
  },50);
  const visibility=()=>{last=performance.now();};document.addEventListener('visibilitychange',visibility);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visibility);};
 },[sequence,playing,state.match]);
 function preview(kind:HighlightKind,side:HighlightSide){
  const club=side==='blue'?state.clubId:state.match!.home===state.clubId?state.match!.away:state.match!.home;
  const player=state.players.find(p=>p.clubId===club&&p.role==='FWD')!;
  playback.current={elapsed:0,started:false};
  setSequence({before:state,preview:true,remaining:[],frame:highlightFrame(kind,0),highlight:{kind,side,player:player.name,color:state.clubs.find(c=>c.id===club)!.color,tick:0,score:''}});
 }
 const suspense=!!sequence&&!sequence.preview&&['prepare','tackle','penalty'].includes(sequence.frame);
 const view=sequence&&!sequence.preview&&sequence.highlight.penaltyIndex!==undefined?penaltyView(state,sequence.highlight.penaltyIndex+(suspense?0:1)):suspense?sequence.before:state;
 return {view,scene:sequence as BroadcastScene|null,suspense,failed,preview,skip:()=>setSequence(null),fail:()=>{setFailed(true);setSequence(null);}};
}
