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
export function sampleHighlight(kind:HighlightKind,progress:number) {
  const p=Math.max(0,Math.min(1,progress));
  const flight=Math.max(0,Math.min(1,(p-.28)/.32));
  const finish=kind==='goal'?{x:276,y:109}:kind==='save'?{x:236,y:107}:{x:316,y:49};
  return {phase:p<.28?'approach':p<.6?'shot':'reaction',runnerX:82+Math.min(1,p/.28)*57,ballX:154+(finish.x-154)*flight,ballY:135+(finish.y-135)*flight-Math.sin(flight*Math.PI)*20,keeperX:253+(236-253)*flight,keeperY:105+2*flight};
}
