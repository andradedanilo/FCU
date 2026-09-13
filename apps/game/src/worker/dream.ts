import {dreamRequestSchema,type Dream} from '../../../../packages/contracts/src/dream.ts';
import type {Result} from '../../../../packages/contracts/src/index.ts';
import {newDream,dreamCommand,validateDream} from '../../../../packages/simulation/src/dreamSeason.ts';
let state:Dream|null=null;
self.onmessage=(event:MessageEvent<unknown>)=>{
 let result:Result<Dream>;
 try{const r=dreamRequestSchema.parse(event.data);state=r.type==='New'?newDream(r):r.type==='Load'?validateDream(r.state):state?dreamCommand(state,r):null;result=state?{ok:true,value:state}:{ok:false,error:'INVALID_COMMAND'};}
 catch{result={ok:false,error:'INVALID_COMMAND'};}self.postMessage(result);
};
