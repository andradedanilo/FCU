import { requestSchema, type Career, type Result } from '../../../../packages/contracts/src/index.ts';
import { applyCommand, createCareer, validateCareer } from '../../../../packages/simulation/src/engine.ts';
let state:Career|null=null;
self.onmessage=(event:MessageEvent<unknown>)=>{
  let result:Result<Career>;
  try {
    const request=requestSchema.parse(event.data);
    if(request.type==='NewCareer')result={ok:true,value:createCareer(request.careerId,request.seed,request.clubId,request.world)};
    else if(request.type==='LoadCareer')result={ok:true,value:validateCareer(request.state)};
    else result=state?applyCommand(state,request.command):{ok:false,error:'INVALID_COMMAND'};
    if(result.ok)state=result.value;
  }catch{result={ok:false,error:'INVALID_COMMAND'};}
  self.postMessage(result);
};
