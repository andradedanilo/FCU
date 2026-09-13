import {z} from 'zod';
import {entityId,type Roster,type Issue} from '../../../packages/roster-pipeline/src/model.ts';
export const actionSchema=z.discriminatedUnion('type',[
  z.strictObject({type:z.literal('fixture')}),z.strictObject({type:z.literal('import')}),
  z.strictObject({type:z.literal('review'),hash:z.string().length(64),teamId:entityId}),
  z.strictObject({type:z.literal('reviewFixture'),hash:z.string().length(64)}),
  z.strictObject({type:z.literal('approve'),hash:z.string().length(64)}),
  z.strictObject({type:z.literal('export'),hash:z.string().length(64)})
]);
export type Action=z.infer<typeof actionSchema>;
export type View={roster:Roster|null;reviewedTeamIds:string[];issues:Issue[];hash:string|null;approved:boolean;provider:string|null;exported:string|null;message:string|null};
export type Reply={ok:true;view:View}|{ok:false;message:string};
export interface PublisherBridge{read:()=>Promise<Reply>;act:(action:Action)=>Promise<Reply>}
declare global{interface Window{publisher:PublisherBridge}}
