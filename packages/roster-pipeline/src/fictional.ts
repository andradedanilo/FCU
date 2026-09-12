import {createHash} from 'node:crypto';
import {worldClubs, countryWorld} from '../../contracts/src/world.ts';
import {entityId, type Roster, type Audit, type EntityId} from './model.ts';

// Synthetic identities are independent of any real provider identity namespace.
export function fictionalId(source:string):EntityId {
  const hash=createHash('sha256').update('fcu-fictional-roster/'+source).digest('hex');
  return entityId.parse(`${hash.slice(0,8)}-${hash.slice(8,12)}-5${hash.slice(13,16)}-a${hash.slice(17,20)}-${hash.slice(20,32)}`);
}
export function fictionalCandidate(reviewed=false):{roster:Roster; audit:Audit} {
  const roster:Roster={rosterSchemaVersion:1,identityProfileId:'fcu-city-v1',identityProfileVersion:2,competitions:[],teams:[],players:[],memberships:[],gameProfiles:[]};
  const observed='2026-09-12T12:00:00Z';
  const audit:Audit={providerId:'fictional',adapterVersion:'1',semantics:'current',extractionStartedAt:observed,extractionCompletedAt:observed,expectedTeams:[],completedTeamIds:[],reviewedTeamIds:[],unresolvedIdentities:[],provenance:[]};
  for (const division of countryWorld.divisions.filter(d=>d.tier===1)) {
    const id=fictionalId(division.id);
    const key=division.country+'-T1' as Roster['competitions'][number]['key'];
    const teamIds=division.clubs.map(fictionalId);
    roster.competitions.push({id,key,countryCode:division.country,displayName:division.country+' development top division',seasonStartYear:2026,participatingTeamIds:teamIds,rulesProfileRef:'world-2'});
    audit.expectedTeams.push({competitionId:id,teamIds});
    for(const clubId of division.clubs) {
      const club=worldClubs.find(c=>c.id===clubId)!;const teamId=fictionalId(clubId);
      roster.teams.push({id:teamId,displayName:club.name,shortName:club.short,color:club.color,countryCode:division.country,competitionId:id,originalVisualRef:'fcu-shield'});
      audit.completedTeamIds.push(teamId);if(reviewed)audit.reviewedTeamIds.push(teamId);
      for(let i=0;i<22;i++) {
        const playerId=fictionalId(clubId+'/'+i);const primaryRole=i<2?'GK':i<10?'DEF':i<18?'MID':'FWD';
        roster.players.push({id:playerId,displayName:`Test Player ${clubId.slice(5)}-${i+1}`,dateOfBirth:`${1994+i%10}-05-12`,nationalityCodes:[division.country],primaryRole,secondaryRoles:[]});
        roster.memberships.push({playerId,playingTeamId:teamId,owningTeamId:teamId,isLoan:false,validFrom:null,validTo:null,shirtNumber:i+1});
        const baseline=60+parseInt(playerId.slice(0,2),16)%11-5;
        roster.gameProfiles.push({playerId,attributes:{goalkeeping:primaryRole==='GK'?baseline:15,tackling:baseline,passing:baseline,shooting:baseline,pace:baseline,stamina:baseline,discipline:baseline},potential:Math.min(100,baseline+10),generatedContract:{weeklyWageCents:200000,expires:'2028-06-30'},ratingModelVersion:'role-baseline-1',assumptions:['Original estimated abilities','Generated wage and contract']});
      }
    }
  }
  for(const entity of [...roster.competitions,...roster.teams,...roster.players])audit.provenance.push({entityId:entity.id,fieldPath:'*',sourceKind:'generated',providerRef:null,observedAtUTC:observed,sourceUpdatedAtUTC:null,confidence:'estimated',rightsRef:null});
  return {roster,audit};
}
