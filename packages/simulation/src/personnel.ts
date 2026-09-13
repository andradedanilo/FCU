import type {Career,Player,Match,PlayerId,Role} from '../../contracts/src/index.ts';
import {overall} from './ratings.ts';
import {ageOn,initialContract} from './contracts.ts';
import {draw,stream} from './rng.ts';
import {available,addDays} from './availability.ts';
import {competitionPlayers} from './discipline.ts';

const attributes=['goalkeeping','tackling','passing','shooting','pace','stamina','discipline'] as const;
export function newPerson(player:Player):Career['personnel']['players'][PlayerId]{return {potential:Math.min(100,overall(player)+10),retired:null,minutes:0,starts:0,eligible:0};}
const training=()=>({days:0,intensity:0,balanced:0,defence:0,attack:0,fitness:0});
export function initialPersonnel(players:Player[],clubs:Career['clubs'],date:string):Career['personnel']{return {players:Object.fromEntries(players.map(p=>[p.id,newPerson(p)])),focus:'balanced',lastReview:date,training:Object.fromEntries(clubs.map(c=>[c.id,training()])),reports:[]};}
export function recordAppearances(state:Career,match:Match){
  if(match.tick===0)return;
  const current=[...match.homeLineup,...match.awayLineup],starters=new Set(current);
  for(const substitution of [...match.substitutions].reverse()){starters.delete(substitution.in);starters.add(substitution.out);}
  for(const player of competitionPlayers({...state,players:state.players.filter(p=>p.clubId===match.home||p.clubId===match.away)},match.competitionClass)){
    const person=state.personnel.players[player.id]!;
    if(available(player,state.date))person.eligible++;
    if(starters.has(player.id))person.starts++;
    const entry=starters.has(player.id)?0:match.substitutions.find(s=>s.in===player.id)?.tick;
    if(entry===undefined)continue;
    const out=match.substitutions.find(s=>s.out===player.id)?.tick??match.tick;
    const incident=match.events.find(e=>e.playerId===player.id&&['red','secondYellow','injury'].includes(e.type))?.tick??match.tick;
    person.minutes+=Math.max(0,Math.min(out,incident,match.tick)-entry);
  }
}
export function personnelDay(state:Career){
  for(const club of state.clubs){const log=state.personnel.training[club.id]!;log.days++;log.intensity+=club.id===state.clubId?{light:75,balanced:100,intense:120}[state.training]:100;log[club.id===state.clubId?state.personnel.focus:'balanced']++;}
  if(state.date<addDays(state.personnel.lastReview,28))return;
  state.personnel.lastReview=state.date;
  state.personnel.reports=state.personnel.reports.filter(r=>r.kind!=='role');
  for(const player of state.players){
    const person=state.personnel.players[player.id]!,role=state.contracts[player.id]!.role;
    if(player.clubId&&person.retired===null&&role!=='prospect'&&person.eligible>0){
      const change=person.starts*100>=person.eligible*(role==='starter'?60:25)?2:-5;
      player.morale=Math.max(0,Math.min(100,player.morale+change));
      if(change<0)state.personnel.reports.push({playerId:player.id,clubId:player.clubId,kind:'role',change,date:state.date});
    }
    person.starts=0;person.eligible=0;
  }
}
export function trainingInjuries(state:Career):boolean{
  const matchClubs=new Set(state.fixtures.filter(f=>f.date===state.date).flatMap(f=>[f.home,f.away]));
  let rng=stream(state.seed,`training-injuries/${state.date}`),managed=false;
  const roll=()=>{let value;[rng,value]=draw(rng);return value%10000;};
  const players=state.players.filter(p=>p.clubId&&!matchClubs.has(p.clubId)&&state.personnel.players[p.id]!.retired===null&&(!p.injuryUntil||p.injuryUntil<=state.date)).sort((a,b)=>a.id<b.id?-1:1);
  for(const player of players){
    const chance=player.clubId===state.clubId?{light:2,balanced:4,intense:8}[state.training]:4;
    if(roll()>=chance)continue;
    const severity=roll(),low=severity<7000?3:severity<9500?14:56,high=severity<7000?7:severity<9500?28:112;
    player.injuryUntil=addDays(state.date,low+Math.floor(roll()*(high-low+1)/10000));
    managed ||= player.clubId===state.clubId;
  }
  return managed;
}
export function academyReview(state:Career){
  const end=`${state.season+1}-06-30`,academy=state.players.filter(p=>p.clubId===state.clubId&&p.academy);
  const expiring=state.date>=`${state.season+1}-06-01`?academy.filter(p=>state.contracts[p.id]!.ends!==null&&state.contracts[p.id]!.ends!<=end):[];
  return {date:end,expiring,overflow:state.date>=`${state.season+1}-06-01`?Math.max(0,academy.length-expiring.length+4-8):0};
}
export function annualDevelopment(state:Career){
  state.personnel.reports=[];
  for(const player of [...state.players].sort((a,b)=>a.id.localeCompare(b.id))){
    const person=state.personnel.players[player.id]!;if(person.retired!==null)continue;
    let rng=stream(state.seed,`development/${state.season}/${player.id}`);
    const random=(n:number)=>{let value;[rng,value]=draw(rng);return value%n;};
    const age=ageOn(state.contracts[player.id]!.birthDate,state.date),club=player.clubId;
    if(age>=38&&random(100)<(age>=40?100:age===39?50:25)){
      person.retired=state.season;player.clubId=null;player.registered=false;player.academy=false;
      const contract=state.contracts[player.id]!;contract.ownerId=null;contract.ends=null;contract.revision++;state.economy.wages[player.id]=0;
      state.personnel.reports.push({playerId:player.id,clubId:club,kind:'retired',change:0,date:state.date});continue;
    }
    const before=overall(player),log=club?state.personnel.training[club]:null;
    let budget=age<24?random(29):age<30?random(8):age<34?-random(15):-(7+random(22));
    if(budget>0)budget=Math.round(budget*(person.minutes<900?.5:1)*(log?.days?log.intensity/log.days/100:1));
    const positive=budget>0;
    for(let point=0;point<Math.abs(budget);point++){
      if(positive&&overall(player)>=person.potential)break;
      let focus:Career['personnel']['focus']='balanced';
      if(log&&log.days){let choice=random(log.days);for(const key of ['balanced','defence','attack','fitness'] as const){choice-=log[key];if(choice<0){focus=key;break;}}}
      const primary=focus==='defence'?'tackling':focus==='attack'?'shooting':focus==='fitness'?'stamina':null;
      const others=primary?attributes.filter(attribute=>attribute!==primary):attributes;
      const chosen=positive&&primary?(random(2)===0?primary:others[random(others.length)]!):attributes[random(attributes.length)]!;
      player[chosen]=Math.max(1,Math.min(100,player[chosen]+(positive?1:-1)));
    }
    person.minutes=0;
    const change=overall(player)-before;
    if(change!==0)state.personnel.reports.push({playerId:player.id,clubId:club,kind:'development',change,date:state.date});
  }
}
export function youthIntake(state:Career){
  for(const club of state.clubs){
    for(let i=0;i<4;i++){
      const number=1+Math.max(22,...state.players.filter(p=>p.id.startsWith('player-'+club.id.slice(5)+'-')).map(p=>Number(p.id.split('-')[2])));
      const id=('player-'+club.id.slice(5)+'-'+number) as PlayerId;
      const [,value]=draw(stream(state.seed,`youth/${state.season}/${club.id}/${i}`));
      const base=30+value%21+2*state.facilities[club.id]!.academy,role=(['GK','DEF','MID','FWD'] as Role[])[i]!;
      const player:Player={id,clubId:club.id,name:`Academy ${club.short} ${state.season}-${i+1}`,role,registered:true,academy:true,condition:100000,morale:70,injuryUntil:null,leagueYellows:0,leagueBan:0,goalkeeping:role==='GK'?base:15,tackling:base,passing:base,shooting:base,pace:base,stamina:base,discipline:base};
      state.players.push(player);state.contracts[id]=initialContract(player,state.date);state.economy.wages[id]=0;
      state.personnel.players[id]={...newPerson(player),potential:Math.max(overall(player),45+(value>>>8)%46)};
      state.personnel.reports.push({playerId:id,clubId:club.id,kind:'arrived',change:0,date:state.date});
    }
    const academy=state.players.filter(p=>p.clubId===club.id&&p.academy).sort((a,b)=>state.personnel.players[a.id]!.potential-state.personnel.players[b.id]!.potential||state.contracts[a.id]!.birthDate.localeCompare(state.contracts[b.id]!.birthDate)||a.id.localeCompare(b.id));
    for(const player of academy.slice(0,Math.max(0,academy.length-8))){player.clubId=null;player.academy=false;const contract=state.contracts[player.id]!;contract.ownerId=null;contract.ends=null;contract.revision++;state.economy.wages[player.id]=0;state.personnel.reports.push({playerId:player.id,clubId:club.id,kind:'released',change:0,date:state.date});}
    state.personnel.training[club.id]=training();
  }
}
export function validatePersonnel(state:Career){
  if(Object.keys(state.personnel.players).length!==state.players.length||state.players.some(p=>!state.personnel.players[p.id])||Object.keys(state.personnel.training).length!==state.clubs.length||state.clubs.some(c=>!state.personnel.training[c.id])||state.personnel.lastReview>state.date)throw Error('INVALID_SAVE');
  for(const p of state.players){const person=state.personnel.players[p.id]!;if(person.starts>person.eligible||person.retired!==null&&(person.retired>state.season||p.clubId!==null||p.registered||state.economy.wages[p.id]!==0))throw Error('INVALID_SAVE');}
  for(const log of Object.values(state.personnel.training))if(log.days!==log.balanced+log.defence+log.attack+log.fitness||log.intensity<log.days*75||log.intensity>log.days*120)throw Error('INVALID_SAVE');
  if(state.personnel.reports.some(r=>!state.personnel.players[r.playerId]||r.date>state.date||r.clubId!==null&&!state.clubs.some(c=>c.id===r.clubId)))throw Error('INVALID_SAVE');
}
