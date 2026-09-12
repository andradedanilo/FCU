import {canonical,type Career,type Cup,type Fixture} from '../../contracts/src/index.ts';
import {createCup,advanceCup,cupChampion,continentalQualifiers,tieWinner,type CupResult} from './cups.ts';

export function cupFixtures(cup:Cup):Fixture[]{
 return cup.rounds.flatMap(round=>round.ties.flatMap(tie=>tie.legs.map((leg,i)=>({id:leg.fixtureId,date:leg.date,home:leg.home,away:leg.away,neutral:leg.neutral,decider:i===tie.legs.length-1,competitionClass:cup.kind,competitionId:cup.id,cupTieId:tie.id,round:round.number,score:null,shootout:null,forfeit:null}))));
}
export function initialCups(state:Pick<Career,'world'|'season'|'seed'|'history'|'cupStartSeason'>):Cup[]{
 if(state.world.kind==='exhibition'||state.season<state.cupStartSeason)return [];
 const previous=state.history.at(-1),world=previous?{kind:state.world.kind,divisions:previous.divisions}:state.world;
 const rankings=Object.fromEntries(world.divisions.filter(d=>d.tier===1).map(d=>[d.id,previous?previous.table.filter(r=>d.clubs.includes(r.clubId)).map(r=>r.clubId):d.clubs]));
 const previousCup=previous?.cups.find(c=>c.kind==='continental'),champion=previousCup?cupChampion(previousCup):null;
 const cups=(['ENG','ESP','FRA','ITA','DEU'] as const).map(country=>createCup(state.seed,state.season,`${country}-CUP`,state.world.divisions.filter(d=>d.country===country).flatMap(d=>d.clubs)));
 cups.push(createCup(state.seed,state.season,'CONTINENTAL',continentalQualifiers(world,rankings,champion)));return cups;
}
export function fixtureResults(fixtures:Fixture[]):Record<string,CupResult>{return Object.fromEntries(fixtures.filter(f=>f.score).map(f=>[f.id,{score:f.score!,shootout:f.shootout,forfeit:f.forfeit}]));}
export function progressCups(state:Career){
 const results=fixtureResults(state.fixtures);
 state.cups=state.cups.map(cup=>{
  const round=cup.rounds.at(-1)!;for(const tie of round.ties)if(!tie.winner)tie.winner=tieWinner(tie,results);
  if(cupChampion(cup)||round.ties.some(t=>!t.winner))return cup;
  const next=advanceCup(cup,state.seed,state.season),existing=new Set(state.fixtures.map(f=>f.id));
  state.fixtures.push(...cupFixtures(next).filter(f=>!existing.has(f.id)));return next;
 });
 state.fixtures.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:a.id<b.id?-1:1);
}
export function validateCups(state:Career){
 if(state.cupStartSeason>state.season+1)throw Error('INVALID_SAVE');
 const expected=initialCups(state),results=fixtureResults(state.fixtures);
 if(state.cups.length!==expected.length)throw Error('INVALID_SAVE');
 for(const [index,start] of expected.entries()){
  let cup=start;
  for(let round=0;round<6;round++){
   const current=cup.rounds.at(-1)!;for(const tie of current.ties)tie.winner=tieWinner(tie,results);
   if(cupChampion(cup)||current.ties.some(t=>!t.winner))break;
   cup=advanceCup(cup,state.seed,state.season);
  }
  if(canonical(cup)!==canonical(state.cups[index]))throw Error('INVALID_SAVE');
 }
 const dates=new Set<string>();for(const f of state.fixtures){
  if((!f.score&&(f.shootout||f.forfeit))||(f.competitionClass==='league'&&f.shootout)||(f.forfeit&&(![f.home,f.away].includes(f.forfeit)||!f.score||f.score[f.forfeit===f.home?0:1]!==0||f.score[f.forfeit===f.home?1:0]<3)))throw Error('INVALID_SAVE');
  for(const club of [f.home,f.away]){const key=`${f.date}/${club}`;if(dates.has(key))throw Error('INVALID_SAVE');dates.add(key);}
 }
}
