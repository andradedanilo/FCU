import manifest from '../package.json' with {type:'json'};
import {createDreamStore,decodeDream} from '../apps/game/src/main/dreamSaves.ts';
import {newDream} from '../packages/simulation/src/dreamSeason.ts';
import {createDiagnostics} from '../apps/game/src/main/diagnostics.ts';
import {alternateSaveHeads} from '../packages/presentation/src/saveHistory.ts';
import { it, expect } from 'vitest';
import { mkdtemp, writeFile, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync,gunzipSync } from 'node:zlib';
import { createSaveStore, checksum, decode } from '../apps/game/src/main/saves.ts';
import {createSettingsStore} from '../apps/game/src/main/settings.ts';
import { createCareer, applyCommand } from '../packages/simulation/src/engine.ts';
import { clubs } from '../packages/contracts/src/identity.ts';
import { canonical } from '../packages/contracts/src/index.ts';
const career=()=>createCareer('00000000-0000-4000-8000-000000000001',45,clubs[0]!.id);
it('persists audio choices atomically and preserves unsupported settings',async()=>{
 const root=await mkdtemp(join(tmpdir(),'fcu-settings-')),store=createSettingsStore(root);
 expect(await store.load()).toEqual({schema:1,music:false,effects:true});
 await Promise.all([store.save({schema:1,music:true,effects:true}),store.save({schema:1,music:false,effects:false})]);
 await writeFile(join(root,'audio.tmp'),'{interrupted');
 expect(await createSettingsStore(root).load()).toEqual({schema:1,music:false,effects:false});
 await expect(store.save({schema:1,music:'yes',effects:true})).rejects.toThrow();
 expect(await store.load()).toEqual({schema:1,music:false,effects:false});
 const unsupported='{"schema":2,"music":true,"effects":true}';await writeFile(join(root,'audio.json'),unsupported);
 await expect(store.load()).rejects.toThrow();await expect(store.save({schema:1,music:false,effects:false})).rejects.toThrow();
 expect(await readFile(join(root,'audio.json'),'utf8')).toBe(unsupported);
});
it('roundtrips a Unicode mid-match checkpoint with the same continuation hash',async()=>{
  const store=createSaveStore(await mkdtemp(join(tmpdir(),'fcu-save-')));const s=career();s.players[0]!.name='Jo\u00e3o';
  const start=applyCommand(s,{type:'StartMatch',commandId:crypto.randomUUID(),careerId:s.careerId,expectedRevision:0});if(!start.ok)throw new Error();
  const progressed=applyCommand(start.value,{type:'AdvanceMatch',minutes:1,commandId:crypto.randomUUID(),careerId:s.careerId,expectedRevision:1});if(!progressed.ok)throw Error();const m=progressed.value.match!;const out=m.homeLineup.find(id=>s.players.find(p=>p.id===id)!.role!=='GK')!;const incoming=m.homeBench.find(id=>s.players.find(p=>p.id===id)!.role!=='GK')!;const changed=applyCommand(progressed.value,{type:'Substitute',out,in:incoming,commandId:crypto.randomUUID(),careerId:s.careerId,expectedRevision:2});if(!changed.ok)throw Error();
  const id=await store.save(changed.value,'manual');const loaded=await store.load(s.careerId,id);expect(checksum(loaded)).toBe(checksum(changed.value));
  const command={type:'AdvanceMatch' as const,minutes:19,commandId:crypto.randomUUID(),careerId:s.careerId,expectedRevision:3};
  expect(checksum(applyCommand(loaded,command))).toBe(checksum(applyCommand(changed.value,command)));
  const payload={...changed.value,engineVersion:'0.6.0',players:changed.value.players.map(p=>Object.fromEntries(Object.entries(p).filter(([key])=>key!=='registered'))),loans:changed.value.loans.map(l=>Object.fromEntries(Object.entries(l).filter(([key])=>key!=='source')))};
  const old={schema:17,appVersion:'0.6.0',engineVersion:'0.6.0',rulesetVersion:changed.value.rulesetVersion,careerId:s.careerId,saveCommitId:id,parentCommitId:null,stateRevision:changed.value.revision,savedAtUTC:'2026-09-12T12:00:00Z',snapshotId:s.snapshotId,kind:'manual',checksum:checksum(payload),payload};
  expect(decode(gzipSync(canonical(old))).state).toEqual(changed.value);
});
it('preserves previous commits and ignores an interrupted temporary write',async()=>{
  const root=await mkdtemp(join(tmpdir(),'fcu-save-'));const store=createSaveStore(root);const s=career();const first=await store.save(s,'manual');
  await writeFile(join(root,s.careerId,'interrupted.tmp'),'partial');const second=await store.save(s,'auto');
  expect((await store.list()).map(e=>e.commitId)).toEqual(expect.arrayContaining([first,second]));expect((await store.list())).toHaveLength(2);const shown=await store.list();shown[0]!.club='Changed display';expect((await store.list()).some(entry=>entry.club==='Changed display')).toBe(false);
  expect(checksum(await store.load(s.careerId,first))).toBe(checksum(s));
});
it('lists corruption for recovery, rejects future versions and preserves original files',async()=>{
  const root=await mkdtemp(join(tmpdir(),'fcu-save-'));const store=createSaveStore(root);const s=career();const first=await store.save(s,'manual');const second=await store.save(s,'auto');
  const file=join(root,s.careerId,`${second}.save`);const bytes=await readFile(file);
  const envelope=JSON.parse(gunzipSync(bytes).toString()) as {schema:number;checksum:string};
  envelope.checksum='0'.repeat(64);expect(()=>decode(gzipSync(canonical(envelope)))).toThrow('INVALID_SAVE');
  envelope.schema+=1;await writeFile(file,gzipSync(canonical(envelope)));
  await expect(store.load(s.careerId,second)).rejects.toThrow('FUTURE_SAVE');
  expect((await store.list()).find(e=>e.commitId===second)?.error).toBe('FUTURE_SAVE');
  expect(checksum(await store.load(s.careerId,first))).toBe(checksum(s));expect((await readdir(join(root,s.careerId)))).toHaveLength(2);
});
it('rejects path traversal and malformed state without writing a save',async()=>{
  const root=await mkdtemp(join(tmpdir(),'fcu-save-'));const store=createSaveStore(root);
  await expect(store.load('../escape','bad')).rejects.toThrow();await expect(store.save({...career(),seed:Infinity},'manual')).rejects.toThrow();expect(await store.list()).toEqual([]);
});

it('migrates a v0.1 checkpoint without rewriting it and refuses missing current fields',async()=>{
 const root=await mkdtemp(join(tmpdir(),'fcu-migrate-'));const store=createSaveStore(root);const s=career();const started=applyCommand(s,{type:'StartMatch',careerId:s.careerId,expectedRevision:0,commandId:crypto.randomUUID()});if(!started.ok)throw Error();
 const id=await store.save(started.value,'manual');const file=join(root,s.careerId,id+'.save');const raw=JSON.parse(gunzipSync(await readFile(file)).toString());
 const malformed=structuredClone(raw);delete malformed.payload.match.homeBench;malformed.checksum=checksum(malformed.payload);expect(()=>decode(gzipSync(canonical(malformed)))).toThrow();
 raw.schema=1;raw.rulesetVersion='exhibition-1';raw.payload.rulesetVersion='exhibition-1';delete raw.payload.tactics;delete raw.payload.match.homeTactics;delete raw.payload.match.awayTactics;raw.appVersion='0.1.0';raw.engineVersion='0.1.0';raw.payload.engineVersion='0.1.0';delete raw.payload.match.homeBench;delete raw.payload.match.awayBench;delete raw.payload.match.substitutions;raw.payload.players=raw.payload.players.filter((p:{clubId:string|null})=>p.clubId!==null);raw.checksum=checksum(raw.payload);
 const legacy=gzipSync(canonical(raw));await writeFile(file,legacy);const loaded=await store.load(s.careerId,id);expect(loaded.match?.homeBench).toHaveLength(9);expect(loaded.match?.substitutions).toEqual([]);expect(loaded.engineVersion).toBe('0.7.6');expect({...loaded,economy:started.value.economy}).toEqual(started.value);expect(loaded.economy.ledger.every(e=>e.kind==='opening')).toBe(true);
 await store.save(loaded,'manual');expect(await readFile(file)).toEqual(legacy);
});

it('migrates schema-2 substitution history and persists new tactical decisions',async()=>{
 const root=await mkdtemp(join(tmpdir(),'fcu-tactics-save-'));const store=createSaveStore(root);let s=career();const act=(action:{type:'StartMatch'}|{type:'AdvanceMatch';minutes:number}|{type:'Substitute';out:import('../packages/contracts/src/index.ts').PlayerId;in:import('../packages/contracts/src/index.ts').PlayerId})=>{const result=applyCommand(s,{...action,careerId:s.careerId,expectedRevision:s.revision,commandId:crypto.randomUUID()} as import('../packages/contracts/src/index.ts').Command);if(!result.ok)throw Error(result.error);s=result.value;};
 act({type:'StartMatch'});act({type:'AdvanceMatch',minutes:1});const m=s.match!;act({type:'Substitute',out:m.homeLineup.find(id=>s.players.find(p=>p.id===id)!.role!=='GK')!,in:m.homeBench.find(id=>s.players.find(p=>p.id===id)!.role!=='GK')!});const history=structuredClone(s.match!.substitutions);const id=await store.save(s,'manual');const file=join(root,s.careerId,id+'.save');const raw=JSON.parse(gunzipSync(await readFile(file)).toString());raw.schema=2;raw.appVersion='0.2.0';raw.engineVersion='0.2.0';raw.rulesetVersion='exhibition-1';raw.payload.engineVersion='0.2.0';raw.payload.rulesetVersion='exhibition-1';delete raw.payload.tactics;delete raw.payload.match.homeTactics;delete raw.payload.match.awayTactics;raw.payload.players=raw.payload.players.filter((p:{clubId:string|null})=>p.clubId!==null);raw.checksum=checksum(raw.payload);const bytes=gzipSync(canonical(raw));await writeFile(file,bytes);
 s=await store.load(s.careerId,id);expect(s.match?.substitutions).toEqual(history);const updated=applyCommand(s,{type:'SetTactics',tactics:{formation:'4-3-3',mentality:'attacking',tempo:'fast',pressing:'high'},careerId:s.careerId,expectedRevision:s.revision,commandId:crypto.randomUUID()});if(!updated.ok)throw Error();const saved=await store.save(updated.value,'manual');expect(await store.load(s.careerId,saved)).toEqual(updated.value);expect(await readFile(file)).toEqual(bytes);
 const malformed=JSON.parse(gunzipSync(await readFile(join(root,s.careerId,saved+'.save'))).toString());delete malformed.payload.tactics;malformed.checksum=checksum(malformed.payload);expect(()=>decode(gzipSync(canonical(malformed)))).toThrow();
});

it('migrates schema-3 plans and roundtrips bench and stored setups without overwriting old files',async()=>{
 const root=await mkdtemp(join(tmpdir(),'fcu-plans-'));const store=createSaveStore(root);const s=career();const id=await store.save(s,'manual');const file=join(root,s.careerId,id+'.save');const raw=JSON.parse(gunzipSync(await readFile(file)).toString());raw.schema=3;raw.appVersion='0.2.1';raw.engineVersion='0.2.1';raw.rulesetVersion='exhibition-2';raw.payload.engineVersion='0.2.1';raw.payload.rulesetVersion='exhibition-2';delete raw.payload.bench;delete raw.payload.presets;raw.payload.players=raw.payload.players.filter((p:{clubId:string|null})=>p.clubId!==null);raw.checksum=checksum(raw.payload);const old=gzipSync(canonical(raw));await writeFile(file,old);
 const migrated=await store.load(s.careerId,id);expect({...migrated,economy:s.economy}).toEqual(s);expect(migrated.economy.ledger).toHaveLength(8);expect(migrated.economy.ledger.every(e=>e.kind==='opening')).toBe(true);migrated.presets[1]={...s.tactics,formation:'4-3-3'};const spare=s.players.find(p=>p.clubId===s.clubId&&!s.lineup.includes(p.id)&&!s.bench.includes(p.id))!;migrated.bench[8]=spare.id;
 const saved=await store.save(migrated,'manual');expect(await store.load(s.careerId,saved)).toEqual(migrated);expect(await readFile(file)).toEqual(old);
 const bad=JSON.parse(gunzipSync(await readFile(join(root,s.careerId,saved+'.save'))).toString());delete bad.payload.presets;bad.checksum=checksum(bad.payload);expect(()=>decode(gzipSync(canonical(bad)))).toThrow();
});

it('identifies alternate save continuations by ancestry and preserves both after restart',async()=>{
 const root=await mkdtemp(join(tmpdir(),'fcu-branches-')),store=createSaveStore(root),state=career();
 const ancestor=await store.save(state,'manual'),first=await store.save(state,'auto');
 expect(alternateSaveHeads(await store.list()).size).toBe(0);
 const original=await readFile(join(root,state.careerId,first+'.save'));
 await store.load(state.careerId,ancestor);const alternative=await store.save(state,'manual');
 const restarted=createSaveStore(root),entries=await restarted.list();
 expect(entries.find(entry=>entry.commitId===alternative)?.parentCommitId).toBe(ancestor);
 expect(entries.every(entry=>entry.season===2026)).toBe(true);
 expect([...alternateSaveHeads(entries)].sort()).toEqual([first,alternative].sort());
 await restarted.load(state.careerId,first);const continued=await restarted.save(state,'auto');
 expect([...alternateSaveHeads(await restarted.list())].sort()).toEqual([continued,alternative].sort());
 expect(await readFile(join(root,state.careerId,first+'.save'))).toEqual(original);
 expect(checksum(await restarted.load(state.careerId,alternative))).toBe(checksum(state));
 expect(await readdir(join(root,state.careerId))).toHaveLength(4);
});

it('bounds diagnostics and excludes unstructured private data from exported reports',()=>{
 const diagnostics=createDiagnostics({build:{appVersion:'0.9.0',sourceCommit:null,sourceDirty:true,lockHash:'0'.repeat(64),rendererHash:null,sourceHash:null},runtime:{platform:'win32',architecture:'x64',electron:'44.3.0',chrome:'1.0',node:'26.8.2',packaged:false}});
 // One capacity scenario: 105 operations leave only the newest 100 records.
 Array.from({length:105},(_,milliseconds)=>diagnostics.record({operation:'load',milliseconds,error:null}));
 diagnostics.record({operation:'https://provider.test/?token=private',milliseconds:1,error:null});
 diagnostics.record({operation:'load',milliseconds:1,error:'IO_ERROR',path:'private-user-file'});
 const report=diagnostics.report();expect(report.payload.records).toHaveLength(100);expect(report.payload.records[0]?.milliseconds).toBe(5);expect(report.payload.records.at(-1)?.milliseconds).toBe(104);
 expect(report.checksum).toBe(checksum(report.payload));expect(JSON.stringify(report)).not.toContain('private');
 report.payload.records.length=0;expect(diagnostics.report().payload.records).toHaveLength(100);
});

it('records the writer app separately from the unchanged engine and preserves previous formats',async()=>{
 const root=await mkdtemp(join(tmpdir(),'fcu-writer-')),store=createSaveStore(join(root,'career')),state=career(),id=await store.save(state,'manual');
 const bytes=await readFile(join(root,'career',state.careerId,id+'.save')),decoded=decode(bytes);expect(decoded.envelope.schema).toBe(26);expect(decoded.envelope.appVersion).toBe(manifest.version);expect(decoded.envelope.engineVersion).toBe('0.7.6');expect(checksum(decoded.state)).toBe(checksum(state));
 const oldPayload={...state,engineVersion:'0.7.4'};const older={...decoded.envelope,schema:24,engineVersion:'0.7.4',payload:oldPayload,checksum:checksum(oldPayload)};expect(checksum(decode(gzipSync(canonical(older))).state)).toBe(checksum(state));
 const dream=newDream({type:'New',id:crypto.randomUUID(),seed:2026,name:'Writer FC',tier:'starter',pack:null}),dreamStore=createDreamStore(join(root,'dream')),commit=await dreamStore.save(dream);
 const raw=decodeDream(await readFile(join(root,'dream',dream.game.careerId,commit+'.dream')));expect(raw.e.schema).toBe(6);expect(raw.e.appVersion).toBe(manifest.version);expect(checksum(raw.state)).toBe(checksum(dream));
 const oldDream={...dream,game:{...dream.game,engineVersion:'0.7.4'}};const previous={...raw.e,schema:3,payload:oldDream,checksum:checksum(oldDream)};delete previous.appVersion;expect(checksum(decodeDream(gzipSync(canonical(previous))).state)).toBe(checksum(dream));
 const missing={...raw.e};delete missing.appVersion;expect(()=>decodeDream(gzipSync(canonical(missing)))).toThrow('INVALID_SAVE');
 expect((await store.list())[0]?.appVersion).toBe(manifest.version);expect((await dreamStore.list())[0]?.appVersion).toBe(manifest.version);
});
