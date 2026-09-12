import { describe, it, expect } from 'vitest';
import { createCareer, applyCommand, advanceMatch, startMatch, standings, validateCareer, autoPick, arrangeLineup, chanceProbability } from '../packages/simulation/src/engine.ts';
import { clubs } from '../packages/contracts/src/identity.ts';
import { defaultTactics, canonical, type Career, type Command, type PlayerId, type Tactics } from '../packages/contracts/src/index.ts';
import { draw } from '../packages/simulation/src/rng.ts';
const id='00000000-0000-4000-8000-000000000001';
const initial=()=>createCareer(id,12345,clubs[0]!.id);
function run(s:Career, action: {type:'StartMatch'}|{type:'AdvanceMatch';minutes:number}|{type:'Substitute';out:PlayerId;in:PlayerId}|{type:'SetTactics';tactics:Tactics}):Career {
  const result=applyCommand(s,{...action,careerId:s.careerId,expectedRevision:s.revision,commandId:`00000000-0000-4000-8000-${String(s.revision+1).padStart(12,'0')}`} as Command);
  if(!result.ok)throw new Error(result.error);return result.value;
}
describe('exhibition domain',()=>{
  it('pins the PRNG vector and creates a balanced complete home-away schedule',()=>{
    expect(draw(0)).toEqual([1831565813,1144304738]);
    const s=initial();expect(s.players).toHaveLength(176);expect(s.fixtures).toHaveLength(56);
    expect(new Set(s.fixtures.map(f=>`${f.home}/${f.away}`)).size).toBe(56);
    expect(s.fixtures.filter(f=>f.home===s.clubId)).toHaveLength(7);
    expect(new Set(s.fixtures.filter(f=>f.round===0).flatMap(f=>[f.home,f.away])).size).toBe(8);
  });
  it('rejects duplicate and foreign lineups and stale commands without mutation',()=>{
    const s=initial();const before=canonical(s);
    const command:Command={type:'SelectLineup',careerId:s.careerId,expectedRevision:0,commandId:id,lineup:Array(11).fill(s.lineup[0])};
    expect(applyCommand(s,command)).toEqual({ok:false,error:'INVALID_LINEUP'});
    expect(applyCommand(s,{...command,lineup:[...s.lineup.slice(0,10),s.players[30]!.id]})).toEqual({ok:false,error:'INVALID_LINEUP'});
    expect(applyCommand(s,{...command,expectedRevision:1})).toEqual({ok:false,error:'STALE_STATE'});
    const changed=applyCommand(s,{...command,lineup:s.lineup});expect(changed.ok).toBe(true);
    if(changed.ok)expect(applyCommand(changed.value,{...command,expectedRevision:1})).toEqual({ok:false,error:'DUPLICATE_COMMAND'});
    expect(canonical(s)).toBe(before);
  });
  it('resumes the exact match stream and stops at half-time without a presenter dependency',()=>{
    const s=initial();const m=startMatch(s,s.fixtures[0]!);
    const half=advanceMatch(m,s.players,90);expect(half.tick).toBe(45);
    const split=advanceMatch(JSON.parse(JSON.stringify(advanceMatch(m,s.players,17))),s.players,28);
    expect(canonical(split)).toBe(canonical(half));
    const final=advanceMatch(half,s.players,90);expect(final.tick).toBe(90);
    expect(final.homeStats.onTarget).toBeGreaterThanOrEqual(final.homeGoals);
    expect(final.events.filter(e=>e.type==='goal')).toHaveLength(final.homeGoals+final.awayGoals);
  });
  it('completes one tiny season with balanced accounting and deterministic saved continuation',()=>{
    let s=initial();
    // This is one complete 14-round season journey, not a generated test matrix.
    while(s.round<14){s=run(s,{type:'StartMatch'});s=run(s,{type:'AdvanceMatch',minutes:90});s=run(s,{type:'AdvanceMatch',minutes:90});s=validateCareer(JSON.parse(canonical(s)));}
    const table=standings(s);expect(table.every(r=>r.played===14)).toBe(true);
    expect(table.reduce((n,r)=>n+r.gf,0)).toBe(table.reduce((n,r)=>n+r.ga,0));
    expect(table.reduce((n,r)=>n+r.won,0)).toBe(table.reduce((n,r)=>n+r.lost,0));
    expect(s.fixtures.every(f=>f.score!==null)).toBe(true);
    expect(applyCommand(s,{type:'StartMatch',careerId:id,commandId:id,expectedRevision:s.revision}).ok).toBe(false);
  });
  it('refuses inconsistent saved schedules and permits Unicode player names',()=>{
    const s=initial();s.players[0]!.name='Jo\u00e3o Example';expect(validateCareer(s).players[0]!.name).toBe('Jo\u00e3o Example');
    s.fixtures[0]!.home=s.fixtures[0]!.away;expect(()=>validateCareer(s)).toThrow();
  });
});

it('substitutes only future participants and resumes the same saved stream',()=>{
 const s=run(run(initial(),{type:'StartMatch'}),{type:'AdvanceMatch',minutes:20});const before=canonical(s);const match=s.match!;const incoming=match.homeBench.find(id=>s.players.find(p=>p.id===id)!.role!=='GK')!;const outgoing=match.homeLineup.find(id=>s.players.find(p=>p.id===id)!.role!=='GK')!;
 const changed=run(s,{type:'Substitute',out:outgoing,in:incoming});expect(canonical(s)).toBe(before);expect(changed.match!.events).toEqual(match.events);expect(changed.match!.rng).toBe(match.rng);expect(changed.match!.tick).toBe(20);expect(changed.match!.homeLineup).toContain(incoming);expect(changed.lineup).toEqual(s.lineup);
 const reloaded=validateCareer(JSON.parse(canonical(changed)));const continued=run(changed,{type:'AdvanceMatch',minutes:25});expect(canonical(run(reloaded,{type:'AdvanceMatch',minutes:25}))).toBe(canonical(continued));expect(continued.match!.events.filter(e=>e.tick>20).some(e=>e.playerId===outgoing)).toBe(false);
 const bad=structuredClone(changed);bad.match!.substitutions[0]!.in=outgoing;expect(()=>validateCareer(bad)).toThrow();
});
it('rejects foreign, duplicate, re-entry and goalkeeper-invalid substitutions',()=>{
 const s=run(run(initial(),{type:'StartMatch'}),{type:'AdvanceMatch',minutes:1});const m=s.match!;const keeper=m.homeLineup.find(id=>s.players.find(p=>p.id===id)!.role==='GK')!;const out=m.homeLineup.find(id=>id!==keeper)!;const incoming=m.homeBench.find(id=>s.players.find(p=>p.id===id)!.role!=='GK')!;
 const command:Command={type:'Substitute',out,in:incoming,careerId:s.careerId,expectedRevision:s.revision,commandId:crypto.randomUUID()};
 expect(applyCommand(s,{...command,out:keeper})).toEqual({ok:false,error:'INVALID_SUBSTITUTION'});expect(applyCommand(s,{...command,in:m.awayBench[0]!})).toEqual({ok:false,error:'INVALID_SUBSTITUTION'});expect(applyCommand(s,{...command,in:out})).toEqual({ok:false,error:'INVALID_SUBSTITUTION'});
 const result=applyCommand(s,command);if(!result.ok)throw Error();expect(applyCommand(result.value,{...command,expectedRevision:result.value.revision})).toEqual({ok:false,error:'DUPLICATE_COMMAND'});
 expect(applyCommand(result.value,{...command,out:incoming,in:out,expectedRevision:result.value.revision,commandId:crypto.randomUUID()})).toEqual({ok:false,error:'INVALID_SUBSTITUTION'});
});
it('allows five changes in three windows with free half-time and rejects a fourth window',()=>{
 let s=run(run(initial(),{type:'StartMatch'}),{type:'AdvanceMatch',minutes:1});
 const swap=()=>{const m=s.match!;const outgoing=m.homeLineup.find(id=>s.players.find(p=>p.id===id)!.role!=='GK')!;const incoming=m.homeBench.find(id=>!m.homeLineup.includes(id)&&!m.substitutions.some(c=>c.out===id)&&s.players.find(p=>p.id===id)!.role!=='GK')!;return {type:'Substitute' as const,out:outgoing,in:incoming};};
 s=run(s,swap());s=run(s,swap());expect(s.match!.substitutions).toHaveLength(2);s=run(s,{type:'AdvanceMatch',minutes:1});s=run(s,swap());s=run(s,{type:'AdvanceMatch',minutes:1});s=run(s,swap());s=run(s,{type:'AdvanceMatch',minutes:1});
 const attempt=()=>applyCommand(s,{...swap(),careerId:s.careerId,expectedRevision:s.revision,commandId:crypto.randomUUID()});expect(attempt()).toEqual({ok:false,error:'INVALID_SUBSTITUTION'});
 s=run(s,{type:'AdvanceMatch',minutes:90});s=run(s,swap());expect(s.match!.substitutions).toHaveLength(5);expect(attempt()).toEqual({ok:false,error:'INVALID_SUBSTITUTION'});expect(validateCareer(s)).toEqual(s);
});

it('fills the three formation presets with unique natural-role players',()=>{
 const s=initial();const shapes=['4-4-2','4-3-3','4-2-3-1'] as const;
 const picked=shapes.map(shape=>arrangeLineup(s.players,autoPick(s.players,s.clubId,shape),shape));expect(picked.map(slots=>slots.filter(s=>s.role==='FWD').length)).toEqual([2,3,1]);expect(picked.map(slots=>slots.filter(s=>s.role==='MID').length)).toEqual([4,3,5]);expect(picked.every(slots=>slots.length===11&&new Set(slots.map(s=>s.player.id)).size===11&&slots.every(s=>s.role===s.player.role))).toBe(true);
 const rearranged=arrangeLineup(s.players,s.lineup,'4-3-3');expect(rearranged.some(slot=>slot.role!==slot.player.role)).toBe(true);expect(new Set(rearranged.map(slot=>slot.player.id))).toEqual(new Set(s.lineup));
});
it('applies tactics only to future ticks with the same saved deterministic continuation',()=>{
 const s=run(run(initial(),{type:'StartMatch'}),{type:'AdvanceMatch',minutes:20});const changed=run(s,{type:'SetTactics',tactics:{formation:'4-3-3',mentality:'attacking',tempo:'fast',pressing:'high'}});expect(changed.match!.events).toEqual(s.match!.events);expect(changed.match!.rng).toBe(s.match!.rng);expect(changed.match!.homeLineup).toEqual(s.match!.homeLineup);expect(changed.match!.tick).toBe(20);expect(changed.match!.awayTactics).toEqual(s.match!.awayTactics);
 const next=run(changed,{type:'AdvanceMatch',minutes:25});expect(run(validateCareer(JSON.parse(canonical(changed))),{type:'AdvanceMatch',minutes:25})).toEqual(next);expect(next.match!.homeStats.possession).not.toBe(run(s,{type:'AdvanceMatch',minutes:25}).match!.homeStats.possession);
 expect(startMatch(changed,changed.fixtures[0]!).homeTactics).toEqual(changed.tactics);
});

it('gives mentality and tempo their stated chance tradeoffs within caps',()=>{
 const own={A:65,M:65};const other={D:65,M:65};const base=chanceProbability(own,other,false,defaultTactics,defaultTactics);
 expect(chanceProbability(own,other,false,{...defaultTactics,mentality:'attacking'},defaultTactics)).toBeGreaterThan(base);expect(chanceProbability(own,other,false,{...defaultTactics,mentality:'cautious'},defaultTactics)).toBeLessThan(base);
 expect(chanceProbability(own,other,false,defaultTactics,{...defaultTactics,mentality:'attacking'})).toBeGreaterThan(base);expect(chanceProbability(own,other,false,defaultTactics,{...defaultTactics,mentality:'cautious'})).toBeLessThan(base);
 expect(chanceProbability(own,other,false,{...defaultTactics,tempo:'fast'},defaultTactics)).toBeGreaterThan(base);expect(chanceProbability(own,other,false,{...defaultTactics,tempo:'slow'},defaultTactics)).toBeLessThan(base);
 expect(chanceProbability({A:100,M:100},{D:1,M:1},true,defaultTactics,defaultTactics)).toBe(2400);expect(chanceProbability({A:1,M:1},{D:100,M:100},false,defaultTactics,defaultTactics)).toBe(400);
});

it('freezes a selected bench and saves three setups without applying them',()=>{
 const s=initial();const selected=[...s.bench];const spare=s.players.find(p=>p.clubId===s.clubId&&!s.lineup.includes(p.id)&&!s.bench.includes(p.id))!;selected[8]=spare.id;
 const base={careerId:s.careerId,expectedRevision:s.revision,commandId:crypto.randomUUID()};
 expect(applyCommand(s,{...base,type:'SelectBench',bench:[...selected.slice(0,8),s.lineup[0]!]})).toEqual({ok:false,error:'INVALID_BENCH'});
 expect(applyCommand(s,{...base,type:'SelectBench',bench:Array(9).fill(selected[0])})).toEqual({ok:false,error:'INVALID_BENCH'});
 const picked=applyCommand(s,{...base,type:'SelectBench',bench:selected});if(!picked.ok)throw Error();
 const preset={...defaultTactics,mentality:'attacking' as const};const saved=applyCommand(picked.value,{...base,expectedRevision:picked.value.revision,commandId:crypto.randomUUID(),type:'StoreTacticPreset',slot:2,tactics:preset});if(!saved.ok)throw Error();
 expect(saved.value.tactics).toEqual(defaultTactics);expect(saved.value.presets).toEqual([null,null,preset]);expect(validateCareer(JSON.parse(canonical(saved.value)))).toEqual(saved.value);
 const started=run(saved.value,{type:'StartMatch'});expect(started.match!.homeBench).toEqual(selected);
 expect(applyCommand(started,{...base,expectedRevision:started.revision,commandId:crypto.randomUUID(),type:'SelectBench',bench:s.bench})).toEqual({ok:false,error:'INVALID_COMMAND'});
 const malformed=structuredClone(saved.value);malformed.bench[0]=malformed.lineup[0]!;expect(()=>validateCareer(malformed)).toThrow();
});
it('changes only AI mentality at minute 60 with identical chunked and saved continuation',()=>{
 const s=initial();let m=advanceMatch(startMatch(s,s.fixtures[0]!),s.players,45);m=advanceMatch(m,s.players,15);m.homeGoals=1;m.awayGoals=0;
 const human={...m.homeTactics,mentality:'cautious' as const};m.homeTactics=human;
 const next=advanceMatch(m,s.players,1);expect(m.awayTactics.mentality).toBe('balanced');expect(next.awayTactics.mentality).toBe('attacking');expect(next.homeTactics).toEqual(human);expect(next.events.slice(0,m.events.length)).toEqual(m.events);
 const both=structuredClone(m);both.managedClubId=null;expect(advanceMatch(both,s.players,1).homeTactics.mentality).toBe('cautious');both.awayGoals=1;expect(advanceMatch(both,s.players,1).homeTactics.mentality).toBe('balanced');
 const final=advanceMatch(m,s.players,30);expect(advanceMatch(JSON.parse(canonical(next)),s.players,29)).toEqual(final);
});
