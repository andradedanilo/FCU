import type { Career, Match, MatchEvent } from '../../contracts/src/index.ts';
export type HighlightKind='goal'|'save'|'shot';
export type Highlight={kind:HighlightKind;player:string;color:string;tick:number;score:string};
export function selectHighlight(events:MatchEvent[],afterOrder:number):MatchEvent|undefined {
  let misses=0;
  const fresh=events.filter(event=>{
    if(event.type==='shot')misses++;
    return event.order>afterOrder&&(event.type==='goal'||event.type==='save'||(event.type==='shot'&&misses%3===0));
  });
  return fresh.find(e=>e.type==='goal')??fresh.find(e=>e.type==='save')??fresh.at(-1);
}
export function projectHighlight(state:Career,event:MatchEvent):Highlight|null {
  if(event.type!=='goal'&&event.type!=='save'&&event.type!=='shot')return null;
  return {kind:event.type,player:state.players.find(p=>p.id===event.playerId)!.name,color:state.clubs.find(c=>c.id===event.clubId)!.color,tick:event.tick,score:`${event.homeGoals} - ${event.awayGoals}`};
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
export function sampleHighlight(kind:HighlightKind,progress:number) {
  const p=Math.max(0,Math.min(1,progress));
  const flight=Math.max(0,Math.min(1,(p-.28)/.32));
  const finish=kind==='goal'?{x:92,y:76}:kind==='save'?{x:200,y:84}:{x:305,y:82};
  return {phase:p<.28?'approach':p<.6?'shot':'reaction',runnerX:142,runnerY:170-Math.min(1,p/.28)*20,ballX:151+(finish.x-151)*flight,ballY:140+(finish.y-140)*flight-Math.sin(flight*Math.PI)*9,keeperX:160+40*flight,keeperY:84};
}
