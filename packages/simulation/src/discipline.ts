import type {Career,Match,CompetitionClass,Player} from '../../contracts/src/index.ts';
import {nextManagedFixture} from './competition.ts';
export function nextCompetition(state:Pick<Career,'fixtures'|'clubId'>):CompetitionClass{return nextManagedFixture(state)?.competitionClass??'league';}
export function competitionPlayers(state:Pick<Career,'players'|'cupDiscipline'>,kind:CompetitionClass):Player[]{
 return kind==='league'?state.players:state.players.map(player=>({...player,leagueBan:state.cupDiscipline[player.id]?.[kind].ban??0,leagueYellows:state.cupDiscipline[player.id]?.[kind].yellows??0}));
}
export function selectionPlayers(state:Pick<Career,'players'|'cupDiscipline'|'fixtures'|'clubId'>){return competitionPlayers(state,nextCompetition(state));}
export function cupBookings(state:Career,player:Player,match:Match){
 if(match.competitionClass==='league')return;
 const kind=match.competitionClass,counters=state.cupDiscipline[player.id]??{domestic:{yellows:0,ban:0},continental:{yellows:0,ban:0}},events=match.events.filter(e=>e.playerId===player.id);
 const total=counters[kind].yellows+events.filter(e=>e.type==='yellow'||e.type==='secondYellow').length;
 counters[kind]={yellows:total%3,ban:Math.max(0,counters[kind].ban-1)+Math.max(total>=3?1:0,events.some(e=>e.type==='red')?3:events.some(e=>e.type==='secondYellow')?1:0)};
 state.cupDiscipline[player.id]=counters;
}
