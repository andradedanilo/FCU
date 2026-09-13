import {checksum} from '../apps/game/src/main/saves.ts';
import {it,expect} from 'vitest';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
import {newDream,dreamCommand,validateDream} from '../packages/simulation/src/dreamSeason.ts';
import {createDreamStore,decodeDream} from '../apps/game/src/main/dreamSaves.ts';
import {canonical,type Command} from '../packages/contracts/src/index.ts';
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
it('completes a separate Dream season and recovers a saved pending reward without Career processing',async()=>{
 let s=newDream({type:'New',id:crypto.randomUUID(),seed:2026,name:'Dream Test',tier:'starter',pack:null});
 const fixed=canonical({economy:s.game.economy,personnel:s.game.personnel,board:s.game.board});
 type Action<T>=T extends Command?Omit<T,'careerId'|'commandId'|'expectedRevision'>:never;
 const match=(action:Action<Command>)=>{s=dreamCommand(s,{type:'Match',command:{...action,careerId:s.game.careerId,commandId:crypto.randomUUID(),expectedRevision:s.game.revision}});};
 // One complete 14-round season exercises the shared match and isolated progression boundary.
 while(s.game.round<14){s=dreamCommand(s,{type:'Next'});match({type:'StartMatch'});s=dreamCommand(s,{type:'Instant'});}
 expect(s.collection.earned).toBe(5);expect(s.collection.progress).toBe(2);expect(s.game.fixtures.every(f=>f.score!==null)).toBe(true);
 expect(canonical({economy:s.game.economy,personnel:s.game.personnel,board:s.game.board})).toBe(fixed);
 s=dreamCommand(s,{type:'Reveal'});const root=await mkdtemp(join(tmpdir(),'fcu-dream-')),store=createDreamStore(root),commit=await store.save(s);
 expect(await createDreamStore(root).load(s.game.careerId,commit)).toEqual(s);expect(validateDream(JSON.parse(canonical(s)))).toEqual(s);
 const path=join(root,s.game.careerId,commit+'.dream'),bytes=await readFile(path);
 await writeFile(join(root,s.game.careerId,'interrupted.tmp'),'partial');expect(await store.list()).toHaveLength(1);
 const previous=JSON.parse(gunzipSync(bytes).toString('utf8'));previous.schema=2;previous.payload.game.engineVersion='0.7.3';previous.checksum=checksum(previous.payload);expect(decodeDream(gzipSync(JSON.stringify(previous))).state).toEqual(s);
 const legacy=JSON.parse(gunzipSync(bytes).toString('utf8'));legacy.schema=1;legacy.payload.game.engineVersion='0.7.2';delete legacy.payload.game.marketArchive;legacy.checksum=checksum(legacy.payload);expect(decodeDream(gzipSync(JSON.stringify(legacy))).state).toEqual(s);
 const broken=JSON.parse(gunzipSync(bytes).toString('utf8'));broken.payload.collection.pending.candidates.reverse();broken.checksum='0'.repeat(64);expect(()=>decodeDream(gzipSync(JSON.stringify(broken)))).toThrow('INVALID_SAVE');
 broken.schema=4;expect(()=>decodeDream(gzipSync(JSON.stringify(broken)))).toThrow('FUTURE_SAVE');
 const pack=s.collection.pending!;s=dreamCommand(s,{type:'Choose',packId:pack.id,playerId:pack.candidates[0]!});expect(s.collection.unlocked).toHaveLength(23);
 s=dreamCommand(s,{type:'Season',tier:'elite'});expect(s.game.season).toBe(2027);expect(s.game.round).toBe(0);expect(validateDream(s)).toEqual(s);
 expect(s.collection.progress).toBe(2);expect(s.game.economy.ledger).toEqual([]);
});
