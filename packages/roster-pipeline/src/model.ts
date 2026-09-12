import {z} from 'zod';

export const entityId = z.string().uuid().brand<'RosterEntityId'>();
export type EntityId = z.infer<typeof entityId>;
const name = z.string().trim().min(1).max(120);
const ref = z.string().min(1).max(100);
const integer = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const competitionKey = z.enum(['ENG-T1', 'ESP-T1', 'FRA-T1', 'ITA-T1', 'DEU-T1']);
export const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'Invalid calendar date');
export const utc = z.iso.datetime();
export const role = z.enum(['GK', 'DEF', 'MID', 'FWD']);
const country = z.string().regex(/^[A-Z]{3}$/);
const rating = integer.min(1).max(100);
export const attributes = z.strictObject({goalkeeping:rating, tackling:rating, passing:rating, shooting:rating, pace:rating, stamina:rating, discipline:rating});
export const competition = z.strictObject({id:entityId, key:competitionKey, countryCode:country, displayName:name, seasonStartYear:integer.min(2000).max(2200), participatingTeamIds:z.array(entityId).min(2).max(100), rulesProfileRef:ref});
export const team = z.strictObject({id:entityId, displayName:name, shortName:z.string().min(1).max(4), color:z.string().regex(/^#[0-9a-f]{6}$/), countryCode:country, competitionId:entityId, originalVisualRef:ref});
export const player = z.strictObject({id:entityId, displayName:name, dateOfBirth:dateOnly, nationalityCodes:z.array(country).min(1).max(5), primaryRole:role, secondaryRoles:z.array(role).max(3)});
export const membership = z.strictObject({playerId:entityId, playingTeamId:entityId, owningTeamId:entityId.nullable(), isLoan:z.boolean(), validFrom:dateOnly.nullable(), validTo:dateOnly.nullable(), shirtNumber:integer.min(1).max(99).nullable()});
export const gameProfile = z.strictObject({playerId:entityId, attributes, potential:rating, generatedContract:z.strictObject({weeklyWageCents:integer, expires:dateOnly}), ratingModelVersion:ref, assumptions:z.array(name).min(1).max(20)});
export const provenance = z.strictObject({entityId, fieldPath:ref, sourceKind:z.enum(['provider','editorial','generated']), providerRef:ref.nullable(), observedAtUTC:utc, sourceUpdatedAtUTC:utc.nullable(), confidence:z.enum(['observed','estimated','reviewed']), rightsRef:ref.nullable()});
export const rosterSchema = z.strictObject({rosterSchemaVersion:z.literal(1), identityProfileId:ref, identityProfileVersion:integer.min(1), competitions:z.array(competition).length(5), teams:z.array(team).max(1000), players:z.array(player).max(50000), memberships:z.array(membership).max(50000), gameProfiles:z.array(gameProfile).max(50000)});
export type Roster = z.infer<typeof rosterSchema>;
export const auditSchema = z.strictObject({providerId:ref, adapterVersion:ref, semantics:z.enum(['current','season']), extractionStartedAt:utc, extractionCompletedAt:utc, expectedTeams:z.array(z.strictObject({competitionId:entityId, teamIds:z.array(entityId).min(2).max(100)})).length(5), completedTeamIds:z.array(entityId).max(1000), reviewedTeamIds:z.array(entityId).max(1000), unresolvedIdentities:z.array(ref).max(50000), provenance:z.array(provenance).max(300000)});
export type Audit = z.infer<typeof auditSchema>;
export type Issue = {code:string; entity:string|null; message:string};
export type Validation = {ok:true; roster:Roster; audit:Audit} | {ok:false; issues:Issue[]};
