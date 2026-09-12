import type {Career,Player,PlayerId,FailureCode} from '../../contracts/src/index.ts';
import {addDays,validDate} from './availability.ts';
import {overall} from './ratings.ts';
import {draw,stream} from './rng.ts';
export function estimate(state:Career,player:Player,spread=15){
 const [,noise]=draw(stream(state.seed,`scout/${state.clubId}/${player.id}/${state.date.slice(0,4)}`));
 const center=overall(player)+noise%(2*spread+1)-spread;
 return {low:Math.max(1,center-spread),high:Math.min(100,center+spread)};
}
export function knownAbility(state:Career,player:Player){
 return player.clubId===state.clubId?{low:overall(player),high:overall(player)}:state.scouting.reports[player.id]??estimate(state,player);
}
export function startScouting(state:Career,id:PlayerId):FailureCode|null {
 const player=state.players.find(p=>p.id===id);
 if(!player||player.clubId===state.clubId||player.academy||state.round>=14)return 'INVALID_COMMAND';
 if(state.scouting.active)return 'SCOUT_BUSY';if(state.scouting.reports[id])return 'ALREADY_SCOUTED';
 state.scouting.active={playerId:id,due:addDays(state.date,7)};return null;
}
export function finishScouting(state:Career):boolean {
 const active=state.scouting.active;if(!active||active.due>state.date)return false;
 const player=state.players.find(p=>p.id===active.playerId)!;
 state.scouting.reports[player.id]={...estimate(state,player,3),date:state.date};state.scouting.active=null;return true;
}
export function validateScouting(state:Career){
 const scout=state.scouting;
 if(new Set(scout.shortlist).size!==scout.shortlist.length||scout.shortlist.some(id=>!state.players.some(p=>p.id===id)))throw Error('INVALID_SAVE');
 if(scout.active&&(!validDate(scout.active.due)||scout.active.due<=state.date||!state.players.some(p=>p.id===scout.active!.playerId)))throw Error('INVALID_SAVE');
 for(const [id,report] of Object.entries(scout.reports))if(!state.players.some(p=>p.id===id)||!validDate(report.date)||report.date>state.date||report.low>report.high)throw Error('INVALID_SAVE');
}
