import type {Career,ClubId,Fixture} from '../../contracts/src/index.ts';
import {overall} from './ratings.ts';
import {standings} from './competition.ts';
import {post,monday} from './economy.ts';
import {addDays} from './availability.ts';
import {autoPick,pickBench} from './selection.ts';
import {selectionPlayers} from './discipline.ts';

type World=Pick<Career,'players'|'clubs'|'world'|'date'>;
export function initialBoard(state:World):Career['board']{
  const clubs:Career['board']['clubs']={};
  for(const division of state.world.divisions){
    const ranked=division.clubs.map(id=>{const squad=state.players.filter(p=>p.clubId===id&&!p.academy);return {id,strength:squad.reduce((n,p)=>n+overall(p),0)/Math.max(1,squad.length)};}).sort((a,b)=>b.strength-a.strength||a.id.localeCompare(b.id));
    for(const [i,club] of ranked.entries())clubs[club.id]={confidence:60,target:i<Math.ceil(ranked.length/3)?Math.floor(ranked.length/2):i<Math.ceil(2*ranked.length/3)?ranked.length-4:ranked.length-(division.tier===1&&state.world.kind==='countries'?2:0),played:0,negativeSince:null,loan:null};
  }
  return {assisted:false,status:'employed',since:state.date,vacancies:[],history:[],clubs};
}
function dismiss(state:Career,club:ClubId,reason:'performance'|'debt'){
  if(club!==state.clubId||state.board.assisted||state.board.status!=='employed')return;
  state.board.history.push({clubId:club,from:state.board.since,to:state.date,reason});state.board.status='dismissed';
  const reputation=state.economy.clubs.find(c=>c.clubId===club)!.reputation;
  state.board.vacancies=state.economy.clubs.filter(c=>c.clubId!==club&&c.reputation<=reputation).sort((a,b)=>a.reputation-b.reputation||a.clubId.localeCompare(b.clubId)).slice(0,3).map(c=>c.clubId);
}
export function boardFixture(state:Career,fixture:Fixture){
  if(fixture.competitionClass!=='league')return;
  const division=state.world.divisions.find(d=>d.clubs.includes(fixture.home))!;
  const table=standings(state,division.id);
  for(const club of [fixture.home,fixture.away]){
    const board=state.board.clubs[club]!;board.played++;
    board.confidence=Math.max(0,Math.min(100,board.confidence+(table.findIndex(r=>r.clubId===club)+1<=board.target?1:-1)));
    if(board.played>10&&board.confidence<20)dismiss(state,club,'performance');
  }
}
export function boardSeason(state:Career){
  for(const division of state.world.divisions){const table=standings(state,division.id);for(const [rank,row] of table.entries()){
    const board=state.board.clubs[row.clubId]!;board.confidence=Math.max(0,Math.min(100,board.confidence+(rank+1<=board.target?15:-15)));
    if(board.played>10&&board.confidence<20)dismiss(state,row.clubId,'performance');
  }}
}
export function newBoardSeason(state:Career){
  const targets=initialBoard(state);
  for(const club of state.clubs){state.board.clubs[club.id]!.target=targets.clubs[club.id]!.target;state.board.clubs[club.id]!.played=0;}
}
export function boardDay(state:Career){
  const balances:Record<string,number>={};for(const entry of state.economy.ledger)for(const p of entry.postings)balances[p.account]=(balances[p.account]??0)+p.amount;
  for(const account of state.economy.clubs){
    const board=state.board.clubs[account.clubId]!,loan=board.loan;
    let balance=balances[account.clubId]??0;
    if(loan&&monday(state.date)&&state.date>loan.started&&loan.paid<52){
      const payment=Math.floor(loan.principal/52)+(loan.paid===51?loan.principal%52:0);
      if(post(state.economy,{id:`board-repay/${account.clubId}/${loan.started}/${state.date}`,date:state.date,kind:'boardRepayment',postings:[{account:account.clubId,amount:-payment},{account:'external',amount:payment}]})){loan.remaining-=payment;loan.paid++;balance-=payment;}
      if(loan.paid===52)board.loan=null;
    }
    if(balance>=0){board.negativeSince=null;continue;}
    board.negativeSince??=state.date;
    if(state.date<addDays(board.negativeSince,28))continue;
    if(board.loan){if(state.date>=addDays(board.loan.started,28))dismiss(state,account.clubId,'debt');continue;}
    const principal=Math.min(-balance,account.sponsorship);
    if(post(state.economy,{id:`board-loan/${account.clubId}/${state.date}`,date:state.date,kind:'boardLoan',postings:[{account:account.clubId,amount:principal},{account:'external',amount:-principal}]}))board.loan={principal,remaining:principal,started:state.date,paid:0};
  }
}
export function acceptJob(state:Career,club:ClubId):boolean{
  if(state.board.status!=='dismissed'||!state.board.vacancies.includes(club))return false;
  state.clubId=club;state.board.status='employed';state.board.since=state.date;state.board.vacancies=[];state.board.clubs[club]!.confidence=60;state.match=null;
  state.round=state.fixtures.filter(f=>f.score!==null&&(f.home===club||f.away===club)).length;
  const players=selectionPlayers(state);state.lineup=autoPick(players,club,state.tactics.formation,state.date);state.bench=pickBench(players,club,state.lineup,state.date);
  state.scouting={shortlist:[],active:null,reports:{}};return true;
}
export function validateBoard(state:Career){
  if(Object.keys(state.board.clubs).length!==state.clubs.length||state.clubs.some(c=>!state.board.clubs[c.id])||state.board.since>state.date||new Set(state.board.vacancies).size!==state.board.vacancies.length||state.board.vacancies.some(id=>id===state.clubId||!state.clubs.some(c=>c.id===id)))throw Error('INVALID_SAVE');
  if(state.board.history.some(h=>!state.clubs.some(c=>c.id===h.clubId)||h.from>h.to||h.to>state.date))throw Error('INVALID_SAVE');
  if(state.board.status!=='dismissed'&&state.board.vacancies.length)throw Error('INVALID_SAVE');
  for(const b of Object.values(state.board.clubs)){if(b.negativeSince&&b.negativeSince>state.date)throw Error('INVALID_SAVE');if(b.loan&&(b.loan.paid===52||b.loan.started>state.date||b.loan.remaining>b.loan.principal||b.loan.remaining!==b.loan.principal-Math.floor(b.loan.principal/52)*b.loan.paid))throw Error('INVALID_SAVE');}
}
