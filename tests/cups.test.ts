import {expect,it} from 'vitest';
import {createCup,advanceCup,cupChampion,continentalQualifiers,cupDates,tieWinner,type CupResult} from '../packages/simulation/src/cups.ts';
import {countryWorld} from '../packages/contracts/src/world.ts';
import {canonical} from '../packages/contracts/src/index.ts';
import {worldSchedule} from '../packages/simulation/src/competition.ts';
import {addDays} from '../packages/simulation/src/availability.ts';

it('draws all domestic entrants once, allocates seeded byes and reserves separated cup dates',()=>{
 const entrants=countryWorld.divisions.filter(d=>d.country==='ENG').flatMap(d=>d.clubs);
 let cup=createCup(2026,2026,'ENG-CUP',entrants);
 expect(canonical(cup)).toBe(canonical(createCup(2026,2026,'ENG-CUP',[...entrants].reverse())));
 expect(cup.rounds[0]!.byes).toHaveLength(28);expect(cup.rounds[0]!.ties).toHaveLength(4);
 expect(new Set([...cup.rounds[0]!.byes,...cup.rounds[0]!.ties.flatMap(t=>[t.legs[0]!.home,t.legs[0]!.away])]).size).toBe(36);
 expect(()=>advanceCup(cup,2026,2026)).toThrow('INVALID_COMMAND');
 while(!cupChampion(cup)){for(const tie of cup.rounds.at(-1)!.ties)tie.winner=tie.legs[0]!.home;if(cupChampion(cup))break;cup=advanceCup(cup,2026,2026);}
 expect(cup.rounds.flatMap(r=>r.ties)).toHaveLength(35);expect(cup.rounds.at(-1)!.ties[0]!.legs[0]!.neutral).toBe(true);
 const french=countryWorld.divisions.filter(d=>d.country==='FRA').flatMap(d=>d.clubs);expect(createCup(2026,2026,'FRA-CUP',french).rounds[0]!.byes).toHaveLength(30);
 const dates=[...Array.from(new Set(worldSchedule(countryWorld,2026).map(f=>f.date))),...Array.from({length:6},(_,r)=>cupDates(2026,'domestic',r)).flat(),...Array.from({length:4},(_,r)=>cupDates(2026,'continental',r)).flat()].sort();
 expect(new Set(dates).size).toBe(dates.length);expect(dates.every((date,i)=>i===0||addDays(dates[i-1]!,3)<=date)).toBe(true);expect(dates.at(-1)!<'2027-06-30').toBe(true);
});
it('qualifies sixteen unique clubs from league positions and the defending champion',()=>{
 const rankings=Object.fromEntries(countryWorld.divisions.filter(d=>d.tier===1).map(d=>[d.id,d.clubs]));
 const initial=continentalQualifiers(countryWorld,rankings,null);expect(initial).toHaveLength(16);expect(initial.at(-1)).toBe(rankings.ENG1![3]);
 const frenchChampion=rankings.FRA1![0]!;expect(continentalQualifiers(countryWorld,rankings,frenchChampion).at(-1)).toBe(rankings.FRA1![3]);
 const secondTierChampion=countryWorld.divisions.find(d=>d.id==='DEU2')!.clubs[0]!;expect(continentalQualifiers(countryWorld,rankings,secondTierChampion).at(-1)).toBe(secondTierChampion);
 expect(()=>continentalQualifiers(countryWorld,{...rankings,ENG1:rankings.ENG1!.slice(1)},null)).toThrow('INVALID_COMMAND');
});
it('uses reversed second legs, no away-goals advantage and penalties only for level aggregates',()=>{
 const entrants=countryWorld.divisions.find(d=>d.id==='ENG2')!.clubs;
 const cup=createCup(2026,2026,'CONTINENTAL',entrants),tie=cup.rounds[0]!.ties[0]!,[first,last]=tie.legs;
 expect(last!.home).toBe(first!.away);expect(last!.away).toBe(first!.home);expect(first!.neutral).toBe(false);
 const scores:Record<string,CupResult>={[first!.fixtureId]:{score:[2,1],shootout:null},[last!.fixtureId]:{score:[1,0],shootout:null}};
 expect(tieWinner(tie,scores)).toBeNull();scores[last!.fixtureId]!.shootout=[3,4];expect(tieWinner(tie,scores)).toBe(first!.home);
 scores[first!.fixtureId]!.score=[3,1];expect(()=>tieWinner(tie,scores)).toThrow('INVALID_COMMAND');scores[last!.fixtureId]!.shootout=null;expect(tieWinner(tie,scores)).toBe(first!.home);
 const invalid=structuredClone(cup);invalid.rounds[0]!.ties[0]!.winner=countryWorld.divisions[0]!.clubs[0]!;expect(()=>advanceCup(invalid,2026,2026)).toThrow('INVALID_COMMAND');
});
