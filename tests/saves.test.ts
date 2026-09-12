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
  const id=await store.save(start.value,'manual');const loaded=await store.load(s.careerId,id);expect(checksum(loaded)).toBe(checksum(start.value));
  const command={type:'AdvanceMatch' as const,minutes:19,commandId:crypto.randomUUID(),careerId:s.careerId,expectedRevision:1};
  expect(checksum(applyCommand(loaded,command))).toBe(checksum(applyCommand(start.value,command)));
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
  envelope.schema=2;await writeFile(file,gzipSync(canonical(envelope)));
  await expect(store.load(s.careerId,second)).rejects.toThrow('FUTURE_SAVE');
  expect((await store.list()).find(e=>e.commitId===second)?.error).toBe('FUTURE_SAVE');
  expect(checksum(await store.load(s.careerId,first))).toBe(checksum(s));expect((await readdir(join(root,s.careerId)))).toHaveLength(2);
});
it('rejects path traversal and malformed state without writing a save',async()=>{
  const root=await mkdtemp(join(tmpdir(),'fcu-save-'));const store=createSaveStore(root);
  await expect(store.load('../escape','bad')).rejects.toThrow();await expect(store.save({...career(),seed:Infinity},'manual')).rejects.toThrow();expect(await store.list()).toEqual([]);
});
