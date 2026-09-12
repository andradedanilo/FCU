import type {Career,ClubId,Economy,Player} from '../../contracts/src/index.ts';
import {validDate} from './availability.ts';

export const economicRules={sponsorship:500000000,capacity:20000,ticket:2000,overhead:2000000,reputation:50} as const;
type LedgerEntry=Career['economy']['ledger'][number];
type World=Pick<Career,'players'|'clubs'|'fixtures'|'date'>;
export function cash(economy:Career['economy'],club:ClubId):number {
 return economy.ledger.reduce((sum,entry)=>sum+entry.postings.reduce((value,p)=>value+(p.account===club?p.amount:0),0),0);
}
export function commitments(state:Pick<Career,'economy'|'players'>,club:ClubId):number {
 return state.players.filter(p=>p.clubId===club).reduce((sum,p)=>sum+state.economy.wages[p.id]!,0);
}
function attendance(capacity:number,reputation:number,ratio:number){return Math.floor(capacity*Math.max(.30,Math.min(.98,.40+reputation/200+ratio/10)));}
export function budgets(state:Pick<Career,'economy'|'players'|'fixtures'>,club:ClubId){
 const account=state.economy.clubs.find(c=>c.clubId===club)!;
 const gate=state.fixtures.filter(f=>f.home===club).length*attendance(account.capacity,account.reputation,.5)*account.ticket;
 const wage=Math.floor(.60*(account.sponsorship+gate+account.lastPrizes)/52);
 const weekly=commitments(state,club);const balance=cash(state.economy,club);
 return {cash:balance,weekly,wage,transfer:Math.max(0,balance-13*weekly-4*account.overhead),overhead:account.overhead};
}
// Signed postings represent equal debits and credits; generated money uses the external account.
export function post(economy:Career['economy'],entry:LedgerEntry):boolean {
 if(economy.ledger.some(e=>e.id===entry.id))return false;
 if(entry.postings[0].amount+entry.postings[1].amount!==0||entry.postings.some(p=>!Number.isSafeInteger(p.amount)))throw Error('INVALID_SAVE');
 economy.ledger.push(entry);return true;
}
function external(economy:Career['economy'],club:ClubId,date:string,kind:LedgerEntry['kind'],amount:number,id=kind+'/'+date+'/'+club){
 post(economy,{id,date,kind,postings:[{account:club,amount},{account:'external',amount:-amount}]});
}
export function createEconomy(world:World,rating:(p:Player)=>number):Economy {
 const economy:Economy={clubs:world.clubs.map(c=>({clubId:c.id,...economicRules,lastPrizes:0})),wages:{},ledger:[]};
 for(const club of world.clubs){
  const squad=world.players.filter(p=>p.clubId===club.id);
  // Neutral age/contract factors until the player-contract slice supplies those terms.
  const desired=squad.map(p=>p.academy?0:Math.round(Math.max(500,2*rating(p)**2)/100)*10000);
  const annualGate=world.fixtures.filter(f=>f.home===club.id).length*attendance(economicRules.capacity,economicRules.reputation,.5)*economicRules.ticket;
  const wageBudget=Math.floor(.60*(economicRules.sponsorship+annualGate)/52);
  const total=desired.reduce((n,w)=>n+w,0);const limit=Math.floor(wageBudget*.8);
  squad.forEach((p,i)=>{economy.wages[p.id]=total>limit?Math.floor(desired[i]!*limit/total):desired[i]!;});
  external(economy,club.id,world.date,'opening',economicRules.sponsorship/2,'opening/'+club.id);
 }
 return economy;
}
function monday(date:string){
 const [year,month,day]=date.split('-').map(Number) as [number,number,number];const y=year-1;
 const leap=year%4===0&&(year%100!==0||year%400===0);
 const before=[0,31,59,90,120,151,181,212,243,273,304,334][month-1]!;
 return (365*y+Math.floor(y/4)-Math.floor(y/100)+Math.floor(y/400)+before+day+(leap&&month>2?1:0))%7===1;
}
export function settleDay(state:Pick<Career,'economy'|'players'>,date:string){
 for(const club of state.economy.clubs){
  if(date.endsWith('-01'))external(state.economy,club.clubId,date,'sponsor',Math.floor(club.sponsorship/12)+(date.slice(5,7)==='06'?club.sponsorship%12:0));
  if(monday(date)){
   external(state.economy,club.clubId,date,'wages',-commitments(state,club.clubId));
   external(state.economy,club.clubId,date,'overhead',-club.overhead);
  }
 }
}
export function settleGate(state:Pick<Career,'economy'|'fixtures'>,club:ClubId,fixtureId:string,date:string){
 const account=state.economy.clubs.find(c=>c.clubId===club)!;
 const previous=state.fixtures.filter(f=>f.score&&(f.home===club||f.away===club)).slice(-5);
 const points=previous.reduce((sum,f)=>{const home=f.home===club,own=f.score![home?0:1],other=f.score![home?1:0];return sum+(own>other?3:own===other?1:0);},0);
 const count=attendance(account.capacity,account.reputation,previous.length?points/(3*previous.length):.5);
 external(state.economy,club,date,'gate',count*account.ticket,'gate/'+fixtureId);
}
export function validateEconomy(state:Career){
 const economy=state.economy,ids=state.clubs.map(c=>c.id);
 if(new Set(economy.clubs.map(c=>c.clubId)).size!==8||economy.clubs.some(c=>!ids.includes(c.clubId))||Object.keys(economy.wages).length!==state.players.length||state.players.some(p=>economy.wages[p.id]===undefined)||new Set(economy.ledger.map(e=>e.id)).size!==economy.ledger.length)throw Error('INVALID_SAVE');
 const balances:Record<string,number>={};
 for(const entry of economy.ledger){
  if(!validDate(entry.date)||entry.date>state.date||entry.postings[0].amount+entry.postings[1].amount!==0||entry.postings[0].account===entry.postings[1].account)throw Error('INVALID_SAVE');
  for(const posting of entry.postings){
   if(posting.account!=='external'&&!ids.includes(posting.account))throw Error('INVALID_SAVE');
   balances[posting.account]=(balances[posting.account]??0)+posting.amount;
   if(!Number.isSafeInteger(balances[posting.account]))throw Error('INVALID_SAVE');
  }
 }
}
