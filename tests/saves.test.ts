import { it, expect } from 'vitest';
import { mkdtemp, writeFile, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync,gunzipSync } from 'node:zlib';
import { createSaveStore, checksum, decode } from '../apps/game/src/main/saves.ts';
import { createCareer, applyCommand } from '../packages/simulation/src/engine.ts';
import { clubs } from '../packages/contracts/src/identity.ts';
import { canonical } from '../packages/contracts/src/index.ts';
const career=()=>createCareer('00000000-0000-4000-8000-000000000001',45,clubs[0]!.id);
it('roundtrips a Unicode mid-match checkpoint with the same continuation hash',async()=>{
  const store=createSaveStore(await mkdtemp(join(tmpdir(),'fcu-save-')));const s=career();s.players[0]!.name='Jo\u00e3o';
  const start=applyCommand(s,{type:'StartMatch',commandId:crypto.randomUUID(),careerId:s.careerId,expectedRevision:0});if(!start.ok)throw new Error();
  const progressed=applyCommand(start.value,{type:'AdvanceMatch',minutes:1,commandId:crypto.randomUUID(),careerId:s.careerId,expectedRevision:1});if(!progressed.ok)throw Error();const m=progressed.value.match!;const out=m.homeLineup.find(id=>s.players.find(p=>p.id===id)!.role!=='GK')!;const incoming=m.homeBench.find(id=>s.players.find(p=>p.id===id)!.role!=='GK')!;const changed=applyCommand(progressed.value,{type:'Substitute',out,in:incoming,commandId:crypto.randomUUID(),careerId:s.careerId,expectedRevision:2});if(!changed.ok)throw Error();
  const id=await store.save(changed.value,'manual');const loaded=await store.load(s.careerId,id);expect(checksum(loaded)).toBe(checksum(changed.value));
  const command={type:'AdvanceMatch' as const,minutes:19,commandId:crypto.randomUUID(),careerId:s.careerId,expectedRevision:3};
  expect(checksum(applyCommand(loaded,command))).toBe(checksum(applyCommand(changed.value,command)));
});
it('preserves previous commits and ignores an interrupted temporary write',async()=>{
  const root=await mkdtemp(join(tmpdir(),'fcu-save-'));const store=createSaveStore(root);const s=career();const first=await store.save(s,'manual');
  await writeFile(join(root,s.careerId,'interrupted.tmp'),'partial');const second=await store.save(s,'auto');
  expect((await store.list()).map(e=>e.commitId)).toEqual(expect.arrayContaining([first,second]));expect((await store.list())).toHaveLength(2);
  expect(checksum(await store.load(s.careerId,first))).toBe(checksum(s));
});
it('lists corruption for recovery, rejects future versions and preserves original files',async()=>{
  const root=await mkdtemp(join(tmpdir(),'fcu-save-'));const store=createSaveStore(root);const s=career();const first=await store.save(s,'manual');const second=await store.save(s,'auto');
  const file=join(root,s.careerId,`${second}.save`);const bytes=await readFile(file);
  const envelope=JSON.parse(gunzipSync(bytes).toString()) as {schema:number;checksum:string};
  envelope.checksum='0'.repeat(64);expect(()=>decode(gzipSync(canonical(envelope)))).toThrow('INVALID_SAVE');
  envelope.schema=3;await writeFile(file,gzipSync(canonical(envelope)));
  await expect(store.load(s.careerId,second)).rejects.toThrow('FUTURE_SAVE');
  expect((await store.list()).find(e=>e.commitId===second)?.error).toBe('FUTURE_SAVE');
  expect(checksum(await store.load(s.careerId,first))).toBe(checksum(s));expect((await readdir(join(root,s.careerId)))).toHaveLength(2);
});
it('rejects path traversal and malformed state without writing a save',async()=>{
  const root=await mkdtemp(join(tmpdir(),'fcu-save-'));const store=createSaveStore(root);
  await expect(store.load('../escape','bad')).rejects.toThrow();await expect(store.save({...career(),seed:Infinity},'manual')).rejects.toThrow();expect(await store.list()).toEqual([]);
});

it('migrates a v0.1 checkpoint without rewriting it and refuses missing v0.2 fields',async()=>{
 const root=await mkdtemp(join(tmpdir(),'fcu-migrate-'));const store=createSaveStore(root);const s=career();const started=applyCommand(s,{type:'StartMatch',careerId:s.careerId,expectedRevision:0,commandId:crypto.randomUUID()});if(!started.ok)throw Error();
 const id=await store.save(started.value,'manual');const file=join(root,s.careerId,id+'.save');const raw=JSON.parse(gunzipSync(await readFile(file)).toString());
 const malformed=structuredClone(raw);delete malformed.payload.match.homeBench;malformed.checksum=checksum(malformed.payload);expect(()=>decode(gzipSync(canonical(malformed)))).toThrow();
 raw.schema=1;raw.appVersion='0.1.0';raw.engineVersion='0.1.0';raw.payload.engineVersion='0.1.0';delete raw.payload.match.homeBench;delete raw.payload.match.awayBench;delete raw.payload.match.substitutions;raw.checksum=checksum(raw.payload);
 const legacy=gzipSync(canonical(raw));await writeFile(file,legacy);const loaded=await store.load(s.careerId,id);expect(loaded.match?.homeBench).toHaveLength(9);expect(loaded.match?.substitutions).toEqual([]);expect(loaded.engineVersion).toBe('0.2.0');expect(loaded).toEqual(started.value);
 await store.save(loaded,'manual');expect(await readFile(file)).toEqual(legacy);
});
