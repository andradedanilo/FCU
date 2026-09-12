import {useEffect,useRef,useState} from 'react';
import type {Career} from '../../../../packages/contracts/src/index.ts';
import {nextHighlight,highlightDuration,highlightFrame,playbackSpeed,type Highlight,type HighlightFrame,type HighlightKind,type HighlightSide} from '../../../../packages/presentation/src/highlights.ts';
export type MatchCue=HighlightKind|'anticipation'|'kick'|'whistle';
export type BroadcastScene={highlight:Highlight;preview:boolean;frame:HighlightFrame};
type Sequence={highlight:Highlight;preview:boolean;before:Career;frame:HighlightFrame};

export function useMatchBroadcast(state:Career,playing:boolean,cue:(kind:MatchCue)=>void){
 const [received,setReceived]=useState(state);
 const [sequence,setSequence]=useState<Sequence|null>(null);
 const [failed,setFailed]=useState(false);
 const playback=useRef({elapsed:0,started:false});
 const sound=useRef(cue);sound.current=cue;
 // Derive a presentation boundary before paint; authoritative state never changes.
 if(received!==state){
  const highlight=nextHighlight(received,state);
  setReceived(state);
  if(highlight&&!failed){playback.current={elapsed:0,started:false};setSequence({highlight,preview:false,before:received,frame:'prepare'});}
  else if(state.match?.fixtureId!==received.match?.fixtureId||state.match!.tick<received.match!.tick||state.match!.tick>received.match!.tick)setSequence(null);
 }
 useEffect(()=>{
  if(!sequence)return;
  if(!sequence.preview&&!playing&&!['interval','extraInterval','finished'].includes(state.match!.phase))return;
  if(!playback.current.started){sound.current('anticipation');playback.current.started=true;}
  let last=performance.now();const clock=playback.current;
  const timer=setInterval(()=>{
   const now=performance.now();if(!document.hidden)clock.elapsed+=Math.max(0,now-last)*(sequence.preview?1:playbackSpeed);last=now;
   const frame=highlightFrame(sequence.highlight.kind,clock.elapsed/highlightDuration);
   if(frame!==sequence.frame){sound.current('kick');sound.current(sequence.highlight.kind);}
   if(clock.elapsed>=highlightDuration)setSequence(null);
   else if(frame!==sequence.frame)setSequence({...sequence,frame});
  },50);
  const visibility=()=>{last=performance.now();};document.addEventListener('visibilitychange',visibility);
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',visibility);};
 },[sequence,playing,state.match]);
 function preview(kind:HighlightKind,side:HighlightSide){
  const club=side==='blue'?state.clubId:state.match!.home===state.clubId?state.match!.away:state.match!.home;
  const player=state.players.find(p=>p.clubId===club&&p.role==='FWD')!;
  playback.current={elapsed:0,started:false};
  setSequence({before:state,preview:true,frame:'prepare',highlight:{kind,side,player:player.name,color:state.clubs.find(c=>c.id===club)!.color,tick:0,score:''}});
 }
 const suspense=!!sequence&&!sequence.preview&&sequence.frame==='prepare';
 return {view:suspense?sequence.before:state,scene:sequence as BroadcastScene|null,suspense,failed,preview,skip:()=>setSequence(null),fail:()=>{setFailed(true);setSequence(null);}};
}
