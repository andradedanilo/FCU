import { z } from 'zod';

export const brand = { title: 'Football Club Universe', short: 'FCU', career: 'FCU Career' } as const;
export const clubId = z.string().regex(/^club-\d{2}$/).brand<'ClubId'>();
export const playerId = z.string().regex(/^player-\d{2}-\d{2}$/).brand<'PlayerId'>();
export type ClubId = z.infer<typeof clubId>;
export type PlayerId = z.infer<typeof playerId>;
const integer = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const roleSchema = z.enum(['GK', 'DEF', 'MID', 'FWD']);
export type Role = z.infer<typeof roleSchema>;
export const clubSchema = z.object({ id: clubId, name: z.string().min(1).max(80), short: z.string().max(4), color: z.string().regex(/^#[0-9a-f]{6}$/) });
const rating = z.number().int().min(1).max(100);
export const playerSchema = z.object({ id: playerId, clubId, name: z.string().min(1).max(100), role: roleSchema, goalkeeping: rating, tackling: rating, passing: rating, shooting: rating, pace: rating, stamina: rating, discipline: rating });
export type Player = z.infer<typeof playerSchema>;
export const eventSchema = z.object({ tick: integer.max(90), order: integer, clubId, playerId, assistId: playerId.nullable(), type: z.enum(['pass', 'shot', 'save', 'goal']), homeGoals: integer.max(90), awayGoals: integer.max(90) });
export type MatchEvent = z.infer<typeof eventSchema>;
const statsSchema = z.object({ shots: integer.max(90), onTarget: integer.max(90), quality: integer.max(900000), possession: integer.max(900000) });
export const fixtureSchema = z.object({ id: z.string().regex(/^fixture-\d{2}-\d$/), round: integer.max(13), home: clubId, away: clubId, score: z.tuple([integer.max(90), integer.max(90)]).nullable() });
export type Fixture = z.infer<typeof fixtureSchema>;
export const substitutionSchema=z.object({tick:integer.min(1).max(89),clubId,out:playerId,in:playerId});
export const matchSchema = z.object({ fixtureId: z.string(), home: clubId, away: clubId, tick: integer.max(90), rng: integer.max(4294967295), homeLineup: z.array(playerId).length(11), awayLineup: z.array(playerId).length(11), homeGoals: integer.max(90), awayGoals: integer.max(90), homeStats: statsSchema, awayStats: statsSchema, events: z.array(eventSchema).max(600), homeBench:z.array(playerId).length(9),awayBench:z.array(playerId).length(9),substitutions:z.array(substitutionSchema).max(10) });
export type Match = z.infer<typeof matchSchema>;
export const careerSchema = z.object({
  careerId: z.string().uuid(), revision: integer, appliedCommands: z.array(z.string().uuid()).max(256), seed: integer.max(4294967295),
  engineVersion: z.literal('0.2.0'), rulesetVersion: z.literal('exhibition-1'), snapshotId: z.literal('fictional-2026-v1'), identityProfileId: z.literal('fcu-city-v1'), identityProfileVersion: z.literal(1),
  date: z.string().regex(/^2026-\d{2}-\d{2}$/), clubId, clubs: z.array(clubSchema).length(8), players: z.array(playerSchema).length(176),
  lineup: z.array(playerId).length(11), fixtures: z.array(fixtureSchema).length(56), round: integer.max(14), match: matchSchema.nullable()
});
export const legacyCareerSchema=careerSchema.extend({engineVersion:z.literal('0.1.0'),match:matchSchema.omit({homeBench:true,awayBench:true,substitutions:true}).nullable()});
export type Career = z.infer<typeof careerSchema>;
const commandBase = { commandId: z.string().uuid(), careerId: z.string().uuid(), expectedRevision: integer };
export const commandSchema = z.discriminatedUnion('type', [
  z.object({ ...commandBase, type: z.literal('SelectLineup'), lineup: z.array(playerId).max(22) }),
  z.object({ ...commandBase, type: z.literal('StartMatch') }),
  z.object({ ...commandBase, type:z.literal('Substitute'),out:playerId,in:playerId }),
  z.object({ ...commandBase, type: z.literal('AdvanceMatch'), minutes: z.number().int().min(1).max(90) })
]);
export type Command = z.infer<typeof commandSchema>;
export const requestSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('NewCareer'), careerId: z.string().uuid(), seed: integer.max(4294967295), clubId }),
  z.object({ type: z.literal('LoadCareer'), state: careerSchema }),
  z.object({ type: z.literal('Command'), command: commandSchema })
]);
export type Request = z.infer<typeof requestSchema>;
export type FailureCode = 'INVALID_SUBSTITUTION' | 'INVALID_LINEUP' | 'STALE_STATE' | 'DUPLICATE_COMMAND' | 'INVALID_COMMAND' | 'INVALID_SAVE' | 'FUTURE_SAVE' | 'IO_ERROR' | 'WORKER_FAILED';
export type Result<T> = { ok: true; value: T } | { ok: false; error: FailureCode };
export type SaveEntry = { careerId: string; commitId: string; club: string; round: number; tick: number; savedAtUTC: string; kind: 'manual' | 'auto'; valid: boolean; error: FailureCode | null };
export interface DesktopBridge {
  save(state: Career, kind: 'manual' | 'auto'): Promise<Result<string>>;
  list(): Promise<Result<SaveEntry[]>>;
  load(careerId: string, commitId: string): Promise<Result<Career>>;
}
export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  const object = value as Record<string, unknown>;
  return '{' + Object.keys(object).sort().map(key => JSON.stringify(key) + ':' + canonical(object[key])).join(',') + '}';
}
