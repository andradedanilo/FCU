import {useEffect,useRef,useState} from 'react';
import {useModal} from './input.ts';
import {text as t} from '../../../../packages/presentation/src/text.ts';
import s from './App.module.css';
import k from './InputEditor.module.css';
type Field=HTMLInputElement|HTMLSelectElement;
export function InputEditor(){
 const [field,setField]=useState<Field|null>(null);
 useEffect(()=>{const open=(event:Event)=>{const target=event.target;if((target instanceof HTMLInputElement||target instanceof HTMLSelectElement)&&!target.disabled&&!target.closest('[data-input-editor]'))setField(target);};document.addEventListener('fcu-edit-field',open);return()=>document.removeEventListener('fcu-edit-field',open);},[]);
 return field?<Editor field={field} close={()=>setField(null)}/>:null;
}
function Editor({field,close}:{field:Field;close:()=>void}){
 const dialog=useRef<HTMLDialogElement|null>(null),[value,setValue]=useState(field.value),[upper,setUpper]=useState(false);
 useModal(dialog);
 const labelNode=field.labels?.[0]?.cloneNode(true) as HTMLLabelElement|undefined;
 labelNode?.querySelectorAll('input,select').forEach(element=>element.remove());
 const label=field.getAttribute('aria-label')||labelNode?.textContent?.trim()||t.inputValue;
 function apply(next:string){
  if(!field.isConnected||field.disabled){close();return;}
  // Use the native setter so React receives the same input/change boundary as direct editing.
  const prototype=field instanceof HTMLSelectElement?HTMLSelectElement.prototype:HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype,'value')!.set!.call(field,next);
  field.dispatchEvent(new Event(field instanceof HTMLSelectElement?'change':'input',{bubbles:true}));close();
 }
 const numeric=field instanceof HTMLInputElement&&(field.type==='number'||field.inputMode==='numeric'||field.inputMode==='decimal');
 const rows=numeric?['123','456','789','0.-']:['1234567890','qwertyuiop','asdfghjkl',"zxcvbnm-.'"];
 const limit=field instanceof HTMLInputElement&&field.maxLength>=0?field.maxLength:1000;
 return <dialog ref={dialog} data-input-editor className={`${s.dialog} ${k.editor}`} aria-label={field instanceof HTMLSelectElement?t.inputChoose:t.inputEdit} onCancel={event=>{event.preventDefault();close();}}>
  <header><h2>{label}</h2><button onClick={close}>{t.close}</button></header>
  {field instanceof HTMLSelectElement?<div className={k.options}>{[...field.options].filter(option=>!option.hidden).map((option,index)=><button key={index} disabled={option.disabled||option.parentElement instanceof HTMLOptGroupElement&&option.parentElement.disabled} aria-pressed={field.value===option.value} onClick={()=>apply(option.value)}>{option.label}</button>)}</div>:<>
   <label>{t.inputValue}<input value={value} maxLength={limit} onChange={event=>setValue(event.target.value)}/></label>
   <div className={k.keys} data-input-section>{rows.map(row=><div key={row}>{[...row].map(char=><button key={char} onClick={()=>setValue(previous=>(previous+(upper?char.toUpperCase():char)).slice(0,limit))}>{upper?char.toUpperCase():char}</button>)}</div>)}</div>
   <div className={k.actions} data-input-section>{!numeric&&<><button aria-pressed={upper} onClick={()=>setUpper(!upper)}>{t.inputShift}</button><button onClick={()=>setValue(previous=>(previous+' ').slice(0,limit))}>{t.inputSpace}</button></>}<button onClick={()=>setValue(previous=>[...previous].slice(0,-1).join(''))}>{t.inputDelete}</button><button onClick={()=>setValue('')}>{t.inputClear}</button><button className={s.primary} onClick={()=>apply(value)}>{t.inputApply}</button></div>
  </>}
 </dialog>;
}
