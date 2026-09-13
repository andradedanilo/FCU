import assert from 'node:assert/strict';
import {newDream,dreamCommand,validateDream} from '../packages/simulation/src/dreamSeason.ts';
import {overall} from '../packages/simulation/src/ratings.ts';
import {canonical} from '../packages/contracts/src/index.ts';
import type {Dream} from '../packages/contracts/src/dream.ts';
const started=performance.now(),reports=[];
const snapshot=(s:Dream)=>({match:s.game.match,fixtures:s.game.fixtures,collection:s.collection,players:s.game.players});
for(const [index,tier] of (['starter','club','elite'] as const).entries()){
 const seed=2026+index;
 let state=newDream({type:'New',id:`00000000-0000-4000-8000-${String(seed).padStart(12,'0')}`,seed,name:'Validation FC',tier,pack:null});
 const isolated=canonical({economy:state.game.economy,personnel:state.game.personnel,board:state.game.board});
 const opponent=state.game.players.filter(p=>p.clubId!==state.game.clubId),opponentMean=opponent.reduce((sum,p)=>sum+overall(p),0)/opponent.length;
 const initialMean=state.game.players.filter(p=>p.clubId===state.game.clubId).reduce((n,p)=>n+overall(p),0)/22;
 const seasons=[];
 let games=0,wins=0,draws=0,goals=0,against=0,restores=0,choices=0;
 for(let year=0;year<10;year++){
  const previousWins=wins,previousGoals=goals,previousAgainst=against;
  for(let fixture=0;fixture<14;fixture++){
   state=dreamCommand(state,{type:'Next'});
   if(year===0&&fixture===0){
    const instant=dreamCommand(state,{type:'Instant'});let stepped=structuredClone(state);
    const send=(type:'StartMatch'|'AdvanceMatch'|'AcknowledgeMatch')=>{const g=stepped.game;stepped=dreamCommand(stepped,{type:'Match',command:{careerId:g.careerId,expectedRevision:g.revision,commandId:`00000000-0000-4000-8000-${String(g.revision).padStart(12,'0')}`,...(type==='AdvanceMatch'?{type,minutes:1}:{type})}});};
    send('StartMatch');while(stepped.game.match!.phase!=='finished')send(stepped.game.match!.pendingDismissal||stepped.game.match!.pendingInjuries.length?'AcknowledgeMatch':'AdvanceMatch');
    assert.equal(canonical(snapshot(stepped)),canonical(snapshot(instant)),'Instant result differs from minute playback');state=instant;
   }else state=dreamCommand(state,{type:'Instant'});
   const match=state.game.match!;assert.equal(match.forfeit,null,'Dream progression ended in a forfeit');games++;
   const home=match.home===state.game.clubId,own=home?match.homeGoals:match.awayGoals,other=home?match.awayGoals:match.homeGoals;
   goals+=own;against+=other;wins+=Number(own>other);draws+=Number(own===other);
   while(state.collection.queued.length||state.collection.pending){
    state=dreamCommand(state,{type:'Reveal'});const pending=state.collection.pending!;
    const saved=canonical(state);state=validateDream(JSON.parse(saved));assert.equal(canonical(state),saved,'Pending reward changed after restore');restores++;
    const playerId=[...pending.candidates].sort((a,b)=>overall(state.pool.find(p=>p.id===b)!.player)-overall(state.pool.find(p=>p.id===a)!.player)||a.localeCompare(b))[0]!;
    state=dreamCommand(state,{type:'Choose',packId:pending.id,playerId});const reward=canonical(state.collection);
    state=dreamCommand(state,{type:'Choose',packId:pending.id,playerId});assert.equal(canonical(state.collection),reward,'Choice replay duplicated a reward');choices++;
   }
   const active=(['GK','DEF','MID','FWD'] as const).flatMap(role=>state.game.players.filter(p=>p.clubId===state.game.clubId&&p.role===role).sort((a,b)=>overall(b)-overall(a)||a.id.localeCompare(b.id)).slice(0,role==='GK'?2:role==='FWD'?4:8).map(p=>state.instances[p.id]!));
   state=dreamCommand(state,{type:'Squad',players:active});
  }
  validateDream(state);assert.equal(state.collection.earned,Math.floor(games/3)+year+1,'Reward cadence changed');
  assert.equal(canonical({economy:state.game.economy,personnel:state.game.personnel,board:state.game.board}),isolated,'Career processing leaked into Dream');
  const squad=state.game.players.filter(p=>p.clubId===state.game.clubId&&p.registered);seasons.push({season:state.game.season,wins:wins-previousWins,goalsFor:goals-previousGoals,goalsAgainst:against-previousAgainst,activeMean:squad.reduce((sum,p)=>sum+overall(p),0)/squad.length});
  state=dreamCommand(state,{type:'Season',tier});
 }
 const active=state.game.players.filter(p=>p.clubId===state.game.clubId&&p.registered),finalMean=active.reduce((n,p)=>n+overall(p),0)/active.length;
 assert.equal(new Set(state.collection.unlocked).size,state.collection.unlocked.length);assert.equal(choices,56);assert.equal(state.collection.unlocked.length,22+choices);
 reports.push({seed,tier,seasonReports:seasons,seasons:10,games,wins,draws,losses:games-wins-draws,goalsFor:goals,goalsAgainst:against,choices,restores,initialMean,finalMean,opponentMean,unlocked:state.collection.unlocked.length,warnings:opponentMean<(tier==='elite'?75:tier==='club'?65:55)?['Fictional pool does not fill the advertised opponent rating band']:[]});
 console.log(JSON.stringify(reports.at(-1)));
}
console.log(JSON.stringify({workload:'Three seeds 2026..2028, ten Dream seasons each, best-rating reward choices and role-balanced 22-player registration',matches:420,passed:true,seconds:(performance.now()-started)/1000,heapMB:Math.round(process.memoryUsage().heapUsed/1048576)}));
