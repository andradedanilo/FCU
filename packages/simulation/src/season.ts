import {boardSeason,newBoardSeason} from './board.ts';
import {annualDevelopment,youthIntake} from './personnel.ts';
import {completeFacilities} from './facilities.ts';
import {initialCups,cupFixtures,validateCups} from './cupSeason.ts';
import {cupChampion} from './cups.ts';
import {canonical,type Career,type FailureCode,type Division} from '../../contracts/src/index.ts';
import {compareFixtures,worldSchedule,standings,seasonEnd,seasonComplete} from './competition.ts';
import {returnLoans} from './loans.ts';
import {callUp} from './academy.ts';
import {autoPick,pickBench} from './selection.ts';
import {post,settleDay,cash,carryLedger,financialProfile} from './economy.ts';
function prizeFor(division:Division,rank:number){return (division.tier===1?10000000:2000000)*(division.clubs.length-rank);}
function seasonPrizes(state:Pick<Career,'world'|'clubs'|'fixtures'|'cups'>){
 const prizes:Record<string,number>=Object.fromEntries(state.clubs.map(c=>[c.id,0]));
 for(const division of state.world.divisions)for(const [rank,row] of standings(state,division.id).entries())prizes[row.clubId]!+=prizeFor(division,rank);
 for(const cup of state.cups){const winner=cupChampion(cup);if(!winner)continue;const final=cup.rounds.at(-1)!.ties[0]!.legs[0]!,runner=final.home===winner?final.away:final.home;prizes[winner]!+=cup.kind==='domestic'?50000000:200000000;prizes[runner]!+=cup.kind==='domestic'?25000000:100000000;}
 return prizes;
}
function moveDivisions(world:Career['world'],table:Career['history'][number]['table']){
 if(world.kind==='exhibition')return;
 for(const country of ['ENG','ESP','FRA','ITA','DEU'] as const){
  const top=world.divisions.find(d=>d.country===country&&d.tier===1)!,second=world.divisions.find(d=>d.country===country&&d.tier===2)!;
  const down=table.filter(r=>top.clubs.includes(r.clubId)).slice(-2).map(r=>r.clubId),up=table.filter(r=>second.clubs.includes(r.clubId)).slice(0,2).map(r=>r.clubId);
  top.clubs=[...top.clubs.filter(id=>!down.includes(id)),...up].sort();second.clubs=[...second.clubs.filter(id=>!up.includes(id)),...down].sort();
 }
}
export function closeSeason(state:Career):FailureCode|null {
 if(state.date!==seasonEnd(state.season)||!seasonComplete(state)||(state.match&&state.match.phase!=='finished')||state.season>=2100)return 'INVALID_COMMAND';
 returnLoans(state);
 const table=state.world.divisions.flatMap(d=>standings(state,d.id)),prizes=seasonPrizes(state);
 for(const row of table){
  const prize=prizes[row.clubId]!;
  if(!post(state.economy,{id:`prize/${state.season}/${row.clubId}`,date:state.date,kind:'prize',postings:[{account:row.clubId,amount:prize},{account:'external',amount:-prize}]}))return 'INVALID_COMMAND';
  state.economy.clubs.find(c=>c.clubId===row.clubId)!.lastPrizes=prize;
 }
 state.history.push({year:state.season,cups:structuredClone(state.cups),fixtures:structuredClone(state.fixtures),table,divisions:structuredClone(state.world.divisions),prizes,balances:Object.fromEntries(state.clubs.map(c=>[c.id,cash(state.economy,c.id)]))});
 boardSeason(state);annualDevelopment(state);
 moveDivisions(state.world,table);
 for(const player of state.players){
  player.leagueYellows=0;const counters=state.cupDiscipline[player.id];if(counters){counters.domestic.yellows=0;counters.continental.yellows=0;}const contract=state.contracts[player.id]!;
  if(contract.ends!==null&&contract.ends<=state.date){player.clubId=null;contract.ownerId=null;contract.ends=null;contract.revision++;state.economy.wages[player.id]=0;}
 }
 for(const offer of state.offers)if(['submitted','countered','accepted','ready','queued'].includes(offer.status)){offer.status='expired';offer.activation=null;}
 state.season++;state.date=`${state.season}-07-01`;state.round=0;state.match=null;state.fixtures=worldSchedule(state.world,state.season);state.cups=initialCups(state);state.fixtures.push(...state.cups.flatMap(cupFixtures));state.fixtures.sort(compareFixtures);
 completeFacilities(state);youthIntake(state);
 for(const club of state.clubs)while(callUp(state,club.id)){ /* At most eight active academy players per club. */ }
 for(const club of state.economy.clubs){const tier=state.world.divisions.find(d=>d.clubs.includes(club.clubId))!.tier;Object.assign(club,financialProfile(tier));}
 state.lineup=autoPick(state.players,state.clubId,state.tactics.formation,state.date);state.bench=pickBench(state.players,state.clubId,state.lineup,state.date);
 newBoardSeason(state);carryLedger(state);settleDay(state,state.date);return null;
}
function validateDivisions(world:Career['world'],clubs:Career['clubs']){
 const ids=world.divisions.flatMap(d=>d.clubs);
 if(ids.length!==clubs.length||new Set(ids).size!==ids.length||clubs.some(c=>!ids.includes(c.id))||new Set(world.divisions.map(d=>d.id)).size!==world.divisions.length)throw Error('INVALID_SAVE');
 if(world.kind==='exhibition'){if(world.divisions.length!==1||world.divisions[0]!.id!=='EXH'||world.divisions[0]!.country!=='EXH'||world.divisions[0]!.tier!==1||ids.length!==8)throw Error('INVALID_SAVE');}
 else {
  if(world.divisions.length!==10)throw Error('INVALID_SAVE');
  for(const [country,count] of [['ENG',20],['ESP',20],['FRA',18],['ITA',20],['DEU',18]] as const){const top=world.divisions.find(d=>d.id===country+'1'),second=world.divisions.find(d=>d.id===country+'2');if(!top||!second||top.country!==country||second.country!==country||top.tier!==1||second.tier!==2||top.clubs.length!==count||second.clubs.length!==16)throw Error('INVALID_SAVE');}
 }
}
export function validateSeasons(state:Career){
 validateDivisions(state.world,state.clubs);
 if(state.date<`${state.season}-07-01`||state.date>seasonEnd(state.season)||state.history.length!==state.season-2026)throw Error('INVALID_SAVE');
 if(state.fixtures.some(f=>f.score!==null&&f.date>state.date))throw Error('INVALID_SAVE');
 for(const [index,history] of state.history.entries()){
  if(history.year!==2026+index)throw Error('INVALID_SAVE');
  const world={kind:state.world.kind,divisions:history.divisions};validateDivisions(world,state.clubs);
  const archived={...state,world,season:history.year,history:state.history.slice(0,index),fixtures:history.fixtures,cups:history.cups};validateCups(archived);
  const expected=[...worldSchedule(world,history.year),...history.cups.flatMap(cupFixtures)].sort(compareFixtures);
  if(history.fixtures.length!==expected.length||history.fixtures.some((f,i)=>{const e=expected[i]!;return !f.score||f.id!==e.id||f.competitionId!==e.competitionId||f.date!==e.date||f.round!==e.round||f.home!==e.home||f.away!==e.away||f.competitionClass!==e.competitionClass||f.neutral!==e.neutral||f.decider!==e.decider||f.cupTieId!==e.cupTieId;}))throw Error('INVALID_SAVE');
  if(Object.keys(history.balances).length!==state.clubs.length||Object.keys(history.prizes).length!==state.clubs.length||state.clubs.some(c=>history.balances[c.id]===undefined||history.prizes[c.id]===undefined))throw Error('INVALID_SAVE');
  if(canonical(history.prizes)!==canonical(seasonPrizes(archived)))throw Error('INVALID_SAVE');
  const table=world.divisions.flatMap(d=>standings({clubs:state.clubs,fixtures:history.fixtures,world},d.id));if(canonical(table)!==canonical(history.table))throw Error('INVALID_SAVE');
  const moved=structuredClone(world);moveDivisions(moved,history.table);const next=state.history[index+1]?.divisions??state.world.divisions;if(canonical(moved.divisions)!==canonical(next))throw Error('INVALID_SAVE');
 }
 const previous=state.history.at(-1);
 if(previous)for(const club of state.clubs){const carry=state.economy.ledger.find(e=>e.id===`carry/${state.season}/${club.id}`);if(!carry||carry.kind!=='opening'||carry.date!==`${state.season}-07-01`||carry.postings[0].account!==club.id||carry.postings[0].amount!==previous.balances[club.id]||carry.postings[1].account!=='external')throw Error('INVALID_SAVE');}
}
