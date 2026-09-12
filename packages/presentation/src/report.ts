import type {Career} from '../../contracts/src/index.ts';
import {standings} from '../../simulation/src/engine.ts';
export function matchReport(state:Career){
 const match=state.match;if(!match||match.tick!==90)return null;
 const home=match.home===state.clubId;const own=home?match.homeGoals:match.awayGoals;const other=home?match.awayGoals:match.homeGoals;
 const table=standings(state);const row=table.find(r=>r.clubId===state.clubId)!;
 return {outcome:own>other?'victory' as const:own<other?'defeat' as const:'draw' as const,earned:own>other?3:own===other?1:0,position:table.indexOf(row)+1,points:row.points,scorers:match.events.filter(e=>e.type==='goal').map(e=>({tick:e.tick,player:state.players.find(p=>p.id===e.playerId)!.name,club:state.clubs.find(c=>c.id===e.clubId)!.short})),own:home?match.homeStats:match.awayStats,other:home?match.awayStats:match.homeStats};
}
