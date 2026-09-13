import {boardDay} from './board.ts';
import {personnelDay,trainingInjuries} from './personnel.ts';
import {completeFacilities} from './facilities.ts';
import {seasonEnd,nextManagedFixture} from './competition.ts';
import {nextLoanDate,returnLoans} from './loans.ts';
import {recruit} from './recruitment.ts';
import {nextMarketDate,processMarket} from './market.ts';
import type {Career,FailureCode} from '../../contracts/src/index.ts';
import {addDays} from './availability.ts';
import {settleDay} from './economy.ts';
import {finishScouting} from './scouting.ts';
import {rules} from './rules.ts';
export function nextFixtureDate(state:Pick<Career,'fixtures'|'clubId'>):string|null{return nextManagedFixture(state)?.date??null;}
export function nextCalendarDate(state:Career):string|null {
 return [...Object.values(state.facilities).flatMap(f=>f.construction?[f.construction.due]:[]),nextFixtureDate(state),state.fixtures.find(f=>f.score===null)?.date??null,state.scouting.active?.due??null,nextMarketDate(state),nextLoanDate(state),seasonEnd(state.season)].filter((date):date is string=>date!==null&&date>state.date&&date<=seasonEnd(state.season)).sort()[0]??null;
}
export function advanceCalendar(state:Career,target:'day'|'event',simulate:(state:Career)=>void):FailureCode|null {
 const fixture=nextFixtureDate(state),limit=nextCalendarDate(state);
 if((state.match&&state.match.phase!=='finished')||!limit||(fixture&&fixture<=state.date))return 'INVALID_COMMAND';
 const end=target==='day'?addDays(state.date,1):limit;
 while(state.date<end){
  state.date=addDays(state.date,1);
  const facilityComplete=completeFacilities(state);personnelDay(state);
  // The command boundary already owns writable players; recovery needs no second copy.
  for(const p of state.players)if(p.condition<100000)p.condition=Math.min(100000,p.condition+(p.injuryUntil&&p.injuryUntil>state.date?6000:rules.recovery[p.clubId===state.clubId?state.training:'balanced'])+(p.clubId?state.facilities[p.clubId]!.recovery*1000:0));
  const returned=returnLoans(state);if(state.date===seasonEnd(state.season))for(const offer of state.offers)if(['submitted','countered','accepted','ready','queued'].includes(offer.status)){offer.status='expired';offer.activation=null;}settleDay(state,state.date);boardDay(state);
  const report=finishScouting(state),market=processMarket(state);recruit(state);const injured=trainingInjuries(state);simulate(state);if(report||market||returned||facilityComplete||injured||state.board.status!=='employed')break;
 }
 return null;
}
