import {it,expect} from 'vitest';
import {createCareer,startMatch,advanceMatch} from '../packages/simulation/src/engine.ts';
import {clubs} from '../packages/contracts/src/identity.ts';
import {canonical} from '../packages/contracts/src/index.ts';
import {projectHighlight,sampleHighlight} from '../packages/presentation/src/highlights.ts';
it('projects committed identity and score without changing the career or illustrating a pass',()=>{
 const state=createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id);state.match=advanceMatch(startMatch(state,state.fixtures[0]!),state.players,45);
 const before=canonical(state);const goal=state.match.events.find(e=>e.type==='goal')!;const pass=state.match.events.find(e=>e.type==='pass')!;
 const h=projectHighlight(state,goal)!;expect(h.player).toBe(state.players.find(p=>p.id===goal.playerId)!.name);expect(h.color).toBe(state.clubs.find(c=>c.id===goal.clubId)!.color);expect(h.score).toBe(`${goal.homeGoals} - ${goal.awayGoals}`);expect(projectHighlight(state,pass)).toBeNull();expect(canonical(state)).toBe(before);
});
it('places a goal inside the drawn goal before its celebration',()=>{
 const shot=sampleHighlight('goal',.59);expect(shot.phase).toBe('shot');expect(shot.ballX).toBeGreaterThan(238);expect(shot.ballX).toBeLessThan(300);expect(shot.ballY).toBeGreaterThan(59);expect(shot.ballY).toBeLessThan(123);expect(sampleHighlight('goal',.7).phase).toBe('reaction');expect(sampleHighlight('goal',.59)).toEqual(shot);
});
it('separates a held save from a miss outside the drawn posts',()=>{
 const saved=sampleHighlight('save',1);expect(saved.ballX).toBe(saved.keeperX);expect(saved.ballY).toBe(saved.keeperY);const missed=sampleHighlight('shot',1);expect(missed.ballX).toBeGreaterThan(300);expect(missed.ballY).toBeLessThan(59);
});
