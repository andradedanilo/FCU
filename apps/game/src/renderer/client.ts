import { careerSchema, type Career, type Request, type Result, type DesktopBridge } from '../../../../packages/contracts/src/index.ts';
declare global { interface Window { fcu:DesktopBridge } }
let worker:Worker|null=null;
let pending:{resolve:(result:Result<Career>)=>void;timer:ReturnType<typeof setTimeout>}|null=null;
function ensureWorker() {
  if(worker)return worker;
  worker=new Worker(new URL('../worker/index.ts',import.meta.url),{type:'module'});
  worker.onmessage=(event:MessageEvent<Result<Career>>)=>{
    if(!pending)return;clearTimeout(pending.timer);const task=pending;pending=null;
    const result=event.data;
    if(result.ok){const parsed=careerSchema.safeParse(result.value);task.resolve(parsed.success?{ok:true,value:parsed.data}:{ok:false,error:'WORKER_FAILED'});}
    else task.resolve(result);
  };
  worker.onerror=()=>resetWorker();return worker;
}
export function resetWorker() {worker?.terminate();worker=null;if(pending){clearTimeout(pending.timer);pending.resolve({ok:false,error:'WORKER_FAILED'});pending=null;}}
export function request(input:Request):Promise<Result<Career>> {
  if(pending)return Promise.resolve({ok:false,error:'INVALID_COMMAND'});
  const host=ensureWorker();
  return new Promise(resolve=>{pending={resolve,timer:setTimeout(resetWorker,10000)};host.postMessage(input);});
}
