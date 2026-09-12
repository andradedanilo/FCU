import {useEffect,type RefObject} from 'react';
import {controllerAction,keyboardAction,type InputAction} from '../../../../packages/presentation/src/input.ts';
const selector='button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,a[href],[tabindex="0"]';
function targets(root:ParentNode){return [...root.querySelectorAll<HTMLElement>(selector)].filter(el=>el.checkVisibility()&&!el.closest('[inert]'));}
function focus(el:HTMLElement|undefined){el?.focus({preventScroll:true});el?.scrollIntoView({block:'nearest',inline:'nearest'});}
export function dispatchInput(action:InputAction){
 const modal=document.querySelector<HTMLDialogElement>('dialog[open]');const scope=modal??document;
 const nodes=targets(scope);const active=document.activeElement;
 if(action==='back'){
  if(modal){modal.dispatchEvent(new Event('cancel',{cancelable:true}));}else document.querySelector<HTMLButtonElement>('[data-input-back]:not(:disabled)')?.click();return;
 }
 if(action==='pause'){if(!modal)document.querySelector<HTMLButtonElement>('[data-input-pause]:not(:disabled)')?.click();return;}
 if(action==='confirm'){if(active instanceof HTMLElement&&nodes.includes(active))active.click();else focus(nodes[0]);return;}
 if(action==='nextSection'||action==='previousSection'){
  const sections=[...scope.querySelectorAll<HTMLElement>('[data-input-section]')].filter(el=>targets(el).length>0);
  const index=sections.reduce((found,el,i)=>active&&el.contains(active)?i:found,-1);const next=(index+(action==='nextSection'?1:-1)+sections.length)%sections.length;
  focus(sections[next]?targets(sections[next]!)[0]:nodes[0]);return;
 }
 if(!(active instanceof HTMLElement)||!nodes.includes(active)){focus(modal?nodes[0]:targets(document.querySelector('main')??document)[0]);return;}
 const box=active.getBoundingClientRect();const horizontal=action==='left'||action==='right';const sign=action==='left'||action==='up'?-1:1;
 const candidates=nodes.filter(el=>el!==active).map(el=>{const b=el.getBoundingClientRect();const dx=b.x+b.width/2-box.x-box.width/2,dy=b.y+b.height/2-box.y-box.height/2;return {el,forward:(horizontal?dx:dy)*sign,cross:Math.abs(horizontal?dy:dx)};}).filter(c=>c.forward>1).sort((a,b)=>(a.forward+a.cross*3)-(b.forward+b.cross*3));
 focus(candidates[0]?.el??nodes[(nodes.indexOf(active)+sign+nodes.length)%nodes.length]);
}
export function useGameInput(screen:string){
 useEffect(()=>{focus(document.querySelector<HTMLButtonElement>('[data-input-pause]')??targets(document.querySelector('main')??document)[0]);},[screen]);
 useEffect(()=>{
  let frame=0;let held:InputAction|null=null;let repeatAt=0;
  const keyboard=(event:KeyboardEvent)=>{
   if(event.altKey||event.ctrlKey||event.metaKey)return;
   const action=keyboardAction(event.code);if(!action)return;
   const target=event.target;
   if(target instanceof HTMLElement&&target.matches('textarea,select,[contenteditable=true],input:not([type=checkbox]):not([type=radio])')&&action!=='back')return;
   event.preventDefault();if(event.repeat&&['confirm','back','pause'].includes(action))return;
   dispatchInput(action);
  };
  const pads=()=>navigator.getGamepads?.().find(p=>p?.connected&&p.mapping==='standard');
  const poll=(now:number)=>{
   frame=0;if(document.hidden)return;const pad=pads();if(!pad){held=null;return;}
   const action=controllerAction(pad.buttons.map(b=>b.pressed),pad.axes);
   if(action!==held){held=action;repeatAt=now+400;if(action)dispatchInput(action);}
   else if(action&&['up','down','left','right'].includes(action)&&now>=repeatAt){dispatchInput(action);repeatAt=now+140;}
   frame=requestAnimationFrame(poll);
  };
  const wake=()=>{cancelAnimationFrame(frame);frame=0;held=null;if(!document.hidden&&pads())frame=requestAnimationFrame(poll);};
  document.addEventListener('keydown',keyboard);document.addEventListener('visibilitychange',wake);window.addEventListener('gamepadconnected',wake);window.addEventListener('gamepaddisconnected',wake);wake();
  return()=>{cancelAnimationFrame(frame);document.removeEventListener('keydown',keyboard);document.removeEventListener('visibilitychange',wake);window.removeEventListener('gamepadconnected',wake);window.removeEventListener('gamepaddisconnected',wake);};
 },[]);
}

export function useModal(ref:RefObject<HTMLDialogElement|null>){
 useEffect(()=>{const previous=document.activeElement;const modal=ref.current;modal?.showModal();return()=>{modal?.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};},[ref]);
}
