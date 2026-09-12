import {useEffect,useRef,useState} from 'react';
import {clockLabel} from '../../../../packages/presentation/src/highlights.ts';
import {text as t} from '../../../../packages/presentation/src/text.ts';
export function MatchClock({tick,playing,duration}:{tick:number;playing:boolean;duration:number}) {
  const elapsed=useRef(0);const minute=useRef(tick);const [value,setValue]=useState(()=>clockLabel(tick,0,duration));
  useEffect(()=>{
    if(minute.current!==tick){minute.current=tick;elapsed.current=0;}
    setValue(clockLabel(tick,elapsed.current,duration));
    if(!playing||tick===90)return;
    let last=performance.now();
    const timer=setInterval(()=>{const now=performance.now();elapsed.current+=now-last;last=now;setValue(clockLabel(tick,elapsed.current,duration));},100);
    return()=>clearInterval(timer);
  },[tick,playing,duration]);
  return <time aria-label={t.matchClock} data-testid="minute" data-tick={tick}>{value}</time>;
}
