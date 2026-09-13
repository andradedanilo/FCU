import {it,expect} from 'vitest';
import {createCareer,arrangeLineup,autoPick,pickBench,validateCareer} from '../packages/simulation/src/engine.ts';
import {clubs} from '../packages/contracts/src/identity.ts';
import {effectiveRating} from '../packages/simulation/src/ratings.ts';
it('uses a secondary position to fill a shortage without the out-of-position penalty',()=>{
 const state=createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id);
 const squad=state.players.filter(p=>p.clubId===state.clubId),defenders=squad.filter(p=>p.role==='DEF');
 for(const p of defenders.slice(3))p.registered=false;
 const cover=squad.filter(p=>p.role==='MID').at(-1)!;cover.secondaryRoles=['DEF'];cover.tackling=99;cover.passing=99;
 const lineup=autoPick(state.players,state.clubId),slots=arrangeLineup(state.players,lineup,'4-4-2');
 expect(new Set(lineup).size).toBe(11);expect(slots.find(s=>s.player.id===cover.id)?.role).toBe('DEF');
 expect(effectiveRating(cover,'DEF')).toBe(effectiveRating({...cover,role:'DEF',secondaryRoles:[]},'DEF'));
 expect(effectiveRating({...cover,secondaryRoles:[]},'DEF')).toBeLessThan(effectiveRating(cover,'DEF'));
 state.lineup=lineup;state.bench=pickBench(state.players,state.clubId,lineup);expect(validateCareer(JSON.parse(JSON.stringify(state))).players.find(p=>p.id===cover.id)?.secondaryRoles).toEqual(['DEF']);
});
it('rejects duplicate and primary roles in secondary position data',()=>{
 const state=createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id);
 state.players[0]!.secondaryRoles=[state.players[0]!.role];expect(()=>validateCareer(state)).toThrow();
 state.players[0]!.secondaryRoles=['DEF','DEF'];expect(()=>validateCareer(state)).toThrow();
});
