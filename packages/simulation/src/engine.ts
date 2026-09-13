import {resolveAttack,validateAttackEvents} from './attacks.ts';
import {copyCareer} from './state.ts';
import {initialBoard,boardFixture,validateBoard,acceptJob} from './board.ts';
import {initialPersonnel,recordAppearances,validatePersonnel} from './personnel.ts';
import {initialFacilities,upgradeFacility,validateFacilities} from './facilities.ts';
import {initialCups,cupFixtures,progressCups,validateCups} from './cupSeason.ts';
import {competitionPlayers,selectionPlayers,cupBookings} from './discipline.ts';
import {finishKnockout,penaltyScore,validatePenalties} from './penalties.ts';
import {worldClubs,countryWorld,exhibitionWorld} from '../../contracts/src/world.ts';
import {closeSeason,validateSeasons} from './season.ts';
import {callUp} from './academy.ts';
export {requiresCallUp} from './academy.ts';
import {compareFixtures,schedule,worldSchedule,nextManagedFixture} from './competition.ts';
export {schedule,standings} from './competition.ts';
import {validateLoans} from './loans.ts';
import {autoPick,validLineup,pickBench,selectableCount} from './selection.ts';
export {autoPick,validLineup,pickBench} from './selection.ts';
import {marketCommand,validateMarket,freePlayers} from './market.ts';
import {nextFixtureDate,advanceCalendar} from './calendar.ts';
import {startScouting,validateScouting} from './scouting.ts';
import {createContracts,renewContract,validateContracts} from './contracts.ts';
import {overall,effectiveRating} from './ratings.ts';
export {overall,effectiveRating} from './ratings.ts';
import {createEconomy,carryLedger,settleDay,settleGate,validateEconomy} from './economy.ts';
import {halfBoundary,regulationBoundary,completeMinute,validateMatchTiming} from './matchTime.ts';
import {available,activeLineup,needsDecision,incidents,settleAvailability,addDays,validDate} from './availability.ts';
import { preAttackCareerSchema, archivedCareerSchema, boardCareerSchema, personnelCareerSchema, facilitiesCareerSchema, registrationCareerSchema, rosterCareerSchema, competitionCareerSchema, careerSchema, countryCareerSchema, repeatingCareerSchema, exhibitionCareerSchema, recruitingCareerSchema, transferCareerSchema, scoutingCareerSchema, renewalCareerSchema, financialCareerSchema, timedCareerSchema, availabilityCareerSchema, legacyCareerSchema, previousCareerSchema, tacticalCareerSchema, planningCareerSchema, conditionCareerSchema, defaultTactics, formationCounts, type Tactics, type Career, type ClubId, type Player, type PlayerId, type Role, type Fixture, type Match, type Command, type Result } from '../../contracts/src/index.ts';
import { clubs } from '../../contracts/src/identity.ts';
import { draw, stream } from './rng.ts';

import {rules} from './rules.ts';
export {rules} from './rules.ts';
const roles: Role[] = ['GK','GK', ...Array<Role>(8).fill('DEF'), ...Array<Role>(8).fill('MID'), ...Array<Role>(4).fill('FWD')];
const firstNames = ['Alex','Robin','Sam','Jamie','Morgan','Casey','Drew','Ellis','Jules','Riley','Taylor','Noel','Avery','Cameron','Jordan','Rowan','Finley','Lee','Remy','Sasha','Micah','Quinn'];
const surnames = ['Ashford','Bellwick','Creston','Dalehurst','Elmbridge','Fenwick','Greyford','Harrowell'];



export function createCareer(careerId: string, seed: number, club:ClubId,kind:Career['world']['kind']='exhibition'):Career {
  const identities=kind==='countries'?worldClubs:clubs,world=structuredClone(kind==='countries'?countryWorld:exhibitionWorld);
  const players:Player[] = identities.flatMap((c, ci) => roles.map((role, i) => {
    let rng = stream(1, `players/${ci}/${i}`);
    const tier=world.divisions.find(d=>d.clubs.includes(c.id))?.tier??1;
    const base=kind==='exhibition'?55:tier===1?62+(ci%4)*5:48+(ci%3)*5;
    const rating = () => { let value; [rng,value]=draw(rng); return base+value%16; };
    return {id:`player-${String(ci+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}` as PlayerId, clubId:c.id, name:`${firstNames[i]} ${ci<8?surnames[ci]:['Ash','Bell','Crest','Dale','Elm','Fen','Grey','Harrow','Oak','Ridge','Stone','Vale','West','North','Wren','Brook'][(ci-8)%16]!+['ford','well','wick','stone','bridge','hurst','mere','dale','wood','field','vale'][Math.floor((ci-8)/16)]!}`, role, condition:100000,morale:70,registered:true,academy:false,injuryUntil:null,leagueYellows:0,leagueBan:0,goalkeeping:role==='GK'?rating():15, tackling:rating(), passing:rating(), shooting:rating(), pace:rating(), stamina:rating(), discipline:rating()};
  }));
  players.push(...freePlayers());
  if (!identities.some(c => c.id === club)) throw new Error('INVALID_COMMAND');
  const base={ careerId, seed, clubId:club, revision:0, appliedCommands:[], season:2026,history:[],rosterOrigin:null,facilities:initialFacilities(identities),engineVersion:'0.7.5',marketArchive:[],cupStartSeason:2026,cups:[],cupDiscipline:{},world,training:'balanced', rulesetVersion:rules.version, snapshotId:kind==='countries'?'fictional-world-2026-v2':'fictional-2026-v1', identityProfileId:'fcu-city-v1', identityProfileVersion:kind==='countries'?2:1, date:'2026-07-01', clubs:identities, players, tactics:{...defaultTactics},presets:[null,null,null],bench:pickBench(players,club,autoPick(players,club)),lineup:autoPick(players,club), fixtures:worldSchedule(world,2026), round:0, match:null };
  const state=careerSchema.parse({...base,board:initialBoard(base),personnel:initialPersonnel(players,identities,base.date),economy:createEconomy(base,overall,world.divisions.filter(d=>d.tier===2).flatMap(d=>d.clubs)),contracts:createContracts(base),scouting:{shortlist:[],active:null,reports:{}},offers:[],loans:[]});state.cups=initialCups(state);state.fixtures.push(...state.cups.flatMap(cupFixtures));state.fixtures.sort(compareFixtures);settleDay(state,state.date);return state;
}
const emptyStats = () => ({shots:0,onTarget:0,quality:0,possession:0});


export function substitutionWindows(match:Match,club:ClubId):number {
 return new Set(match.substitutions.filter(s=>s.clubId===club&&s.tick!==halfBoundary(match)&&(!match.extraTime||s.tick!==regulationBoundary(match)+15)).map(s=>s.tick)).size;
}
export function migrateLegacyCareer(input:unknown):Career {
 const old=legacyCareerSchema.parse(input);const m=old.match;
 return migrateTacticalCareer({...old,engineVersion:'0.2.1',rulesetVersion:'exhibition-2',tactics:{...defaultTactics},match:m?{...m,homeTactics:{...defaultTactics},awayTactics:{...defaultTactics},homeBench:pickBench(old.players.map(p=>({...p,condition:100000,morale:70,registered:true,academy:false,injuryUntil:null,leagueYellows:0,leagueBan:0})),m.home,m.homeLineup),awayBench:pickBench(old.players.map(p=>({...p,condition:100000,morale:70,registered:true,academy:false,injuryUntil:null,leagueYellows:0,leagueBan:0})),m.away,m.awayLineup),substitutions:[]}:null});
}
export function migratePreviousCareer(input:unknown):Career {
 const old=previousCareerSchema.parse(input);
 return migrateTacticalCareer({...old,engineVersion:'0.2.1',rulesetVersion:'exhibition-2',tactics:{...defaultTactics},match:old.match?{...old.match,homeTactics:{...defaultTactics},awayTactics:{...defaultTactics}}:null});
}
export function migrateTacticalCareer(input:unknown):Career {
 const old=tacticalCareerSchema.parse(input);
 return migratePlanningCareer({...old,engineVersion:'0.2.2',rulesetVersion:'exhibition-3',bench:pickBench(old.players.map(p=>({...p,condition:100000,morale:70,registered:true,academy:false,injuryUntil:null,leagueYellows:0,leagueBan:0})),old.clubId,old.lineup),presets:[null,null,null],match:old.match?{...old.match,managedClubId:old.clubId}:null});
}
export function migratePlanningCareer(input:unknown):Career {
 const old=planningCareerSchema.parse(input);const players=old.players.map(p=>({...p,condition:100000,morale:70,registered:true,academy:false,injuryUntil:null,leagueYellows:0,leagueBan:0}));
 return migrateConditionCareer({...old,engineVersion:'0.3.0',rulesetVersion:'exhibition-4',players,training:'balanced',match:old.match?{...old.match,condition:Object.fromEntries(players.filter(p=>p.clubId===old.match!.home||p.clubId===old.match!.away).map(p=>[p.id,p.condition]))}:null});
}
export function migrateConditionCareer(input:unknown):Career {
 const old=conditionCareerSchema.parse(input);const players=old.players.map(p=>({...p,registered:true,academy:false,injuryUntil:null,leagueYellows:0,leagueBan:0}));
 return migrateAvailabilityCareer({...old,engineVersion:'0.3.1',rulesetVersion:'exhibition-5',players,match:old.match?{...old.match,date:old.match.tick===90?addDays('2026-07-01',(old.round-1)*7):old.date,dismissed:[],injuries:[],pendingInjuries:[],pendingDismissal:false,forfeit:null}:null});
}
export function migrateAvailabilityCareer(input:unknown):Career {
 const old=availabilityCareerSchema.parse(input);const m=old.match;
 return migrateTimedCareer({...old,engineVersion:'0.3.2',rulesetVersion:'exhibition-6',match:m?{...m,phase:m.tick===90?'finished':m.tick===45?'interval':m.tick<45?'first':'second',addedTime:[m.tick>=45?0:null,m.tick===90?0:null]}:null});
}
export function migrateTimedCareer(input:unknown):Career {
 const old=timedCareerSchema.parse(input);
 return migrateFinancialCareer({...old,engineVersion:'0.4.0',rulesetVersion:'exhibition-7',economy:createEconomy({...old,players:old.players.map(p=>({...p,registered:true}))},overall)});
}
export function migrateFinancialCareer(input:unknown):Career {
 const old=financialCareerSchema.parse(input);
 return migrateRenewalCareer({...old,engineVersion:'0.4.1',rulesetVersion:'exhibition-8',contracts:createContracts({...old,players:old.players.map(p=>({...p,registered:true}))})});
}
export function migrateRenewalCareer(input:unknown):Career {
 const old=renewalCareerSchema.parse(input);
 return migrateScoutingCareer({...old,engineVersion:'0.4.2',rulesetVersion:'exhibition-9',scouting:{shortlist:[],active:null,reports:{}}});
}
export function migrateScoutingCareer(input:unknown):Career {
 const old=scoutingCareerSchema.parse(input),free=freePlayers();
 return migrateTransferCareer({...old,engineVersion:'0.4.3',rulesetVersion:'exhibition-10',players:[...old.players,...free],contracts:{...old.contracts,...createContracts({players:free,date:old.date})},economy:{...old.economy,wages:{...old.economy.wages,...Object.fromEntries(free.map(p=>[p.id,0]))}},offers:[],match:old.match?{...old.match,participants:Object.fromEntries(old.players.filter(p=>p.clubId===old.match!.home||p.clubId===old.match!.away).map(p=>[p.id,p.clubId]))}:null});
}
export function migrateTransferCareer(input:unknown):Career {const old=transferCareerSchema.parse(input);return migrateRecruitingCareer({...old,engineVersion:'0.4.4',rulesetVersion:'exhibition-11'});}
export function migrateRecruitingCareer(input:unknown):Career {const old=recruitingCareerSchema.parse(input);return migrateExhibitionCareer({...old,engineVersion:'0.4.5',rulesetVersion:'exhibition-12',offers:old.offers.map(o=>({...o,loanShare:null})),loans:[]});}
export function migrateExhibitionCareer(input:unknown):Career {const old=exhibitionCareerSchema.parse(input),dates=schedule(old.clubs.map(c=>c.id));return migrateRepeatingCareer({...old,engineVersion:'0.5.0',rulesetVersion:'exhibition-13',season:2026,history:[],fixtures:old.fixtures.map((f,i)=>({...f,date:dates[i]!.date}))});}
export function migrateRepeatingCareer(input:unknown):Career {
 const old=repeatingCareerSchema.parse(input),world=structuredClone(exhibitionWorld);
 const history=old.history.map(h=>({...h,fixtures:h.fixtures.map(f=>({...f,competitionId:'EXH'})),divisions:structuredClone(world.divisions),balances:Object.fromEntries(old.clubs.map(c=>[c.id,old.economy.ledger.filter(e=>e.date<=`${h.year+1}-06-30`).reduce((sum,e)=>sum+e.postings.reduce((n,p)=>n+(p.account===c.id?p.amount:0),0),0)])),prizes:Object.fromEntries(h.table.map((r,i)=>[r.clubId,10000000*(h.table.length-i)]))}));
 return migrateCountryCareer({...old,engineVersion:'0.5.1',rulesetVersion:'world-1',world,fixtures:old.fixtures.map(f=>({...f,competitionId:'EXH'})),history});
}
export function migrateCountryCareer(input:unknown):Career {
 const old=countryCareerSchema.parse(input),league={competitionClass:'league' as const,neutral:false,decider:false,cupTieId:null,shootout:null,forfeit:null};
 const next=careerSchema.parse({...old,board:initialBoard({...old,players:old.players.map(p=>({...p,registered:true}))}),personnel:initialPersonnel(old.players.map(p=>({...p,registered:true})),old.clubs,old.date),facilities:initialFacilities(old.clubs),players:old.players.map(p=>({...p,registered:true})),loans:old.loans.map(l=>({...l,source:'market'})),rosterOrigin:null,engineVersion:'0.7.5',marketArchive:[],rulesetVersion:'world-2',cupStartSeason:old.world.kind==='exhibition'?2026:old.season+1,cups:[],cupDiscipline:{},fixtures:old.fixtures.map(f=>({...f,...league,forfeit:old.match?.fixtureId===f.id?old.match.forfeit:null})),history:old.history.map(h=>({...h,cups:[],fixtures:h.fixtures.map(f=>({...f,...league}))})),match:old.match?{...old.match,competitionClass:'league',neutral:false,decider:false,aggregate:[0,0],extraTime:false,penalties:[]}:null});carryLedger(next);return validateCareer(next);
}
export function validBench(players:Player[],club:ClubId,lineup:PlayerId[],bench:PlayerId[]):boolean {
 return bench.length<=9&&new Set(bench).size===bench.length&&bench.every(id=>!lineup.includes(id)&&players.some(p=>p.id===id&&p.clubId===club));
}
// Fill natural slots first, then assign remaining outfield players deterministically.
export function arrangeLineup(players:Player[],ids:PlayerId[],formation:Tactics['formation']) {
 const roles=(['GK','DEF','MID','FWD'] as const).flatMap((role,i)=>Array<Role>(formationCounts[formation][i]!).fill(role));
 const remaining=ids.map(id=>players.find(p=>p.id===id)!).sort((a,b)=>compare(a.id,b.id));
 const emergency=remaining.some(p=>p.role==='GK')?null:[...remaining].sort((a,b)=>b.goalkeeping-a.goalkeeping||compare(a.id,b.id))[0]??null;
 const slots=roles.map(role=>{if(role==='GK'&&emergency){remaining.splice(remaining.indexOf(emergency),1);return {role,player:emergency};}const i=remaining.findIndex(p=>p.role===role);return {role,player:i<0?null:remaining.splice(i,1)[0]!};});
 return slots.flatMap(slot=>{const player=slot.player??remaining.shift();return player?[{role:slot.role,player}]:[];});
}
export function startMatch(input: Career, fixture: Fixture): Match {
  const state={...input,players:competitionPlayers({...input,players:input.players.filter(p=>p.clubId===fixture.home||p.clubId===fixture.away)},fixture.competitionClass)};
  const previous=fixture.cupTieId?state.fixtures.find(f=>f.cupTieId===fixture.cupTieId&&f.id!==fixture.id&&f.score):null;
  const aggregate:[number,number]=previous?.score?[previous.score[previous.home===fixture.home?0:1],previous.score[previous.home===fixture.home?1:0]]:[0,0];
  const homeLineup=fixture.home===state.clubId?[...state.lineup]:autoPick(state.players,fixture.home,'4-4-2',state.date);
  const awayLineup=fixture.away===state.clubId?[...state.lineup]:autoPick(state.players,fixture.away,'4-4-2',state.date);
  const match:Match={competitionClass:fixture.competitionClass,neutral:fixture.neutral,decider:fixture.decider,aggregate,extraTime:false,penalties:[],participants:Object.fromEntries(state.players.filter(p=>p.clubId===fixture.home||p.clubId===fixture.away).map(p=>[p.id,p.clubId!])),phase:'first',addedTime:[null,null],date:state.date,dismissed:[],injuries:[],pendingInjuries:[],pendingDismissal:false,forfeit:null,condition:Object.fromEntries(state.players.filter(p=>p.clubId===fixture.home||p.clubId===fixture.away).map(p=>[p.id,p.condition])),managedClubId:fixture.home===state.clubId||fixture.away===state.clubId?state.clubId:null,homeTactics:{...(fixture.home===state.clubId?state.tactics:defaultTactics)},awayTactics:{...(fixture.away===state.clubId?state.tactics:defaultTactics)},homeBench:fixture.home===state.clubId?[...state.bench]:pickBench(state.players,fixture.home,homeLineup,state.date),awayBench:fixture.away===state.clubId?[...state.bench]:pickBench(state.players,fixture.away,awayLineup,state.date),substitutions:[],fixtureId:fixture.id, home:fixture.home, away:fixture.away, tick:0, rng:stream(state.seed,`match/${fixture.id}`), homeLineup,awayLineup, homeGoals:0,awayGoals:0,homeStats:emptyStats(),awayStats:emptyStats(),events:[]};
  if(homeLineup.length<7)awardForfeit(match,fixture.home);else if(awayLineup.length<7)awardForfeit(match,fixture.away);return match;
}
function strength(slots:ReturnType<typeof arrangeLineup>) {
 const mean=(role:Role)=>{const group=slots.filter(s=>s.role===role);return group.length?Math.round(group.reduce((n,s)=>n+effectiveRating(s.player,role)*100,0)/group.length)/100:10;};
 return {A:mean('FWD'),M:mean('MID'),D:mean('DEF'),K:mean('GK')};
}
const clamp = (n:number,lo:number,hi:number) => Math.max(lo,Math.min(hi,Math.round(n)));
export function chanceProbability(own:{A:number;M:number},other:{D:number;M:number},home:boolean,tactics:Tactics,opponent:Tactics):number {
 return clamp(rules.chance*(own.A+own.M)/(other.D+other.M)*(home?rules.homeFactor/10000:1)*rules.mentality[tactics.mentality]/10000*rules.tempo[tactics.tempo]/10000*rules.exposure[opponent.mentality]/10000,rules.minChance,rules.maxChance);
}
function awardForfeit(match:Match,club:ClubId){
 match.forfeit=club;const difference=club===match.home?match.awayGoals-match.homeGoals:match.homeGoals-match.awayGoals;
 match.homeGoals=club===match.home?0:Math.max(3,difference);match.awayGoals=club===match.away?0:Math.max(3,difference);match.phase='finished';match.pendingInjuries=[];match.pendingDismissal=false;
}
function validSelection(state:Career,lineup:PlayerId[]):boolean {
 const eligible=selectionPlayers(state).filter(p=>p.clubId===state.clubId&&available(p,state.date));
 return validLineup(state.players,state.clubId,lineup)&&lineup.length===Math.min(11,selectableCount(eligible))&&(!eligible.some(p=>p.role==='GK')||lineup.some(id=>state.players.find(p=>p.id===id)?.role==='GK'));
}
export function substitutePlayer(m:Match,players:Player[],club:ClubId,out:PlayerId,incoming:PlayerId):boolean {
 if(m.tick<1||m.phase==='finished')return false;
 const lineup=club===m.home?m.homeLineup:m.awayLineup;const bench=club===m.home?m.homeBench:m.awayBench;
 const changes=m.substitutions.filter(s=>s.clubId===club);const index=lineup.indexOf(out);
 const window=m.phase==='interval'||m.phase==='extraInterval'||changes.some(s=>s.tick===m.tick)||substitutionWindows(m,club)<3;
 if(index<0||m.dismissed.includes(out)||!bench.includes(incoming)||lineup.includes(incoming)||changes.some(s=>s.out===incoming)||m.injuries.some(i=>i.playerId===incoming)||changes.length>=5||!window)return false;
 if(players.find(p=>p.id===out)?.role==='GK'&&players.find(p=>p.id===incoming)?.role!=='GK')return false;
 const candidate=[...lineup];candidate[index]=incoming;if(!validLineup(players,club,candidate))return false;
 lineup[index]=incoming;m.substitutions.push({tick:m.tick,clubId:club,out,in:incoming});m.pendingInjuries=m.pendingInjuries.filter(id=>id!==out);return true;
}
function automaticChanges(m:Match,players:Player[]){
 for(const club of [m.home,m.away]){
  if(club===m.managedClubId)continue;
  const lineup=club===m.home?m.homeLineup:m.awayLineup;const bench=club===m.home?m.homeBench:m.awayBench;
  const replacement=(out:PlayerId)=>{
   const outgoing=players.find(p=>p.id===out)!;
   const candidates=bench.map(id=>players.find(p=>p.id===id)!).filter(p=>(p.role==='GK')===(outgoing.role==='GK')).sort((a,b)=>Number(b.role===outgoing.role)-Number(a.role===outgoing.role)||effectiveRating(b)-effectiveRating(a)||compare(a.id,b.id));
   return candidates.some(p=>substitutePlayer(m,players,club,out,p.id));
  };
  for(const injury of m.injuries)if(lineup.includes(injury.playerId))replacement(injury.playerId);
  const last=m.substitutions.filter(s=>s.clubId===club).at(-1)?.tick??0;
  if(m.tick>=60+(m.addedTime[0]??0)&&m.tick-last>=10){const tired=activeLineup(m,club).filter(id=>m.condition[id]!<55000).sort((a,b)=>m.condition[a]!-m.condition[b]!||compare(a,b));if(tired[0])replacement(tired[0]);}
 }
}
export function advanceMatch(previous: Match, players: Player[], minutes: number): Match {
  players=players.filter(p=>Object.hasOwn(previous.condition,p.id));
  const match=structuredClone(previous);
  if(needsDecision(match)||match.phase==='finished')return match;
  if(match.phase==='interval')match.phase='second';else if(match.phase==='extraInterval')match.phase='extraSecond';
  const tactics=[match.homeTactics,match.awayTactics];
  const conditionedPlayers=players.map(p=>({...p}));
  const roll=()=>{let value; [match.rng,value]=draw(match.rng); return value%10000;};
  const weighted=(pool:Player[],weight:(p:Player)=>number):Player=>{
    const total=pool.reduce((n,p)=>n+weight(p),0); let target=roll()*total/10000;
    for (const p of pool) {target-=weight(p);if(target<0)return p;} return pool[pool.length-1]!;
  };
  const end=Math.min(130,match.tick+minutes);
  while(match.tick<end) {
    if(match.tick===60+(match.addedTime[0]??0)){
      if(match.home!==match.managedClubId)match.homeTactics.mentality=match.homeGoals<match.awayGoals?'attacking':match.homeGoals>match.awayGoals?'cautious':'balanced';
      if(match.away!==match.managedClubId)match.awayTactics.mentality=match.awayGoals<match.homeGoals?'attacking':match.awayGoals>match.homeGoals?'cautious':'balanced';
    }
    match.tick++;
    incidents(match,players,roll,weighted);
    automaticChanges(match,players);
  const active=[activeLineup(match,match.home),activeLineup(match,match.away)];
  for(const player of conditionedPlayers)player.condition=match.condition[player.id]??player.condition;
  const slots=active.map((ids,i)=>arrangeLineup(conditionedPlayers,ids,tactics[i]!.formation));
  // Keep the committed lineup order for weighted draws when natural roles are unchanged.
  const lineups=active.map((ids,i)=>ids.map(id=>{const slot=slots[i]!.find(s=>s.player.id===id)!;return {...slot.player,role:slot.role};}));
  const strengths=slots.map((team,i)=>{const value=strength(team);const size=team.length/11;return {...value,A:Math.round(value.A*size*100)/100,D:Math.round(value.D*size*100)/100,M:Math.round(value.M*size*rules.pressing[tactics[i]!.pressing]/100)/100};});
    for(const [side,ids] of active.entries())for(const id of ids)match.condition[id]=Math.max(0,match.condition[id]!-Math.round(rules.conditionLoss*rules.conditionTempo[tactics[side]!.tempo]/10000*rules.conditionPressing[tactics[side]!.pressing]/10000));
    const short=active.findIndex(ids=>ids.length<7);
    if(short>=0){awardForfeit(match,short===0?match.home:match.away);break;}
    const homePossession=Math.round(10000*strengths[0]!.M/(strengths[0]!.M+strengths[1]!.M));
    match.homeStats.possession+=homePossession; match.awayStats.possession+=10000-homePossession;
    const order=roll()<5000?[0,1]:[1,0];
    for(const side of order) {
      const own=strengths[side]!; const other=strengths[1-side]!;
      const chance=chanceProbability(own,other,side===0&&!match.neutral,tactics[side]!,tactics[1-side]!);
      const opponent=side===0?match.away:match.home;
      const penalty=match.events.some(e=>e.tick===match.tick&&e.clubId===opponent&&e.type==='foul')&&roll()<rules.boxFoul;
      if(!penalty&&roll()>=chance)continue;
      resolveAttack(match,side,lineups[side]!,lineups[1-side]!,other,roll,weighted,penalty);
    }
    if(completeMinute(match)||needsDecision(match))break;
  }
  finishKnockout(match,players);
  return match;
}
function settleFixture(state:Career,match:Match,dream=false){
 const fixture=state.fixtures.find(f=>f.id===match.fixtureId)!;if(fixture.score!==null)return;
 if(!dream)recordAppearances(state,match);
 if(!dream&&match.tick>0)settleGate(state,fixture.home,fixture.id,state.date,fixture.neutral);
 state.players=state.players.map(p=>{if(p.clubId!==match.home&&p.clubId!==match.away)return p;const own=p.clubId===match.home?match.homeGoals:match.awayGoals,other=p.clubId===match.home?match.awayGoals:match.homeGoals;cupBookings(state,p,match);const settled=settleAvailability(p,match);return {...settled,...(match.competitionClass==='league'?{}:{leagueBan:p.leagueBan,leagueYellows:p.leagueYellows}),condition:match.condition[p.id]??p.condition,morale:clamp(p.morale+(own>other?4:own<other?-4:0),0,100)};});
 fixture.score=[match.homeGoals,match.awayGoals];fixture.shootout=penaltyScore(match);fixture.forfeit=match.forfeit;if(!dream)boardFixture(state,fixture);
}
function simulateScheduledAI(state:Career,dream=false){
 if(nextManagedFixture(state)?.date===state.date)return;
 for(const fixture of state.fixtures){if(fixture.score!==null||fixture.date!==state.date||fixture.home===state.clubId||fixture.away===state.clubId)continue;
  if(!dream)for(const club of [fixture.home,fixture.away])while(callUp(state,club,fixture.competitionClass)){ /* At most eight active academy places. */ }
  let match=startMatch(state,fixture);while(match.phase!=='finished')match=advanceMatch(match,state.players,90);settleFixture(state,match,dream);
 }
}
export function applyCommand(state: Career, command: Command, dream=false): Result<Career> {
  if(command.careerId!==state.careerId||command.expectedRevision!==state.revision)return {ok:false,error:'STALE_STATE'};
  if(state.appliedCommands.includes(command.commandId))return {ok:false,error:'DUPLICATE_COMMAND'};
  if(state.board.status!=='employed'&&!['AcceptJob','RetireManager'].includes(command.type))return {ok:false,error:'INVALID_COMMAND'};
  let advanced:Match|null=null;
  if(command.type==='AdvanceMatch'){
    if(!state.match||state.match.phase==='finished')return {ok:false,error:'INVALID_COMMAND'};
    if(needsDecision(state.match))return {ok:false,error:'MATCH_DECISION'};
    advanced=advanceMatch(state.match,state.players,command.minutes);
    // Intermediate ticks change only the match; settled Career records remain untouched.
    if(advanced.phase!=='finished')return {ok:true,value:{...state,match:advanced,revision:state.revision+1,appliedCommands:[...state.appliedCommands,command.commandId].slice(-256)}};
  }
  const next=copyCareer(state);
  if(command.type==='AcceptJob'){if(!acceptJob(next,command.clubId))return {ok:false,error:'INVALID_COMMAND'};}
  else if(command.type==='RetireManager'){if(state.board.status==='retired')return {ok:false,error:'INVALID_COMMAND'};if(state.board.status==='employed')next.board.history.push({clubId:state.clubId,from:state.board.since,to:state.date,reason:'retirement'});next.board.status='retired';next.board.vacancies=[];}
  else if(command.type==='SetAssisted'){next.board.assisted=command.enabled;}
  else if(command.type==='CloseSeason'){const error=closeSeason(next);if(error)return {ok:false,error};}
  else if(command.type==='SubmitLoan'||command.type==='SubmitOffer'||command.type==='CounterOffer'||command.type==='AcceptOffer'||command.type==='OfferTerms'||command.type==='ConfirmDeal'||command.type==='WithdrawOffer'){
    const error=marketCommand(next,command);if(error)return {ok:false,error};
  } else if(command.type==='AdvanceCalendar'){
    const error=advanceCalendar(next,command.target,simulateScheduledAI);if(error)return {ok:false,error};
  } else if(command.type==='ScoutPlayer'){
    const error=startScouting(next,command.playerId);if(error)return {ok:false,error};
  } else if(command.type==='SetShortlist'){
    if(!state.players.some(p=>p.id===command.playerId&&p.clubId!==state.clubId))return {ok:false,error:'INVALID_COMMAND'};
    next.scouting.shortlist=command.listed?[...new Set([...state.scouting.shortlist,command.playerId])].sort():state.scouting.shortlist.filter(id=>id!==command.playerId);
  } else if(command.type==='RenewContract'){
    const error=renewContract(next,command);if(error)return {ok:false,error};
  } else if(command.type==='SelectLineup') {
    if(state.match && state.match.phase!=='finished')return {ok:false,error:'INVALID_COMMAND'};
    if(!validSelection(state,command.lineup))return {ok:false,error:'INVALID_LINEUP'};
    if(command.lineup.some(id=>!available(selectionPlayers(state).find(p=>p.id===id)!,state.date)))return {ok:false,error:'UNAVAILABLE_PLAYER'};
    next.lineup=command.lineup;
    // Retain valid choices; fill only vacancies when the starting eleven changes.
    const retained=state.bench.filter(id=>!command.lineup.includes(id)&&available(selectionPlayers(state).find(p=>p.id===id)!,state.date));
    next.bench=[...retained,...pickBench(selectionPlayers(state),state.clubId,command.lineup,state.date).filter(id=>!retained.includes(id))].slice(0,9);
    if(!validBench(state.players,state.clubId,next.lineup,next.bench))next.bench=pickBench(selectionPlayers(state),state.clubId,next.lineup,state.date);
  } else if(command.type==='ForfeitMatch') {
    if(state.date!==nextFixtureDate(state))return {ok:false,error:'NOT_MATCH_DAY'};
    if(!nextManagedFixture(state)||(state.match&&state.match.phase!=='finished')||selectableCount(selectionPlayers(state).filter(p=>p.clubId===state.clubId&&available(p,state.date)))>=7||state.players.filter(p=>p.clubId===state.clubId&&p.academy).length<8)return {ok:false,error:'INVALID_COMMAND'};
    next.match=startMatch(state,nextManagedFixture(state)!);awardForfeit(next.match,state.clubId);
  } else if(command.type==='CallUp') {
    if((state.match&&state.match.phase!=='finished')||!callUp(next,state.clubId))return {ok:false,error:'INVALID_COMMAND'};
  } else if(command.type==='AcknowledgeMatch') {
    if(!next.match||!needsDecision(next.match))return {ok:false,error:'INVALID_COMMAND'};next.match.pendingInjuries=[];next.match.pendingDismissal=false;
  } else if(command.type==='SetRegistration') {
    if(state.match&&state.match.phase!=='finished')return {ok:false,error:'INVALID_COMMAND'};
    const chosen=state.players.filter(p=>command.players.includes(p.id)&&p.clubId===state.clubId&&!p.academy);
    const reserved=state.loans.filter(l=>l.parent===state.clubId&&l.status==='active').length;
    if(new Set(command.players).size!==command.players.length||chosen.length!==command.players.length||chosen.length+reserved>30||chosen.filter(p=>p.role==='GK').length<2)return {ok:false,error:'INVALID_LINEUP'};
    for(const p of next.players)if(p.clubId===next.clubId&&!p.academy)p.registered=command.players.includes(p.id);
    next.lineup=autoPick(next.players,next.clubId,next.tactics.formation,next.date);next.bench=pickBench(next.players,next.clubId,next.lineup,next.date);
    if(next.lineup.length!==11)return {ok:false,error:'INVALID_LINEUP'};
  } else if(command.type==='SetTrainingFocus') {
    next.personnel.focus=command.focus;
  } else if(command.type==='UpgradeFacility') {
    if(!upgradeFacility(next,command.kind))return {ok:false,error:'INVALID_COMMAND'};
  } else if(command.type==='SetTraining') {
    next.training=command.training;
  } else if(command.type==='SelectBench') {
    if(state.match&&state.match.phase!=='finished')return {ok:false,error:'INVALID_COMMAND'};
    if(!validBench(state.players,state.clubId,state.lineup,command.bench))return {ok:false,error:'INVALID_BENCH'};
    if(command.bench.some(id=>!available(selectionPlayers(state).find(p=>p.id===id)!,state.date)))return {ok:false,error:'UNAVAILABLE_PLAYER'};
    next.bench=command.bench;
  } else if(command.type==='StoreTacticPreset') {
    next.presets[command.slot]=command.tactics;
  } else if(command.type==='SetTactics') {
    if(state.match&&state.match.phase!=='finished'){
      if(state.match.home===state.clubId)next.match!.homeTactics=command.tactics;else next.match!.awayTactics=command.tactics;
    }
    next.tactics=command.tactics;
  } else if(command.type==='Substitute') {
    if(!next.match||!substitutePlayer(next.match,state.players,state.clubId,command.out,command.in))return {ok:false,error:'INVALID_SUBSTITUTION'};
  } else if(command.type==='StartMatch') {
    if(state.date!==nextFixtureDate(state))return {ok:false,error:'NOT_MATCH_DAY'};
    if(!nextManagedFixture(state)||(state.match&&state.match.phase!=='finished'))return {ok:false,error:'INVALID_COMMAND'};
    if([...state.lineup,...state.bench].some(id=>!available(selectionPlayers(state).find(p=>p.id===id)!,state.date)))return {ok:false,error:'UNAVAILABLE_PLAYER'};
    if(!validSelection(state,state.lineup))return {ok:false,error:'INVALID_LINEUP'};
    const fixture=nextManagedFixture(state)!;const opponent=fixture.home===state.clubId?fixture.away:fixture.home;if(!dream)while(callUp(next,opponent,fixture.competitionClass)){ /* Bounded academy cover. */ }
    next.match=startMatch(next,fixture);
  } else {
    if(!state.match||state.match.phase==='finished')return {ok:false,error:'INVALID_COMMAND'};
    if(needsDecision(state.match))return {ok:false,error:'MATCH_DECISION'};
    next.match=advanced??advanceMatch(state.match,state.players,command.minutes);
  }
  const finishedFixture=next.match?.phase==='finished'&&state.fixtures.find(f=>f.id===next.match!.fixtureId)?.score===null;
  if(next.match&&finishedFixture){settleFixture(next,next.match,dream);simulateScheduledAI(next,dream);next.round++;}
  if(command.type==='AdvanceCalendar'||finishedFixture)progressCups(next);next.revision++;next.appliedCommands=[...state.appliedCommands,command.commandId].slice(-256);
  return {ok:true,value:next};
}
function compare(a:string,b:string){return a<b?-1:a>b?1:0;}

export function migrateCompetitionCareer(input:unknown):Career {
 const old=competitionCareerSchema.parse(input);return validateCareer({...old,board:initialBoard({...old,players:old.players.map(p=>({...p,registered:true}))}),personnel:initialPersonnel(old.players.map(p=>({...p,registered:true})),old.clubs,old.date),facilities:initialFacilities(old.clubs),engineVersion:'0.7.5',marketArchive:[],players:old.players.map(p=>({...p,registered:true})),loans:old.loans.map(l=>({...l,source:'market'})),rosterOrigin:null});
}
export function migrateRosterCareer(input:unknown):Career {const old=rosterCareerSchema.parse(input);return validateCareer({...old,board:initialBoard({...old,players:old.players.map(p=>({...p,registered:true}))}),personnel:initialPersonnel(old.players.map(p=>({...p,registered:true})),old.clubs,old.date),facilities:initialFacilities(old.clubs),engineVersion:'0.7.5',marketArchive:[],players:old.players.map(p=>({...p,registered:true})),loans:old.loans.map(l=>({...l,source:'market'}))});}
export function migrateRegistrationCareer(input:unknown):Career {const old=registrationCareerSchema.parse(input);return validateCareer({...old,board:initialBoard({...old,players:old.players.map(p=>({...p,registered:true}))}),personnel:initialPersonnel(old.players,old.clubs,old.date),engineVersion:'0.7.5',marketArchive:[],facilities:initialFacilities(old.clubs)});}
export function migrateFacilitiesCareer(input:unknown):Career {const old=facilitiesCareerSchema.parse(input);return validateCareer({...old,board:initialBoard(old),engineVersion:'0.7.5',marketArchive:[],personnel:initialPersonnel(old.players,old.clubs,old.date)});}
export function migratePersonnelCareer(input:unknown):Career {const old=personnelCareerSchema.parse(input);return validateCareer({...old,engineVersion:'0.7.5',marketArchive:[],board:initialBoard(old)});}
export function migrateArchivedCareer(input:unknown):Career {const old=archivedCareerSchema.parse(input);return validateCareer({...old,engineVersion:'0.7.5'});}
export function migrateBoardCareer(input:unknown):Career {const old=boardCareerSchema.parse(input);return validateCareer({...old,engineVersion:'0.7.5',marketArchive:[]});}
export function migratePreAttackCareer(input:unknown):Career {const old=preAttackCareerSchema.parse(input);return validateCareer({...old,engineVersion:'0.7.5'});}
export function validateCareer(input: unknown): Career {
  const state=careerSchema.parse(input);
  validateBoard(state);validatePersonnel(state);validateFacilities(state);validateEconomy(state);validateContracts(state);validateScouting(state);validateMarket(state);validateLoans(state);validateSeasons(state);validateCups(state);
  return validateMatchState(state);
}
export function validateMatchState(state:Career):Career {
  const nextDate=nextFixtureDate(state);if((nextDate&&state.date>nextDate)||(state.match&&state.match.date>state.date))throw new Error('INVALID_SAVE');
  if(!validDate(state.date)||state.players.some(p=>p.injuryUntil!==null&&!validDate(p.injuryUntil)))throw new Error('INVALID_SAVE');
  const ids=state.clubs.map(c=>c.id);
  if(new Set(ids).size!==state.clubs.length||new Set(state.players.map(p=>p.id)).size!==state.players.length||!ids.includes(state.clubId)||!validLineup(state.players,state.clubId,state.lineup))throw new Error('INVALID_SAVE');
  if(state.players.some(p=>p.clubId!==null&&!ids.includes(p.clubId))||ids.some(id=>state.players.filter(p=>p.clubId===id&&!p.academy&&p.registered).length>30||state.players.filter(p=>p.clubId===id&&p.academy).length>8))throw new Error('INVALID_SAVE');
  if(!validBench(state.players,state.clubId,state.lineup,state.bench))throw new Error('INVALID_SAVE');
  if(state.round!==state.fixtures.filter(f=>f.score!==null&&(f.home===state.clubId||f.away===state.clubId)).length||state.fixtures.some(f=>f.score===null&&f.date<state.date))throw new Error('INVALID_SAVE');
  const expected=[...worldSchedule(state.world,state.season),...state.cups.flatMap(cupFixtures)].sort(compareFixtures);
  if(state.fixtures.length!==expected.length||state.fixtures.some((f,i)=>{const e=expected[i]!;return f.id!==e.id||f.home!==e.home||f.away!==e.away||f.round!==e.round||f.date!==e.date||f.competitionId!==e.competitionId||f.competitionClass!==e.competitionClass||f.neutral!==e.neutral||f.decider!==e.decider||f.cupTieId!==e.cupTieId;}))throw new Error('INVALID_SAVE');
  if(Object.keys(state.cupDiscipline).some(id=>!state.players.some(p=>p.id===id)))throw Error('INVALID_SAVE');
  const historical=state.match?state.players.map(p=>({...p,clubId:state.match!.participants[p.id]??p.clubId})):state.players;
  if(state.match){const m=state.match;const f=state.fixtures.find(f=>f.id===m.fixtureId);if(!f||f.date!==m.date||f.home!==m.home||f.away!==m.away||f.competitionClass!==m.competitionClass||f.neutral!==m.neutral||f.decider!==m.decider||(f.score!==null)!==(m.phase==='finished')||(!(m.forfeit&&m.tick===0)&&m.forfeit!==m.home&&!validLineup(historical,m.home,m.homeLineup))||(!(m.forfeit&&m.tick===0)&&m.forfeit!==m.away&&!validLineup(historical,m.away,m.awayLineup))||m.events.some((e,i)=>e.order!==i||e.tick>m.tick||!historical.some(p=>p.id===e.playerId&&p.clubId===e.clubId)))throw new Error('INVALID_SAVE');}
  if(state.match){
    const m=state.match;
    validateMatchTiming(m);validatePenalties(m);validateAttackEvents(m);
    const ownFixture=state.fixtures.find(f=>f.id===m.fixtureId)!,firstLeg=ownFixture.cupTieId?state.fixtures.find(f=>f.cupTieId===ownFixture.cupTieId&&f.date<ownFixture.date):null;
    const aggregate=firstLeg?.score?[firstLeg.score[firstLeg.home===m.home?0:1],firstLeg.score[firstLeg.home===m.home?1:0]]:[0,0];if(m.aggregate[0]!==aggregate[0]||m.aggregate[1]!==aggregate[1])throw Error('INVALID_SAVE');
    if(m.phase==='finished'){const fixture=state.fixtures.find(f=>f.id===m.fixtureId)!;if(JSON.stringify(fixture.shootout)!==JSON.stringify(penaltyScore(m))||fixture.forfeit!==m.forfeit)throw Error('INVALID_SAVE');const score=fixture.score;if(!score||score[0]!==m.homeGoals||score[1]!==m.awayGoals)throw new Error('INVALID_SAVE');}
    if(!validDate(m.date)||m.injuries.some(i=>!validDate(i.until)))throw new Error('INVALID_SAVE');
    const dismissed=m.events.filter(e=>e.type==='red'||e.type==='secondYellow').map(e=>e.playerId);
    if(new Set(m.dismissed).size!==m.dismissed.length||dismissed.length!==m.dismissed.length||dismissed.some(id=>!m.dismissed.includes(id))||new Set(m.injuries.map(i=>i.playerId)).size!==m.injuries.length||m.injuries.some(i=>i.until<=m.date||!m.events.some(e=>e.type==='injury'&&e.playerId===i.playerId))||new Set(m.pendingInjuries).size!==m.pendingInjuries.length||m.pendingInjuries.some(id=>!m.injuries.some(i=>i.playerId===id)||!(m.home===state.clubId?m.homeLineup:m.awayLineup).includes(id)))throw new Error('INVALID_SAVE');
    const participants=historical.filter(p=>m.participants[p.id]!==undefined);
    if(Object.entries(m.participants).some(([id,club])=>![m.home,m.away].includes(club)||!state.players.some(p=>p.id===id)||m.condition[id as PlayerId]===undefined)||(m.phase!=='finished'&&participants.some(p=>state.players.find(current=>current.id===p.id)!.clubId!==p.clubId)))throw new Error('INVALID_SAVE');
    if(Object.keys(m.condition).some(id=>!participants.some(p=>p.id===id))||[...m.homeLineup,...m.awayLineup,...m.homeBench,...m.awayBench].some(id=>m.condition[id]===undefined))throw new Error('INVALID_SAVE');
    if(m.managedClubId!==state.clubId)throw new Error('INVALID_SAVE');
    for(const [club,lineup,bench] of [[m.home,m.homeLineup,m.homeBench],[m.away,m.awayLineup,m.awayBench]] as const){
      const changes=m.substitutions.filter(s=>s.clubId===club);
      if(changes.length>5||substitutionWindows(m,club)>3||new Set(bench).size!==bench.length||bench.some(id=>!historical.some(p=>p.id===id&&p.clubId===club)))throw new Error('INVALID_SAVE');
      const original=[...lineup];
      for(const change of [...changes].reverse()){
        const index=original.indexOf(change.in);
        if(index<0||original.includes(change.out)||!bench.includes(change.in))throw new Error('INVALID_SAVE');
        original[index]=change.out;
        if(!validLineup(historical,club,original))throw new Error('INVALID_SAVE');
      }
      if((!(m.forfeit&&m.tick===0)&&m.forfeit!==club&&!validLineup(historical,club,original))||original.some(id=>bench.includes(id))||new Set(changes.map(c=>c.in)).size!==changes.length||new Set(changes.map(c=>c.out)).size!==changes.length||changes.some((c,i)=>changes.slice(0,i).some(other=>other.out===c.in)))throw new Error('INVALID_SAVE');
    }
    if(m.substitutions.some((s,i)=>s.tick>m.tick||(s.clubId!==m.home&&s.clubId!==m.away)||(i>0&&s.tick<m.substitutions[i-1]!.tick)))throw new Error('INVALID_SAVE');
  }
  return state;
}
