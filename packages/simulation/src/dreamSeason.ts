import {dreamSchema,type Dream,type DreamRequest} from '../../contracts/src/dream.ts';
import type {Player,PlayerId,Role} from '../../contracts/src/index.ts';
import {clubs} from '../../contracts/src/identity.ts';
import {createCareer,applyCommand,validateMatchState,autoPick,pickBench} from './engine.ts';
import {createPackedCareer} from './roster.ts';
import {overall} from './ratings.ts';
import {newCollection,fixtureReward,seasonReward,revealPack,choosePlayer,validateCollection} from './dream.ts';
import {worldSchedule,nextManagedFixture,seasonComplete} from './competition.ts';
import {selectionPlayers} from './discipline.ts';
import {addDays} from './availability.ts';
import {stream} from './rng.ts';

const targets={GK:2,DEF:8,MID:8,FWD:4};
export const rewardPool=(state:Dream)=>state.pool.map(p=>({id:p.id,ability:overall(p.player)}));
function pick(state:Dream,low:number,high:number,key:string){
 return (Object.keys(targets) as Role[]).flatMap(role=>state.pool.filter(p=>p.player.role===role).sort((a,b)=>{
  const distance=(p:typeof a)=>{const rating=overall(p.player);return rating<low?low-rating:rating>high?(key==='starter'?100:0)+rating-high:0;};
  return distance(a)-distance(b)||stream(state.game.seed,`${key}/${a.id}`)-stream(state.game.seed,`${key}/${b.id}`)||a.id.localeCompare(b.id);
 }).slice(0,targets[role]));
}
function instance(player:Player,id:PlayerId,clubId:Player['clubId']):Player{
 return {...player,id,clubId,registered:true,academy:false,condition:100000,morale:70,injuryUntil:null,leagueBan:0,leagueYellows:0};
}
function select(state:Dream){const g=state.game,players=selectionPlayers(g);g.lineup=autoPick(players,g.clubId,g.tactics.formation,g.date);g.bench=pickBench(players,g.clubId,g.lineup,g.date);}
function opponents(state:Dream){
 const g=state.game,[low,high]=state.tier==='starter'?[55,64]:state.tier==='club'?[65,74]:[75,84];
 g.players=g.players.filter(p=>p.clubId===g.clubId);
 for(const club of g.clubs.filter(c=>c.id!==g.clubId)){
  const players=pick(state,low!,high!,`${g.season}/${club.id}`);
  if(players.length!==22)throw Error('INVALID_COMMAND');
  for(const [i,p] of players.entries()){const id=`player-${club.id.slice(5)}-${String(i+1).padStart(2,'0')}` as PlayerId;g.players.push(instance(p.player,id,club.id));state.instances[id]=p.id;}
 }
}
export function newDream(request:Extract<DreamRequest,{type:'New'}>):Dream{
 const source=request.pack?createPackedCareer(request.id,request.seed,clubs[0]!.id,request.pack):createCareer(request.id,request.seed,clubs[0]!.id,'countries');
 const game=createCareer(request.id,request.seed,clubs[0]!.id);
 const state:Dream={gameMode:'dreamClub',schema:1,game,snapshotId:source.snapshotId,tier:request.tier,pool:source.players.filter(p=>!p.academy).map(player=>({id:source.rosterOrigin?.playerIds[player.id]??player.id,player})),instances:{},collection:newCollection(request.seed,[])};
 const starter=pick(state,50,64,'starter');if(starter.length!==22)throw Error('INVALID_COMMAND');
 game.clubs[0]!.name=request.name;game.clubs[0]!.short='FCU';game.players=[];game.board.assisted=true;game.economy.ledger=[];
 for(const [i,p] of starter.entries()){const id=`player-01-${String(i+1).padStart(2,'0')}` as PlayerId;game.players.push(instance(p.player,id,game.clubId));state.instances[id]=p.id;}
 state.collection=newCollection(request.seed,starter.map(p=>p.id));opponents(state);select(state);return validateDream(state);
}
const matchCommands=['SelectLineup','SelectBench','StoreTacticPreset','SetTactics','Substitute','StartMatch','AdvanceMatch','AcknowledgeMatch'];
export function dreamCommand(input:Dream,request:Exclude<DreamRequest,{type:'New'|'Load'}>):Dream{
 if(request.type==='Instant'){
  let next=input;
  if(!next.game.match||next.game.match.phase==='finished'){next=dreamCommand(next,{type:'Next'});next=dreamCommand(next,{type:'Match',command:{type:'StartMatch',careerId:next.game.careerId,expectedRevision:next.game.revision,commandId:instantId(next.game.revision)}});}
  while(next.game.match!.phase!=='finished'){const g=next.game;next=dreamCommand(next,{type:'Match',command:{careerId:g.careerId,expectedRevision:g.revision,commandId:instantId(g.revision),...(g.match!.pendingDismissal||g.match!.pendingInjuries.length?{type:'AcknowledgeMatch' as const}:{type:'AdvanceMatch' as const,minutes:90})}});}
  return next;
 }
 const state=structuredClone(input);const g=state.game,pool=rewardPool(state);
 if(request.type==='Match'){
  if(!matchCommands.includes(request.command.type))throw Error('INVALID_COMMAND');
  const result=applyCommand(g,request.command,true);if(!result.ok)throw Error(result.error);state.game=result.value;
  if(state.game.round>g.round){const match=state.game.match!;fixtureReward(state.collection,pool,match.fixtureId,match.forfeit!==null);
   const nextDate=nextManagedFixture(state.game)?.date??addDays(state.game.date,7);
   for(const p of state.game.players){p.condition=100000;if(p.injuryUntil&&p.injuryUntil!==g.players.find(old=>old.id===p.id)?.injuryUntil)p.injuryUntil=addDays(nextDate,1);}
   if(seasonComplete(state.game))seasonReward(state.collection,pool,state.game.season);
  }
 }else if(request.type==='Reveal')revealPack(state.collection,pool);
 else if(request.type==='Choose'){
  const owned=state.collection.unlocked.includes(request.playerId);
  if(!choosePlayer(state.collection,request.packId,request.playerId))throw Error('INVALID_COMMAND');
  if(!owned){const p=state.pool.find(p=>p.id===request.playerId)!,id=`player-01-${state.collection.unlocked.length+100}` as PlayerId;g.players.push({...instance(p.player,id,g.clubId),registered:false});state.instances[id]=p.id;}
 }else if(request.type==='Squad'){
  if(g.match&&g.match.phase!=='finished'||new Set(request.players).size!==request.players.length||request.players.some(id=>!state.collection.unlocked.includes(id)))throw Error('INVALID_COMMAND');
  for(const p of g.players)if(p.clubId===g.clubId)p.registered=request.players.includes(state.instances[p.id]!);
  select(state);if(g.lineup.length!==11||g.players.filter(p=>p.clubId===g.clubId&&p.registered&&p.role==='GK').length<2)throw Error('INVALID_LINEUP');
 }else if(request.type==='Next'){
  if(g.match&&g.match.phase!=='finished')throw Error('INVALID_COMMAND');const fixture=nextManagedFixture(g);if(!fixture)throw Error('INVALID_COMMAND');
  g.date=fixture.date;g.match=null;select(state);
 }else {
  if(!seasonComplete(g)||g.season>=2100)throw Error('INVALID_COMMAND');
  g.season++;g.date=`${g.season}-07-01`;g.round=0;g.match=null;g.fixtures=worldSchedule(g.world,g.season);state.tier=request.tier;
  for(const p of g.players){p.leagueYellows=0;p.condition=100000;}
  opponents(state);select(state);
 }
 if(request.type!=='Match')g.revision++;
 return state;
}
export function validateDream(input:unknown):Dream{
 const state=dreamSchema.parse(input),g=state.game;
 if(g.world.kind!=='exhibition'||g.clubs.length!==8||g.cups.length||g.history.length||g.marketArchive.length||g.offers.length||g.loans.length||g.economy.ledger.length)throw Error('INVALID_SAVE');
 validateCollection(state.collection,rewardPool(state));validateMatchState(g);
 const owned=g.players.filter(p=>p.clubId===g.clubId).map(p=>state.instances[p.id]);
 if(new Set(owned).size!==owned.length||owned.length!==state.collection.unlocked.length||owned.some(id=>!id||!state.collection.unlocked.includes(id)))throw Error('INVALID_SAVE');
 const stats=['goalkeeping','tackling','passing','shooting','pace','stamina','discipline','name','role'] as const;
 for(const p of g.players){const source=state.pool.find(s=>s.id===state.instances[p.id]);if(!source||p.transferListing||JSON.stringify(p.secondaryRoles??[])!==JSON.stringify(source.player.secondaryRoles??[])||stats.some(key=>p[key]!==source.player[key]))throw Error('INVALID_SAVE');}
 return state;
}

function instantId(revision:number){return '00000000-0000-4000-8000-'+revision.toString().padStart(12,'0');}
