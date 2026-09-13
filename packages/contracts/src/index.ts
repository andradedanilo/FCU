import { z } from 'zod';
import {rosterSchema} from './roster.ts';
export const installedRosterSchema=z.strictObject({snapshotId:z.string().regex(/^roster-\d{4}-\d{2}\.\d{8}\.r[1-9]\d{0,5}$/),contentHash:z.string().regex(/^[a-f0-9]{64}$/),observedAt:z.iso.datetime(),development:z.boolean(),roster:rosterSchema});
export type InstalledRoster=z.infer<typeof installedRosterSchema>;

export const brand = { title: 'Football Club Universe', short: 'FCU', career: 'FCU Career', dreamClub:'FCU Dream Club' } as const;
export const clubId = z.string().regex(/^club-\d{2,3}$/).brand<'ClubId'>();
export const playerId = z.string().regex(/^player-\d{2,3}-\d{2,5}$/).brand<'PlayerId'>();
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
export const transferablePlayerSchema=availablePlayerSchema.extend({clubId:clubId.nullable()});
export const registeredPlayerSchema=transferablePlayerSchema.extend({registered:z.boolean()});
export const playerPerformanceSchema=z.object({season:integer.min(2026).max(2101),clubId,competition:z.enum(['league','domestic','continental']),fromDate:z.iso.date(),appearances:integer.max(300),starts:integer.max(300),minutes:integer.max(39000),goals:integer.max(3000),assists:integer.max(3000),yellows:integer.max(600),reds:integer.max(300)});
export const transferListingSchema=z.object({kind:z.enum(['sale','loan']),fee:integer.max(1000000000000),share:z.union([z.literal(0),z.literal(50),z.literal(100)])}).refine(l=>l.kind==='sale'||l.fee===0);
export const positionedPlayerSchema=registeredPlayerSchema.extend({secondaryRoles:z.array(roleSchema).max(3).optional(),transferListing:transferListingSchema.optional(),performance:z.array(playerPerformanceSchema).max(1000).optional()}).refine(p=>new Set(p.secondaryRoles??[]).size===(p.secondaryRoles??[]).length&&!(p.secondaryRoles??[]).includes(p.role));
export type Player = z.infer<typeof positionedPlayerSchema>;
export const trainingSchema=z.enum(['light','balanced','intense']);
export const eventSchema = z.object({ tick: integer.max(90), order: integer, clubId, playerId, assistId: playerId.nullable(), type: z.enum(['pass', 'shot', 'save', 'goal']), homeGoals: integer.max(90), awayGoals: integer.max(90) });
export const incidentEventSchema=eventSchema.extend({type:z.enum(['pass','shot','save','goal','foul','yellow','secondYellow','red','injury'])});
export const attackingEventSchema=incidentEventSchema.extend({tick:integer.max(130),homeGoals:integer.max(130),awayGoals:integer.max(130),type:z.enum([...incidentEventSchema.shape.type.options,'offside','disallowedOffside','disallowedFoul','corner','post','penalty','clearance'])});
export type MatchEvent = z.infer<typeof attackingEventSchema>;
const statsSchema = z.object({ shots: integer.max(90), onTarget: integer.max(90), quality: integer.max(900000), possession: integer.max(900000) });
export const fixtureSchema = z.object({ id: z.string().regex(/^fixture-\d{2}-\d$/), round: integer.max(13), home: clubId, away: clubId, score: z.tuple([integer.max(90), integer.max(90)]).nullable() });
export type Fixture = z.infer<typeof competitionFixtureSchema>;
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
export type Match=NonNullable<z.infer<typeof careerSchema>['match']>;
export const timedCareerSchema=availabilityCareerSchema.extend({engineVersion:z.literal('0.3.2'),rulesetVersion:z.literal('exhibition-6'),match:timedMatchSchema.nullable(),fixtures:z.array(fixtureSchema.extend({score:z.tuple([integer.max(100),integer.max(100)]).nullable()})).length(56)});
const postingSchema=z.object({account:z.union([clubId,z.literal('external')]),amount:z.number().int().min(-Number.MAX_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER)});
export const economySchema=z.object({clubs:z.array(z.object({clubId,capacity:integer.max(200000),reputation:integer.max(100),ticket:integer.max(1000000),sponsorship:integer.max(1000000000000),overhead:integer.max(10000000000),lastPrizes:integer.max(1000000000000)})).length(8),wages:z.record(playerId,integer.max(10000000000)),ledger:z.array(z.object({id:z.string().min(1).max(120),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),kind:z.enum(['opening','sponsor','wages','overhead','gate']),postings:z.tuple([postingSchema,postingSchema])})).max(20000)});
export type Economy=z.infer<typeof economySchema>;
export const financialCareerSchema=timedCareerSchema.extend({engineVersion:z.literal('0.4.0'),rulesetVersion:z.literal('exhibition-7'),economy:economySchema});
export const promisedRoleSchema=z.enum(['starter','rotation','prospect']);
export const contractSchema=z.object({ownerId:clubId,ends:z.string().regex(/^\d{4}-06-30$/),birthDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),role:promisedRoleSchema,revision:integer});
export type Contract=z.infer<typeof transferableContractSchema>;
export const contractEconomySchema=economySchema.extend({ledger:z.array(economySchema.shape.ledger.element.extend({kind:z.enum(['opening','sponsor','wages','overhead','gate','signingBonus'])})).max(20000)});
export const renewalCareerSchema=financialCareerSchema.extend({engineVersion:z.literal('0.4.1'),rulesetVersion:z.literal('exhibition-8'),economy:contractEconomySchema,contracts:z.record(playerId,contractSchema)});
const scoutReportSchema=z.object({low:integer.max(100),high:integer.max(100),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)});
export const scoutingSchema=z.object({shortlist:z.array(playerId).max(240),active:z.object({playerId,due:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)}).nullable(),reports:z.record(playerId,scoutReportSchema)});
export const scoutingCareerSchema=renewalCareerSchema.extend({engineVersion:z.literal('0.4.2'),rulesetVersion:z.literal('exhibition-9'),scouting:scoutingSchema});
export const historicalMatchSchema=timedMatchSchema.extend({participants:z.record(playerId,clubId)});
export const transferableContractSchema=contractSchema.extend({ownerId:clubId.nullable(),ends:z.string().regex(/^\d{4}-06-30$/).nullable()});
export const offerId=z.string().uuid().brand<'OfferId'>();
export type OfferId=z.infer<typeof offerId>;
const offerTermsSchema=z.object({years:z.number().int().min(1).max(5),wage:integer.max(10000000000),bonus:integer.max(1000000000000),role:promisedRoleSchema});
export const offerSchema=z.object({id:offerId,playerId,buyerId:clubId,sellerId:clubId.nullable(),contractRevision:integer,fee:integer.max(1000000000000),date:z.string(),responseDate:z.string(),expires:z.string(),activation:z.string().nullable(),buyerCounters:integer.max(2),sellerCounters:integer.max(2),status:z.enum(['submitted','countered','accepted','ready','queued','rejected','expired','withdrawn','completed']),reason:z.enum(['price','squad','ownership','funds','wages','reputation','competing']).nullable(),terms:offerTermsSchema.nullable()});
export const loanOfferSchema=offerSchema.extend({loanShare:z.union([z.literal(0),z.literal(50),z.literal(100)]).nullable()});
export type Offer=z.infer<typeof loanOfferSchema>;
export const transferEconomySchema=contractEconomySchema.extend({ledger:z.array(contractEconomySchema.shape.ledger.element.extend({kind:z.enum(['opening','sponsor','wages','overhead','gate','signingBonus','transferFee'])})).max(20000)});
export const transferCareerSchema=scoutingCareerSchema.extend({date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),engineVersion:z.literal('0.4.3'),rulesetVersion:z.literal('exhibition-10'),players:z.array(transferablePlayerSchema).min(176).max(300),contracts:z.record(playerId,transferableContractSchema),match:historicalMatchSchema.nullable(),economy:transferEconomySchema,offers:z.array(offerSchema).max(5000)});
export const recruitingCareerSchema=transferCareerSchema.extend({engineVersion:z.literal('0.4.4'),rulesetVersion:z.literal('exhibition-11')});
export const loanSchema=z.object({id:offerId,playerId,parent:clubId,borrower:clubId,ends:z.string().regex(/^\d{4}-06-30$/),share:z.union([z.literal(0),z.literal(50),z.literal(100)]),status:z.enum(['active','returned'])});
export const exhibitionCareerSchema=recruitingCareerSchema.extend({engineVersion:z.literal('0.4.5'),rulesetVersion:z.literal('exhibition-12'),offers:z.array(loanOfferSchema).max(5000),loans:z.array(loanSchema).max(5000)});
export const seasonalFixtureSchema=fixtureSchema.extend({id:z.string().regex(/^fixture-(?:\d{4}-)?\d{2}-\d{1,2}$/),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),score:z.tuple([integer.max(100),integer.max(100)]).nullable()});
const tableRowSchema=z.object({clubId,played:integer,won:integer,drawn:integer,lost:integer,gf:integer,ga:integer,points:integer});
export const seasonHistorySchema=z.object({year:integer.min(2026).max(2100),fixtures:z.array(seasonalFixtureSchema).length(56),table:z.array(tableRowSchema).length(8)});
const seasonEconomySchema=transferEconomySchema.extend({ledger:z.array(transferEconomySchema.shape.ledger.element.extend({kind:z.enum(['opening','sponsor','wages','overhead','gate','signingBonus','transferFee','prize'])})).max(20000)});
export const repeatingCareerSchema=exhibitionCareerSchema.extend({economy:seasonEconomySchema,engineVersion:z.literal('0.5.0'),rulesetVersion:z.literal('exhibition-13'),season:integer.min(2026).max(2100),players:z.array(transferablePlayerSchema).min(176).max(5000),fixtures:z.array(seasonalFixtureSchema).length(56),history:z.array(seasonHistorySchema).max(100)});
export const divisionSchema=z.object({id:z.string().regex(/^(EXH|ENG[12]|ESP[12]|FRA[12]|ITA[12]|DEU[12])$/),country:z.enum(['EXH','ENG','ESP','FRA','ITA','DEU']),tier:z.union([z.literal(1),z.literal(2)]),clubs:z.array(clubId).min(8).max(20)});
export type Division=z.infer<typeof divisionSchema>;
export const worldSchema=z.object({kind:z.enum(['exhibition','countries']),divisions:z.array(divisionSchema).min(1).max(10)});
export const worldFixtureSchema=seasonalFixtureSchema.extend({id:z.string().regex(/^fixture-(?:(?:\d{4}-)?\d{2}-\d{1,2}|\d{4}-(?:ENG|ESP|FRA|ITA|DEU)[12]-\d{2}-\d{1,2})$/),round:integer.max(99),competitionId:z.string().max(20)});
const worldEconomySchema=seasonEconomySchema.extend({clubs:z.array(economySchema.shape.clubs.element).min(8).max(176),ledger:z.array(seasonEconomySchema.shape.ledger.element).max(100000)});
const worldHistorySchema=seasonHistorySchema.extend({fixtures:z.array(worldFixtureSchema).max(10000),table:z.array(tableRowSchema).min(8).max(176),divisions:z.array(divisionSchema).min(1).max(10),balances:z.record(clubId,z.number().int().min(-Number.MAX_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER)),prizes:z.record(clubId,integer)});
export const countryCareerSchema=repeatingCareerSchema.extend({engineVersion:z.literal('0.5.1'),rulesetVersion:z.literal('world-1'),snapshotId:z.enum(['fictional-2026-v1','fictional-world-2026-v1']),identityProfileVersion:z.union([z.literal(1),z.literal(2)]),world:worldSchema,clubs:z.array(clubSchema).min(8).max(176),players:z.array(transferablePlayerSchema).min(176).max(20000),round:integer.max(100),fixtures:z.array(worldFixtureSchema).max(10000),economy:worldEconomySchema,history:z.array(worldHistorySchema).max(100)});

export const cupLegSchema=z.object({fixtureId:z.string().max(90),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),home:clubId,away:clubId,neutral:z.boolean()});
export const cupTieSchema=z.object({id:z.string().max(80),legs:z.array(cupLegSchema).min(1).max(2),winner:clubId.nullable()});
export const cupRoundSchema=z.object({number:integer.max(5),byes:z.array(clubId).max(32),ties:z.array(cupTieSchema).min(1).max(16)});
export const cupSchema=z.object({id:z.enum(['ENG-CUP','ESP-CUP','FRA-CUP','ITA-CUP','DEU-CUP','CONTINENTAL']),kind:z.enum(['domestic','continental']),entrants:z.array(clubId).min(16).max(36),rounds:z.array(cupRoundSchema).min(1).max(6)});
export type Cup=z.infer<typeof cupSchema>;
export type CupTie=z.infer<typeof cupTieSchema>;
export const competitionClassSchema=z.enum(['league','domestic','continental']);
export type CompetitionClass=z.infer<typeof competitionClassSchema>;
const scoreSchema=z.tuple([integer.max(1000),integer.max(1000)]);
export const competitionFixtureSchema=worldFixtureSchema.extend({id:z.string().max(90),score:scoreSchema.nullable(),forfeit:clubId.nullable(),competitionClass:competitionClassSchema,neutral:z.boolean(),decider:z.boolean(),cupTieId:z.string().max(80).nullable(),shootout:scoreSchema.nullable()});
export const penaltyKickSchema=z.object({clubId,playerId,scored:z.boolean()});
export const knockoutMatchSchema=historicalMatchSchema.extend({homeGoals:integer.max(130),awayGoals:integer.max(130),tick:integer.max(130),phase:z.enum(['first','interval','second','extraFirst','extraInterval','extraSecond','finished']),events:z.array(timedEventSchema.extend({tick:integer.max(130),homeGoals:integer.max(130),awayGoals:integer.max(130)})).max(1900),substitutions:z.array(substitutionSchema.extend({tick:integer.min(1).max(129)})).max(10),homeStats:timedStatsSchema.extend({possession:integer.max(1300000),shots:integer.max(130),onTarget:integer.max(130),quality:integer.max(1300000)}),awayStats:timedStatsSchema.extend({possession:integer.max(1300000),shots:integer.max(130),onTarget:integer.max(130),quality:integer.max(1300000)}),competitionClass:competitionClassSchema,neutral:z.boolean(),decider:z.boolean(),aggregate:scoreSchema,extraTime:z.boolean(),penalties:z.array(penaltyKickSchema).max(2048)});
const disciplineCounter=z.object({yellows:integer.max(2),ban:integer.max(100)});
export const competitionCareerSchema=countryCareerSchema.extend({scouting:scoutingSchema.extend({shortlist:z.array(playerId).max(20000)}),engineVersion:z.literal('0.5.2'),rulesetVersion:z.literal('world-2'),fixtures:z.array(competitionFixtureSchema).max(10000),match:knockoutMatchSchema.nullable(),cupStartSeason:integer.min(2026).max(2101),cups:z.array(cupSchema).max(6),cupDiscipline:z.record(playerId,z.object({domestic:disciplineCounter,continental:disciplineCounter})),history:z.array(worldHistorySchema.extend({fixtures:z.array(competitionFixtureSchema).max(10000),cups:z.array(cupSchema).max(6)})).max(100)});
export const rosterCareerSchema=competitionCareerSchema.extend({engineVersion:z.literal('0.6.0'),snapshotId:z.string().min(1).max(100),rosterOrigin:z.strictObject({contentHash:z.string().regex(/^[a-f0-9]{64}$/),observedAt:z.iso.datetime(),development:z.boolean(),playerIds:z.record(playerId,z.string().uuid()),clubIds:z.record(clubId,z.string().uuid())}).nullable()});
export const registrationCareerSchema=rosterCareerSchema.extend({engineVersion:z.literal('0.6.1'),players:z.array(registeredPlayerSchema).min(176).max(60000),loans:z.array(loanSchema.extend({source:z.enum(['market','roster'])})).max(5000)});
export const facilityKind=z.enum(['academy','recovery']);
export const facilitySchema=z.strictObject({academy:integer.max(3),recovery:integer.max(3),construction:z.strictObject({kind:facilityKind,level:integer.min(1).max(3),started:z.iso.date(),due:z.iso.date()}).nullable()});
export const facilitiesCareerSchema=registrationCareerSchema.extend({engineVersion:z.literal('0.7.0'),facilities:z.record(clubId,facilitySchema),economy:worldEconomySchema.extend({ledger:z.array(worldEconomySchema.shape.ledger.element.extend({kind:z.enum(['opening','sponsor','wages','overhead','gate','signingBonus','transferFee','prize','facility'])})).max(100000)})});
export const focusSchema=z.enum(['balanced','defence','attack','fitness']);
export const personSchema=z.strictObject({potential:integer.min(1).max(100),retired:integer.min(2026).nullable(),minutes:integer.max(100000),starts:integer.max(1000),eligible:integer.max(1000)});
export const personnelSchema=z.strictObject({players:z.record(playerId,personSchema),focus:focusSchema,lastReview:z.iso.date(),training:z.record(clubId,z.strictObject({days:integer.max(366),intensity:integer.max(50000),balanced:integer.max(366),defence:integer.max(366),attack:integer.max(366),fitness:integer.max(366)})),reports:z.array(z.strictObject({playerId,clubId:clubId.nullable(),kind:z.enum(['development','retired','arrived','released','role']),change:z.number().int().min(-100).max(100),date:z.iso.date()})).max(60000)});
export const personnelCareerSchema=facilitiesCareerSchema.extend({engineVersion:z.literal('0.7.1'),personnel:personnelSchema});
export const boardSchema=z.strictObject({assisted:z.boolean(),status:z.enum(['employed','dismissed','retired']),since:z.iso.date(),vacancies:z.array(clubId).max(3),history:z.array(z.strictObject({clubId,from:z.iso.date(),to:z.iso.date(),reason:z.enum(['performance','debt','retirement'])})).max(1000),clubs:z.record(clubId,z.strictObject({confidence:integer.max(100),target:integer.min(1).max(100),played:integer.max(100),negativeSince:z.iso.date().nullable(),loan:z.strictObject({principal:integer.positive(),remaining:integer,started:z.iso.date(),paid:integer.max(52)}).nullable()}))});
export const boardCareerSchema=personnelCareerSchema.extend({engineVersion:z.literal('0.7.2'),board:boardSchema,economy:personnelCareerSchema.shape.economy.extend({ledger:z.array(personnelCareerSchema.shape.economy.shape.ledger.element.extend({kind:z.enum(['opening','sponsor','wages','overhead','gate','signingBonus','transferFee','prize','facility','boardLoan','boardRepayment'])})).max(100000)})});
export const marketRecordSchema=offerSchema.pick({id:true,playerId:true,buyerId:true,sellerId:true,date:true,fee:true}).extend({wage:integer});
export const archivedCareerSchema=boardCareerSchema.extend({engineVersion:z.literal('0.7.3'),marketArchive:z.array(marketRecordSchema).max(100000)});
export const preAttackCareerSchema=archivedCareerSchema.extend({engineVersion:z.literal('0.7.4')});
export const prePositionCareerSchema=preAttackCareerSchema.extend({engineVersion:z.literal('0.7.5'),match:knockoutMatchSchema.extend({events:z.array(attackingEventSchema).max(3000),homeStats:knockoutMatchSchema.shape.homeStats.extend({shots:integer.max(260),onTarget:integer.max(260),quality:integer.max(2600000)}),awayStats:knockoutMatchSchema.shape.awayStats.extend({shots:integer.max(260),onTarget:integer.max(260),quality:integer.max(2600000)})}).nullable()});
export const preOutgoingCareerSchema=prePositionCareerSchema.extend({engineVersion:z.literal('0.7.6'),players:z.array(positionedPlayerSchema).min(176).max(60000)});
export const preRecordsCareerSchema=preOutgoingCareerSchema.extend({engineVersion:z.literal('0.7.7')});
export const careerSchema=preRecordsCareerSchema.extend({engineVersion:z.literal('0.7.8')});
export type Career=z.infer<typeof careerSchema>;


const commandBase = { commandId: z.string().uuid(), careerId: z.string().uuid(), expectedRevision: integer };
export const commandSchema = z.discriminatedUnion('type', [
  z.object({ ...commandBase, type: z.literal('SelectLineup'), lineup: z.array(playerId).max(22) }),
  z.object({ ...commandBase, type: z.literal('StartMatch') }),
  z.object({...commandBase,type:z.literal('SetTransferListing'),playerId,listing:transferListingSchema.nullable()}),
  z.object({...commandBase,type:z.literal('RespondBid'),offerId,accept:z.boolean()}),
  z.object({...commandBase,type:z.literal('CloseSeason')}),
  z.object({...commandBase,type:z.literal('SubmitLoan'),playerId,share:z.union([z.literal(0),z.literal(50),z.literal(100)])}),
  z.object({...commandBase,type:z.literal('SubmitOffer'),playerId,fee:integer.max(1000000000000)}),
  z.object({...commandBase,type:z.literal('CounterOffer'),offerId,fee:integer.max(1000000000000)}),
  z.object({...commandBase,type:z.literal('AcceptOffer'),offerId}),
  z.object({...commandBase,type:z.literal('OfferTerms'),offerId,terms:offerTermsSchema}),
  z.object({...commandBase,type:z.literal('ConfirmDeal'),offerId}),
  z.object({...commandBase,type:z.literal('WithdrawOffer'),offerId}),
  z.object({...commandBase,type:z.literal('SetShortlist'),playerId,listed:z.boolean()}),
  z.object({...commandBase,type:z.literal('ScoutPlayer'),playerId}),
  z.object({...commandBase,type:z.literal('AdvanceCalendar'),target:z.enum(['day','event'])}),
  z.object({...commandBase,type:z.literal('PromoteAcademy'),playerId,contractRevision:integer,years:z.number().int().min(1).max(5),wage:integer.max(10000000000),bonus:integer.max(1000000000000),role:promisedRoleSchema}),
  z.object({...commandBase,type:z.literal('RenewContract'),playerId,contractRevision:integer,years:z.number().int().min(1).max(5),wage:integer.max(10000000000),bonus:integer.max(1000000000000),role:promisedRoleSchema}),
  z.object({...commandBase,type:z.literal('SetTraining'),training:trainingSchema}),
  z.object({...commandBase,type:z.literal('UpgradeFacility'),kind:facilityKind}),
  z.object({...commandBase,type:z.literal('SetTrainingFocus'),focus:focusSchema}),
  z.object({...commandBase,type:z.literal('SetAssisted'),enabled:z.boolean()}),
  z.object({...commandBase,type:z.literal('AcceptJob'),clubId}),
  z.object({...commandBase,type:z.literal('RetireManager')}),
  z.object({...commandBase,type:z.literal('SetRegistration'),players:z.array(playerId).min(11).max(30)}),
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
  z.object({ type: z.literal('NewCareer'), careerId: z.string().uuid(), seed: integer.max(4294967295), clubId,world:z.enum(['exhibition','countries']) }),
  z.object({ type: z.literal('LoadCareer'), state: careerSchema }),
  z.object({type:z.literal('NewPackedCareer'),careerId:z.string().uuid(),seed:integer.max(4294967295),clubId,pack:installedRosterSchema}),
  z.object({ type: z.literal('Command'), command: commandSchema })
]);
export type Request = z.infer<typeof requestSchema>;
export type FailureCode = 'OFFER_CHANGED' | 'SQUAD_NEED' | 'SQUAD_FULL' | 'REPUTATION' | 'SCOUT_BUSY' | 'ALREADY_SCOUTED' | 'NOT_MATCH_DAY' | 'CONTRACT_CHANGED' | 'INSUFFICIENT_FUNDS' | 'WAGE_BUDGET' | 'PLAYER_TERMS' | 'UNAVAILABLE_PLAYER' | 'MATCH_DECISION' | 'INVALID_BENCH' | 'INVALID_SUBSTITUTION' | 'INVALID_LINEUP' | 'STALE_STATE' | 'DUPLICATE_COMMAND' | 'INVALID_COMMAND' | 'INVALID_SAVE' | 'FUTURE_SAVE' | 'IO_ERROR' | 'WORKER_FAILED';
export type Result<T> = { ok: true; value: T } | { ok: false; error: FailureCode };
export type SaveEntry = { careerId: string; commitId: string; parentCommitId:string|null; appVersion:string|null; season:number|null; club: string; round: number; tick: number; savedAtUTC: string; kind: 'manual' | 'auto'; valid: boolean; engineVersion:string|null; error: FailureCode | null };
export interface DesktopBridge {
  onCloseRequested(listener:()=>Promise<boolean>):()=>void;
  diagnostics():Promise<Result<import('./diagnostics.ts').DiagnosticReport>>;
  exportDiagnostics():Promise<Result<boolean>>;
  onPowerState(listener:(state:'suspend'|'resume')=>void):()=>void;
  audioSettings():Promise<Result<AudioSettings>>;
  saveAudioSettings(value:AudioSettings):Promise<Result<AudioSettings>>;
  dreamSave(state:import('./dream.ts').Dream):Promise<Result<string>>;
  dreamList():Promise<Result<SaveEntry[]>>;
  dreamLoad(id:string,commit:string):Promise<Result<import('./dream.ts').Dream>>;
  rosterList():Promise<Result<InstalledRoster[]>>;
  rosterImport():Promise<Result<InstalledRoster|null>>;
  save(state: Career, kind: 'manual' | 'auto'): Promise<Result<string>>;
  list(): Promise<Result<SaveEntry[]>>;
  load(careerId: string, commitId: string): Promise<Result<Career>>;
}
export const audioSettingsSchema=z.strictObject({schema:z.literal(1),music:z.boolean(),effects:z.boolean()});
export type AudioSettings=z.infer<typeof audioSettingsSchema>;
export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  const object = value as Record<string, unknown>;
  return '{' + Object.keys(object).sort().map(key => JSON.stringify(key) + ':' + canonical(object[key])).join(',') + '}';
}
