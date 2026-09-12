import {competitionPlayers,nextCompetition} from './discipline.ts';
import type {Career,ClubId,Role,PlayerId,CompetitionClass} from '../../contracts/src/index.ts';
import {available} from './availability.ts';
import {initialContract} from './contracts.ts';
export function requiresCallUp(state:Career,club:ClubId=state.clubId,kind:CompetitionClass=nextCompetition(state)):boolean {
 const eligible=competitionPlayers(state,kind).filter(p=>p.clubId===club&&available(p,state.date));return eligible.length<11||!eligible.some(p=>p.role==='GK');
}
export function callUp(state:Career,club:ClubId,kind:CompetitionClass=nextCompetition(state)):boolean {
 const squad=competitionPlayers(state,kind).filter(p=>p.clubId===club);if(squad.filter(p=>p.academy).length>=8||!requiresCallUp(state,club,kind))return false;
 const role:Role=squad.some(p=>p.role==='GK'&&available(p,state.date))?'MID':'GK';const number=1+Math.max(22,...state.players.filter(p=>p.id.startsWith('player-'+club.slice(5)+'-')).map(p=>Number(p.id.split('-')[2])));
 state.players.push({id:('player-'+club.slice(5)+'-'+number) as PlayerId,clubId:club,name:'Academy '+club.slice(5)+' '+number,role,academy:true,condition:100000,morale:70,injuryUntil:null,leagueYellows:0,leagueBan:0,goalkeeping:role==='GK'?45:15,tackling:45,passing:45,shooting:45,pace:45,stamina:45,discipline:60});state.economy.wages[state.players.at(-1)!.id]=0;state.contracts[state.players.at(-1)!.id]=initialContract(state.players.at(-1)!,state.date);return true;
}
