import {useEffect,useRef,useState} from 'react';
import {useModal} from './input.ts';
import type {DiagnosticReport} from '../../../../packages/contracts/src/diagnostics.ts';
import {text as t} from '../../../../packages/presentation/src/text.ts';
import s from './App.module.css';
export function Diagnostics({close}:{close:()=>void}){
 const dialog=useRef<HTMLDialogElement|null>(null),[report,setReport]=useState<DiagnosticReport|null>(null),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);useModal(dialog);
 useEffect(()=>{let active=true;void window.fcu.diagnostics().then(result=>{if(!active)return;if(result.ok)setReport(result.value);else setNotice(t.errors[result.error]);});return()=>{active=false;};},[]);
 async function save(){setBusy(true);try{const result=await window.fcu.exportDiagnostics();setNotice(result.ok?(result.value?t.diagnosticsSaved:t.diagnosticsCancelled):t.errors[result.error]);}finally{setBusy(false);}}
 return <dialog ref={dialog} className={`${s.dialog} ${s.diagnostics}`} aria-label={t.diagnostics} onCancel={close}><header><h2>{t.diagnostics}</h2><button onClick={close}>{t.close}</button></header><p>{t.diagnosticsHint}</p>{report&&<><dl><dt>{t.diagnosticsBuild}</dt><dd>{report.payload.build.appVersion} / {report.payload.build.sourceCommit?.slice(0,12)??t.diagnosticsUnknown}{report.payload.build.sourceDirty?` / ${t.diagnosticsDirty}`:''}</dd><dt>{t.diagnosticsPlatform}</dt><dd>{report.payload.runtime.platform} / {report.payload.runtime.architecture} / Electron {report.payload.runtime.electron}</dd><dt>{t.diagnosticsOperations}</dt><dd>{report.payload.records.length}</dd></dl><details><summary>{t.diagnosticsContents}</summary><pre>{JSON.stringify(report,null,2)}</pre></details><button disabled={busy} onClick={()=>void save()}>{t.diagnosticsExport}</button></>}<p role="status">{notice}</p></dialog>;
}
