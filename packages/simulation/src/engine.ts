import {nextFixtureDate,advanceCalendar} from './calendar.ts';
import {startScouting,validateScouting} from './scouting.ts';
import {createContracts,initialContract,renewContract,validateContracts} from './contracts.ts';
import {overall,effectiveRating} from './ratings.ts';
export {overall,effectiveRating} from './ratings.ts';
import {createEconomy,settleDay,settleGate,validateEconomy} from './economy.ts';
import {halfBoundary,completeMinute} from './matchTime.ts';
import {available,activeLineup,needsDecision,incidents,settleAvailability,addDays,validDate} from './availability.ts';
import { careerSchema, renewalCareerSchema, financialCareerSchema, timedCareerSchema, availabilityCareerSchema, legacyCareerSchema, previousCareerSchema, tacticalCareerSchema, planningCareerSchema, conditionCareerSchema, defaultTactics, formationCounts, type Tactics, type Career, type ClubId, type Player, type PlayerId, type Role, type Fixture, type Match, type Command, type Result } from '../../contracts/src/index.ts';
import { clubs } from '../../contracts/src/identity.ts';
import { draw, stream } from './rng.ts';

import {rules} from './rules.ts';
export {rules} from './rules.ts';
const roles: Role[] = ['GK','GK', ...Array<Role>(8).fill('DEF'), ...Array<Role>(8).fill('MID'), ...Array<Role>(4).fill('FWD')];
const firstNames = ['Alex','Robin','Sam','Jamie','Morgan','Casey','Drew','Ellis','Jules','Riley','Taylor','Noel','Avery','Cameron','Jordan','Rowan','Finley','Lee','Remy','Sasha','Micah','Quinn'];
const surnames = ['Ashford','Bellwick','Creston','Dalehurst','Elmbridge','Fenwick','Greyford','Harrowell'];
export function autoPick(players: Player[], club: ClubId,formation:Tactics['formation']='4-4-2',date='2026-07-01'): PlayerId[] {
  const natural=(['GK','DEF','MID','FWD'] as const).flatMap((role, i) => players.filter(p => p.clubId === club && p.role === role && available(p,date)).sort((a,b) => effectiveRating(b)-effectiveRating(a) || compare(a.id,b.id)).slice(0, formationCounts[formation][i]).map(p => p.id));
  const extras=players.filter(p=>p.clubId===club&&p.role!=='GK'&&available(p,date)&&!natural.includes(p.id)).sort((a,b)=>effectiveRating(b)-effectiveRating(a)||compare(a.id,b.id));
  return [...natural,...extras.map(p=>p.id)].slice(0,11);
}
export function validLineup(players: Player[], club: ClubId, lineup: PlayerId[]): boolean {
  if (lineup.length < 7 || lineup.length > 11 || new Set(lineup).size !== lineup.length) return false;
  const selected = lineup.map(id => players.find(p => p.id === id && p.clubId === club));
  return selected.every(p => p !== undefined) && selected.filter(p => p?.role === 'GK').length <= 1;
}
export function schedule(ids: ClubId[]): Fixture[] {
  const rotation = [...ids]; const first: Fixture[] = [];
  for (let round=0; round<7; round++) {
    for (let i=0;i<4;i++) {
      const a=rotation[i]!; const b=rotation[7-i]!;
      first.push({ id:`fixture-${String(round).padStart(2,'0')}-${i}`, round, home:round%2 ? b:a, away:round%2 ? a:b, score:null });
    }
    rotation.splice(1,0,rotation.pop()!);
  }
  return [...first, ...first.map((f,i) => ({ ...f, id:`fixture-${String(f.round+7).padStart(2,'0')}-${i%4}`, round:f.round+7, home:f.away, away:f.home }))];
}
export function requiresCallUp(state:Career,club:ClubId=state.clubId):boolean {
 const eligible=state.players.filter(p=>p.clubId===club&&available(p,state.date));return eligible.length<11||!eligible.some(p=>p.role==='GK');
}
function callUp(state:Career,club:ClubId):boolean {
 const squad=state.players.filter(p=>p.clubId===club);if(squad.filter(p=>p.academy).length>=8||!requiresCallUp(state,club))return false;
 const role:Role=squad.some(p=>p.role==='GK'&&available(p,state.date))?'MID':'GK';const number=23+squad.filter(p=>p.academy).length;
 state.players.push({id:('player-'+club.slice(-2)+'-'+number) as PlayerId,clubId:club,name:'Academy '+club.slice(-2)+' '+number,role,academy:true,condition:100000,morale:70,injuryUntil:null,leagueYellows:0,leagueBan:0,goalkeeping:role==='GK'?45:15,tackling:45,passing:45,shooting:45,pace:45,stamina:45,discipline:60});state.economy.wages[state.players.at(-1)!.id]=0;state.contracts[state.players.at(-1)!.id]=initialContract(state.players.at(-1)!,state.date);return true;
}
export function createCareer(careerId: string, seed: number, club: ClubId): Career {
  const players = clubs.flatMap((c, ci) => roles.map((role, i) => {
    let rng = stream(1, `players/${ci}/${i}`);
    const rating = () => { let value; [rng,value]=draw(rng); return 55+value%16; };
    return {id:`player-${String(ci+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}` as PlayerId, clubId:c.id, name:`${firstNames[i]} ${surnames[ci]}`, role, condition:100000,morale:70,academy:false,injuryUntil:null,leagueYellows:0,leagueBan:0,goalkeeping:role==='GK'?rating():15, tackling:rating(), passing:rating(), shooting:rating(), pace:rating(), stamina:rating(), discipline:rating()};
  }));
  if (!clubs.some(c => c.id === club)) throw new Error('INVALID_COMMAND');
  const base={ careerId, seed, clubId:club, revision:0, appliedCommands:[], engineVersion:'0.4.2',training:'balanced', rulesetVersion:rules.version, snapshotId:'fictional-2026-v1', identityProfileId:'fcu-city-v1', identityProfileVersion:1, date:'2026-07-01', clubs, players, tactics:{...defaultTactics},presets:[null,null,null],bench:pickBench(players,club,autoPick(players,club)),lineup:autoPick(players,club), fixtures:schedule(clubs.map(c=>c.id)), round:0, match:null };
  const state=careerSchema.parse({...base,economy:createEconomy(base,overall),contracts:createContracts(base),scouting:{shortlist:[],active:null,reports:{}}});settleDay(state,state.date);return state;
}
const emptyStats = () => ({shots:0,onTarget:0,quality:0,possession:0});
// Reserve one goalkeeper and the eight highest-rated remaining outfield players.
export function pickBench(players:Player[],club:ClubId,lineup:PlayerId[],date='2026-07-01'):PlayerId[] {
 const reserves=players.filter(p=>p.clubId===club&&!lineup.includes(p.id)&&available(p,date)).sort((a,b)=>effectiveRating(b)-effectiveRating(a)||compare(a.id,b.id));
 return [...reserves.filter(p=>p.role==='GK').slice(0,1),...reserves.filter(p=>p.role!=='GK').slice(0,8)].map(p=>p.id);
}
export function substitutionWindows(match:Match,club:ClubId):number {
 return new Set(match.substitutions.filter(s=>s.clubId===club&&s.tick!==halfBoundary(match)).map(s=>s.tick)).size;
}
export function migrateLegacyCareer(input:unknown):Career {
 const old=legacyCareerSchema.parse(input);const m=old.match;
 return migrateTacticalCareer({...old,engineVersion:'0.2.1',rulesetVersion:'exhibition-2',tactics:{...defaultTactics},match:m?{...m,homeTactics:{...defaultTactics},awayTactics:{...defaultTactics},homeBench:pickBench(old.players.map(p=>({...p,condition:100000,morale:70,academy:false,injuryUntil:null,leagueYellows:0,leagueBan:0})),m.home,m.homeLineup),awayBench:pickBench(old.players.map(p=>({...p,condition:100000,morale:70,academy:false,injuryUntil:null,leagueYellows:0,leagueBan:0})),m.away,m.awayLineup),substitutions:[]}:null});
}
export function migratePreviousCareer(input:unknown):Career {
 const old=previousCareerSchema.parse(input);
 return migrateTacticalCareer({...old,engineVersion:'0.2.1',rulesetVersion:'exhibition-2',tactics:{...defaultTactics},match:old.match?{...old.match,homeTactics:{...defaultTactics},awayTactics:{...defaultTactics}}:null});
}
export function migrateTacticalCareer(input:unknown):Career {
 const old=tacticalCareerSchema.parse(input);
 return migratePlanningCareer({...old,engineVersion:'0.2.2',rulesetVersion:'exhibition-3',bench:pickBench(old.players.map(p=>({...p,condition:100000,morale:70,academy:false,injuryUntil:null,leagueYellows:0,leagueBan:0})),old.clubId,old.lineup),presets:[null,null,null],match:old.match?{...old.match,managedClubId:old.clubId}:null});
}
export function migratePlanningCareer(input:unknown):Career {
 const old=planningCareerSchema.parse(input);const players=old.players.map(p=>({...p,condition:100000,morale:70,academy:false,injuryUntil:null,leagueYellows:0,leagueBan:0}));
 return migrateConditionCareer({...old,engineVersion:'0.3.0',rulesetVersion:'exhibition-4',players,training:'balanced',match:old.match?{...old.match,condition:Object.fromEntries(players.filter(p=>p.clubId===old.match!.home||p.clubId===old.match!.away).map(p=>[p.id,p.condition]))}:null});
}
export function migrateConditionCareer(input:unknown):Career {
 const old=conditionCareerSchema.parse(input);const players=old.players.map(p=>({...p,academy:false,injuryUntil:null,leagueYellows:0,leagueBan:0}));
 return migrateAvailabilityCareer({...old,engineVersion:'0.3.1',rulesetVersion:'exhibition-5',players,match:old.match?{...old.match,date:old.match.tick===90?addDays('2026-07-01',(old.round-1)*7):old.date,dismissed:[],injuries:[],pendingInjuries:[],pendingDismissal:false,forfeit:null}:null});
}
export function migrateAvailabilityCareer(input:unknown):Career {
 const old=availabilityCareerSchema.parse(input);const m=old.match;
 return migrateTimedCareer({...old,engineVersion:'0.3.2',rulesetVersion:'exhibition-6',match:m?{...m,phase:m.tick===90?'finished':m.tick===45?'interval':m.tick<45?'first':'second',addedTime:[m.tick>=45?0:null,m.tick===90?0:null]}:null});
}
export function migrateTimedCareer(input:unknown):Career {
 const old=timedCareerSchema.parse(input);
 return migrateFinancialCareer({...old,engineVersion:'0.4.0',rulesetVersion:'exhibition-7',economy:createEconomy(old,overall)});
}
export function migrateFinancialCareer(input:unknown):Career {
 const old=financialCareerSchema.parse(input);
 return migrateRenewalCareer({...old,engineVersion:'0.4.1',rulesetVersion:'exhibition-8',contracts:createContracts(old)});
}
export function migrateRenewalCareer(input:unknown):Career {
 const old=renewalCareerSchema.parse(input);
 return validateCareer({...old,engineVersion:'0.4.2',rulesetVersion:rules.version,scouting:{shortlist:[],active:null,reports:{}}});
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
export function startMatch(state: Career, fixture: Fixture): Match {
  const homeLineup=fixture.home===state.clubId?[...state.lineup]:autoPick(state.players,fixture.home,'4-4-2',state.date);
  const awayLineup=fixture.away===state.clubId?[...state.lineup]:autoPick(state.players,fixture.away,'4-4-2',state.date);
  const match:Match={phase:'first',addedTime:[null,null],date:state.date,dismissed:[],injuries:[],pendingInjuries:[],pendingDismissal:false,forfeit:null,condition:Object.fromEntries(state.players.filter(p=>p.clubId===fixture.home||p.clubId===fixture.away).map(p=>[p.id,p.condition])),managedClubId:fixture.home===state.clubId||fixture.away===state.clubId?state.clubId:null,homeTactics:{...(fixture.home===state.clubId?state.tactics:defaultTactics)},awayTactics:{...(fixture.away===state.clubId?state.tactics:defaultTactics)},homeBench:fixture.home===state.clubId?[...state.bench]:pickBench(state.players,fixture.home,homeLineup,state.date),awayBench:fixture.away===state.clubId?[...state.bench]:pickBench(state.players,fixture.away,awayLineup,state.date),substitutions:[],fixtureId:fixture.id, home:fixture.home, away:fixture.away, tick:0, rng:stream(state.seed,`match/${fixture.id}`), homeLineup,awayLineup, homeGoals:0,awayGoals:0,homeStats:emptyStats(),awayStats:emptyStats(),events:[]};
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
 const eligible=state.players.filter(p=>p.clubId===state.clubId&&available(p,state.date));
 return validLineup(state.players,state.clubId,lineup)&&lineup.length===Math.min(11,eligible.length)&&(!eligible.some(p=>p.role==='GK')||lineup.some(id=>state.players.find(p=>p.id===id)?.role==='GK'));
}
export function substitutePlayer(m:Match,players:Player[],club:ClubId,out:PlayerId,incoming:PlayerId):boolean {
 if(m.tick<1||m.phase==='finished')return false;
 const lineup=club===m.home?m.homeLineup:m.awayLineup;const bench=club===m.home?m.homeBench:m.awayBench;
 const changes=m.substitutions.filter(s=>s.clubId===club);const index=lineup.indexOf(out);
 const window=m.phase==='interval'||changes.some(s=>s.tick===m.tick)||substitutionWindows(m,club)<3;
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
  const match=structuredClone(previous);
  if(needsDecision(match)||match.phase==='finished')return match;
  if(match.phase==='interval')match.phase='second';
  const tactics=[match.homeTactics,match.awayTactics];
  const roll=()=>{let value; [match.rng,value]=draw(match.rng); return value%10000;};
  const weighted=(pool:Player[],weight:(p:Player)=>number):Player=>{
    const total=pool.reduce((n,p)=>n+weight(p),0); let target=roll()*total/10000;
    for (const p of pool) {target-=weight(p);if(target<0)return p;} return pool[pool.length-1]!;
  };
  const end=Math.min(100,match.tick+minutes);
  while(match.tick<end) {
    if(match.tick===60+(match.addedTime[0]??0)){
      if(match.home!==match.managedClubId)match.homeTactics.mentality=match.homeGoals<match.awayGoals?'attacking':match.homeGoals>match.awayGoals?'cautious':'balanced';
      if(match.away!==match.managedClubId)match.awayTactics.mentality=match.awayGoals<match.homeGoals?'attacking':match.awayGoals>match.homeGoals?'cautious':'balanced';
    }
    match.tick++;
    incidents(match,players,roll,weighted);
    automaticChanges(match,players);
  const active=[activeLineup(match,match.home),activeLineup(match,match.away)];
  const slots=active.map((ids,i)=>arrangeLineup(players.map(p=>({...p,condition:match.condition[p.id]??p.condition})),ids,tactics[i]!.formation));
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
      const chance=chanceProbability(own,other,side===0,tactics[side]!,tactics[1-side]!);
      if(roll()>=chance) continue;
      const shooter=weighted(lineups[side]!.filter(p=>p.role!=='GK'),p=>p.shooting*(p.role==='FWD'?3:p.role==='MID'?2:1));
      const passer=weighted(lineups[side]!.filter(p=>p.id!==shooter.id),p=>p.passing);
      const team=side===0?match.home:match.away;
      const emit=(type:'pass'|'shot'|'save'|'goal', id:PlayerId, assistId:PlayerId|null=null)=>match.events.push({tick:match.tick,order:match.events.length,clubId:team,playerId:id,assistId,type,homeGoals:match.homeGoals,awayGoals:match.awayGoals});
      emit('pass',passer.id);
      const target=clamp(rules.target+(shooter.shooting-other.D)*40,2000,6000);
      const goal=clamp(rules.goal+(shooter.shooting-other.K)*40,1200,5500);
      const stats=side===0?match.homeStats:match.awayStats;
      stats.shots++;stats.quality+=Math.round(target*goal/10000);
      if(roll()>=target){emit('shot',shooter.id);continue;}
      stats.onTarget++;
      if(roll()>=goal){emit('save',shooter.id);continue;}
      if(side===0)match.homeGoals++;else match.awayGoals++;
      emit('goal',shooter.id,roll()<rules.assist?passer.id:null);
    }
    if(completeMinute(match)||needsDecision(match))break;
  }
  return match;
}
export function applyCommand(state: Career, command: Command): Result<Career> {
  if(command.careerId!==state.careerId||command.expectedRevision!==state.revision)return {ok:false,error:'STALE_STATE'};
  if(state.appliedCommands.includes(command.commandId))return {ok:false,error:'DUPLICATE_COMMAND'};
  const next=structuredClone(state);
  if(command.type==='AdvanceCalendar'){
    const error=advanceCalendar(next,command.target);if(error)return {ok:false,error};
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
    if(command.lineup.some(id=>!available(state.players.find(p=>p.id===id)!,state.date)))return {ok:false,error:'UNAVAILABLE_PLAYER'};
    next.lineup=command.lineup;
    // Retain valid choices; fill only vacancies when the starting eleven changes.
    const retained=state.bench.filter(id=>!command.lineup.includes(id)&&available(state.players.find(p=>p.id===id)!,state.date));
    next.bench=[...retained,...pickBench(state.players,state.clubId,command.lineup,state.date).filter(id=>!retained.includes(id))].slice(0,9);
    if(!validBench(state.players,state.clubId,next.lineup,next.bench))next.bench=pickBench(state.players,state.clubId,next.lineup,state.date);
  } else if(command.type==='ForfeitMatch') {
    if(state.date!==nextFixtureDate(state))return {ok:false,error:'NOT_MATCH_DAY'};
    if(state.round>=14||(state.match&&state.match.phase!=='finished')||state.players.filter(p=>p.clubId===state.clubId&&available(p,state.date)).length>=7||state.players.filter(p=>p.clubId===state.clubId&&p.academy).length<8)return {ok:false,error:'INVALID_COMMAND'};
    next.match=startMatch(state,state.fixtures.find(f=>f.round===state.round&&(f.home===state.clubId||f.away===state.clubId))!);awardForfeit(next.match,state.clubId);
  } else if(command.type==='CallUp') {
    if((state.match&&state.match.phase!=='finished')||!callUp(next,state.clubId))return {ok:false,error:'INVALID_COMMAND'};
  } else if(command.type==='AcknowledgeMatch') {
    if(!next.match||!needsDecision(next.match))return {ok:false,error:'INVALID_COMMAND'};next.match.pendingInjuries=[];next.match.pendingDismissal=false;
  } else if(command.type==='SetTraining') {
    next.training=command.training;
  } else if(command.type==='SelectBench') {
    if(state.match&&state.match.phase!=='finished')return {ok:false,error:'INVALID_COMMAND'};
    if(!validBench(state.players,state.clubId,state.lineup,command.bench))return {ok:false,error:'INVALID_BENCH'};
    if(command.bench.some(id=>!available(state.players.find(p=>p.id===id)!,state.date)))return {ok:false,error:'UNAVAILABLE_PLAYER'};
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
    if(state.round>=14||(state.match&&state.match.phase!=='finished'))return {ok:false,error:'INVALID_COMMAND'};
    if([...state.lineup,...state.bench].some(id=>!available(state.players.find(p=>p.id===id)!,state.date)))return {ok:false,error:'UNAVAILABLE_PLAYER'};
    if(!validSelection(state,state.lineup))return {ok:false,error:'INVALID_LINEUP'};
    const fixture=state.fixtures.find(f=>f.round===state.round&&(f.home===state.clubId||f.away===state.clubId))!;const opponent=fixture.home===state.clubId?fixture.away:fixture.home;while(callUp(next,opponent)){ /* Bounded academy cover. */ }
    next.match=startMatch(next,fixture);
  } else {
    if(!state.match||state.match.phase==='finished')return {ok:false,error:'INVALID_COMMAND'};
    if(needsDecision(state.match))return {ok:false,error:'MATCH_DECISION'};
    next.match=advanceMatch(state.match,state.players,command.minutes);
  }
  if(next.match?.phase==='finished'&&state.fixtures.find(f=>f.id===next.match!.fixtureId)?.score===null) {
      next.fixtures=state.fixtures.map(f=>{
        if(f.round!==state.round)return f;
        for(const club of [f.home,f.away])if(club!==state.clubId)while(callUp(next,club)){ /* Bounded by eight academy places. */ }
        let m=f.id===next.match!.fixtureId?next.match!:startMatch(next,f);
        while(m.phase!=='finished')m=advanceMatch(m,next.players,90);
        if(m.tick>0)settleGate(next,f.home,f.id,state.date);
        next.players=next.players.map(p=>{
          if(p.clubId!==m.home&&p.clubId!==m.away)return p;
          const own=p.clubId===m.home?m.homeGoals:m.awayGoals;const other=p.clubId===m.home?m.awayGoals:m.homeGoals;
          return {...settleAvailability(p,m),condition:m.condition[p.id]??p.condition,morale:clamp(p.morale+(own>other?4:own<other?-4:0),0,100)};
        });
        return {...f,score:[m.homeGoals,m.awayGoals]};
      });
      next.round++;

  }
  next.revision++;next.appliedCommands=[...state.appliedCommands,command.commandId].slice(-256);
  return {ok:true,value:next};
}
function compare(a:string,b:string){return a<b?-1:a>b?1:0;}
export function standings(state: Career) {
  const rows=state.clubs.map(club=>({clubId:club.id,played:0,won:0,drawn:0,lost:0,gf:0,ga:0,points:0}));
  for(const f of state.fixtures){if(!f.score)continue; const h=rows.find(r=>r.clubId===f.home)!;const a=rows.find(r=>r.clubId===f.away)!;const [hg,ag]=f.score;
    h.played++;a.played++;h.gf+=hg;h.ga+=ag;a.gf+=ag;a.ga+=hg;
    if(hg===ag){h.drawn++;a.drawn++;h.points++;a.points++;}else{const w=hg>ag?h:a;const l=hg>ag?a:h;w.won++;w.points+=3;l.lost++;}
  }
  const head=(id:ClubId,group:ClubId[])=>state.fixtures.reduce((n,f)=>{if(!f.score||!group.includes(f.home)||!group.includes(f.away))return n;const side=f.home===id?0:f.away===id?1:-1;if(side!==0&&side!==1)return n;const own=f.score[side]!;const other=f.score[1-side]!;return n+(own>other?3:own===other?1:0);},0);
  return rows.sort((a,b)=>{
    const primary=b.points-a.points||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf;if(primary)return primary;
    const group=rows.filter(r=>r.points===a.points&&r.gf-r.ga===a.gf-a.ga&&r.gf===a.gf).map(r=>r.clubId);
    return head(b.clubId,group)-head(a.clubId,group)||compare(a.clubId,b.clubId);
  });
}
export function validateCareer(input: unknown): Career {
  const state=careerSchema.parse(input);
  validateEconomy(state);validateContracts(state);validateScouting(state);
  const nextDate=nextFixtureDate(state);if((nextDate&&state.date>nextDate)||(state.match&&state.match.date>state.date))throw new Error('INVALID_SAVE');
  if(!validDate(state.date)||state.players.some(p=>p.injuryUntil!==null&&!validDate(p.injuryUntil)))throw new Error('INVALID_SAVE');
  const ids=state.clubs.map(c=>c.id);
  if(new Set(ids).size!==8||new Set(state.players.map(p=>p.id)).size!==state.players.length||!ids.includes(state.clubId)||!validLineup(state.players,state.clubId,state.lineup))throw new Error('INVALID_SAVE');
  if(state.players.some(p=>!ids.includes(p.clubId))||ids.some(id=>state.players.filter(p=>p.clubId===id&&!p.academy).length!==22||state.players.filter(p=>p.clubId===id&&p.academy).length>8))throw new Error('INVALID_SAVE');
  if(!validBench(state.players,state.clubId,state.lineup,state.bench))throw new Error('INVALID_SAVE');
  const expected=schedule(ids);
  if(state.fixtures.some((f,i)=>{const e=expected[i]!;return f.id!==e.id||f.home!==e.home||f.away!==e.away||f.round!==e.round||(f.score!==null)!==(f.round<state.round);}))throw new Error('INVALID_SAVE');
  if(state.match){const m=state.match;const f=state.fixtures.find(f=>f.id===m.fixtureId);if(!f||f.home!==m.home||f.away!==m.away||f.round!==(m.phase==='finished'?state.round-1:state.round)||(m.forfeit!==m.home&&!validLineup(state.players,m.home,m.homeLineup))||(m.forfeit!==m.away&&!validLineup(state.players,m.away,m.awayLineup))||m.events.some((e,i)=>e.order!==i||e.tick>m.tick||!state.players.some(p=>p.id===e.playerId&&p.clubId===e.clubId)))throw new Error('INVALID_SAVE');}
  if(state.match){
    const m=state.match;
    const half=halfBoundary(m),end=90+(m.addedTime[0]??0)+(m.addedTime[1]??0);
    if(m.forfeit!==null){if(m.phase!=='finished'||![m.home,m.away].includes(m.forfeit))throw new Error('INVALID_SAVE');}
    else if(m.phase==='first'?(m.tick>=half&&m.addedTime[0]!==null)||m.tick>49||m.addedTime[1]!==null||((m.tick<45)!==(m.addedTime[0]===null)):m.phase==='interval'?m.addedTime[0]===null||m.addedTime[1]!==null||m.tick!==half:m.phase==='second'?m.addedTime[0]===null||m.tick<half||m.tick>=end||((m.tick<90+m.addedTime[0])!==(m.addedTime[1]===null)):m.addedTime.some(n=>n===null)||m.tick!==end)throw new Error('INVALID_SAVE');
    if(m.phase==='finished'){const score=state.fixtures.find(f=>f.id===m.fixtureId)!.score;if(!score||score[0]!==m.homeGoals||score[1]!==m.awayGoals)throw new Error('INVALID_SAVE');}
    if(!validDate(m.date)||m.injuries.some(i=>!validDate(i.until)))throw new Error('INVALID_SAVE');
    const dismissed=m.events.filter(e=>e.type==='red'||e.type==='secondYellow').map(e=>e.playerId);
    if(new Set(m.dismissed).size!==m.dismissed.length||dismissed.length!==m.dismissed.length||dismissed.some(id=>!m.dismissed.includes(id))||new Set(m.injuries.map(i=>i.playerId)).size!==m.injuries.length||m.injuries.some(i=>i.until<=m.date||!m.events.some(e=>e.type==='injury'&&e.playerId===i.playerId))||new Set(m.pendingInjuries).size!==m.pendingInjuries.length||m.pendingInjuries.some(id=>!m.injuries.some(i=>i.playerId===id)||!(m.home===state.clubId?m.homeLineup:m.awayLineup).includes(id)))throw new Error('INVALID_SAVE');
    const participants=state.players.filter(p=>p.clubId===m.home||p.clubId===m.away);
    if(Object.keys(m.condition).some(id=>!participants.some(p=>p.id===id))||[...m.homeLineup,...m.awayLineup,...m.homeBench,...m.awayBench].some(id=>m.condition[id]===undefined))throw new Error('INVALID_SAVE');
    if(m.managedClubId!==state.clubId)throw new Error('INVALID_SAVE');
    for(const [club,lineup,bench] of [[m.home,m.homeLineup,m.homeBench],[m.away,m.awayLineup,m.awayBench]] as const){
      const changes=m.substitutions.filter(s=>s.clubId===club);
      if(changes.length>5||substitutionWindows(m,club)>3||new Set(bench).size!==bench.length||bench.some(id=>!state.players.some(p=>p.id===id&&p.clubId===club)))throw new Error('INVALID_SAVE');
      const original=[...lineup];
      for(const change of [...changes].reverse()){
        const index=original.indexOf(change.in);
        if(index<0||original.includes(change.out)||!bench.includes(change.in))throw new Error('INVALID_SAVE');
        original[index]=change.out;
        if(!validLineup(state.players,club,original))throw new Error('INVALID_SAVE');
      }
      if((m.forfeit!==club&&!validLineup(state.players,club,original))||original.some(id=>bench.includes(id))||new Set(changes.map(c=>c.in)).size!==changes.length||new Set(changes.map(c=>c.out)).size!==changes.length||changes.some((c,i)=>changes.slice(0,i).some(other=>other.out===c.in)))throw new Error('INVALID_SAVE');
    }
    if(m.substitutions.some((s,i)=>s.tick>m.tick||(s.clubId!==m.home&&s.clubId!==m.away)||(i>0&&s.tick<m.substitutions[i-1]!.tick)))throw new Error('INVALID_SAVE');
  }
  return state;
}
