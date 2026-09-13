import type {Career,Match,Player} from '../../contracts/src/index.ts';
export function performanceTotals(player:Player,season?:number){
 const total={appearances:0,starts:0,minutes:0,goals:0,assists:0,yellows:0,reds:0};
 for(const row of player.performance??[])if(season===undefined||row.season===season)for(const key of Object.keys(total) as (keyof typeof total)[])total[key]+=row[key];
 return total;
}
export function recordPerformance(state:Career,match:Match){
 if(match.tick===0)return;
 const starters=new Set([...match.homeLineup,...match.awayLineup]);
 for(const sub of [...match.substitutions].reverse()){starters.delete(sub.in);starters.add(sub.out);}
 const counts=new Map<string,{goals:number;assists:number;yellows:number;reds:number}>();
 const tally=(id:string)=>{let row=counts.get(id);if(!row){row={goals:0,assists:0,yellows:0,reds:0};counts.set(id,row);}return row;};
 for(const event of match.events){if(event.type==='goal'){tally(event.playerId).goals++;if(event.assistId)tally(event.assistId).assists++;}else if(event.type==='yellow')tally(event.playerId).yellows++;else if(event.type==='red')tally(event.playerId).reds++;else if(event.type==='secondYellow'){tally(event.playerId).yellows++;tally(event.playerId).reds++;}}
 for(const player of state.players){
  if(player.clubId!==match.home&&player.clubId!==match.away)continue;
  const club=match.participants[player.id];if(!club)continue;
  const entry=starters.has(player.id)?0:match.substitutions.find(s=>s.in===player.id)?.tick;if(entry===undefined)continue;
  const exit=Math.min(match.tick,match.substitutions.find(s=>s.out===player.id)?.tick??match.tick,match.events.find(e=>e.playerId===player.id&&['red','secondYellow','injury'].includes(e.type))?.tick??match.tick);
  const rows=player.performance??[],index=rows.findIndex(r=>r.season===state.season&&r.clubId===club&&r.competition===match.competitionClass);
  const row=index>=0?{...rows[index]!}:{season:state.season,clubId:club,competition:match.competitionClass,fromDate:match.date,appearances:0,starts:0,minutes:0,goals:0,assists:0,yellows:0,reds:0};
  row.appearances++;row.starts+=Number(starters.has(player.id));row.minutes+=Math.max(0,exit-entry);
  const count=counts.get(player.id);if(count){row.goals+=count.goals;row.assists+=count.assists;row.yellows+=count.yellows;row.reds+=count.reds;}
  // Prior season rows are immutable; replace only this match's aggregate.
  player.performance=index<0?[...rows,row]:rows.map((r,i)=>i===index?row:r);
 }
}
export function validatePerformance(state:Career){
 const clubs=new Set(state.clubs.map(c=>c.id));
 for(const player of state.players){const keys=new Set<string>();for(const row of player.performance??[]){
  const key=`${row.season}/${row.clubId}/${row.competition}`;
  if(keys.has(key)||!clubs.has(row.clubId)||row.season>state.season||row.fromDate<`${row.season}-07-01`||row.fromDate>`${row.season+1}-06-30`||row.fromDate>state.date||row.starts>row.appearances||row.minutes>130*row.appearances||row.reds>row.appearances||row.yellows>2*row.appearances)throw Error('INVALID_SAVE');keys.add(key);
 }}
}
