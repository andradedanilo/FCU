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
import {applyCommand} from '../packages/simulation/src/engine.ts';
import {youthIntake} from '../packages/simulation/src/personnel.ts';
import {desiredTerms} from '../packages/simulation/src/contracts.ts';
import {canonical} from '../packages/contracts/src/index.ts';
it('promotes an academy player with a paid senior contract once and preserves development',()=>{
 const state=createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id);youthIntake(state);
 const player=state.players.find(p=>p.clubId===state.clubId&&p.academy)!;
 const action={type:'PromoteAcademy' as const,playerId:player.id,contractRevision:0,years:2,role:'prospect' as const,...desiredTerms(state,player),careerId:state.careerId,expectedRevision:state.revision,commandId:'00000000-0000-4000-8000-000000000002'};
 const before=canonical(state),result=applyCommand(state,action);expect(result.ok).toBe(true);if(!result.ok)throw Error(result.error);
 const next=result.value;expect(canonical(state)).toBe(before);expect(next.players.find(p=>p.id===player.id)?.academy).toBe(false);expect(next.personnel.players[player.id]).toEqual(state.personnel.players[player.id]);expect(next.economy.wages[player.id]).toBe(action.wage);validateCareer(next);
 expect(applyCommand(next,{...action,expectedRevision:next.revision})).toEqual({ok:false,error:'DUPLICATE_COMMAND'});
 expect(applyCommand(next,{...action,expectedRevision:next.revision,commandId:'00000000-0000-4000-8000-000000000003'})).toEqual({ok:false,error:'INVALID_COMMAND'});
 expect(applyCommand(state,{...action,bonus:Number.MAX_SAFE_INTEGER})).toEqual({ok:false,error:'INSUFFICIENT_FUNDS'});
});
