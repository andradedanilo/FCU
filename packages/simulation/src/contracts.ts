import type {Career,Player,Contract,Command,FailureCode} from '../../contracts/src/index.ts';
import {budgets,post} from './economy.ts';
import {overall} from './ratings.ts';
import {validDate} from './availability.ts';

export function initialContract(player:Player,date:string):Contract {
 const number=Number(player.id.slice(-2));
 return {ownerId:player.clubId,birthDate:`${player.academy?Number(date.slice(0,4))-17:1992+(number-1)%15}-07-01`,ends:player.clubId===null?null:`${Number(date.slice(0,4))+1+(player.academy?0:number%3)}-06-30`,role:player.academy?'prospect':'rotation',revision:0};
}
export function createContracts(state:Pick<Career,'players'|'date'>):Career['contracts']{
 return Object.fromEntries(state.players.map(p=>[p.id,initialContract(p,state.date)]));
}
export function ageOn(birthDate:string,date:string){return Number(date.slice(0,4))-Number(birthDate.slice(0,4))-Number(date.slice(5)<birthDate.slice(5));}
export function contractEnd(date:string,years:number){return `${Number(date.slice(0,4))+years}-06-30`;}
export function marketValue(state:Career,player:Player){
 const contract=state.contracts[player.id]!;const age=ageOn(contract.birthDate,state.date);
 const ageFactor=age<24?12000:age<30?10000:6500;
 const yearLater=String(Number(state.date.slice(0,4))+1)+state.date.slice(4);
 const termFactor=(contract.ends??state.date)<yearLater?6500:10000;
 return Math.round(1000*overall(player)**2*ageFactor/10000*termFactor/10000/1000)*100000;
}
export function desiredTerms(state:Career,player:Player){
 const wage=Math.round(Math.max(50000,marketValue(state,player)/500)/10000)*10000;
 return {wage,bonus:4*wage};
}
type Renewal=Extract<Command,{type:'RenewContract'}>;
export function renewalError(state:Career,action:Omit<Renewal,'careerId'|'commandId'|'expectedRevision'>):FailureCode|null {
 const player=state.players.find(p=>p.id===action.playerId),contract=state.contracts[action.playerId];
 if(!player||!contract||player.academy||player.clubId!==state.clubId||contract.ownerId!==state.clubId||(state.match&&state.match.phase!=='finished'))return 'INVALID_COMMAND';
 if(contract.revision!==action.contractRevision)return 'CONTRACT_CHANGED';
 const end=contractEnd(state.date,action.years),desired=desiredTerms(state,player);
 const roles={prospect:0,rotation:1,starter:2};
 if((contract.ends===null||end<=contract.ends)||action.wage<desired.wage||action.bonus<4*action.wage||roles[action.role]<roles[contract.role])return 'PLAYER_TERMS';
 const bank=budgets(state,state.clubId),weekly=bank.committed-state.economy.wages[player.id]!+action.wage;
 if(weekly>bank.wage)return 'WAGE_BUDGET';
 if(bank.cash-action.bonus<13*weekly+4*bank.overhead)return 'INSUFFICIENT_FUNDS';
 return null;
}
export function renewContract(state:Career,action:Renewal):FailureCode|null {
 const error=renewalError(state,action);if(error)return error;
 const contract=state.contracts[action.playerId]!;
 if(!post(state.economy,{id:`renewal/${action.playerId}/${contract.revision}`,date:state.date,kind:'signingBonus',postings:[{account:state.clubId,amount:-action.bonus},{account:'external',amount:action.bonus}]}))return 'CONTRACT_CHANGED';
 state.economy.wages[action.playerId]=action.wage;
 state.contracts[action.playerId]={...contract,ends:contractEnd(state.date,action.years),role:action.role,revision:contract.revision+1};
 return null;
}
export function validateContracts(state:Career){
 if(Object.keys(state.contracts).length!==state.players.length)throw Error('INVALID_SAVE');
 for(const player of state.players){const contract=state.contracts[player.id];
  if(!contract||(contract.ownerId!==player.clubId&&!state.loans.some(l=>l.playerId===player.id&&l.status==='active'&&l.parent===contract.ownerId&&l.borrower===player.clubId))||!validDate(contract.birthDate)||(player.clubId===null?contract.ends!==null||state.economy.wages[player.id]!==0:contract.ends===null||!validDate(contract.ends)||contract.ends<state.date)||ageOn(contract.birthDate,state.date)<15||ageOn(contract.birthDate,state.date)>60)throw Error('INVALID_SAVE');
 }
}
