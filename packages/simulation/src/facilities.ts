import type {Career} from '../../contracts/src/index.ts';
import {addDays} from './availability.ts';
import {budgets,post} from './economy.ts';
export const facilityCosts=[25000000,50000000,100000000] as const;
export function initialFacilities(clubs:Career['clubs']):Career['facilities']{return Object.fromEntries(clubs.map(c=>[c.id,{academy:0,recovery:0,construction:null}]));}
export function upgradeFacility(state:Career,kind:'academy'|'recovery'):boolean{
  const facility=state.facilities[state.clubId]!;
  if(facility.construction||facility[kind]>=3||(state.match&&state.match.phase!=='finished'))return false;
  const level=facility[kind]+1,cost=facilityCosts[level-1]!;
  if(budgets(state,state.clubId).transfer<cost)return false;
  if(!post(state.economy,{id:`facility/${state.clubId}/${kind}/${level}`,date:state.date,kind:'facility',postings:[{account:state.clubId,amount:-cost},{account:'external',amount:cost}]}))return false;
  facility.construction={kind,level,started:state.date,due:addDays(state.date,30)};return true;
}
export function completeFacilities(state:Career):boolean{
  let completed=false;
  for(const [id,facility] of Object.entries(state.facilities))if(facility.construction&&facility.construction.due<=state.date){facility[facility.construction.kind]=facility.construction.level;facility.construction=null;if(id===state.clubId)completed=true;}
  return completed;
}
export function validateFacilities(state:Career){
  if(Object.keys(state.facilities).length!==state.clubs.length||state.clubs.some(c=>!state.facilities[c.id]))throw Error('INVALID_SAVE');
  for(const facility of Object.values(state.facilities)){
    const work=facility.construction;
    if(work&&(work.level!==facility[work.kind]+1||work.started>state.date||work.due<=state.date||work.due!==addDays(work.started,30)))throw Error('INVALID_SAVE');
  }
}
