import {app,BrowserWindow,ipcMain,dialog,session,type IpcMainInvokeEvent} from 'electron';
import {readFile,mkdir,writeFile,rename,open} from 'node:fs/promises';
import {join,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {z} from 'zod';
import {rosterSchema,auditSchema,type EntityId} from '../../../packages/roster-pipeline/src/model.ts';
import {fictionalCandidate} from '../../../packages/roster-pipeline/src/fictional.ts';
import {validateRoster} from '../../../packages/roster-pipeline/src/validate.ts';
import {approve,canonical,canonicalRoster,rosterChanges,sha256} from '../../../packages/roster-pipeline/src/review.ts';
import {createArchive,openArchive,type OpenPack} from '../../../packages/roster-pipeline/src/archive.ts';
import {writeArchive,listArchives} from '../../../packages/roster-pipeline/src/store.ts';
import {actionSchema,type Reply,type View} from './contract.ts';

const here=dirname(fileURLToPath(import.meta.url));
const directory=process.env.FCU_PUBLISHER_DIR??join(here,'../apps/roster-tool/.local');
app.setPath('userData',join(directory,'electron'));
const documentSchema=z.strictObject({roster:rosterSchema,audit:auditSchema});
const sessionSchema=documentSchema.extend({approvedHash:z.string().length(64).nullable(),exported:z.string().nullable()});
let current:z.infer<typeof sessionSchema>|null=null;
let previous:OpenPack|null=null;
const trust={allowDevelopment:true,trustedKeys:new Map()};
async function loadPrevious(){
  const archives=await listArchives(join(directory,'exports'),trust);
  const latest=archives.at(-1);
  previous=latest?openArchive(await readFile(join(directory,'exports',latest.snapshotId+'.zip')),trust):null;
}
const currentHash=()=>current?sha256(canonicalRoster(current.roster)+canonical(current.audit)):null;
const view=(message:string|null=null):View=>{
  const result=current?validateRoster(current.roster,current.audit):null;
  return {previousSnapshotId:previous?.manifest.snapshotId??null,previousTeams:previous?.roster.teams??[],changes:current?rosterChanges(previous?.roster??null,current.roster):[],roster:current?.roster??null,reviewedTeamIds:current?.audit.reviewedTeamIds??[],issues:result&&!result.ok?result.issues:[],hash:currentHash(),approved:!!current&&current.approvedHash===currentHash(),provider:current?.audit.providerId??null,exported:current?.exported??null,message};
};
async function persist(){await mkdir(directory,{recursive:true});const path=join(directory,'candidate.json');await writeFile(path+'.tmp',JSON.stringify(current));await rename(path+'.tmp',path);}
if(!app.requestSingleInstanceLock())app.quit();
else void app.whenReady().then(async()=>{
  await mkdir(directory,{recursive:true});
  try{current=sessionSchema.parse(JSON.parse(await readFile(join(directory,'candidate.json'),'utf8')));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')await dialog.showMessageBox({type:'warning',message:'The previous publisher candidate could not be read. Its file is preserved.'});}
  await loadPrevious();
  const url=pathToFileURL(join(here,'../dist-roster/index.html')).href;
  const window=new BrowserWindow({title:'FCU Roster Publisher',width:1360,height:900,minWidth:900,minHeight:650,webPreferences:{preload:join(here,'preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false}});
  window.removeMenu();window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',e=>e.preventDefault());window.webContents.on('will-attach-webview',e=>e.preventDefault());session.defaultSession.setPermissionRequestHandler((_w,_p,cb)=>cb(false));session.defaultSession.setPermissionCheckHandler(()=>false);
  const trusted=(e:IpcMainInvokeEvent)=>e.sender===window.webContents&&e.senderFrame===window.webContents.mainFrame&&e.senderFrame.url===url;
  ipcMain.handle('publisher:read',(e:IpcMainInvokeEvent):Reply=>trusted(e)?{ok:true,view:view()}:{ok:false,message:'Untrusted request.'});
  let queue=Promise.resolve<Reply>({ok:true,view:view()});
  ipcMain.handle('publisher:act',(e:IpcMainInvokeEvent,raw:unknown)=>{
    if(!trusted(e))return {ok:false,message:'Untrusted request.'};
    queue=queue.then(async():Promise<Reply>=>{
      try{
        const action=actionSchema.parse(raw);let message:string|null=null;
        if(action.type==='fixture')current={...fictionalCandidate(),approvedHash:null,exported:null};
        else if(action.type==='import'){
          const selected=await dialog.showOpenDialog(window,{filters:[{name:'Normalized roster candidate',extensions:['json']}],properties:['openFile']});
          if(selected.canceled)return {ok:true,view:view()};
          const handle=await open(selected.filePaths[0]!,'r');let content:string;
          try{if((await handle.stat()).size>20*1024*1024)throw Error('Candidate exceeds 20 MB.');content=await handle.readFile('utf8');}finally{await handle.close();}
          current={...documentSchema.parse(JSON.parse(content)),approvedHash:null,exported:null};
        }else{
          if(!current||action.hash!==currentHash())throw Error('Candidate changed. Refresh the review.');
          if(action.type==='review'){
            if(!current.roster.teams.some(t=>t.id===action.teamId))throw Error('Unknown club.');
            current.audit.reviewedTeamIds=[...new Set([...current.audit.reviewedTeamIds,action.teamId])].sort() as EntityId[];current.approvedHash=null;
          }else if(action.type==='reviewFixture'){
            if(current.audit.providerId!=='fictional'||canonicalRoster(current.roster)!==canonicalRoster(fictionalCandidate().roster))throw Error('Bulk review is only available for the unchanged synthetic fixture.');
            current.audit.reviewedTeamIds=current.roster.teams.map(t=>t.id).sort();current.approvedHash=null;
          }else if(action.type==='approve'){
            const approval=approve(current.roster,current.audit,action.hash,'Local operator',new Date().toISOString());current.approvedHash=approval.reviewHash;
          }else{
            if(current.approvedHash!==action.hash)throw Error('Approve this exact candidate before export.');
            const output=join(directory,'exports');
            const archives=await listArchives(output,trust);const hash=sha256(canonicalRoster(current.roster));
            if(archives.some(a=>a.contentHash===hash&&a.compatibleSaveSchemaMax>=18)){message='No roster changes; existing export retained.';return {ok:true,view:view(message)};}
            const year=current.roster.competitions[0]!.seasonStartYear;const base=`roster-${year}-${String(year+1).slice(-2)}.${new Date().toISOString().slice(0,10).replaceAll('-','')}.r`;
            const revision=1+Math.max(0,...archives.filter(a=>a.snapshotId.startsWith(base)).map(a=>Number(a.snapshotId.slice(base.length))));
            const approval=approve(current.roster,current.audit,action.hash,'Local operator',new Date().toISOString());
            const bytes=createArchive(current.roster,current.audit,approval,{snapshotId:base+revision,previousSnapshotId:archives.at(-1)?.snapshotId??null,attribution:'FCU publisher development candidate',rightsRef:null,notices:'Unsigned development candidate. Abilities and contracts are generated estimates.',key:null});
            current.exported=await writeArchive(output,bytes,trust);
            await loadPrevious();
          }
        }
        await persist();return {ok:true,view:view(message)};
      }catch(error){return {ok:false,message:error instanceof z.ZodError?'Candidate data or command does not match the required schema.':error instanceof Error?error.message:'Publisher operation failed.'};}
    });return queue;
  });
  let closing=false;window.on('close',event=>{if(closing)return;event.preventDefault();void queue.finally(()=>{closing=true;window.close();});});
  app.on('second-instance',()=>{window.restore();window.focus();});await window.loadURL(url);
});
app.on('window-all-closed',()=>app.quit());
