import {useEffect,useRef,useState} from 'react';
export function usePowerPause(pause:(state:'suspend'|'resume')=>void,checkpoint:()=>void,busy:boolean){
 const handlers=useRef({pause,checkpoint});handlers.current={pause,checkpoint};
 const [pending,setPending]=useState(false);
 useEffect(()=>window.fcu.onPowerState(state=>{handlers.current.pause(state);if(state==='suspend')setPending(true);}),[]);
 useEffect(()=>{if(pending&&!busy){setPending(false);handlers.current.checkpoint();}},[pending,busy]);
}
