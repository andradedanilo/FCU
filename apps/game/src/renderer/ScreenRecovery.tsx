import {Component,useEffect,useState,type ReactNode} from 'react';
import {brand} from '../../../../packages/contracts/src/index.ts';
import {text as t} from '../../../../packages/presentation/src/text.ts';
import {useGameInput} from './input.ts';
import s from './App.module.css';
function Recovery({restart}:{restart:()=>void}){
 const [notice,setNotice]=useState(''),[busy,setBusy]=useState(false);useGameInput('recovery');
 useEffect(()=>window.fcu.onCloseRequested(async()=>true),[]);
 async function report(){setBusy(true);try{const result=await window.fcu.exportDiagnostics();setNotice(result.ok?(result.value?t.diagnosticsSaved:t.diagnosticsCancelled):t.errors[result.error]);}catch{setNotice(t.errors.IO_ERROR);}finally{setBusy(false);}}
 return <main className={s.recovery}><section><p>{brand.title}</p><h1>{t.screenFailed}</h1><p>{t.screenRecoveryHint}</p><button disabled={busy} onClick={restart}>{t.screenRestart}</button><button disabled={busy} onClick={()=>void report()}>{t.diagnosticsExport}</button><p>{t.diagnosticsHint}</p><p role="status">{notice}</p></section></main>;
}
export class ScreenRecovery extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<Recovery restart={()=>this.setState({failed:false})}/>:this.props.children;}
}
