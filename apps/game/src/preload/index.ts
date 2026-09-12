import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopBridge } from '../../../../packages/contracts/src/index.ts';
const bridge:DesktopBridge={save:(state,kind)=>ipcRenderer.invoke('save',state,kind),list:()=>ipcRenderer.invoke('list'),load:(career,commit)=>ipcRenderer.invoke('load',career,commit)};
contextBridge.exposeInMainWorld('fcu',bridge);
