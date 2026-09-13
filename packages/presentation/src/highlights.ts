import type { Career, Match, MatchEvent } from '../../contracts/src/index.ts';
export type HighlightKind='offside'|'disallowedOffside'|'disallowedFoul'|'corner'|'post'|'penaltySave'|'goal'|'save'|'shot'|'foul'|'yellow'|'red'|'injury'|'substitution'|'coach'|'penaltyGoal'|'penaltyMiss'|'lineup'|'halftime'|'win';
export type HighlightSide='blue'|'red';
export type Highlight={kind:HighlightKind;player:string;color:string;side:HighlightSide;tick:number;score:string;penaltyIndex?:number};
export function selectHighlight(events:MatchEvent[],afterOrder:number):MatchEvent|undefined {
  let misses=0,fouls=0;
  const fresh=events.filter(event=>{
    if(event.type==='shot')misses++;
    if(event.type==='foul')fouls++;
    return event.order>afterOrder&&(events[event.order-1]?.type==='penalty'||['offside','disallowedOffside','disallowedFoul','corner','post'].includes(event.type)||event.type==='goal'||event.type==='save'||event.type==='red'||event.type==='secondYellow'||event.type==='yellow'||event.type==='injury'||(event.type==='foul'&&fouls%6===0)||(event.type==='shot'&&misses%3===0));
  });
  return fresh.find(e=>e.type==='red'||e.type==='secondYellow')??fresh.find(e=>e.type==='injury')??fresh.find(e=>events[e.order-1]?.type==='penalty')??fresh.find(e=>e.type==='disallowedOffside'||e.type==='disallowedFoul'||e.type==='post')??fresh.find(e=>e.type==='goal')??fresh.find(e=>e.type==='yellow')??fresh.find(e=>e.type==='save')??fresh.at(-1);
}
export function projectHighlight(state:Career,event:MatchEvent):Highlight|null {
  if(event.type==='pass'||event.type==='penalty'||event.type==='clearance')return null;
  const penalty=state.match?.events[event.order-1]?.type==='penalty';
  return {kind:penalty?(event.type==='goal'?'penaltyGoal':event.type==='save'?'penaltySave':'penaltyMiss'):event.type==='secondYellow'?'red':event.type,player:state.players.find(p=>p.id===event.playerId)!.name,color:state.clubs.find(c=>c.id===event.clubId)!.color,side:event.clubId===state.clubId?'blue':'red',tick:event.tick,score:`${event.homeGoals} - ${event.awayGoals}`};
}
export function nextHighlight(previous:Career,state:Career):Highlight|null {
  if(!previous.match||!state.match||previous.match.fixtureId!==state.match.fixtureId||state.match.tick<previous.match.tick)return null;
  const base={color:state.clubs.find(c=>c.id===state.clubId)!.color,side:'blue' as HighlightSide,tick:state.match.tick,score:''};
  if(state.match.substitutions.length>previous.match.substitutions.length){
    const change=state.match.substitutions.at(-1)!;
    return {...base,kind:'substitution',side:change.clubId===state.clubId?'blue':'red',player:state.players.find(p=>p.id===change.in)!.name};
  }
  if(state.match.tick===previous.match.tick){
    const key=state.match.home===state.clubId?'homeTactics':'awayTactics';
    if(JSON.stringify(state.match[key])!==JSON.stringify(previous.match[key]))return {...base,kind:'coach',player:''};
    return null;
  }
  if(state.match.tick!==previous.match.tick+1)return null;
  const event=selectHighlight(state.match.events,previous.match.events.at(-1)?.order??-1);
  return event?projectHighlight(state,event):null;
}
export const highlightDuration=4800;
export const playbackSpeed=2;
export function minuteDuration(events:MatchEvent[],tick:number):number {
 const before=events.filter(e=>e.tick<tick).at(-1)?.order??-1;
 return selectHighlight(events,before)?3000:600;
}
export function matchMinute(tick:number,firstAdded=0,secondAdded=0,extraTime=false):string {
 if(extraTime&&tick>90+firstAdded+secondAdded)return String(tick-firstAdded-secondAdded);
 if(tick>45&&tick<=45+firstAdded)return '45+'+(tick-45);
 const minute=tick>45+firstAdded?tick-firstAdded:tick;
 return minute>90?'90+'+(minute-90):String(minute).padStart(2,'0');
}
export function clockLabel(tick:number,elapsed:number,duration:number,match?:Pick<Match,'phase'|'addedTime'>&Partial<Pick<Match,'extraTime'>>):string {
 const seconds=(match?match.phase==='interval'||match.phase==='extraInterval'||match.phase==='finished':tick===45||tick===90)?0:Math.min(59,Math.floor(Math.max(0,elapsed)/duration*60));
 return `${matchMinute(tick,match?.addedTime[0]??0,match?.addedTime[1]??0,match?.extraTime??false)}:${String(seconds).padStart(2,'0')}`;
}
export type HighlightFrame='prepare'|'tackle'|'penalty'|HighlightKind;
export function highlightFrame(kind:HighlightKind,progress:number):HighlightFrame {
  if(kind==='foul'||kind==='yellow'||kind==='red')return progress<.4?'tackle':kind;
  if(kind==='penaltyGoal'||kind==='penaltyMiss'||kind==='penaltySave')return progress<.4?'penalty':kind==='penaltyGoal'?'goal':kind==='penaltySave'?'save':'penaltyMiss';
  if(kind==='post'||kind==='disallowedOffside'||kind==='disallowedFoul')return progress<.4?'prepare':kind;
  if(kind==='goal'||kind==='save'||kind==='shot')return progress<.4?'prepare':kind;
  return kind;
}
export function penaltyHighlights(previous:Career,state:Career):Highlight[]{
  const match=state.match;
  if(!match||previous.match?.fixtureId!==match.fixtureId||match.penalties.length<=previous.match.penalties.length)return [];
  return match.penalties.slice(previous.match.penalties.length).map((kick,index)=>({kind:kick.scored?'penaltyGoal':'penaltyMiss',side:kick.clubId===state.clubId?'blue':'red',player:state.players.find(p=>p.id===kick.playerId)!.name,color:state.clubs.find(c=>c.id===kick.clubId)!.color,tick:match.tick,score:'',penaltyIndex:previous.match!.penalties.length+index}));
}
export function penaltyView(state:Career,visible:number):Career{
  const match=state.match!;
  return {...state,match:{...match,penalties:match.penalties.slice(0,visible),phase:visible<match.penalties.length?'extraSecond':match.phase}};
}
export function boundaryArt(state:Career):'lineup'|'halftime'|'blue-win'|'red-win'|null{
 const match=state.match!;
 if(match.tick===0)return 'lineup';
 if(match.phase==='interval'||match.phase==='extraInterval')return 'halftime';
 if(match.phase!=='finished')return null;
 const home=match.penalties.length?match.penalties.filter(k=>k.clubId===match.home&&k.scored).length:match.homeGoals+(match.decider?match.aggregate[0]:0);
 const away=match.penalties.length?match.penalties.filter(k=>k.clubId===match.away&&k.scored).length:match.awayGoals+(match.decider?match.aggregate[1]:0);
 if(home===away)return 'halftime';
 return (home>away?match.home:match.away)===state.clubId?'blue-win':'red-win';
}
