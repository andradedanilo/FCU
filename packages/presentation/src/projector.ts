import type { Career, ClubId, MatchEvent, PlayerId, Role } from '../../contracts/src/index.ts';
export type Figure = { id:PlayerId; team:ClubId; role:Role; x:number; z:number; color:string };
export type MatchView = { fixtureId:string; home:ClubId; figures:Figure[]; event:MatchEvent|null; passer:PlayerId|null; tick:number };
export interface MatchPresenter {
  mount(container:HTMLElement):void;
  render(view:MatchView,events:MatchEvent[]):void;
  setSpeed(speed:number):void;
  pause():void;
  dispose():void;
}
export function projectMatch(state:Career):MatchView {
  const match=state.match!;
  const figures=[match.homeLineup,match.awayLineup].flatMap((lineup,side)=>{
    const players=lineup.map(id=>state.players.find(p=>p.id===id)!);
    const counts={GK:0,DEF:0,MID:0,FWD:0};
    return players.map(player=>{
      const count=players.filter(p=>p.role===player.role).length;const index=counts[player.role]++;
      const sign=side===0?1:-1;
      return {id:player.id,team:player.clubId,role:player.role,x:({GK:-47,DEF:-30,MID:-12,FWD:9}[player.role])*sign,z:(index-(count-1)/2)*(count===1?0:45/count),color:state.clubs.find(c=>c.id===player.clubId)!.color};
    });
  });
  const event=match.events.at(-1)??null;
  const passer=event&&event.type!=='pass'?match.events.at(-2)?.playerId??null:null;
  return {fixtureId:match.fixtureId,home:match.home,figures,event,passer,tick:match.tick};
}
export function visualOffset(key:string):number {
  let value=0;for(let i=0;i<key.length;i++)value=(Math.imul(value,31)+key.charCodeAt(i))>>>0;
  return (value%1000)/1000;
}
