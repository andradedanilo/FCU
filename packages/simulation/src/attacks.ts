import type {Match,MatchEvent,Player,PlayerId} from '../../contracts/src/index.ts';
import {rules} from './rules.ts';
const clamp=(n:number,low:number,high:number)=>Math.max(low,Math.min(high,Math.round(n)));
type Weighted=(players:Player[],weight:(player:Player)=>number)=>Player;
// One committed attack has one outcome; a corner can add at most one second chance.
export function resolveAttack(match:Match,side:number,lineup:Player[],opponents:Player[],defence:{D:number;K:number},roll:()=>number,weighted:Weighted,penalty=false){
 const club=side===0?match.home:match.away,other=side===0?match.away:match.home;
 const stats=side===0?match.homeStats:match.awayStats;
 const emit=(type:MatchEvent['type'],playerId:PlayerId,assistId:PlayerId|null=null,clubId=club)=>match.events.push({tick:match.tick,order:match.events.length,type,playerId,assistId,clubId,homeGoals:match.homeGoals,awayGoals:match.awayGoals});
 const shooter=weighted(lineup.filter(p=>p.role!=='GK'),p=>p.shooting*(p.role==='FWD'?3:p.role==='MID'?2:1));
 const score=(assist:PlayerId|null)=>{if(side===0)match.homeGoals++;else match.awayGoals++;emit('goal',shooter.id,assist);};
 if(penalty){
  emit('penalty',shooter.id);
  const probability=clamp(rules.penaltyGoal+(shooter.shooting-defence.K)*20,5500,9000);
  stats.shots++;stats.quality+=probability;
  if(roll()<probability){stats.onTarget++;score(null);}
  else if(roll()<6500){stats.onTarget++;emit('save',shooter.id);}
  else emit('shot',shooter.id);
  return;
 }
 const passer=weighted(lineup.filter(p=>p.id!==shooter.id),p=>p.passing);
 emit('pass',passer.id);
 if(roll()<rules.offside){emit('offside',shooter.id);return;}
 const shot=(corner:boolean):'miss'|'save'|'end'=>{
  const target=clamp(rules.target+(shooter.shooting-defence.D)*40,2000,6000);
  const goal=clamp(rules.goal+(shooter.shooting-defence.K)*40,1200,5500);
  const onTarget=roll()<target,scored=onTarget&&roll()<goal;
  // Adjudicate a scoring move before publishing any goal or shot statistics.
  if(scored&&!corner&&roll()<rules.disallowed){emit(roll()<6000?'disallowedOffside':'disallowedFoul',shooter.id);return 'end';}
  stats.shots++;stats.quality+=Math.round(target*goal/10000);
  if(!onTarget){if(roll()<rules.woodwork){emit('post',shooter.id);return 'end';}emit('shot',shooter.id);return 'miss';}
  stats.onTarget++;
  if(!scored){emit('save',shooter.id);return 'save';}
  score(roll()<rules.assist?passer.id:null);return 'end';
 };
 const result=shot(false);
 if(result==='end'||roll()>=(result==='save'?rules.cornerSave:rules.cornerMiss))return;
 emit('corner',passer.id);
 // The initial corner delivery cannot be offside. Unconverted deliveries are cleared.
 if(roll()<rules.cornerChance)shot(true);
 else {const defender=weighted(opponents.filter(p=>p.role!=='GK'),p=>p.tackling);emit('clearance',defender.id,null,other);}
}
export function validateAttackEvents(match:Match){
 let home=0,away=0,lastTick=0;
 const counts=new Map([[match.home,{shots:0,onTarget:0}],[match.away,{shots:0,onTarget:0}]]);
 for(const [index,event] of match.events.entries()){
  if(event.order!==index||event.tick<lastTick||event.tick<1||event.tick>match.tick)throw Error('INVALID_SAVE');lastTick=event.tick;
  if(event.type==='goal'){if(event.clubId===match.home)home++;else if(event.clubId===match.away)away++;else throw Error('INVALID_SAVE');}
  if(event.homeGoals!==home||event.awayGoals!==away)throw Error('INVALID_SAVE');
  const stats=counts.get(event.clubId);if(!stats)throw Error('INVALID_SAVE');
  if(['goal','save','shot','post'].includes(event.type))stats.shots++;
  if(event.type==='goal'||event.type==='save')stats.onTarget++;
  if(event.type==='penalty'){
   const foul=match.events.slice(0,index).some(e=>e.tick===event.tick&&e.clubId!==event.clubId&&e.type==='foul');
   const result=match.events[index+1];
   if(!foul||!result||result.tick!==event.tick||result.playerId!==event.playerId||result.clubId!==event.clubId||!['goal','save','shot'].includes(result.type)||result.assistId!==null)throw Error('INVALID_SAVE');
  }
 }
 if(!match.forfeit&&(home!==match.homeGoals||away!==match.awayGoals))throw Error('INVALID_SAVE');
 for(const [club,stats] of [[match.home,match.homeStats],[match.away,match.awayStats]] as const){const count=counts.get(club)!;if(stats.shots!==count.shots||stats.onTarget!==count.onTarget||stats.onTarget>stats.shots)throw Error('INVALID_SAVE');}
}
