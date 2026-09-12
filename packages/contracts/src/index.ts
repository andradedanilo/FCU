import { z } from 'zod';

export const brand = { title: 'Football Club Universe', short: 'FCU', career: 'FCU Career' } as const;
export const clubId = z.string().regex(/^club-\d{2}$/).brand<'ClubId'>();
export const playerId = z.string().regex(/^player-\d{2}-\d{2}$/).brand<'PlayerId'>();
export type ClubId = z.infer<typeof clubId>;
export type PlayerId = z.infer<typeof playerId>;
const integer = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const roleSchema = z.enum(['GK', 'DEF', 'MID', 'FWD']);
export type Role = z.infer<typeof roleSchema>;
export const formationSchema=z.enum(['4-4-2','4-3-3','4-2-3-1']);
export const tacticsSchema=z.object({formation:formationSchema,mentality:z.enum(['cautious','balanced','attacking']),tempo:z.enum(['slow','normal','fast']),pressing:z.enum(['low','normal','high'])});
export type Tactics=z.infer<typeof tacticsSchema>;
export const defaultTactics:Tactics={formation:'4-4-2',mentality:'balanced',tempo:'normal',pressing:'normal'};
export const formationCounts={'4-4-2':[1,4,4,2],'4-3-3':[1,4,3,3],'4-2-3-1':[1,4,5,1]} as const;
export const clubSchema = z.object({ id: clubId, name: z.string().min(1).max(80), short: z.string().max(4), color: z.string().regex(/^#[0-9a-f]{6}$/) });
const rating = z.number().int().min(1).max(100);
export const playerSchema = z.object({ id: playerId, clubId, name: z.string().min(1).max(100), role: roleSchema, goalkeeping: rating, tackling: rating, passing: rating, shooting: rating, pace: rating, stamina: rating, discipline: rating });
export const fitPlayerSchema=playerSchema.extend({condition:integer.max(100000),morale:integer.max(100)});
export const availablePlayerSchema=fitPlayerSchema.extend({academy:z.boolean(),injuryUntil:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),leagueYellows:integer.max(4),leagueBan:integer.max(100)});
export type Player = z.infer<typeof availablePlayerSchema>;
export const trainingSchema=z.enum(['light','balanced','intense']);
export const eventSchema = z.object({ tick: integer.max(90), order: integer, clubId, playerId, assistId: playerId.nullable(), type: z.enum(['pass', 'shot', 'save', 'goal']), homeGoals: integer.max(90), awayGoals: integer.max(90) });
export const incidentEventSchema=eventSchema.extend({type:z.enum(['pass','shot','save','goal','foul','yellow','secondYellow','red','injury'])});
export type MatchEvent = z.infer<typeof incidentEventSchema>;
const statsSchema = z.object({ shots: integer.max(90), onTarget: integer.max(90), quality: integer.max(900000), possession: integer.max(900000) });
export const fixtureSchema = z.object({ id: z.string().regex(/^fixture-\d{2}-\d$/), round: integer.max(13), home: clubId, away: clubId, score: z.tuple([integer.max(90), integer.max(90)]).nullable() });
export type Fixture = z.infer<typeof fixtureSchema>;
export const substitutionSchema=z.object({tick:integer.min(1).max(89),clubId,out:playerId,in:playerId});
export const matchSchema = z.object({ fixtureId: z.string(), home: clubId, away: clubId, tick: integer.max(90), rng: integer.max(4294967295), homeLineup: z.array(playerId).length(11), awayLineup: z.array(playerId).length(11), homeGoals: integer.max(90), awayGoals: integer.max(90), homeStats: statsSchema, awayStats: statsSchema, events: z.array(eventSchema).max(600), homeBench:z.array(playerId).length(9),awayBench:z.array(playerId).length(9),substitutions:z.array(substitutionSchema).max(10),homeTactics:tacticsSchema,awayTactics:tacticsSchema });

export const tacticalCareerSchema = z.object({
  careerId: z.string().uuid(), revision: integer, appliedCommands: z.array(z.string().uuid()).max(256), seed: integer.max(4294967295),
  engineVersion: z.literal('0.2.1'), rulesetVersion: z.literal('exhibition-2'), snapshotId: z.literal('fictional-2026-v1'), identityProfileId: z.literal('fcu-city-v1'), identityProfileVersion: z.literal(1),
  date: z.string().regex(/^2026-\d{2}-\d{2}$/), clubId, clubs: z.array(clubSchema).length(8), players: z.array(playerSchema).length(176),
  tactics:tacticsSchema,lineup: z.array(playerId).length(11), fixtures: z.array(fixtureSchema).length(56), round: integer.max(14), match: matchSchema.nullable()
});
export const previousCareerSchema=tacticalCareerSchema.omit({tactics:true}).extend({engineVersion:z.literal('0.2.0'),rulesetVersion:z.literal('exhibition-1'),match:matchSchema.omit({homeTactics:true,awayTactics:true}).nullable()});
export const legacyCareerSchema=previousCareerSchema.extend({engineVersion:z.literal('0.1.0'),match:matchSchema.omit({homeBench:true,awayBench:true,substitutions:true,homeTactics:true,awayTactics:true}).nullable()});
export const planningCareerSchema=tacticalCareerSchema.extend({engineVersion:z.literal('0.2.2'),rulesetVersion:z.literal('exhibition-3'),bench:z.array(playerId).length(9),presets:z.array(tacticsSchema.nullable()).length(3),match:matchSchema.extend({managedClubId:clubId.nullable()}).nullable()});
export const conditionCareerSchema=planningCareerSchema.extend({engineVersion:z.literal('0.3.0'),rulesetVersion:z.literal('exhibition-4'),training:trainingSchema,players:z.array(fitPlayerSchema).length(176),match:matchSchema.extend({managedClubId:clubId.nullable(),condition:z.record(playerId,integer.max(100000))}).nullable()});
export const incidentMatchSchema=matchSchema.extend({homeLineup:z.array(playerId).max(11),awayLineup:z.array(playerId).max(11),managedClubId:clubId.nullable(),condition:z.record(playerId,integer.max(100000)),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),events:z.array(incidentEventSchema).max(1200),homeBench:z.array(playerId).max(9),awayBench:z.array(playerId).max(9),dismissed:z.array(playerId).max(22),injuries:z.array(z.object({playerId,until:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)})).max(22),pendingInjuries:z.array(playerId).max(11),pendingDismissal:z.boolean(),forfeit:clubId.nullable()});

export const availabilityCareerSchema=conditionCareerSchema.extend({engineVersion:z.literal('0.3.1'),rulesetVersion:z.literal('exhibition-5'),lineup:z.array(playerId).min(7).max(11),players:z.array(availablePlayerSchema).min(176).max(240),bench:z.array(playerId).max(9),match:incidentMatchSchema.nullable()});
const timedEventSchema=incidentEventSchema.extend({tick:integer.max(100),homeGoals:integer.max(100),awayGoals:integer.max(100)});
const timedStatsSchema=statsSchema.extend({shots:integer.max(100),onTarget:integer.max(100),quality:integer.max(1000000),possession:integer.max(1000000)});
export const timedMatchSchema=incidentMatchSchema.extend({tick:integer.max(100),phase:z.enum(['first','interval','second','finished']),addedTime:z.tuple([integer.max(5).nullable(),integer.max(5).nullable()]),events:z.array(timedEventSchema).max(1400),homeGoals:integer.max(100),awayGoals:integer.max(100),homeStats:timedStatsSchema,awayStats:timedStatsSchema,substitutions:z.array(substitutionSchema.extend({tick:integer.min(1).max(99)})).max(10)});
export type Match=z.infer<typeof timedMatchSchema>;
export const timedCareerSchema=availabilityCareerSchema.extend({engineVersion:z.literal('0.3.2'),rulesetVersion:z.literal('exhibition-6'),match:timedMatchSchema.nullable(),fixtures:z.array(fixtureSchema.extend({score:z.tuple([integer.max(100),integer.max(100)]).nullable()})).length(56)});
const postingSchema=z.object({account:z.union([clubId,z.literal('external')]),amount:z.number().int().min(-Number.MAX_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER)});
export const economySchema=z.object({clubs:z.array(z.object({clubId,capacity:integer.max(200000),reputation:integer.max(100),ticket:integer.max(1000000),sponsorship:integer.max(1000000000000),overhead:integer.max(10000000000),lastPrizes:integer.max(1000000000000)})).length(8),wages:z.record(playerId,integer.max(10000000000)),ledger:z.array(z.object({id:z.string().min(1).max(120),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),kind:z.enum(['opening','sponsor','wages','overhead','gate']),postings:z.tuple([postingSchema,postingSchema])})).max(20000)});
export type Economy=z.infer<typeof economySchema>;
export const careerSchema=timedCareerSchema.extend({engineVersion:z.literal('0.4.0'),rulesetVersion:z.literal('exhibition-7'),economy:economySchema});
export type Career = z.infer<typeof careerSchema>;
const commandBase = { commandId: z.string().uuid(), careerId: z.string().uuid(), expectedRevision: integer };
export const commandSchema = z.discriminatedUnion('type', [
  z.object({ ...commandBase, type: z.literal('SelectLineup'), lineup: z.array(playerId).max(22) }),
  z.object({ ...commandBase, type: z.literal('StartMatch') }),
  z.object({...commandBase,type:z.literal('SetTraining'),training:trainingSchema}),
  z.object({...commandBase,type:z.literal('AcknowledgeMatch')}),
  z.object({...commandBase,type:z.literal('CallUp')}),
  z.object({...commandBase,type:z.literal('ForfeitMatch')}),
  z.object({...commandBase,type:z.literal('SetTactics'),tactics:tacticsSchema}),
  z.object({...commandBase,type:z.literal('SelectBench'),bench:z.array(playerId).max(22)}),
  z.object({...commandBase,type:z.literal('StoreTacticPreset'),slot:z.number().int().min(0).max(2),tactics:tacticsSchema.nullable()}),
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
export type FailureCode = 'UNAVAILABLE_PLAYER' | 'MATCH_DECISION' | 'INVALID_BENCH' | 'INVALID_SUBSTITUTION' | 'INVALID_LINEUP' | 'STALE_STATE' | 'DUPLICATE_COMMAND' | 'INVALID_COMMAND' | 'INVALID_SAVE' | 'FUTURE_SAVE' | 'IO_ERROR' | 'WORKER_FAILED';
export type Result<T> = { ok: true; value: T } | { ok: false; error: FailureCode };
export type SaveEntry = { careerId: string; commitId: string; club: string; round: number; tick: number; savedAtUTC: string; kind: 'manual' | 'auto'; valid: boolean; engineVersion:string|null; error: FailureCode | null };
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
