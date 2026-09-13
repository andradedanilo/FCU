import {keyboardAction,controllerAction} from '../packages/presentation/src/input.ts';
import {matchReport} from '../packages/presentation/src/report.ts';
import {it,expect,vi} from 'vitest';
import {createGameAudio} from '../apps/game/src/renderer/audio.ts';

it('keeps one recorded ambience loop, fixed audio speed and immediate SFX mute',()=>{
 const clips:Clip[]=[];
 class Clip{volume=1;playbackRate=1;loop=false;paused=false;constructor(public src:string){clips.push(this);}play(){return Promise.resolve();}pause(){this.paused=true;}}
 vi.stubGlobal('Audio',Clip);vi.stubGlobal('document',{hidden:false,addEventListener:vi.fn(),removeEventListener:vi.fn()});
 const audio=createGameAudio();
 try{audio.match(true);const first=clips[0]!;expect(first.loop).toBe(true);audio.match(true);expect(first.paused).toBe(true);expect(clips.filter(c=>c.loop&&!c.paused)).toHaveLength(1);
 audio.suspend(true);expect(clips.filter(c=>c.loop&&!c.paused)).toHaveLength(0);audio.suspend(false);expect(clips.filter(c=>c.loop&&!c.paused)).toHaveLength(1);
 audio.highlight('kick');expect(clips.at(-1)!.src).toContain('kick.wav');expect(clips.at(-1)!.playbackRate).toBe(1);audio.match(false);expect(clips.filter(c=>c.loop&&!c.paused)).toHaveLength(0);audio.effects(false);expect(clips.every(c=>c.paused)).toBe(true);const count=clips.length;audio.highlight('whistle');expect(clips).toHaveLength(count);
 audio.effects(true);for(const kind of ['foul','yellow','red','tackle'] as const){audio.highlight(kind);expect(clips.at(-1)!.src).toContain('tackle.wav');expect(clips.at(-1)!.volume).toBe(.32);}
 const beforeAttention=clips.length;for(const kind of ['corner','offside','disallowedOffside'] as const)audio.highlight(kind);expect(clips).toHaveLength(beforeAttention);
 audio.highlight('whistle');expect(clips.at(-1)!.src).toContain('whistle.wav');audio.highlight('fulltime');expect(clips.at(-1)!.src).toContain('fulltime.wav');expect(clips.at(-1)!.playbackRate).toBe(1);audio.effects(false);
 audio.music(true);const song=clips.at(-1)!;expect(song.src).toContain('music.wav');expect(song.loop).toBe(true);expect(song.paused).toBe(false);
 audio.effects(true);audio.click();expect(clips.at(-1)!.src).toContain('click.wav');audio.effects(false);expect(song.paused).toBe(false);
 audio.effects(true);audio.highlight('save');expect(clips.at(-1)!.src).toContain('groan.wav');audio.highlight('goal');expect(clips.at(-1)!.src).toContain('cheer.wav');
 audio.suspend(true);expect(clips.every(c=>c.paused)).toBe(true);audio.suspend(false);const resumed=clips.at(-1)!;expect(resumed.src).toContain('music.wav');audio.music(false);expect(resumed.paused).toBe(true);
 audio.music(true);audio.dispose();expect(clips.every(c=>c.paused)).toBe(true);
 }finally{audio.dispose();vi.unstubAllGlobals();}
});
import {createCareer,startMatch,advanceMatch,applyCommand,standings} from '../packages/simulation/src/engine.ts';
import {clubs} from '../packages/contracts/src/identity.ts';
import {canonical} from '../packages/contracts/src/index.ts';
import {nextHighlight,projectHighlight,highlightFrame,selectHighlight,clockLabel,minuteDuration} from '../packages/presentation/src/highlights.ts';
import {penaltyHighlights,penaltyView,boundaryArt} from '../packages/presentation/src/highlights.ts';

it('prioritizes a dismissal and reveals the referee decision after the tackle',()=>{
 const state=createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id);state.match=startMatch(state,state.fixtures[0]!);
 const base={tick:12,clubId:state.match.home,playerId:state.match.homeLineup[10]!,assistId:null,homeGoals:1,awayGoals:0};
 const events=[{...base,order:0,type:'goal' as const},{...base,order:1,type:'secondYellow' as const}];
 const event=selectHighlight(events,-1)!;expect(event.type).toBe('secondYellow');expect(projectHighlight(state,event)?.kind).toBe('red');
 expect(highlightFrame('red',.39)).toBe('tackle');expect(highlightFrame('red',.4)).toBe('red');
 const changed=structuredClone(state);changed.match!.homeTactics.mentality='attacking';
 expect(nextHighlight(state,changed)?.kind).toBe('coach');expect(nextHighlight(changed,changed)).toBeNull();
});

it('reveals shootout kicks in order without exposing the final winner or changing saved results',()=>{
 const before=createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id);before.match=startMatch(before,before.fixtures[0]!);
 expect(boundaryArt(before)).toBe('lineup');
 const after=structuredClone(before),match=after.match!;match.tick=120;match.phase='finished';
 match.penalties=[{clubId:match.home,playerId:match.homeLineup[10]!,scored:true},{clubId:match.away,playerId:match.awayLineup[10]!,scored:false}];
 const saved=canonical(after);expect(penaltyHighlights(before,after).map(h=>[h.kind,h.side,h.penaltyIndex])).toEqual([['penaltyGoal','blue',0],['penaltyMiss','red',1]]);
 expect(highlightFrame('penaltyGoal',.2)).toBe('penalty');expect(highlightFrame('penaltyGoal',.5)).toBe('goal');
 const hidden=penaltyView(after,1);expect(hidden.match!.penalties).toHaveLength(1);expect(boundaryArt(hidden)).toBeNull();
 expect(boundaryArt(penaltyView(after,2))).toBe('blue-win');expect(boundaryArt({...after,clubId:match.away})).toBe('red-win');expect(canonical(after)).toBe(saved);
});
it('projects committed identity and score without changing the career or illustrating a pass',()=>{
 const state=createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id);state.match=advanceMatch(startMatch(state,state.fixtures[0]!),state.players,45);
 const before=canonical(state);const goal=state.match.events.find(e=>e.type==='goal')!;const pass=state.match.events.find(e=>e.type==='pass')!;
 const h=projectHighlight(state,goal)!;expect(h.player).toBe(state.players.find(p=>p.id===goal.playerId)!.name);expect(h.color).toBe(state.clubs.find(c=>c.id===goal.clubId)!.color);expect(h.score).toBe(`${goal.homeGoals} - ${goal.awayGoals}`);expect(projectHighlight(state,pass)).toBeNull();expect(canonical(state)).toBe(before);
});
it('holds preparation until the result cut, then holds the goal celebration',()=>{
 expect(highlightFrame('goal',0)).toBe('prepare');expect(highlightFrame('goal',.39)).toBe('prepare');expect(highlightFrame('goal',.4)).toBe('goal');expect(highlightFrame('goal',1)).toBe('goal');
});
it('uses distinct saved-shot and missed-shot reaction stills',()=>{
 expect(highlightFrame('save',0)).toBe('prepare');expect(highlightFrame('shot',0)).toBe('prepare');expect(highlightFrame('save',.4)).toBe('save');expect(highlightFrame('shot',.4)).toBe('shot');expect(highlightFrame('save',1)).toBe('save');expect(highlightFrame('shot',1)).toBe('shot');
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

it('keeps the visual clock inside its committed minute without changing still-frame selection',()=>{
 expect(clockLabel(12,300,600)).toBe('12:30');expect(clockLabel(12,900,600)).toBe('12:59');expect(clockLabel(45,300,600)).toBe('45:00');expect(clockLabel(90,999,600)).toBe('90:00');expect(clockLabel(47,300,600,{phase:'first',addedTime:[3,null]})).toBe('45+2:30');expect(clockLabel(94,300,600,{phase:'finished',addedTime:[3,1]})).toBe('90+1:00');expect(minuteDuration([],0)).toBe(600);
 expect(highlightFrame('goal',.2)).toBe(highlightFrame('goal',.3));
});

it('uses common keyboard and controller actions with a neutral stick dead zone',()=>{
 expect(keyboardAction('ArrowDown')).toBe(controllerAction([false,false,false,false,false,false,false,false,false,false,false,false,false,true],[]));
 expect(controllerAction([true],[])).toBe(keyboardAction('Enter'));expect(controllerAction([false,true],[])).toBe(keyboardAction('Escape'));
 expect(controllerAction([], [.3,-.3])).toBeNull();expect(controllerAction([], [-.8,.2])).toBe('left');expect(controllerAction([], [0,.8])).toBe('down');expect(keyboardAction('KeyP')).toBe('pause');expect(keyboardAction('KeyE')).toBe('nextSection');expect(keyboardAction('Tab')).toBeNull();
});
it('reports the managed side result and table consequences without changing career state',()=>{
 let s=createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id);expect(matchReport(s)).toBeNull();
 const act=(action:{type:'StartMatch'}|{type:'AdvanceMatch';minutes:number}|{type:'AcknowledgeMatch'})=>{const result=applyCommand(s,{...action,careerId:s.careerId,expectedRevision:s.revision,commandId:crypto.randomUUID()});if(!result.ok)throw Error();s=result.value;};
 act({type:'StartMatch'});act({type:'AdvanceMatch',minutes:90});expect(matchReport(s)).toBeNull();while(s.match!.phase!=='finished'){if(s.match!.pendingDismissal||s.match!.pendingInjuries.length)act({type:'AcknowledgeMatch'});act({type:'AdvanceMatch',minutes:90});}const before=canonical(s);const report=matchReport(s)!;
 expect(report.scorers.length).toBe(s.match!.homeGoals+s.match!.awayGoals);expect(report.points).toBe(report.earned);expect(report.own).toEqual(s.match!.homeStats);expect(report.position).toBe(standings(s).findIndex(r=>r.clubId===s.clubId)+1);expect(canonical(s)).toBe(before);
 const away={...s,clubId:s.match!.away};expect(matchReport(away)!.own).toEqual(s.match!.awayStats);expect(matchReport(away)!.earned+report.earned).toBe(report.outcome==='draw'?2:3);
});

it('maps scene colors to the managed club and only stages newly delivered minutes',()=>{
 const before=createCareer('00000000-0000-4000-8000-000000000001',2026,clubs[0]!.id);before.match=startMatch(before,before.fixtures[0]!);
 const after=structuredClone(before);after.match!.tick=1;
 const event={type:'goal' as const,tick:1,order:0,clubId:before.match.home,playerId:before.match.homeLineup[10]!,assistId:null,homeGoals:1,awayGoals:0};
 after.match!.events=[event];after.match!.homeGoals=1;
 expect(nextHighlight(before,after)?.side).toBe('blue');expect(projectHighlight({...after,clubId:after.match!.away},event)?.side).toBe('red');
 expect(nextHighlight(after,after)).toBeNull();expect(nextHighlight(after,before)).toBeNull();
 expect(before.match.homeGoals).toBe(0);expect(before.match.events).toHaveLength(0);
});
