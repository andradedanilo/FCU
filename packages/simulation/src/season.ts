import {canonical,type Career,type FailureCode} from '../../contracts/src/index.ts';
import {schedule,standings,seasonEnd} from './competition.ts';
import {returnLoans} from './loans.ts';
import {callUp} from './academy.ts';
import {autoPick,pickBench} from './selection.ts';
import {post,settleDay} from './economy.ts';
export function closeSeason(state:Career):FailureCode|null {
 if(state.date!==seasonEnd(state.season)||state.round!==14||state.fixtures.some(f=>f.score===null)||(state.match&&state.match.phase!=='finished')||state.season>=2100)return 'INVALID_COMMAND';
 returnLoans(state);
 const table=standings(state);
 for(const [rank,row] of table.entries()){
  const prize=10000000*(table.length-rank);
  if(!post(state.economy,{id:`prize/${state.season}/${row.clubId}`,date:state.date,kind:'prize',postings:[{account:row.clubId,amount:prize},{account:'external',amount:-prize}]}))return 'INVALID_COMMAND';
  state.economy.clubs.find(c=>c.clubId===row.clubId)!.lastPrizes=prize;
 }
 state.history.push({year:state.season,fixtures:structuredClone(state.fixtures),table});
 for(const player of state.players){
  player.leagueYellows=0;
  const contract=state.contracts[player.id]!;
  if(contract.ends!==null&&contract.ends<=state.date){player.clubId=null;contract.ownerId=null;contract.ends=null;contract.revision++;state.economy.wages[player.id]=0;}
 }
 for(const offer of state.offers)if(['submitted','countered','accepted','ready','queued'].includes(offer.status)){offer.status='expired';offer.activation=null;}
 state.season++;state.date=`${state.season}-07-01`;state.round=0;state.match=null;state.fixtures=schedule(state.clubs.map(c=>c.id),state.season);
 for(const club of state.clubs)while(callUp(state,club.id)){ /* At most eight active academy players per club. */ }
 state.lineup=autoPick(state.players,state.clubId,state.tactics.formation,state.date);state.bench=pickBench(state.players,state.clubId,state.lineup,state.date);
 settleDay(state,state.date);
 return null;
}
export function validateSeasons(state:Career){
 if(state.date<`${state.season}-07-01`||state.date>seasonEnd(state.season)||state.history.length!==state.season-2026)throw Error('INVALID_SAVE');
 if(state.fixtures.some(f=>f.score!==null&&f.date>state.date))throw Error('INVALID_SAVE');
 for(const [index,history] of state.history.entries()){
  if(history.year!==2026+index)throw Error('INVALID_SAVE');
  const expected=schedule(state.clubs.map(c=>c.id),history.year);
  if(history.fixtures.some((f,i)=>{const e=expected[i]!;return !f.score||f.id!==e.id||f.date!==e.date||f.round!==e.round||f.home!==e.home||f.away!==e.away;}))throw Error('INVALID_SAVE');
  for(const [rank,row] of history.table.entries()){const prize=state.economy.ledger.find(e=>e.id===`prize/${history.year}/${row.clubId}`),amount=10000000*(history.table.length-rank);if(!prize||prize.kind!=='prize'||prize.date!==seasonEnd(history.year)||prize.postings[0].account!==row.clubId||prize.postings[0].amount!==amount||prize.postings[1].account!=='external'||prize.postings[1].amount!==-amount)throw Error('INVALID_SAVE');}
  if(canonical(standings({clubs:state.clubs,fixtures:history.fixtures}))!==canonical(history.table))throw Error('INVALID_SAVE');
 }
}
