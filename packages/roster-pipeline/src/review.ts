import {createHash} from 'node:crypto';
import {type Roster, type Audit} from './model.ts';
import {validateRoster} from './validate.ts';

export function canonical(value:unknown):string {
  if (value===null || typeof value!=='object') return JSON.stringify(value??null);
  if (Array.isArray(value)) return '['+value.map(canonical).join(',')+']';
  return '{'+Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,item])=>JSON.stringify(key)+':'+canonical(item)).join(',')+'}';
}
export const sha256 = (value:string) => createHash('sha256').update(value).digest('hex');
export function canonicalRoster(roster:Roster):string {
  const order = <T>(items:readonly T[], key:(value:T)=>string) => [...items].sort((a,b)=>key(a)<key(b)?-1:key(a)>key(b)?1:0);
  return canonical({...roster, competitions:order(roster.competitions.map(c=>({...c,participatingTeamIds:[...c.participatingTeamIds].sort()})),c=>c.id), teams:order(roster.teams,t=>t.id), players:order(roster.players.map(p=>({...p,nationalityCodes:[...p.nationalityCodes].sort(),secondaryRoles:[...p.secondaryRoles].sort()})),p=>p.id), memberships:order(roster.memberships,m=>m.playerId), gameProfiles:order(roster.gameProfiles.map(p=>({...p,assumptions:[...p.assumptions].sort()})),p=>p.playerId)});
}
export type Change = {kind:'addition'|'departure'|'transfer'|'edit'; playerId:string; name:string; from:string|null; to:string|null};
export function rosterChanges(previous:Roster|null, next:Roster):Change[] {
  const changes:Change[]=[];
  const before = new Map(previous?.players.map(p=>[p.id,p])??[]);
  const oldMembership = new Map(previous?.memberships.map(m=>[m.playerId,m])??[]);
  const oldProfiles = new Map(previous?.gameProfiles.map(p=>[p.playerId,p])??[]);
  const after = new Map(next.players.map(p=>[p.id,p]));
  const membership = new Map(next.memberships.map(m=>[m.playerId,m]));
  const profiles = new Map(next.gameProfiles.map(p=>[p.playerId,p]));
  for (const p of next.players) {
    const old = before.get(p.id), from=oldMembership.get(p.id)?.playingTeamId??null, to=membership.get(p.id)?.playingTeamId??null;
    const kind = !old?'addition':from!==to?'transfer':canonical(old)!==canonical(p)||canonical(oldMembership.get(p.id))!==canonical(membership.get(p.id))||canonical(oldProfiles.get(p.id))!==canonical(profiles.get(p.id))?'edit':null;
    if (kind) changes.push({kind,playerId:p.id,name:p.displayName,from,to});
  }
  for (const p of previous?.players??[]) if (!after.has(p.id)) changes.push({kind:'departure',playerId:p.id,name:p.displayName,from:oldMembership.get(p.id)?.playingTeamId??null,to:null});
  return changes.sort((a,b)=>a.playerId<b.playerId?-1:a.playerId>b.playerId?1:0);
}
export function candidate(raw:unknown, audit:unknown) {
  const checked = validateRoster(raw,audit);
  if (!checked.ok) return checked;
  const payload = canonicalRoster(checked.roster);
  return {...checked, contentHash:sha256(payload), reviewHash:sha256(payload+canonical(checked.audit))};
}
export type Approval = {reviewHash:string; reviewer:string; approvedAtUTC:string};
export function approve(roster:Roster, audit:Audit, expectedHash:string, reviewer:string, approvedAtUTC:string):Approval {
  const current = candidate(roster,audit);
  if (!current.ok || current.reviewHash!==expectedHash) throw Error('CANDIDATE_CHANGED_OR_INVALID');
  if (!reviewer.trim() || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(approvedAtUTC) || !Number.isFinite(Date.parse(approvedAtUTC))) throw Error('INVALID_REVIEWER');
  return {reviewHash:expectedHash,reviewer:reviewer.trim(),approvedAtUTC};
}
