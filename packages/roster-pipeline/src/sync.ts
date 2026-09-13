import {z} from 'zod';
import {rosterSchema,auditSchema} from './model.ts';
import {collectPages,type RosterProvider} from './provider.ts';
import {validateRoster} from './validate.ts';

const reference=z.string().min(1).max(100);
export const syncPlanSchema=z.strictObject({
  roster:rosterSchema,audit:auditSchema,
  competitions:z.record(z.string(),z.strictObject({league:reference,season:reference})),
  teams:z.record(z.string(),reference),players:z.record(z.string(),reference)
});
const team=z.strictObject({ref:reference,name:z.string().min(1)});
const member=z.strictObject({playerRef:reference,teamRef:reference});
const profile=z.strictObject({ref:reference,name:z.string().min(1),dateOfBirth:z.iso.date(),role:z.enum(['GK','DEF','MID','FWD'])});
const season=z.strictObject({ref:reference,startYear:z.number().int()});

// The private plan supplies reviewed identities, nationality, ownership and generated estimates.
// Unknown source identities require a revised plan; display names never merge people.
export async function syncRoster(raw:unknown,provider:RosterProvider,signal?:AbortSignal){
  const plan=syncPlanSchema.parse(raw),{roster,audit}=plan;
  if(audit.providerId!==provider.id)throw Error('PROVIDER_PLAN_MISMATCH');
  const caps=await provider.capabilities();
  if(caps.membership!==audit.semantics||!Number.isSafeInteger(caps.maxBatchSize)||caps.maxBatchSize<1||caps.maxBatchSize>500)throw Error('UNSUPPORTED_CAPABILITY');
  const mappings=[{entities:roster.competitions.map(c=>c.id),map:plan.competitions},{entities:roster.teams.map(t=>t.id),map:plan.teams},{entities:roster.players.map(p=>p.id),map:plan.players}];
  for(const {entities,map} of mappings){if(JSON.stringify([...entities].sort())!==JSON.stringify(Object.keys(map).sort()))throw Error('INCOMPLETE_IDENTITY_MAP');}
  if(new Set(Object.values(plan.teams)).size!==roster.teams.length||new Set(Object.values(plan.players)).size!==roster.players.length)throw Error('AMBIGUOUS_IDENTITY');
  const byPlayer=new Map(Object.entries(plan.players).map(([canonical,source])=>[source,canonical]));
  const seen=new Set<string>();audit.completedTeamIds=[];audit.reviewedTeamIds=[];
  audit.extractionStartedAt=new Date().toISOString();
  for(const competition of roster.competitions){
    const refs=plan.competitions[competition.id]!;
    const seasons=await collectPages(async cursor=>{if(cursor!==null)throw Error('UNSUPPORTED_SEASON_PAGINATION');return provider.listSeasons(refs.league);},season,s=>s.ref,signal);
    if(!seasons.items.some(s=>s.ref===refs.season&&s.startYear===competition.seasonStartYear))throw Error('MISSING_SELECTED_SEASON');
    const teams=await collectPages(cursor=>provider.listTeams(refs.season,cursor),team,t=>t.ref,signal);
    const expected=competition.participatingTeamIds.map(id=>plan.teams[id]!).sort();
    if(JSON.stringify(teams.items.map(t=>t.ref).sort())!==JSON.stringify(expected))throw Error('INCOMPLETE_TEAMS');
    for(const clubId of competition.participatingTeamIds){
      const teamRef=plan.teams[clubId]!;
      const squad=await collectPages(cursor=>provider.fetchSquad(teamRef,refs.season,cursor),member,m=>m.playerRef,signal);
      for(const membership of squad.items){
        const playerId=byPlayer.get(membership.playerRef);
        if(!playerId||seen.has(playerId)||membership.teamRef!==teamRef)throw Error('UNRESOLVED_MEMBERSHIP');
        const mapped=roster.memberships.find(m=>m.playerId===playerId);
        if(!mapped||mapped.playingTeamId!==clubId)throw Error('REVIEW_OWNERSHIP_AND_TRANSFER');
        seen.add(playerId);
      }
      const ids=squad.items.map(m=>m.playerRef).sort();
      for(let offset=0;offset<ids.length;offset+=caps.maxBatchSize){
        const batch=ids.slice(offset,offset+caps.maxBatchSize);
        const players=await collectPages(cursor=>provider.fetchPlayers(batch,cursor),profile,p=>p.ref,signal);
        if(JSON.stringify(players.items.map(p=>p.ref).sort())!==JSON.stringify(batch))throw Error('INCOMPLETE_PROFILES');
        for(const fetched of players.items){
          const canonical=roster.players.find(p=>p.id===byPlayer.get(fetched.ref))!;
          canonical.displayName=fetched.name;canonical.dateOfBirth=fetched.dateOfBirth;canonical.primaryRole=fetched.role;
          canonical.secondaryRoles=canonical.secondaryRoles.filter(role=>role!==fetched.role);
          audit.provenance=audit.provenance.filter(p=>!(p.entityId===canonical.id&&p.fieldPath==='displayName,dateOfBirth,primaryRole'));
          audit.provenance.push({entityId:canonical.id,fieldPath:'displayName,dateOfBirth,primaryRole',sourceKind:'provider',providerRef:fetched.ref,observedAtUTC:players.pages.at(-1)!.fetchedAtUTC,sourceUpdatedAtUTC:null,confidence:'observed',rightsRef:null});
        }
      }
      audit.completedTeamIds.push(clubId);
    }
  }
  if(seen.size!==roster.players.length)throw Error('DEPARTED_PLAYERS_REQUIRE_REVIEW');
  signal?.throwIfAborted();audit.extractionCompletedAt=new Date().toISOString();
  const validation=validateRoster(roster,audit);
  if(!validation.ok&&validation.issues.some(issue=>issue.code!=='REVIEW_REQUIRED'))throw Error('NORMALIZED_CANDIDATE_INVALID');
  return {roster,audit};
}
