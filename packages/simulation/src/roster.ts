import {loanEnd} from './loans.ts';
import {type Career,type InstalledRoster,type ClubId,type Player,clubSchema,playerId,offerId} from '../../contracts/src/index.ts';
import {countryWorld} from '../../contracts/src/world.ts';
import {createCareer,validateCareer} from './engine.ts';
import {autoPick,pickBench} from './selection.ts';
import {createEconomy,settleDay} from './economy.ts';
import {createContracts} from './contracts.ts';
import {overall} from './ratings.ts';
import {worldSchedule,compareFixtures} from './competition.ts';
import {initialCups,cupFixtures} from './cupSeason.ts';

export function rosterClubMapping(pack:InstalledRoster):Map<string,ClubId> {
  const mapping=new Map<string,ClubId>();
  for(const division of countryWorld.divisions.filter(d=>d.tier===1)){
    const competition=pack.roster.competitions.find(c=>c.key===division.country+'-T1');
    const teams=competition?[...competition.participatingTeamIds].sort():[];
    if(!competition||teams.length!==division.clubs.length)throw Error('INVALID_ROSTER_WORLD');
    teams.forEach((id,i)=>mapping.set(id,division.clubs[i]!));
  }
  if(mapping.size!==pack.roster.teams.length)throw Error('INVALID_ROSTER_WORLD');
  return mapping;
}
export function rosterClubs(pack:InstalledRoster):Career['clubs'] {
  const mapping=rosterClubMapping(pack);
  return pack.roster.teams.map(t=>clubSchema.parse({id:mapping.get(t.id),name:t.displayName,short:t.shortName,color:t.color}));
}
export function createPackedCareer(careerId:string,seed:number,clubId:ClubId,pack:InstalledRoster):Career {
  const mapping=rosterClubMapping(pack);
  const year=pack.roster.competitions[0]!.seasonStartYear;
  if(year<2026||year>2100||pack.roster.competitions.some(c=>c.seasonStartYear!==year))throw Error('INVALID_ROSTER_SEASON');
  const state=createCareer(careerId,seed,clubId,'countries');
  state.season=year;state.date=`${year}-07-01`;state.cupStartSeason=year;
  const imported=rosterClubs(pack),topIds=new Set(imported.map(c=>c.id));
  state.clubs=state.clubs.map(c=>imported.find(t=>t.id===c.id)??c);
  const sourcePlayers=new Map(pack.roster.players.map(p=>[p.id,p]));const profiles=new Map(pack.roster.gameProfiles.map(p=>[p.playerId,p]));
  const players:Player[]=state.players.filter(p=>p.clubId===null||!topIds.has(p.clubId));
  const playerIds:Record<string,string>={},clubIds:Record<string,string>={};
  for(const team of pack.roster.teams){
    const destination=mapping.get(team.id)!;clubIds[destination]=team.id;
    const squad=pack.roster.memberships.filter(m=>m.playingTeamId===team.id).sort((a,b)=>a.playerId<b.playerId?-1:1);
    if(squad.length<18||squad.filter(m=>sourcePlayers.get(m.playerId)?.primaryRole==='GK').length<2)throw Error('INVALID_ROSTER_SQUAD');
    if(squad.some(m=>m.owningTeamId===null||!mapping.has(m.owningTeamId)||m.isLoan===(m.owningTeamId===team.id)))throw Error('UNRESOLVED_ROSTER_OWNER');
    for(const [i,membership] of squad.entries()){
      const source=sourcePlayers.get(membership.playerId),profile=profiles.get(membership.playerId);
      if(!source||!profile)throw Error('INVALID_ROSTER_PLAYER');
      const id=playerId.parse(`player-${destination.slice(5)}-${String(i+1).padStart(2,'0')}`);playerIds[id]=source.id;
      players.push({id,clubId:destination,name:source.displayName,role:source.primaryRole,...profile.attributes,condition:100000,morale:70,registered:true,academy:false,injuryUntil:null,leagueYellows:0,leagueBan:0});
    }
  }
  if(new Set(Object.values(playerIds)).size!==pack.roster.players.length)throw Error('INVALID_ROSTER_PLAYER');
  state.players=players.sort((a,b)=>a.id<b.id?-1:1);
  state.snapshotId=pack.snapshotId;state.identityProfileVersion=2;
  state.rosterOrigin={contentHash:pack.contentHash,observedAt:pack.observedAt,development:pack.development,playerIds,clubIds};
  const localPlayers=new Map(Object.entries(playerIds).map(([local,source])=>[source,playerId.parse(local)]));
  state.loans=pack.roster.memberships.filter(m=>m.isLoan).map(m=>({id:offerId.parse(m.playerId),playerId:localPlayers.get(m.playerId)!,parent:mapping.get(m.owningTeamId!)!,borrower:mapping.get(m.playingTeamId)!,ends:loanEnd(state.date),share:100,status:'active',source:'roster'}));
  for(const team of state.clubs){
    const reserved=state.loans.filter(l=>l.parent===team.id).length,capacity=30-reserved;
    const squad=players.filter(p=>p.clubId===team.id&&!p.academy).sort((a,b)=>overall(b)-overall(a)||(a.id<b.id?-1:1));
    if(capacity<11)throw Error('ROSTER_LOAN_CAPACITY');
    const lineup=autoPick(players,team.id,'4-4-2',state.date),bench=pickBench(players,team.id,lineup,state.date);
    const active=new Set([...new Set([...lineup,...bench,...squad.map(p=>p.id)])].slice(0,capacity));
    for(const player of squad)player.registered=active.has(player.id);
  }
  state.lineup=autoPick(players,clubId,'4-4-2',state.date);state.bench=pickBench(players,clubId,state.lineup,state.date);
  state.fixtures=worldSchedule(state.world,year);state.cups=initialCups(state);state.fixtures.push(...state.cups.flatMap(cupFixtures));state.fixtures.sort(compareFixtures);
  state.economy=createEconomy(state,overall,state.world.divisions.filter(d=>d.tier===2).flatMap(d=>d.clubs));state.contracts=createContracts(state);
  for(const p of players){const sourceId=playerIds[p.id];if(!sourceId)continue;const profile=profiles.get(sourceId as typeof pack.roster.players[number]['id'])!,source=sourcePlayers.get(sourceId as typeof pack.roster.players[number]['id'])!;state.economy.wages[p.id]=profile.generatedContract.weeklyWageCents;state.contracts[p.id]!.birthDate=source.dateOfBirth;state.contracts[p.id]!.ends=profile.generatedContract.expires;}
  for(const loan of state.loans){const contract=state.contracts[loan.playerId]!;contract.ownerId=loan.parent;if(!contract.ends||contract.ends<loan.ends)contract.ends=loan.ends;}
  settleDay(state,state.date);return validateCareer(state);
}
