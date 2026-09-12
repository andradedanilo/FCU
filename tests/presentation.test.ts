import { it, expect } from 'vitest';
import { createCareer, startMatch, advanceMatch } from '../packages/simulation/src/engine.ts';
import { clubs } from '../packages/contracts/src/identity.ts';
import { canonical } from '../packages/contracts/src/index.ts';
import { projectMatch, visualOffset } from '../packages/presentation/src/projector.ts';
import { describeEvent } from '../packages/presentation/src/text.ts';
import { samplePlay } from '../packages/presentation/src/choreography.ts';
it('projects the committed scorer and figures without changing the domain',()=>{
  const s=createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id);s.match=advanceMatch(startMatch(s,s.fixtures[0]!),s.players,45);
  const before=canonical(s);const view=projectMatch(s);expect(view.figures).toHaveLength(22);expect(new Set(view.figures.map(f=>f.id)).size).toBe(22);
  expect(view.event).toEqual(s.match.events.at(-1));if(view.event)expect(describeEvent(s,view.event)).toContain(s.players.find(p=>p.id===view.event!.playerId)!.name);
  expect(visualOffset('fixture-00-0/2')).toBe(visualOffset('fixture-00-0/2'));expect(canonical(s)).toBe(before);
});
it('samples the committed pass, run and outcome without changing a career',()=>{
  const state=createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id);
  state.match=advanceMatch(startMatch(state,state.fixtures[0]!),state.players,90);
  const before=canonical(state);
  const view=projectMatch(state);
  const goal=state.match.events.find(e=>e.type==='goal')!;
  expect(goal).toBeDefined();
  const pass=state.match.events[goal.order-1]!;
  const play={...view,event:goal,passer:pass.playerId};
  const kickoff=samplePlay(play,0),receive=samplePlay(play,.35),finish=samplePlay(play,1);
  expect(kickoff.ball.x).toBe(view.figures.find(f=>f.id===pass.playerId)!.x);
  expect(receive.ball.x).toBeCloseTo(receive.positions[goal.playerId]!.x);
  expect(Math.abs(finish.ball.x)).toBeCloseTo(54.3);
  expect(samplePlay(play,1)).toEqual(finish);
  const next=samplePlay({...play,event:{...goal,order:goal.order+2}},0,finish.positions,finish.ball);
  expect(next.positions).toEqual(finish.positions);expect(next.ball).toEqual(finish.ball);
  expect(canonical(state)).toBe(before);
});
it('keeps a saved shot with the defending keeper and a miss outside the posts',()=>{
  const state=createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id);
  state.match=advanceMatch(startMatch(state,state.fixtures[0]!),state.players,90);
  const view=projectMatch(state);
  // Fixed outcome fixtures isolate presentation from whether this seed produces a save.
  const actor=state.match.events.find(e=>e.type==='goal')!;
  const save={...actor,type:'save' as const};
  const miss={...actor,type:'shot' as const};
  const held=samplePlay({...view,event:save},1);
  const keeper=view.figures.find(f=>f.role==='GK'&&f.team!==save.clubId)!;
  expect(held.ball.x).toBeCloseTo(held.positions[keeper.id]!.x);
  expect(held.ball.z).toBeCloseTo(held.positions[keeper.id]!.z);
  expect(Math.abs(samplePlay({...view,event:miss},1).ball.z)).toBeGreaterThan(4.5);
});
