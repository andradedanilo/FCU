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
 for(const player of state.players){
  const club=match.participants[player.id];if(!club)continue;
  const entry=starters.has(player.id)?0:match.substitutions.find(s=>s.in===player.id)?.tick;if(entry===undefined)continue;
  const exit=Math.min(match.tick,match.substitutions.find(s=>s.out===player.id)?.tick??match.tick,match.events.find(e=>e.playerId===player.id&&['red','secondYellow','injury'].includes(e.type))?.tick??match.tick);
  const rows=player.performance??[],index=rows.findIndex(r=>r.season===state.season&&r.clubId===club&&r.competition===match.competitionClass);
  const row=index>=0?{...rows[index]!}:{season:state.season,clubId:club,competition:match.competitionClass,fromDate:match.date,appearances:0,starts:0,minutes:0,goals:0,assists:0,yellows:0,reds:0};
  row.appearances++;row.starts+=Number(starters.has(player.id));row.minutes+=Math.max(0,exit-entry);
  for(const event of match.events){if(event.type==='goal'){row.goals+=Number(event.playerId===player.id);row.assists+=Number(event.assistId===player.id);}if(event.playerId===player.id){row.yellows+=Number(event.type==='yellow'||event.type==='secondYellow');row.reds+=Number(event.type==='red'||event.type==='secondYellow');}}
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
