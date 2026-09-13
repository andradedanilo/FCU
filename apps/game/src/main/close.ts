import {ipcMain,dialog,type BrowserWindow,type IpcMainEvent} from 'electron';
import {randomUUID} from 'node:crypto';
import {text as t} from '../../../../packages/presentation/src/text.ts';
export function protectClose(window:BrowserWindow,trusted:(event:IpcMainEvent)=>boolean,idle:()=>Promise<unknown>){
 let closing=false,prompting=false,rendererGone=false,pending:{id:string;timer:ReturnType<typeof setTimeout>}|null=null;
 function clear(){if(pending)clearTimeout(pending.timer);pending=null;}
 async function recover(){
  if(prompting||window.isDestroyed())return;prompting=true;
  try{const result=await dialog.showMessageBox(window,{type:'error',message:t.processFailed,detail:t.processRecoveryHint,buttons:[t.processRestart,t.processQuit],defaultId:0,cancelId:1,noLink:true});if(window.isDestroyed())return;if(result.response===0){rendererGone=false;window.webContents.reload();}else window.destroy();}finally{prompting=false;}
 }
 async function failed(){
  clear();if(prompting||window.isDestroyed())return;prompting=true;
  try{const result=await dialog.showMessageBox(window,{type:'warning',message:t.closeSaveFailed,detail:t.closeSaveHint,buttons:[t.closeRetry,t.closeCancel,t.closeDiscard],defaultId:0,cancelId:1,noLink:true});if(window.isDestroyed()||rendererGone)return;prompting=false;if(result.response===0)request();else if(result.response===2)window.destroy();}finally{prompting=false;if(rendererGone)void recover();}
 }
 function request(){
  if(rendererGone){void recover();return;}if(pending||prompting||window.isDestroyed())return;const id=randomUUID();
  pending={id,timer:setTimeout(()=>void failed(),10000)};window.webContents.send('request-close',id);
 }
 const ready=(event:IpcMainEvent,id:unknown,ok:unknown)=>{
  if(!trusted(event)||id!==pending?.id||typeof ok!=='boolean')return;
  if(!ok){void failed();return;}
  void idle().then(()=>{if(id!==pending?.id||window.isDestroyed())return;clear();closing=true;window.close();},()=>void failed());
 };
 ipcMain.on('close-ready',ready);
 window.webContents.on('render-process-gone',()=>{clear();closing=false;rendererGone=true;void recover();});
 window.on('close',event=>{if(closing)return;event.preventDefault();request();});
 window.on('closed',()=>{clear();ipcMain.removeListener('close-ready',ready);});
}
