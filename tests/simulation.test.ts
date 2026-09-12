import { describe, it, expect } from 'vitest';
import { createCareer, applyCommand, advanceMatch, startMatch, standings, validateCareer } from '../packages/simulation/src/engine.ts';
import { clubs } from '../packages/contracts/src/identity.ts';
import { canonical, type Career, type Command } from '../packages/contracts/src/index.ts';
import { draw } from '../packages/simulation/src/rng.ts';
const id='00000000-0000-4000-8000-000000000001';
const initial=()=>createCareer(id,12345,clubs[0]!.id);
function run(s:Career, action: {type:'StartMatch'}|{type:'AdvanceMatch';minutes:number}):Career {
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
