import {describe,it,expect} from 'vitest';
import {z} from 'zod';
import {fictionalCandidate,fictionalId} from '../packages/roster-pipeline/src/fictional.ts';
import {candidate,approve,canonicalRoster,rosterChanges} from '../packages/roster-pipeline/src/review.ts';
import {validateRoster} from '../packages/roster-pipeline/src/validate.ts';
import {collectPages} from '../packages/roster-pipeline/src/provider.ts';
import {generateKeyPairSync} from 'node:crypto';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {zipSync,unzipSync,strToU8} from 'fflate';
import {createArchive,openArchive} from '../packages/roster-pipeline/src/archive.ts';
import {writeArchive} from '../packages/roster-pipeline/src/store.ts';
import {createPackedCareer,rosterClubs} from '../packages/simulation/src/roster.ts';
import {createSaveStore} from '../apps/game/src/main/saves.ts';
import {applyCommand,validateCareer} from '../packages/simulation/src/engine.ts';
import {returnLoans,validateLoans} from '../packages/simulation/src/loans.ts';
import {available} from '../packages/simulation/src/availability.ts';
import {fictionalProvider,syncFictional} from '../packages/roster-pipeline/src/fictional-provider.ts';
import {sportmonksProvider,sportmonksTransport} from '../packages/roster-pipeline/src/sportmonks.ts';

describe('Publisher roster boundaries',()=>{
  it('maps a season-specific provider fixture without inventing roles or membership history',async()=>{
    const responses:Record<string,unknown>={
      'leagues/1?include=seasons':{data:{id:1,seasons:[{id:2,league_id:1,starting_at:'2026-08-01'}]}},
      'teams/seasons/2':{data:[{id:3,name:'Fixture club'}]},
      'squads/seasons/2/teams/3':{data:[{player_id:4,team_id:3,season_id:2}]},
      'players/4':{data:{id:4,name:'Jos\u00e9 Fixture',date_of_birth:'2000-01-01',position_id:25}}
    };
    const provider=sportmonksProvider(async path=>responses[path],{'25':'DEF'});
    expect((await provider.capabilities()).membership).toBe('season');
    expect((await provider.listSeasons('1')).items).toEqual([{ref:'2',startYear:2026}]);
    expect((await provider.listTeams('2',null)).items[0]?.ref).toBe('3');
    expect((await provider.fetchSquad('3','2',null)).items).toEqual([{playerRef:'4',teamRef:'3'}]);
    expect((await provider.fetchPlayers(['4'],null)).items[0]).toMatchObject({name:'Jos\u00e9 Fixture',role:'DEF'});
    responses['players/4']={data:{id:4,name:'Fixture',date_of_birth:'2000-01-01',position_id:999}};
    await expect(provider.fetchPlayers(['4'],null)).rejects.toThrow('UNMAPPED_PROVIDER_ROLE');
    responses['squads/seasons/2/teams/3']={data:[{player_id:4,team_id:3,season_id:99}]};
    await expect(provider.fetchSquad('3','2',null)).rejects.toThrow('PROVIDER_ID_MISMATCH');
  });
  it('honors provider backoff, stops authentication failures and keeps tokens out of URLs',async()=>{
    let count=0,time=0;const waits:number[]=[],urls:string[]=[];
    const request=sportmonksTransport({token:'fixture-secret',requestsPerMinute:60,now:()=>time,wait:async ms=>{waits.push(ms);time+=ms;},fetch:async(input,options)=>{
      urls.push(String(input));expect(options?.headers).toMatchObject({Authorization:'fixture-secret'});count++;
      return count===1?new Response('',{status:429,headers:{'Retry-After':'3'}}):Response.json({data:[]});
    }});
    expect(await request('teams/seasons/2')).toEqual({data:[]});expect(count).toBe(2);expect(waits).toContain(3000);expect(urls.join()).not.toContain('fixture-secret');
    let denied=0;const unauthorized=sportmonksTransport({token:'fixture-secret',requestsPerMinute:60,wait:async()=>{},fetch:async()=>{denied++;return new Response('',{status:403});}});
    await expect(unauthorized('teams/seasons/2')).rejects.toThrow('PROVIDER_ACCESS_DENIED');expect(denied).toBe(1);
    await expect(request('https://example.com')).rejects.toThrow('INVALID_PROVIDER_PATH');
  });
  it('builds the offline candidate through every adapter page and rejects a missing squad',async()=>{
    const result=await syncFictional();
    expect(result.audit.completedTeamIds).toHaveLength(96);
    expect(result.roster.players).toHaveLength(2112);
    expect(result.audit.reviewedTeamIds).toEqual([]);
    expect(canonicalRoster(result.roster)).toBe(canonicalRoster(fictionalCandidate().roster));
    const broken=fictionalProvider(),fetch=broken.fetchSquad;
    broken.fetchSquad=async(...args)=>{const page=await fetch(...args);return {...page,total:0,items:[],nextCursor:null};};
    await expect(syncFictional(broken)).rejects.toThrow('INCOMPLETE_SQUAD');
  });
  it('preserves Unicode and stable identity through reordered snapshots and a transfer',async()=>{
    const a=fictionalCandidate(true), b=structuredClone(a);
    b.roster.players[0]!.displayName='Jos\u00e9 M\u00fcller';a.roster.players[0]!.displayName=b.roster.players[0]!.displayName;
    b.roster.players.reverse();b.roster.teams.reverse();b.roster.memberships.reverse();b.roster.gameProfiles.reverse();b.roster.competitions.reverse();b.roster.competitions.forEach(c=>c.participatingTeamIds.reverse());
    expect(canonicalRoster(a.roster)).toBe(canonicalRoster(b.roster));
    expect(rosterChanges(JSON.parse(canonicalRoster(a.roster)),b.roster)).toEqual([]);
    const moved=b.roster.memberships.find(m=>m.playerId===a.roster.players[3]!.id)!;
    moved.playingTeamId=a.roster.teams[1]!.id;moved.owningTeamId=moved.playingTeamId;
    expect(validateRoster(b.roster,b.audit).ok).toBe(true);
    expect(rosterChanges(a.roster,b.roster)).toEqual([{kind:'transfer',playerId:moved.playerId,name:a.roster.players[3]!.displayName,from:a.roster.teams[0]!.id,to:moved.playingTeamId}]);
    expect(a.roster.memberships[3]!.playingTeamId).toBe(a.roster.teams[0]!.id);
    const pack={snapshotId:'roster-2026-27.20260912.r1',contentHash:'a'.repeat(64),observedAt:a.audit.extractionCompletedAt,development:true,roster:a.roster};
    const club=rosterClubs(pack)[0]!.id;
    const career=createPackedCareer('00000000-0000-4000-8000-000000000001',2026,club,pack);
    const saves=createSaveStore(await mkdtemp(join(tmpdir(),'fcu-import-career-')));const commit=await saves.save(career,'manual');
    const loaded=await saves.load(career.careerId,commit);expect(loaded).toEqual(career);expect(loaded.players.some(p=>p.name==='Jos\u00e9 M\u00fcller')).toBe(true);
    const changed=createPackedCareer('00000000-0000-4000-8000-000000000002',2026,club,{...pack,snapshotId:'roster-2026-27.20260912.r2',roster:b.roster});
    const originalId=Object.entries(career.rosterOrigin!.playerIds).find(([,source])=>source===moved.playerId)![0];
    const changedId=Object.entries(changed.rosterOrigin!.playerIds).find(([,source])=>source===moved.playerId)![0];
    expect(career.players.find(p=>p.id===originalId)!.clubId).not.toBe(changed.players.find(p=>p.id===changedId)!.clubId);
    expect(await saves.load(career.careerId,commit)).toEqual(career);
    const expanded=structuredClone(a.roster);
    // One oversized squad fixture exercises retention, registration and imported ownership together.
    for(let i=0;i<10;i++){
      const id=fictionalId('reserve/'+i);
      expanded.players.push({...expanded.players[4]!,id,displayName:'Reserve '+i});
      expanded.memberships.push({...expanded.memberships[4]!,playerId:id,shirtNumber:null});
      expanded.gameProfiles.push({...expanded.gameProfiles[4]!,playerId:id});
    }
    const borrowed=expanded.memberships[25]!;borrowed.isLoan=true;borrowed.playingTeamId=expanded.teams[0]!.id;
    const large=createPackedCareer('00000000-0000-4000-8000-000000000003',2026,club,{...pack,roster:expanded});
    expect(large.players.filter(p=>p.clubId===club&&!p.academy)).toHaveLength(33);
    const active=large.players.filter(p=>p.clubId===club&&p.registered&&!p.academy),inactive=large.players.find(p=>p.clubId===club&&!p.registered)!;
    expect(active).toHaveLength(30);expect(available(inactive,large.date)).toBe(false);expect(large.economy.wages[inactive.id]).toBeGreaterThan(0);
    const replacement=active.find(p=>p.role!=='GK')!;const registration={type:'SetRegistration' as const,players:[...active.filter(p=>p.id!==replacement.id).map(p=>p.id),inactive.id],careerId:large.careerId,expectedRevision:large.revision,commandId:crypto.randomUUID()};
    const registered=applyCommand(large,registration);if(!registered.ok)throw Error(registered.error);
    expect(large.players.find(p=>p.id===inactive.id)!.registered).toBe(false);
    expect(validateCareer(registered.value).players.find(p=>p.id===inactive.id)!.registered).toBe(true);
    expect(registered.value.economy).toEqual(large.economy);expect(registered.value.loans[0]!.source).toBe('roster');
    const loan=registered.value.loans[0]!;expect(registered.value.contracts[loan.playerId]!.ownerId).toBe(loan.parent);
    const stored=await saves.save(registered.value,'manual');expect(await saves.load(large.careerId,stored)).toEqual(registered.value);
    const returned=structuredClone(registered.value);returned.date=loan.ends;returnLoans(returned);validateLoans(returned);expect(returned.players.find(p=>p.id===loan.playerId)!.clubId).toBe(loan.parent);
  });
  it('blocks incomplete coverage, unresolved identities and malformed roster facts',()=>{
    const input=fictionalCandidate();
    expect(validateRoster(input.roster,input.audit)).toMatchObject({ok:false,issues:expect.arrayContaining([expect.objectContaining({code:'REVIEW_REQUIRED'})])});
    input.audit.reviewedTeamIds=[...input.audit.completedTeamIds];input.audit.completedTeamIds.pop();input.audit.unresolvedIdentities.push('ambiguous-person');input.roster.memberships.push({...input.roster.memberships[0]!});
    const result=validateRoster(input.roster,input.audit);expect(result.ok).toBe(false);
    if(result.ok)throw Error('Expected blocked roster');
    expect(result.issues.map(i=>i.code)).toEqual(expect.arrayContaining(['INCOMPLETE_FETCH','IDENTITY_CONFLICT','DUPLICATE_ID']));
    input.roster.players[0]!.dateOfBirth='2000-02-30';expect(validateRoster(input.roster,input.audit)).toMatchObject({ok:false,issues:[{code:'INVALID_SCHEMA',entity:null,message:expect.any(String)}]});
  });
  it('finishes pagination and rejects lost pages, duplicate IDs and cursor cycles',async()=>{
    const stamp='2026-09-12T12:00:00Z';const item=z.strictObject({id:z.string()});
    const page=(ids:string[],cursor:string|null,fingerprint:string,total=2)=>({items:ids.map(id=>({id})),nextCursor:cursor,total,requestFingerprint:fingerprint,fetchedAtUTC:stamp,sourceUpdatedAtUTC:null});
    const complete=await collectPages(async cursor=>cursor===null?page(['a'],'2','first'):page(['b'],null,'second'),item,x=>x.id);
    expect(complete.items.map(x=>x.id)).toEqual(['a','b']);
    await expect(collectPages(async()=>page(['a'],null,'first'),item,x=>x.id)).rejects.toThrow('INCOMPLETE_FETCH');
    await expect(collectPages(async cursor=>cursor===null?page(['a'],'2','first'):page(['a'],null,'second'),item,x=>x.id)).rejects.toThrow('DUPLICATE_PROVIDER_ID');
    await expect(collectPages(async cursor=>cursor===null?page(['a'],'2','first'):page(['b'],'2','second'),item,x=>x.id)).rejects.toThrow('REPEATED_OR_EMPTY_PAGE');
    await expect(collectPages(async()=>page(['a'],null,'first'),item,x=>x.id,AbortSignal.abort())).rejects.toThrow();
  });
  it('invalidates an exact review on roster or audit edits while content ignores fetch time',()=>{
    const input=fictionalCandidate(true);const before=candidate(input.roster,input.audit);if(!before.ok)throw Error('Invalid fixture');
    const accepted=approve(input.roster,input.audit,before.reviewHash,'Fixture reviewer','2026-09-12T13:00:00Z');expect(accepted.reviewHash).toBe(before.reviewHash);
    input.audit.extractionCompletedAt='2026-09-12T12:05:00Z';const after=candidate(input.roster,input.audit);if(!after.ok)throw Error('Invalid changed fixture');
    expect(after.contentHash).toBe(before.contentHash);expect(after.reviewHash).not.toBe(before.reviewHash);
    expect(()=>approve(input.roster,input.audit,before.reviewHash,'Fixture reviewer','2026-09-12T13:00:00Z')).toThrow('CANDIDATE_CHANGED_OR_INVALID');
    input.roster.gameProfiles[0]!.attributes.shooting++;
    expect(()=>approve(input.roster,input.audit,after.reviewHash,'Fixture reviewer','2026-09-12T13:00:00Z')).toThrow('CANDIDATE_CHANGED_OR_INVALID');
  });
  it('verifies signed immutable packs and refuses tampering, links and unsafe entries',async()=>{
    const input=fictionalCandidate(true), current=candidate(input.roster,input.audit);if(!current.ok)throw Error('Invalid fixture');
    const approval=approve(input.roster,input.audit,current.reviewHash,'Fixture reviewer','2026-09-12T13:00:00Z');
    const keys=generateKeyPairSync('ed25519');const trust={allowDevelopment:false,trustedKeys:new Map([['fixture-key',keys.publicKey]])};
    const options={snapshotId:'roster-2026-27.20260912.r1',previousSnapshotId:null,attribution:'FCU development fixture',rightsRef:null,notices:'Original synthetic fixture.',key:{id:'fixture-key',privateKey:keys.privateKey}};
    const bytes=createArchive(input.roster,input.audit,approval,options);
    expect(openArchive(bytes,trust).roster.players).toHaveLength(2112);
    expect(()=>openArchive(bytes,{...trust,trustedKeys:new Map()})).toThrow('UNTRUSTED_PACK');
    const files=unzipSync(bytes);files['notices.txt']=strToU8('changed');expect(()=>openArchive(zipSync(files),trust)).toThrow('PACK_CHECKSUM');
    const unsafe:Record<string,Uint8Array>={...unzipSync(bytes),'../roster.json':strToU8('{}')};delete unsafe['roster.json'];expect(()=>openArchive(zipSync(unsafe),trust)).toThrow('UNEXPECTED_PACK_ENTRY');
    const symlink=bytes.slice();const data=new DataView(symlink.buffer);let offset=symlink.length-22;offset=data.getUint32(offset+16,true);data.setUint32(offset+38,0xa0000000,true);expect(()=>openArchive(symlink,trust)).toThrow('UNEXPECTED_PACK_ENTRY');
    const development=createArchive(input.roster,input.audit,approval,{...options,key:null});expect(()=>openArchive(development,trust)).toThrow('UNTRUSTED_PACK');expect(openArchive(development,{...trust,allowDevelopment:true}).manifest.permittedDistribution).toBe('development');
    const directory=await mkdtemp(join(tmpdir(),'fcu-roster-pack-'));const path=await writeArchive(directory,bytes,trust);
    await expect(writeArchive(directory,bytes,trust)).rejects.toMatchObject({code:'EEXIST'});expect(await readFile(path)).toEqual(Buffer.from(bytes));
  });
});
