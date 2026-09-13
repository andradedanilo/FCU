import {expect,it} from 'vitest';
import {createCup,advanceCup,cupChampion,continentalQualifiers,cupDates,tieWinner,type CupResult} from '../packages/simulation/src/cups.ts';
import {countryWorld} from '../packages/contracts/src/world.ts';
import {canonical} from '../packages/contracts/src/index.ts';
import {worldSchedule} from '../packages/simulation/src/competition.ts';
import {addDays} from '../packages/simulation/src/availability.ts';
import {createCareer,migrateCountryCareer,startMatch,advanceMatch,validateCareer,applyCommand,autoPick,pickBench} from '../packages/simulation/src/engine.ts';
import {selectionPlayers,competitionPlayers,cupBookings} from '../packages/simulation/src/discipline.ts';
import {penalties,validatePenalties} from '../packages/simulation/src/penalties.ts';
import {clockLabel} from '../packages/presentation/src/highlights.ts';

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
it('resumes a saved domestic tie through both extra-time periods without added minutes',()=>{
 const state=createCareer('00000000-0000-4000-8000-000000000003',2026,countryWorld.divisions[0]!.clubs[0]!,'countries');
 const old=migrateCountryCareer({...state,snapshotId:'fictional-world-2026-v1',engineVersion:'0.5.1',rulesetVersion:'world-1',fixtures:state.fixtures.filter(f=>f.competitionClass==='league')});expect(old.cups).toEqual([]);expect(old.cupStartSeason).toBe(2027);expect(old.fixtures).toHaveLength(2952);
 const fixture=state.fixtures.find(f=>f.competitionClass==='domestic')!;
 state.clubId=fixture.home;state.date=fixture.date;
 for(const f of state.fixtures)if(f.date<state.date)f.score=[0,0];
 state.round=state.fixtures.filter(f=>f.score&&(f.home===state.clubId||f.away===state.clubId)).length;
 state.lineup=autoPick(selectionPlayers(state),state.clubId,state.tactics.formation,state.date);state.bench=pickBench(selectionPlayers(state),state.clubId,state.lineup,state.date);
 state.match=startMatch(state,fixture);state.match.tick=90;state.match.phase='extraFirst';state.match.addedTime=[0,0];state.match.extraTime=true;
 const loaded=validateCareer(JSON.parse(canonical(state))),command={type:'AdvanceMatch' as const,minutes:15,careerId:state.careerId,expectedRevision:state.revision,commandId:crypto.randomUUID()};
 const first=applyCommand(state,command),replay=applyCommand(loaded,command);expect(canonical(first)).toBe(canonical(replay));if(!first.ok)throw Error(first.error);
 expect(first.value.match).toMatchObject({tick:105,phase:'extraInterval'});expect(clockLabel(105,0,600,first.value.match!)).toBe('105:00');expect(validateCareer(first.value)).toEqual(first.value);
 const last=advanceMatch(first.value.match!,state.players,15);expect(last).toMatchObject({tick:120,phase:'finished',extraTime:true});expect(clockLabel(120,0,600,last)).toBe('120:00');
});
it('draws repeatable penalties only from active players and rejects invalid kick records',()=>{
 const state=createCareer('00000000-0000-4000-8000-000000000004',2026,countryWorld.divisions[0]!.clubs[0]!);
 const match=startMatch(state,{...state.fixtures[0]!,competitionClass:'domestic',decider:true});
 match.extraTime=true;match.tick=120;match.addedTime=[0,0];match.phase='finished';match.dismissed=[match.homeLineup[1]!];match.injuries=[{playerId:match.awayLineup[1]!,until:'2026-07-08'}];
 const repeat=structuredClone(match);penalties(match,state.players);penalties(repeat,state.players);expect(canonical(match)).toBe(canonical(repeat));expect(match.homeGoals+match.awayGoals).toBe(0);expect(match.penalties.length).toBeGreaterThan(5);expect(()=>validatePenalties(match)).not.toThrow();
 const invalid=structuredClone(match);invalid.penalties[0]!.playerId=match.homeBench[0]!;expect(()=>validatePenalties(invalid)).toThrow('INVALID_SAVE');
});
it('keeps domestic, continental and league eligibility and sanctions separate',()=>{
 const state=createCareer('00000000-0000-4000-8000-000000000005',2026,countryWorld.divisions[0]!.clubs[0]!);
 const player=state.players.find(p=>p.clubId===state.clubId&&p.role==='FWD')!;player.leagueBan=2;player.leagueYellows=4;
 state.cupDiscipline[player.id]={domestic:{yellows:2,ban:0},continental:{yellows:1,ban:2}};
 expect(competitionPlayers(state,'domestic').find(p=>p.id===player.id)!.leagueBan).toBe(0);expect(competitionPlayers(state,'continental').find(p=>p.id===player.id)!.leagueBan).toBe(2);
 const match=startMatch(state,{...state.fixtures[0]!,competitionClass:'domestic',decider:true});match.events.push({tick:1,order:0,type:'yellow',clubId:player.clubId!,playerId:player.id,assistId:null,homeGoals:0,awayGoals:0});
 cupBookings(state,player,match);expect(state.cupDiscipline[player.id]).toEqual({domestic:{yellows:0,ban:1},continental:{yellows:1,ban:2}});expect(player).toMatchObject({leagueBan:2,leagueYellows:4});
});
