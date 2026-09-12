import type {Career,ClubId,Economy,Player} from '../../contracts/src/index.ts';
import {validDate} from './availability.ts';

export const economicRules={sponsorship:500000000,capacity:20000,ticket:2000,overhead:2000000,reputation:50} as const;
export function financialProfile(tier:1|2){return tier===1?{...economicRules}:{sponsorship:100000000,capacity:8000,ticket:2000,overhead:500000,reputation:35};}
type LedgerEntry=Career['economy']['ledger'][number];
type World=Pick<Career,'players'|'clubs'|'date'>&{fixtures:Pick<Career['fixtures'][number],'home'>[]};
export function cash(economy:Career['economy'],club:ClubId):number {
 return economy.ledger.reduce((sum,entry)=>sum+entry.postings.reduce((value,p)=>value+(p.account===club?p.amount:0),0),0);
}
export function commitments(state:Pick<Career,'economy'|'players'|'loans'>,club:ClubId,reserved=false):number {
 return state.players.reduce((sum,p)=>{const wage=state.economy.wages[p.id]!,loan=state.loans.find(l=>l.playerId===p.id&&l.status==='active');
  if(!loan)return sum+(p.clubId===club?wage:0);const share=Math.floor(wage*loan.share/100);
  return sum+(loan.parent===club?(reserved?wage:wage-share):loan.borrower===club?share:0);
 },0);
}
function attendance(capacity:number,reputation:number,ratio:number){return Math.floor(capacity*Math.max(.30,Math.min(.98,.40+reputation/200+ratio/10)));}
export function budgets(state:Pick<Career,'economy'|'players'|'fixtures'|'loans'>,club:ClubId){
 const account=state.economy.clubs.find(c=>c.clubId===club)!;
 const gate=state.fixtures.filter(f=>f.home===club&&f.competitionClass==='league').length*attendance(account.capacity,account.reputation,.5)*account.ticket;
 const wage=Math.floor(.60*(account.sponsorship+gate+account.lastPrizes)/52);
 const weekly=commitments(state,club),committed=commitments(state,club,true);const balance=cash(state.economy,club);
 return {cash:balance,weekly,committed,wage,transfer:Math.max(0,balance-13*committed-4*account.overhead),overhead:account.overhead};
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
export function createEconomy(world:World,rating:(p:Player)=>number,lower:ClubId[]=[]):Economy {
 const economy:Economy={clubs:world.clubs.map(c=>({clubId:c.id,...financialProfile(lower.includes(c.id)?2:1),lastPrizes:0})),wages:{},ledger:[]};
 for(const club of world.clubs){
  const profile=economy.clubs.find(c=>c.clubId===club.id)!;
  const squad=world.players.filter(p=>p.clubId===club.id);
  // Neutral age/contract factors until the player-contract slice supplies those terms.
  const desired=squad.map(p=>p.academy?0:Math.round(Math.max(500,2*rating(p)**2)/100)*10000);
  const annualGate=world.fixtures.filter(f=>f.home===club.id).length*attendance(profile.capacity,profile.reputation,.5)*profile.ticket;
  const wageBudget=Math.floor(.60*(profile.sponsorship+annualGate)/52);
  const total=desired.reduce((n,w)=>n+w,0);const limit=Math.floor(wageBudget*.8);
  squad.forEach((p,i)=>{economy.wages[p.id]=total>limit?Math.floor(desired[i]!*limit/total):desired[i]!;});
  external(economy,club.id,world.date,'opening',profile.sponsorship/2,'opening/'+club.id);
 }
 for(const player of world.players)if(player.clubId===null)economy.wages[player.id]=0;
 return economy;
}
export function monday(date:string){
 const [year,month,day]=date.split('-').map(Number) as [number,number,number];const y=year-1;
 const leap=year%4===0&&(year%100!==0||year%400===0);
 const before=[0,31,59,90,120,151,181,212,243,273,304,334][month-1]!;
 return (365*y+Math.floor(y/4)-Math.floor(y/100)+Math.floor(y/400)+before+day+(leap&&month>2?1:0))%7===1;
}
export function settleDay(state:Pick<Career,'economy'|'players'|'loans'>,date:string){
 const weekly=monday(date),monthly=date.endsWith('-01');if(!weekly&&!monthly)return;
 const batch={...state.economy,ledger:[] as LedgerEntry[]};
 for(const club of state.economy.clubs){
  if(monthly)external(batch,club.clubId,date,'sponsor',Math.floor(club.sponsorship/12)+(date.slice(5,7)==='06'?club.sponsorship%12:0));
  if(weekly){external(batch,club.clubId,date,'wages',-commitments(state,club.clubId));external(batch,club.clubId,date,'overhead',-club.overhead);}
 }
 const existing=new Set(state.economy.ledger.map(e=>e.id));
 state.economy.ledger.push(...batch.ledger.filter(e=>!existing.has(e.id)));
}
export function settleGate(state:Pick<Career,'economy'|'fixtures'>,club:ClubId,fixtureId:string,date:string,neutral=false){
 const account=state.economy.clubs.find(c=>c.clubId===club)!;
 if(neutral){const fixture=state.fixtures.find(f=>f.id===fixtureId)!,other=state.economy.clubs.find(c=>c.clubId===fixture.away)!;const total=attendance(Math.max(account.capacity,other.capacity),Math.floor((account.reputation+other.reputation)/2),.5)*account.ticket;const half=Math.floor(total/2);external(state.economy,club,date,'gate',half,'gate/'+fixtureId+'/'+club);external(state.economy,fixture.away,date,'gate',total-half,'gate/'+fixtureId+'/'+fixture.away);return;}
 const previous=state.fixtures.filter(f=>f.score&&(f.home===club||f.away===club)).slice(-5);
 const points=previous.reduce((sum,f)=>{const home=f.home===club,own=f.score![home?0:1],other=f.score![home?1:0];return sum+(own>other?3:own===other?1:0);},0);
 const count=attendance(account.capacity,account.reputation,previous.length?points/(3*previous.length):.5);
 external(state.economy,club,date,'gate',count*account.ticket,'gate/'+fixtureId);
}
export function validateEconomy(state:Career){
 const economy=state.economy,ids=state.clubs.map(c=>c.id);
 if(new Set(economy.clubs.map(c=>c.clubId)).size!==state.clubs.length||economy.clubs.some(c=>!ids.includes(c.clubId))||Object.keys(economy.wages).length!==state.players.length||state.players.some(p=>economy.wages[p.id]===undefined)||new Set(economy.ledger.map(e=>e.id)).size!==economy.ledger.length)throw Error('INVALID_SAVE');
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

export function carryLedger(state:Pick<Career,'season'|'history'|'economy'|'clubs'>){
 const previous=state.history.at(-1);if(!previous)return;
 const date=`${state.season}-07-01`;
 const current=state.economy.ledger.filter(e=>e.date>=date&&!e.id.startsWith('carry/'));
 state.economy.ledger=[];
 for(const club of state.clubs){const amount=previous.balances[club.id]!;post(state.economy,{id:`carry/${state.season}/${club.id}`,date,kind:'opening',postings:[{account:club.id,amount},{account:'external',amount:-amount}]});}
 state.economy.ledger.push(...current);
}
