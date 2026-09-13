import {z} from 'zod';
import {careerSchema,registeredPlayerSchema,commandSchema,installedRosterSchema} from './index.ts';

const id=z.string().min(1).max(100);
const count=z.number().int().min(0).max(10000);
export const collectionSchema=z.strictObject({
 rng:z.number().int().min(0).max(4294967295),earned:count,progress:z.number().int().min(0).max(2),
 fixtures:z.array(id).max(10000),seasons:z.array(z.number().int().min(2026).max(2100)).max(75),
 unlocked:z.array(id).max(60000),queued:z.array(count.positive()).max(1000),
 pending:z.strictObject({id:count.positive(),candidates:z.array(id).min(1).max(3)}).nullable(),
 consumed:z.array(z.strictObject({id:count.positive(),playerId:id})).max(10000)
});
export type Collection=z.infer<typeof collectionSchema>;
export interface RewardPlayer {id:string;ability:number}
export const dreamSchema=z.strictObject({gameMode:z.literal('dreamClub'),schema:z.literal(1),game:careerSchema.extend({players:z.array(registeredPlayerSchema).min(176).max(60200)}),snapshotId:id,tier:z.enum(['starter','club','elite']),pool:z.array(z.strictObject({id,player:registeredPlayerSchema})).min(22).max(60000),instances:z.record(z.string(),id),collection:collectionSchema});
export type Dream=z.infer<typeof dreamSchema>;
export const dreamRequestSchema=z.discriminatedUnion('type',[
 z.object({type:z.literal('New'),id:z.string().uuid(),seed:z.number().int().min(0).max(4294967295),name:z.string().trim().min(1).max(40),tier:z.enum(['starter','club','elite']),pack:installedRosterSchema.nullable()}),
 z.object({type:z.literal('Load'),state:dreamSchema}),
 z.object({type:z.literal('Match'),command:commandSchema}),
 z.object({type:z.literal('Instant')}),z.object({type:z.literal('Next')}),z.object({type:z.literal('Reveal')}),
 z.object({type:z.literal('Choose'),packId:count.positive(),playerId:id}),
 z.object({type:z.literal('Squad'),players:z.array(id).min(11).max(30)}),
 z.object({type:z.literal('Season'),tier:z.enum(['starter','club','elite'])})
]);
export type DreamRequest=z.infer<typeof dreamRequestSchema>;
