import type {Match} from '../../../../packages/contracts/src/index.ts';
import {useEffect,useRef,useState} from 'react';
import {clockLabel} from '../../../../packages/presentation/src/highlights.ts';
import {text as t} from '../../../../packages/presentation/src/text.ts';
export function MatchClock({match,playing,duration}:{match:Match;playing:boolean;duration:number}) {
  const {tick,phase,addedTime}=match;
  const elapsed=useRef(0);const minute=useRef(tick);const [value,setValue]=useState(()=>clockLabel(tick,0,duration,{phase,addedTime}));
  useEffect(()=>{
    if(minute.current!==tick){minute.current=tick;elapsed.current=0;}
    setValue(clockLabel(tick,elapsed.current,duration,{phase,addedTime}));
    if(!playing||phase==='finished'||phase==='interval')return;
    let last=performance.now();
    const timer=setInterval(()=>{const now=performance.now();elapsed.current+=now-last;last=now;setValue(clockLabel(tick,elapsed.current,duration,{phase,addedTime}));},100);
    return()=>clearInterval(timer);
  },[tick,phase,addedTime,playing,duration]);
  return <time aria-label={t.matchClock} data-testid="minute" data-tick={tick} data-phase={phase}>{value}</time>;
}
