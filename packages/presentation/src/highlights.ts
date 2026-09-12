import type { Career, MatchEvent } from '../../contracts/src/index.ts';
export type HighlightKind='goal'|'save'|'shot';
export type Highlight={kind:HighlightKind;player:string;color:string;opponentColor:string;tick:number;score:string};
export function selectHighlight(events:MatchEvent[],afterOrder:number):MatchEvent|undefined {
  let misses=0;
  const fresh=events.filter(event=>{
    if(event.type==='shot')misses++;
    return event.order>afterOrder&&(event.type==='goal'||event.type==='save'||(event.type==='shot'&&misses%3===0));
  });
  return fresh.find(e=>e.type==='goal')??fresh.find(e=>e.type==='save')??fresh.at(-1);
}
export function projectHighlight(state:Career,event:MatchEvent):Highlight|null {
  if(event.type==='pass')return null;
  const match=state.match!;
  return {kind:event.type,player:state.players.find(p=>p.id===event.playerId)!.name,color:state.clubs.find(c=>c.id===event.clubId)!.color,opponentColor:state.clubs.find(c=>c.id===(event.clubId===match.home?match.away:match.home))!.color,tick:event.tick,score:`${event.homeGoals} - ${event.awayGoals}`};
}
export const highlightDuration=4800;
export const playbackSpeed=2;
export function minuteDuration(events:MatchEvent[],tick:number):number {
 const before=events.filter(e=>e.tick<tick).at(-1)?.order??-1;
 return selectHighlight(events,before)?3000:600;
}
export function clockLabel(tick:number,elapsed:number,duration:number):string {
 const seconds=tick===45||tick===90?0:Math.min(59,Math.floor(Math.max(0,elapsed)/duration*60));
 return `${String(tick).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`;
}
export function sampleHighlight(kind:HighlightKind,progress:number) {
  const p=Math.max(0,Math.min(1,progress));
  const flight=Math.max(0,Math.min(1,(p-.28)/.32));
  const finish=kind==='goal'?{x:186,y:59}:kind==='save'?{x:178,y:79}:{x:235,y:38};
  return {phase:p<.28?'approach':p<.6?'shot':'reaction',runnerX:147,runnerY:163-Math.min(1,p/.28)*38,ballX:153+(finish.x-153)*flight,ballY:117+(finish.y-117)*flight-Math.sin(flight*Math.PI)*9,keeperX:160+18*flight,keeperY:79};
}
