import type {Match,Player,PlayerId,ClubId} from '../../contracts/src/index.ts';
import {rules} from './rules.ts';
export function validDate(date:string):boolean{
 const [year,month,day]=date.split('-').map(Number);if(!year||!month||!day||month>12)return false;const length=[31,year%4===0&&(year%100!==0||year%400===0)?29:28,31,30,31,30,31,31,30,31,30,31][month-1]!;return day<=length;
}
export function addDays(date:string,days:number):string{
 let [year,month,day]=date.split('-').map(Number) as [number,number,number];
 const length=()=>[31,year%4===0&&(year%100!==0||year%400===0)?29:28,31,30,31,30,31,31,30,31,30,31][month-1]!;
 for(let i=0;i<days;i++){day++;if(day>length()){day=1;month++;if(month===13){year++;month=1;}}}
 return String(year).padStart(4,'0')+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');
}
export function available(p:Player,date:string){return p.registered&&p.leagueBan===0&&(p.injuryUntil===null||p.injuryUntil<=date);}
export function activeLineup(match:Match,club:ClubId):PlayerId[]{return (club===match.home?match.homeLineup:match.awayLineup).filter(id=>!match.dismissed.includes(id)&&!match.injuries.some(injury=>injury.playerId===id));}
export function needsDecision(match:Match){return match.phase!=='finished'&&(match.pendingDismissal||match.pendingInjuries.length>0);}
export function settleAvailability(player:Player,match:Match):Player{
 const events=match.events.filter(e=>e.playerId===player.id);
 const yellows=events.filter(e=>e.type==='yellow'||e.type==='secondYellow').length;
 const accumulated=player.leagueYellows+yellows;
 const ban=Math.max(accumulated>=5?1:0,events.some(e=>e.type==='secondYellow')?1:0,events.some(e=>e.type==='red')?3:0);
 return {...player,leagueYellows:accumulated%5,leagueBan:Math.max(0,player.leagueBan-1)+ban,injuryUntil:match.injuries.find(i=>i.playerId===player.id)?.until??player.injuryUntil};
}
// Mutate only the engine's private tick copy, using its existing random stream.
export function incidents(match:Match,players:Player[],roll:()=>number,weighted:(pool:Player[],weight:(p:Player)=>number)=>Player){
 for(const club of [match.home,match.away]){
  const team=()=>activeLineup(match,club).map(id=>players.find(p=>p.id===id)!);
  const emit=(type:'foul'|'yellow'|'secondYellow'|'red'|'injury',id:PlayerId)=>match.events.push({tick:match.tick,order:match.events.length,clubId:club,playerId:id,assistId:null,type,homeGoals:match.homeGoals,awayGoals:match.awayGoals});
  const outfield=team().filter(p=>p.role!=='GK');
  if(roll()<rules.foul&&outfield.length){
   const player=weighted(outfield,p=>(101-p.discipline)*(match.events.some(e=>e.playerId===p.id&&e.type==='yellow')?rules.bookedFoulWeight:10000));emit('foul',player.id);
   if(roll()<rules.yellow){const second=match.events.some(e=>e.playerId===player.id&&e.type==='yellow');emit(second?'secondYellow':'yellow',player.id);if(second)match.dismissed.push(player.id);}
   else if(roll()<rules.red){emit('red',player.id);match.dismissed.push(player.id);}
   if(club===match.managedClubId&&match.dismissed.includes(player.id))match.pendingDismissal=true;
  }
  const active=team();if(!active.length)continue;
  const average=active.reduce((sum,p)=>sum+match.condition[p.id]!,0)/active.length;
  const tactics=club===match.home?match.homeTactics:match.awayTactics;
  const chance=Math.round(rules.injury*(1+(100000-average)/100000)*(tactics.pressing==='high'?1.15:1));
  if(roll()<chance){
   const player=weighted(active,p=>100001-match.condition[p.id]!);const severity=roll();const [low,high]=severity<7000?[3,7]:severity<9500?[14,28]:[56,112];const days=low!+Math.floor(roll()*(high!-low!+1)/10000);
   match.injuries.push({playerId:player.id,until:addDays(match.date,days)});emit('injury',player.id);if(club===match.managedClubId)match.pendingInjuries.push(player.id);
  }
 }
}
