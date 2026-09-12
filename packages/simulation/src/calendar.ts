import type {Career,FailureCode} from '../../contracts/src/index.ts';
import {addDays} from './availability.ts';
import {settleDay} from './economy.ts';
import {finishScouting} from './scouting.ts';
import {rules} from './rules.ts';
export function nextFixtureDate(state:Pick<Career,'round'>):string|null{return state.round<14?addDays('2026-07-01',state.round*7):null;}
export function nextCalendarDate(state:Career):string|null {
 return [nextFixtureDate(state),state.scouting.active?.due??null].filter((date):date is string=>date!==null&&date>state.date).sort()[0]??null;
}
export function advanceCalendar(state:Career,target:'day'|'event'):FailureCode|null {
 const fixture=nextFixtureDate(state),limit=nextCalendarDate(state);
 if((state.match&&state.match.phase!=='finished')||!limit||(fixture&&fixture<=state.date))return 'INVALID_COMMAND';
 const end=target==='day'?addDays(state.date,1):limit;
 while(state.date<end){
  state.date=addDays(state.date,1);
  state.players=state.players.map(p=>({...p,condition:Math.min(100000,p.condition+(p.injuryUntil&&p.injuryUntil>state.date?6000:rules.recovery[p.clubId===state.clubId?state.training:'balanced']))}));
  settleDay(state,state.date);
  if(finishScouting(state))break;
 }
 return null;
}
