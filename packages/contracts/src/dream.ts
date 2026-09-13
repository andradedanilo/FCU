import {z} from 'zod';

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
