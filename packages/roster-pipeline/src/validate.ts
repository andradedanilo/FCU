import {rosterSchema, auditSchema, type Validation, type Issue} from './model.ts';

export function validateRoster(raw:unknown, rawAudit:unknown):Validation {
  const parsed = rosterSchema.safeParse(raw), checked = auditSchema.safeParse(rawAudit);
  if (!parsed.success || !checked.success) return {ok:false, issues:[{code:'INVALID_SCHEMA', entity:null, message:'Roster or extraction audit does not match schema 1.'}]};
  const roster = parsed.data, audit = checked.data, issues:Issue[] = [];
  const issue = (code:string, entity:string|null, message:string) => issues.push({code,entity,message});
  const unique = (values:readonly string[], scope:string) => {
    const seen = new Set<string>();
    for (const value of values) { if (seen.has(value)) issue('DUPLICATE_ID',value,scope); seen.add(value); }
    return seen;
  };
  const same = (a:readonly string[], b:readonly string[]) => {const sorted=[...b].sort();return a.length===b.length && [...a].sort().every((value,i)=>value===sorted[i]);};
  unique([...roster.competitions,...roster.teams,...roster.players].map(e=>e.id),'Canonical identities must be unique across entity types.');
  unique(roster.competitions.map(c=>c.key),'Each target league must appear exactly once.');
  unique(audit.expectedTeams.map(c=>c.competitionId),'Expected league membership is ambiguous.');
  unique(audit.completedTeamIds,'Repeated completed squad.');
  unique(audit.reviewedTeamIds,'Repeated reviewed squad.');
  const teams = new Map(roster.teams.map(t=>[t.id,t]));
  const players = new Map(roster.players.map(p=>[p.id,p]));
  const competitions = new Set(roster.competitions.map(c=>c.id));
  if (!same(audit.expectedTeams.map(c=>c.competitionId), [...competitions])) issue('LEAGUE_COVERAGE',null,'Expected leagues do not match the candidate.');
  for (const c of roster.competitions) {
    const expected = audit.expectedTeams.find(e=>e.competitionId===c.id);
    const actual = roster.teams.filter(t=>t.competitionId===c.id).map(t=>t.id);
    unique(c.participatingTeamIds,'Repeated league participant.');
    if (expected) unique(expected.teamIds,'Repeated expected participant.');
    if (!expected || !same(expected.teamIds,c.participatingTeamIds) || !same(actual,c.participatingTeamIds)) issue('TEAM_COVERAGE',c.id,'League team membership does not reconcile with expected membership.');
    if (c.countryCode!==c.key.slice(0,3)) issue('COUNTRY_CONFLICT',c.id,'Competition country differs from its target.');
  }
  if (!same([...teams.keys()],audit.completedTeamIds)) issue('INCOMPLETE_FETCH',null,'Every expected squad must finish fetching; no stale squad fallback.');
  if (!same([...teams.keys()],audit.reviewedTeamIds)) issue('REVIEW_REQUIRED',null,'Every squad needs an explicit completeness review.');
  if (audit.extractionStartedAt>audit.extractionCompletedAt) issue('INVALID_INTERVAL',null,'Extraction ends before it starts.');
  if (audit.unresolvedIdentities.length) issue('IDENTITY_CONFLICT',null,'Unresolved provider identity mappings remain.');
  const members = unique(roster.memberships.map(m=>m.playerId),'A player cannot have two active playing memberships.');
  const profiles = unique(roster.gameProfiles.map(p=>p.playerId),'A player cannot have two game profiles.');
  if (!same([...players.keys()],[...members]) || !same([...players.keys()],[...profiles])) issue('PLAYER_COVERAGE',null,'Each player needs exactly one membership and generated game profile.');
  for (const m of roster.memberships) {
    if (!players.has(m.playerId) || !teams.has(m.playingTeamId) || (m.owningTeamId!==null&&!teams.has(m.owningTeamId))) issue('ORPHAN_MEMBERSHIP',m.playerId,'Membership refers to an unknown entity.');
    if (m.owningTeamId===null || m.isLoan === (m.owningTeamId===m.playingTeamId)) issue('OWNERSHIP_CONFLICT',m.playerId,'Resolve loan owner and playing-club ownership before export.');
    if (m.validFrom && m.validTo && m.validFrom>m.validTo) issue('INVALID_MEMBERSHIP_DATE',m.playerId,'Membership ends before it starts.');
  }
  for (const t of roster.teams) {
    if (!competitions.has(t.competitionId)) issue('ORPHAN_TEAM',t.id,'Unknown competition.');
    if (roster.competitions.find(c=>c.id===t.competitionId)?.countryCode!==t.countryCode) issue('COUNTRY_CONFLICT',t.id,'Team country differs from its competition.');
    const squad = roster.memberships.filter(m=>m.playingTeamId===t.id);
    if (squad.length<18 || squad.filter(m=>players.get(m.playerId)?.primaryRole==='GK').length<2) issue('SQUAD_PLAUSIBILITY',t.id,'Squad requires at least 18 players and two goalkeepers; completeness still requires review.');
  }
  const observed = audit.extractionCompletedAt.slice(0,10);
  for (const p of roster.players) {
    const age = Number(observed.slice(0,4))-Number(p.dateOfBirth.slice(0,4))-(observed.slice(5)<p.dateOfBirth.slice(5)?1:0);
    if (age<14 || age>60) issue('AGE_REVIEW',p.id,'Player age is outside the import guard.');
    if (p.secondaryRoles.includes(p.primaryRole) || new Set(p.secondaryRoles).size!==p.secondaryRoles.length) issue('ROLE_CONFLICT',p.id,'Secondary roles repeat.');
  }
  const entities = new Set([...roster.competitions,...roster.teams,...roster.players].map(e=>e.id));
  const sourced = new Set(audit.provenance.map(p=>p.entityId));
  for (const id of entities) if (!sourced.has(id)) issue('MISSING_PROVENANCE',id,'Entity has no source record.');
  for (const p of audit.provenance) if (!entities.has(p.entityId)) issue('ORPHAN_PROVENANCE',p.entityId,'Source record refers to an unknown entity.');
  return issues.length ? {ok:false,issues} : {ok:true,roster,audit};
}
