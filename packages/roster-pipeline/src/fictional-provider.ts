import {z} from 'zod';
import {fictionalCandidate} from './fictional.ts';
import {collectPages,type Page,type RosterProvider} from './provider.ts';

const season=z.strictObject({ref:z.string(),startYear:z.number().int()});
const team=z.strictObject({ref:z.string(),name:z.string()});
const member=z.strictObject({playerRef:z.string(),teamRef:z.string()});
const player=z.strictObject({ref:z.string(),name:z.string(),dateOfBirth:z.string(),role:z.string()});

export function fictionalProvider():RosterProvider {
  const {roster}=fictionalCandidate();
  function page<T>(items:T[],cursor:string|null,key:string):Page<T>{
    const offset=cursor===null?0:Number(cursor);
    if(!Number.isSafeInteger(offset)||offset<0||offset>items.length)throw Error('INVALID_CURSOR');
    const end=Math.min(offset+10,items.length);
    return {items:items.slice(offset,end),nextCursor:end<items.length?String(end):null,total:items.length,requestFingerprint:key+'/'+offset,fetchedAtUTC:new Date().toISOString(),sourceUpdatedAtUTC:null};
  }
  return {
    id:'fictional',
    capabilities:async()=>({membership:'current',maxBatchSize:50,requestsPerMinute:6000,sourceTimestamps:false}),
    listSeasons:async ref=>{
      const competition=roster.competitions.find(c=>c.id===ref);if(!competition)throw Error('UNKNOWN_COMPETITION');
      return page([{ref:competition.id,startYear:competition.seasonStartYear}],null,'seasons/'+ref);
    },
    listTeams:async(ref,cursor)=>{
      if(!roster.competitions.some(c=>c.id===ref))throw Error('UNKNOWN_SEASON');
      return page(roster.teams.filter(t=>t.competitionId===ref).map(t=>({ref:t.id,name:t.displayName})),cursor,'teams/'+ref);
    },
    fetchSquad:async(ref,seasonRef,cursor)=>{
      if(!roster.teams.some(t=>t.id===ref&&t.competitionId===seasonRef))throw Error('UNKNOWN_TEAM_SEASON');
      return page(roster.memberships.filter(m=>m.playingTeamId===ref).map(m=>({playerRef:m.playerId,teamRef:ref})),cursor,'squad/'+ref);
    },
    fetchPlayers:async(ids,cursor)=>{
      if(ids.length>50||new Set(ids).size!==ids.length)throw Error('INVALID_BATCH');
      const players=ids.map(id=>{const p=roster.players.find(p=>p.id===id);if(!p)throw Error('UNKNOWN_PLAYER');return {ref:p.id,name:p.displayName,dateOfBirth:p.dateOfBirth,role:p.primaryRole};});
      return page(players,cursor,'players/'+ids[0]);
    }
  };
}

// Exercise the same paginated boundary offline. Failed runs never return a candidate.
export async function syncFictional(provider:RosterProvider=fictionalProvider(),signal?:AbortSignal){
  if(provider.id!=='fictional')throw Error('WRONG_PROVIDER');
  const result=fictionalCandidate(),started=new Date().toISOString();
  const capabilities=await provider.capabilities();
  if(capabilities.membership!=='current'||!Number.isSafeInteger(capabilities.maxBatchSize)||capabilities.maxBatchSize<1)throw Error('UNSUPPORTED_CAPABILITY');
  result.audit.completedTeamIds=[];
  for(const competition of result.roster.competitions){
    signal?.throwIfAborted();
    const seasons=await collectPages(async cursor=>{if(cursor!==null)throw Error('UNSUPPORTED_SEASON_PAGINATION');return provider.listSeasons(competition.id);},season,s=>s.ref,signal);
    if(!seasons.items.some(s=>s.ref===competition.id&&s.startYear===competition.seasonStartYear))throw Error('MISSING_SEASON');
    const teams=await collectPages(cursor=>provider.listTeams(competition.id,cursor),team,t=>t.ref,signal);
    if(JSON.stringify(teams.items.map(t=>t.ref).sort())!==JSON.stringify([...competition.participatingTeamIds].sort()))throw Error('INCOMPLETE_TEAMS');
    for(const entry of teams.items){
      const squad=await collectPages(cursor=>provider.fetchSquad(entry.ref,competition.id,cursor),member,m=>m.playerRef,signal);
      const expected=result.roster.memberships.filter(m=>m.playingTeamId===entry.ref).map(m=>m.playerId).sort();
      if(squad.items.some(m=>m.teamRef!==entry.ref)||JSON.stringify(squad.items.map(m=>m.playerRef).sort())!==JSON.stringify(expected))throw Error('INCOMPLETE_SQUAD');
      for(let offset=0;offset<expected.length;offset+=capabilities.maxBatchSize){
        const ids=expected.slice(offset,offset+capabilities.maxBatchSize);
        const profiles=await collectPages(cursor=>provider.fetchPlayers(ids,cursor),player,p=>p.ref,signal);
        if(JSON.stringify(profiles.items.map(p=>p.ref).sort())!==JSON.stringify(ids))throw Error('INCOMPLETE_PROFILES');
        for(const profile of profiles.items){
          const original=result.roster.players.find(p=>p.id===profile.ref)!;
          if(profile.name!==original.displayName||profile.dateOfBirth!==original.dateOfBirth||profile.role!==original.primaryRole)throw Error('FICTIONAL_PROFILE_MISMATCH');
        }
      }
      result.audit.completedTeamIds.push(result.roster.teams.find(t=>t.id===entry.ref)!.id);
    }
  }
  signal?.throwIfAborted();
  result.audit.extractionStartedAt=started;result.audit.extractionCompletedAt=new Date().toISOString();
  result.audit.provenance.forEach(p=>{p.observedAtUTC=result.audit.extractionCompletedAt;});
  return result;
}
