import {penaltyScore} from '../../simulation/src/penalties.ts';
import {matchMinute} from './highlights.ts';
import type {Career} from '../../contracts/src/index.ts';
import {standings} from '../../simulation/src/engine.ts';
export function matchReport(state:Career){
 const match=state.match;if(!match||match.phase!=='finished')return null;
 const shootout=penaltyScore(match),tie=state.cups.flatMap(c=>c.rounds).flatMap(r=>r.ties).find(t=>t.legs.some(l=>l.fixtureId===match.fixtureId));
 const home=match.home===state.clubId;const own=home?match.homeGoals:match.awayGoals;const other=home?match.awayGoals:match.homeGoals;
 const table=standings(state);const row=table.find(r=>r.clubId===state.clubId)!;
 const outcomeOwn=shootout?shootout[home?0:1]:own,outcomeOther=shootout?shootout[home?1:0]:other;
 return {tieWinner:tie?.winner??null,outcome:outcomeOwn>outcomeOther?'victory' as const:outcomeOwn<outcomeOther?'defeat' as const:'draw' as const,earned:match.competitionClass!=='league'?0:own>other?3:own===other?1:0,position:table.indexOf(row)+1,points:row.points,scorers:match.events.filter(e=>e.type==='goal').map(e=>({tick:matchMinute(e.tick,match.addedTime[0]??0,match.addedTime[1]??0,match.extraTime),player:state.players.find(p=>p.id===e.playerId)!.name,club:state.clubs.find(c=>c.id===e.clubId)!.short})),own:home?match.homeStats:match.awayStats,other:home?match.awayStats:match.homeStats};
}
