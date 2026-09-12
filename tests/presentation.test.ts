import {keyboardAction,controllerAction} from '../packages/presentation/src/input.ts';
import {matchReport} from '../packages/presentation/src/report.ts';
import {it,expect} from 'vitest';
import {createCareer,startMatch,advanceMatch,applyCommand,standings} from '../packages/simulation/src/engine.ts';
import {clubs} from '../packages/contracts/src/identity.ts';
import {canonical} from '../packages/contracts/src/index.ts';
import {projectHighlight,sampleHighlight,selectHighlight,clockLabel,minuteDuration} from '../packages/presentation/src/highlights.ts';
it('projects committed identity and score without changing the career or illustrating a pass',()=>{
 const state=createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id);state.match=advanceMatch(startMatch(state,state.fixtures[0]!),state.players,45);
 const before=canonical(state);const goal=state.match.events.find(e=>e.type==='goal')!;const pass=state.match.events.find(e=>e.type==='pass')!;
 const h=projectHighlight(state,goal)!;expect(h.player).toBe(state.players.find(p=>p.id===goal.playerId)!.name);expect(h.color).toBe(state.clubs.find(c=>c.id===goal.clubId)!.color);expect(h.score).toBe(`${goal.homeGoals} - ${goal.awayGoals}`);expect(projectHighlight(state,pass)).toBeNull();expect(canonical(state)).toBe(before);
});
it('places a goal inside the drawn goal before its celebration',()=>{
 const shot=sampleHighlight('goal',.59);expect(shot.phase).toBe('shot');expect(shot.ballX).toBeGreaterThan(43);expect(shot.ballX).toBeLessThan(277);expect(shot.ballY).toBeGreaterThan(32);expect(shot.ballY).toBeLessThan(91);expect(sampleHighlight('goal',.7).phase).toBe('reaction');expect(sampleHighlight('goal',.59)).toEqual(shot);
});
it('separates a held save from a miss outside the drawn posts',()=>{
 const saved=sampleHighlight('save',1);expect(saved.ballX).toBe(saved.keeperX);expect(saved.ballY).toBe(saved.keeperY);const missed=sampleHighlight('shot',1);expect(missed.ballX).toBeGreaterThan(281);expect(missed.ballY).toBeGreaterThan(32);expect(missed.ballY).toBeLessThan(95);
});
it('curates misses without changing or dropping recorded match outcomes',()=>{
 const state=createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id);
 const match=startMatch(state,state.fixtures[0]!);match.tick=90;
 // Fixed committed-event fixture isolates curation from tactical balance changes.
 const shooter=match.homeLineup[10]!;const event={clubId:match.home,playerId:shooter,assistId:null,homeGoals:0,awayGoals:0};
 match.events=[3,6,9,12,15,18,21,24,27,30,33,36,39,42,45,48,51,54].map((tick,order)=>({...event,tick,order,type:'shot' as const}));
 match.events.push({...event,tick:60,order:18,type:'goal',homeGoals:1},{...event,tick:70,order:19,type:'save',homeGoals:1});
 const before=canonical(match);let after=-1;const selected=[];
 // One fixture, in the same one-minute delivery order as the worker.
 for(let tick=1;tick<=90;tick++){
   const events=match.events.filter(e=>e.tick<=tick);const next=selectHighlight(events,after);if(next)selected.push(next);after=events.at(-1)?.order??-1;
 }
 expect(selected.filter(e=>e.type==='shot')).toHaveLength(6);expect(selected.filter(e=>e.type==='shot').map(e=>e.tick)).toEqual([9,18,27,36,45,54]);
 expect(selected.filter(e=>e.type==='goal'||e.type==='save')).toEqual(match.events.filter(e=>e.type==='goal'||e.type==='save'));
 expect(match.events.filter(e=>e.type==='shot')).toHaveLength(18);expect(canonical(match)).toBe(before);
 expect(selectHighlight(match.events,match.events.at(-1)!.order)).toBeUndefined();
});

it('keeps the visual clock inside its committed minute and draws attacks toward the top',()=>{
 expect(clockLabel(12,300,600)).toBe('12:30');expect(clockLabel(12,900,600)).toBe('12:59');expect(clockLabel(45,300,600)).toBe('45:00');expect(clockLabel(90,999,600)).toBe('90:00');expect(minuteDuration([],0)).toBe(600);
 expect(sampleHighlight('goal',.25).runnerY).toBeLessThan(sampleHighlight('goal',0).runnerY);expect(sampleHighlight('goal',.58).ballY).toBeLessThan(sampleHighlight('goal',.3).ballY);
});

it('uses common keyboard and controller actions with a neutral stick dead zone',()=>{
 expect(keyboardAction('ArrowDown')).toBe(controllerAction([false,false,false,false,false,false,false,false,false,false,false,false,false,true],[]));
 expect(controllerAction([true],[])).toBe(keyboardAction('Enter'));expect(controllerAction([false,true],[])).toBe(keyboardAction('Escape'));
 expect(controllerAction([], [.3,-.3])).toBeNull();expect(controllerAction([], [-.8,.2])).toBe('left');expect(controllerAction([], [0,.8])).toBe('down');expect(keyboardAction('KeyP')).toBe('pause');expect(keyboardAction('KeyE')).toBe('nextSection');expect(keyboardAction('Tab')).toBeNull();
});
it('reports the managed side result and table consequences without changing career state',()=>{
 let s=createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id);expect(matchReport(s)).toBeNull();
 const act=(action:{type:'StartMatch'}|{type:'AdvanceMatch';minutes:number})=>{const result=applyCommand(s,{...action,careerId:s.careerId,expectedRevision:s.revision,commandId:crypto.randomUUID()});if(!result.ok)throw Error();s=result.value;};
 act({type:'StartMatch'});act({type:'AdvanceMatch',minutes:90});expect(matchReport(s)).toBeNull();act({type:'AdvanceMatch',minutes:90});const before=canonical(s);const report=matchReport(s)!;
 expect(report.scorers.length).toBe(s.match!.homeGoals+s.match!.awayGoals);expect(report.points).toBe(report.earned);expect(report.own).toEqual(s.match!.homeStats);expect(report.position).toBe(standings(s).findIndex(r=>r.clubId===s.clubId)+1);expect(canonical(s)).toBe(before);
 const away={...s,clubId:s.match!.away};expect(matchReport(away)!.own).toEqual(s.match!.awayStats);expect(matchReport(away)!.earned+report.earned).toBe(report.outcome==='draw'?2:3);
});
