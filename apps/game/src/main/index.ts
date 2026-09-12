import { app, BrowserWindow, ipcMain, session, dialog, type IpcMainInvokeEvent } from 'electron';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import { brand, type Result, type FailureCode } from '../../../../packages/contracts/src/index.ts';
import { createSaveStore } from './saves.ts';

const here=dirname(fileURLToPath(import.meta.url));
// Save identity stays fixed when the executable or product title changes.
app.setPath('userData',join(app.getPath('appData'),'fcu'));
if(process.env.FCU_USER_DATA && !app.isPackaged)app.setPath('userData',process.env.FCU_USER_DATA);
const locked=app.requestSingleInstanceLock();
if(!locked)app.quit();
else void app.whenReady().then(async()=>{
  const store=createSaveStore(join(app.getPath('userData'),'saves'));
  const productionURL=pathToFileURL(join(here,'../dist/index.html')).href;
  const devURL=!app.isPackaged&&process.env.FCU_DEV_URL==='http://localhost:5173'?'http://localhost:5173':null;
  const window=new BrowserWindow({width:1440,height:940,minWidth:800,minHeight:600,fullscreen:true,title:brand.title,backgroundColor:'#10191c',show:false,webPreferences:{preload:join(here,'preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false}});
  window.removeMenu();
  window.webContents.on('before-input-event',(event,input)=>{if(input.type==='keyDown'&&input.key==='F11'){event.preventDefault();window.setFullScreen(!window.isFullScreen());}});
  const trusted=(event:IpcMainInvokeEvent)=>event.sender===window.webContents&&event.senderFrame===window.webContents.mainFrame&&(event.senderFrame.url===productionURL||event.senderFrame.url===`${devURL}/`);
  const route=<T>(fn:(...args:unknown[])=>Promise<T>)=>async(event:IpcMainInvokeEvent,...args:unknown[]):Promise<Result<T>>=>{
    if(!trusted(event))return {ok:false,error:'INVALID_COMMAND'};
    try{return {ok:true,value:await fn(...args)};}catch(error){const code:FailureCode=error instanceof Error&&error.message==='FUTURE_SAVE'?'FUTURE_SAVE':error instanceof Error&&error.message==='INVALID_SAVE'?'INVALID_SAVE':'IO_ERROR';return {ok:false,error:code};}
  };
  ipcMain.handle('save',route(async(state,kind)=>store.save(state,z.enum(['manual','auto']).parse(kind))));
  ipcMain.handle('list',route(async()=>store.list()));
  ipcMain.handle('load',route(async(career,commit)=>store.load(z.string().uuid().parse(career),z.string().uuid().parse(commit))));
  session.defaultSession.setPermissionRequestHandler((_webContents,_permission,callback)=>callback(false));
  session.defaultSession.setPermissionCheckHandler(()=>false);
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',event=>event.preventDefault());
  window.webContents.on('will-attach-webview',event=>event.preventDefault());
  let closing=false;
  window.on('close',event=>{if(closing)return;event.preventDefault();void store.idle().then(()=>{closing=true;window.close();});});
  window.webContents.on('render-process-gone',()=>{void dialog.showMessageBox({type:'error',message:'FCU stopped unexpectedly. Reopen the game and load a confirmed save.'});});
  app.on('second-instance',()=>{window.restore();window.focus();});
  window.once('ready-to-show',()=>window.show());
  await window.loadURL(devURL??productionURL);
});
app.on('window-all-closed',()=>app.quit());
