import { it, expect } from 'vitest';
import { createCareer, startMatch, advanceMatch } from '../packages/simulation/src/engine.ts';
import { clubs } from '../packages/contracts/src/identity.ts';
import { canonical } from '../packages/contracts/src/index.ts';
import { projectMatch, visualOffset } from '../packages/presentation/src/projector.ts';
import { describeEvent } from '../packages/presentation/src/text.ts';
it('projects the committed scorer and figures without changing the domain',()=>{
  const s=createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id);s.match=advanceMatch(startMatch(s,s.fixtures[0]!),s.players,45);
  const before=canonical(s);const view=projectMatch(s);expect(view.figures).toHaveLength(22);expect(new Set(view.figures.map(f=>f.id)).size).toBe(22);
  expect(view.event).toEqual(s.match.events.at(-1));if(view.event)expect(describeEvent(s,view.event)).toContain(s.players.find(p=>p.id===view.event!.playerId)!.name);
  expect(visualOffset('fixture-00-0/2')).toBe(visualOffset('fixture-00-0/2'));expect(canonical(s)).toBe(before);
});
