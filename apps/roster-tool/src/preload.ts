import {contextBridge,ipcRenderer} from 'electron';
import type {PublisherBridge} from './contract.ts';
contextBridge.exposeInMainWorld('publisher',{read:()=>ipcRenderer.invoke('publisher:read'),act:action=>ipcRenderer.invoke('publisher:act',action)} satisfies PublisherBridge);
