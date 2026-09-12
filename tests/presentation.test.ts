import {it,expect} from 'vitest';
import {createCareer,startMatch,advanceMatch} from '../packages/simulation/src/engine.ts';
import {clubs} from '../packages/contracts/src/identity.ts';
import {canonical} from '../packages/contracts/src/index.ts';
import {projectHighlight,sampleHighlight,selectHighlight,clockLabel,minuteDuration} from '../packages/presentation/src/highlights.ts';
it('projects committed identity and score without changing the career or illustrating a pass',()=>{
 const state=createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id);state.match=advanceMatch(startMatch(state,state.fixtures[0]!),state.players,45);
 const before=canonical(state);const goal=state.match.events.find(e=>e.type==='goal')!;const pass=state.match.events.find(e=>e.type==='pass')!;
 const h=projectHighlight(state,goal)!;expect(h.player).toBe(state.players.find(p=>p.id===goal.playerId)!.name);expect(h.color).toBe(state.clubs.find(c=>c.id===goal.clubId)!.color);expect(h.score).toBe(`${goal.homeGoals} - ${goal.awayGoals}`);expect(projectHighlight(state,pass)).toBeNull();expect(canonical(state)).toBe(before);
});
it('places a goal inside the drawn goal before its celebration',()=>{
 const shot=sampleHighlight('goal',.59);expect(shot.phase).toBe('shot');expect(shot.ballX).toBeGreaterThan(102);expect(shot.ballX).toBeLessThan(218);expect(shot.ballY).toBeGreaterThan(43);expect(shot.ballY).toBeLessThan(82);expect(sampleHighlight('goal',.7).phase).toBe('reaction');expect(sampleHighlight('goal',.59)).toEqual(shot);
});
it('separates a held save from a miss outside the drawn posts',()=>{
 const saved=sampleHighlight('save',1);expect(saved.ballX).toBe(saved.keeperX);expect(saved.ballY).toBe(saved.keeperY);const missed=sampleHighlight('shot',1);expect(missed.ballX).toBeGreaterThan(218);expect(missed.ballY).toBeLessThan(43);
});
it('curates misses without changing or dropping recorded match outcomes',()=>{
 const state=createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id);
 let match=advanceMatch(startMatch(state,state.fixtures[0]!),state.players,90);match=advanceMatch(match,state.players,90);
 const before=canonical(match);let after=-1;const selected=[];
 // One fixture, in the same one-minute delivery order as the worker.
 for(let tick=1;tick<=90;tick++){
   const events=match.events.filter(e=>e.tick<=tick);const next=selectHighlight(events,after);if(next)selected.push(next);after=events.at(-1)?.order??-1;
 }
 expect(selected.filter(e=>e.type==='shot')).toHaveLength(6);
 expect(selected.filter(e=>e.type==='goal'||e.type==='save')).toEqual(match.events.filter(e=>e.type==='goal'||e.type==='save'));
 expect(match.events.filter(e=>e.type==='shot')).toHaveLength(18);expect(canonical(match)).toBe(before);
 expect(selectHighlight(match.events,match.events.at(-1)!.order)).toBeUndefined();
});

it('keeps the visual clock inside its committed minute and draws attacks toward the top',()=>{
 expect(clockLabel(12,300,600)).toBe('12:30');expect(clockLabel(12,900,600)).toBe('12:59');expect(clockLabel(45,300,600)).toBe('45:00');expect(clockLabel(90,999,600)).toBe('90:00');expect(minuteDuration([],0)).toBe(600);
 expect(sampleHighlight('goal',.25).runnerY).toBeLessThan(sampleHighlight('goal',0).runnerY);expect(sampleHighlight('goal',.58).ballY).toBeLessThan(sampleHighlight('goal',.3).ballY);
});
