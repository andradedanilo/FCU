import {it,expect} from 'vitest';
import {newCollection,fixtureReward,seasonReward,revealPack,choosePlayer,validateCollection,rewardOdds} from '../packages/simulation/src/dream.ts';
it('earns choices once, preserves revealed candidates and resolves the final unowned player',()=>{
 const pool=Array.from({length:24},(_,i)=>({id:`source-${i}`,ability:i<12?55:i<20?70:85}));
 const c=newCollection(2026,[pool[0]!.id]);
 fixtureReward(c,pool,'forfeit',true);expect(c.fixtures).toHaveLength(0);
 // Fifteen completed fixtures earn five sequential packs, regardless of results.
 for(let i=0;i<15;i++)fixtureReward(c,pool,`match-${i}`,false);
 fixtureReward(c,pool,'match-0',false);expect(c.earned).toBe(5);expect(c.progress).toBe(0);
 revealPack(c,pool);const saved=JSON.stringify(c),loaded=validateCollection(JSON.parse(saved),pool);
 revealPack(loaded,pool);expect(JSON.stringify(loaded)).toBe(saved);
 const first=c.pending!;expect(choosePlayer(c,first.id,'unknown')).toBe(false);
 expect(choosePlayer(c,first.id,first.candidates[0]!)).toBe(true);
 const chosen=JSON.stringify(c);expect(choosePlayer(c,first.id,first.candidates[0]!)).toBe(true);expect(JSON.stringify(c)).toBe(chosen);
 // Consume the next three choices to reach the disclosed fifth-pack guarantee.
 for(let i=0;i<3;i++){revealPack(c,pool);choosePlayer(c,c.pending!.id,c.pending!.candidates[0]!);}
 revealPack(c,pool);expect(c.pending!.id).toBe(5);expect(c.pending!.candidates.some(id=>pool.find(p=>p.id===id)!.ability>=65)).toBe(true);
 expect(validateCollection(JSON.parse(JSON.stringify(c)),pool)).toEqual(c);
 const final=newCollection(9,pool.slice(0,-1).map(p=>p.id));seasonReward(final,pool,2026);seasonReward(final,pool,2026);expect(final.earned).toBe(1);
 expect(rewardOdds(final,pool)).toEqual([{weight:0,total:5},{weight:0,total:5},{weight:5,total:5}]);
 revealPack(final,pool);expect(final.pending!.candidates).toEqual([pool.at(-1)!.id]);choosePlayer(final,1,pool.at(-1)!.id);
 seasonReward(final,pool,2027);expect(final.earned).toBe(1);expect(final.pending).toBeNull();expect(final.queued).toEqual([]);
 expect(()=>validateCollection({...final,unlocked:[...final.unlocked,final.unlocked[0]]},pool)).toThrow();
});
