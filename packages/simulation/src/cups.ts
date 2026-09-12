import type {Career,ClubId,Cup,CupTie} from '../../contracts/src/index.ts';
import {draw,stream} from './rng.ts';
import {addDays} from './availability.ts';
import {monday} from './economy.ts';

const countries=['ENG','ESP','FRA','ITA','DEU'] as const;
const domesticDates=['09-02','09-30','11-04','02-03','04-07','05-26'];
const continentalDates=[['08-26','09-09'],['10-07','10-21'],['11-18','12-02'],['05-19']];
function wednesday(year:number,monthDay:string){
 const date=`${monthDay<'07-01'?year+1:year}-${monthDay}`;
 for(let i=0;i<7;i++)if(monday(addDays(date,i)))return addDays(date,(i+2)%7);
 throw Error('INVALID_COMMAND');
}
export function cupDates(year:number,kind:Cup['kind'],round:number){
 const dates=kind==='domestic'?[domesticDates[round]]:continentalDates[round];
 if(!dates||dates.some(date=>!date))throw Error('INVALID_COMMAND');
 return dates.map(date=>wednesday(year,date!));
}
function shuffled(seed:number,key:string,ids:ClubId[]){
 const result=[...ids].sort();let rng=stream(seed,key);
 for(let i=result.length-1;i>0;i--){let value;[rng,value]=draw(rng);const j=value%(i+1);[result[i],result[j]]=[result[j]!,result[i]!];}
 return result;
}
function drawRound(cup:Pick<Cup,'id'|'kind'>,seed:number,year:number,entrants:ClubId[],number:number):Cup['rounds'][number]{
 if(new Set(entrants).size!==entrants.length||entrants.length<2)throw Error('INVALID_COMMAND');
 const ids=shuffled(seed,`cup/${year}/${cup.id}/${number}`,entrants);
 const preliminary=cup.kind==='domestic'&&number===0;
 const playing=preliminary?2*(entrants.length-32):entrants.length;
 if(playing<2||playing%2!==0||(!preliminary&&(playing&(playing-1))!==0))throw Error('INVALID_COMMAND');
 const dates=cupDates(year,cup.kind,number),ties:CupTie[]=[];
 for(let i=0;i<playing;i+=2){
  const home=ids[i]!,away=ids[i+1]!,id=`cup-${year}-${cup.id}-${number}-${i/2}`;
  ties.push({id,winner:null,legs:dates.map((date,leg)=>({fixtureId:`${id}-${leg}`,date,home:leg===0?home:away,away:leg===0?away:home,neutral:playing===2&&!preliminary}))});
 }
 return {number,byes:ids.slice(playing),ties};
}
export function createCup(seed:number,year:number,id:Cup['id'],entrants:ClubId[]):Cup{
 const kind=id==='CONTINENTAL'?'continental':'domestic';
 if(kind==='continental'?entrants.length!==16:![34,36].includes(entrants.length))throw Error('INVALID_COMMAND');
 return {id,kind,entrants:[...entrants].sort(),rounds:[drawRound({id,kind},seed,year,entrants,0)]};
}
export function cupChampion(cup:Cup):ClubId|null{
 const final=cup.rounds.at(-1)!;
 return final.number===(cup.kind==='domestic'?5:3)?final.ties[0]!.winner:null;
}
export function advanceCup(cup:Cup,seed:number,year:number):Cup{
 const last=cup.rounds.at(-1)!;
 if(cupChampion(cup)||last.ties.some(tie=>!tie.winner||![tie.legs[0]!.home,tie.legs[0]!.away].includes(tie.winner))||last.number===(cup.kind==='domestic'?5:3))throw Error('INVALID_COMMAND');
 const entrants=[...last.byes,...last.ties.map(tie=>tie.winner!)];
 return {...cup,rounds:[...cup.rounds,drawRound(cup,seed,year,entrants,last.number+1)]};
}
export function continentalQualifiers(world:Career['world'],rankings:Record<string,ClubId[]>,champion:ClubId|null):ClubId[]{
 if(world.kind!=='countries')throw Error('INVALID_COMMAND');
 for(const country of countries){const clubs=world.divisions.find(d=>d.id===country+'1')!.clubs,table=rankings[country+'1'];if(!table||table.length!==clubs.length||new Set(table).size!==table.length||table.some(id=>!clubs.includes(id)))throw Error('INVALID_COMMAND');}
 const qualified=countries.flatMap(country=>rankings[country+'1']!.slice(0,3));
 const championCountry=champion?world.divisions.find(d=>d.clubs.includes(champion))?.country:'ENG';
 if(!championCountry||championCountry==='EXH')throw Error('INVALID_COMMAND');
 qualified.push(champion&&!qualified.includes(champion)?champion:rankings[championCountry+'1']!.find(id=>!qualified.includes(id))!);
 if(new Set(qualified).size!==16)throw Error('INVALID_COMMAND');return qualified;
}
export type CupResult={score:[number,number];shootout:[number,number]|null};
export function tieWinner(tie:CupTie,results:Record<string,CupResult>):ClubId|null{
 const first=tie.legs[0]!,last=tie.legs.at(-1)!;
 let home=0,away=0;
 for(const leg of tie.legs){const result=results[leg.fixtureId];if(!result)return null;if(result.score.some(n=>!Number.isSafeInteger(n)||n<0))throw Error('INVALID_COMMAND');home+=result.score[leg.home===first.home?0:1];away+=result.score[leg.home===first.home?1:0];if(leg!==last&&result.shootout)throw Error('INVALID_COMMAND');}
 const penalties=results[last.fixtureId]!.shootout;
 if(home!==away){if(penalties)throw Error('INVALID_COMMAND');return home>away?first.home:first.away;}
 if(!penalties)return null;
 if(penalties.some(n=>!Number.isSafeInteger(n)||n<0)||penalties[0]===penalties[1])throw Error('INVALID_COMMAND');
 return penalties[0]>penalties[1]?last.home:last.away;
}
