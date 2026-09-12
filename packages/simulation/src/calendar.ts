import {nextLoanDate,returnLoans} from './loans.ts';
import {recruit} from './recruitment.ts';
import {nextMarketDate,processMarket} from './market.ts';
import type {Career,FailureCode} from '../../contracts/src/index.ts';
import {addDays} from './availability.ts';
import {settleDay} from './economy.ts';
import {finishScouting} from './scouting.ts';
import {rules} from './rules.ts';
export function nextFixtureDate(state:Pick<Career,'round'>):string|null{return state.round<14?addDays('2026-07-01',state.round*7):null;}
export function nextCalendarDate(state:Career):string|null {
 return [nextFixtureDate(state),state.scouting.active?.due??null,nextMarketDate(state),nextLoanDate(state)].filter((date):date is string=>date!==null&&date>state.date&&date<='2027-06-30').sort()[0]??null;
}
export function advanceCalendar(state:Career,target:'day'|'event'):FailureCode|null {
 const fixture=nextFixtureDate(state),limit=nextCalendarDate(state);
 if((state.match&&state.match.phase!=='finished')||!limit||(fixture&&fixture<=state.date))return 'INVALID_COMMAND';
 const end=target==='day'?addDays(state.date,1):limit;
 while(state.date<end){
  state.date=addDays(state.date,1);
  state.players=state.players.map(p=>({...p,condition:Math.min(100000,p.condition+(p.injuryUntil&&p.injuryUntil>state.date?6000:rules.recovery[p.clubId===state.clubId?state.training:'balanced']))}));
  const returned=returnLoans(state);if(state.date==='2027-06-30')for(const offer of state.offers)if(['submitted','countered','accepted','ready','queued'].includes(offer.status)){offer.status='expired';offer.activation=null;}settleDay(state,state.date);
  const report=finishScouting(state),market=processMarket(state);recruit(state);if(report||market||returned)break;
 }
 return null;
}
