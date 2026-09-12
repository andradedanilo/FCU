import type {Match,Player} from '../../contracts/src/index.ts';
import {activeLineup} from './availability.ts';
import {draw} from './rng.ts';

// Keep kick outcomes separate from open-play goals and statistics.
export function penalties(match:Match,players:Player[]){
 const teams=[match.home,match.away].map(club=>activeLineup(match,club).map(id=>players.find(p=>p.id===id)!));
 if(teams.some(team=>team.length<7))throw Error('INVALID_COMMAND');
 const keepers=teams.map(team=>team.find(p=>p.role==='GK')??[...team].sort((a,b)=>b.goalkeeping-a.goalkeeping||(a.id<b.id?-1:1))[0]!);
 const order=teams.map(team=>[...team].sort((a,b)=>b.shooting-a.shooting||(a.id<b.id?-1:1)));
 const goals:[number,number]=[0,0],taken:[number,number]=[0,0];
 for(let kick=0;kick<2048;kick++){
  const side=kick%2===0?0:1,player=order[side]![taken[side]%order[side]!.length]!;
  const chance=Math.max(5500,Math.min(9000,7500+(player.shooting-keepers[1-side]!.goalkeeping)*20));
  let value;[match.rng,value]=draw(match.rng);const scored=value%10000<chance;
  taken[side]++;goals[side]+=Number(scored);match.penalties.push({clubId:side===0?match.home:match.away,playerId:player.id,scored});
  if(taken[0]!<=5&&taken[1]!<=5){if(goals[0]!>goals[1]!+5-taken[1]!||goals[1]!>goals[0]!+5-taken[0]!)return;}
  if(taken[0]===taken[1]&&taken[0]!>=5&&goals[0]!==goals[1])return;
 }
 throw Error('INVALID_COMMAND');
}
export function finishKnockout(match:Match,players:Player[]){
 if(match.phase==='finished'&&match.extraTime&&match.forfeit===null&&match.homeGoals+match.aggregate[0]===match.awayGoals+match.aggregate[1]&&match.penalties.length===0)penalties(match,players);
}
export function penaltyScore(match:Pick<Match,'penalties'|'home'|'away'>):[number,number]|null{
 return match.penalties.length?[match.penalties.filter(k=>k.clubId===match.home&&k.scored).length,match.penalties.filter(k=>k.clubId===match.away&&k.scored).length]:null;
}
export function validatePenalties(match:Match){
 const needed=match.phase==='finished'&&match.extraTime&&match.forfeit===null&&match.homeGoals+match.aggregate[0]===match.awayGoals+match.aggregate[1];
 if(!needed){if(match.penalties.length)throw Error('INVALID_SAVE');return;}
 const sides=[match.home,match.away],eligible=sides.map(club=>activeLineup(match,club)),taken:[number,number]=[0,0],goals:[number,number]=[0,0],used=[new Set<string>(),new Set<string>()];
 if(!match.penalties.length||eligible.some(team=>team.length<7))throw Error('INVALID_SAVE');
 for(const [i,kick] of match.penalties.entries()){
  const side=i%2===0?0:1;if(used[side]!.size===eligible[side]!.length)used[side]!.clear();
  if(kick.clubId!==sides[side]||!eligible[side]!.includes(kick.playerId)||used[side]!.has(kick.playerId))throw Error('INVALID_SAVE');
  used[side]!.add(kick.playerId);taken[side]++;goals[side]+=Number(kick.scored);
  const early=taken[0]<=5&&taken[1]<=5&&(goals[0]>goals[1]+5-taken[1]||goals[1]>goals[0]+5-taken[0]);
  const decided=early||(taken[0]===taken[1]&&taken[0]>=5&&goals[0]!==goals[1]);
  if(decided!==(i===match.penalties.length-1))throw Error('INVALID_SAVE');
 }
}
