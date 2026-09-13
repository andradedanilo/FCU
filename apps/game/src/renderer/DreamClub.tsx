import type {MatchCue} from './useMatchBroadcast.ts';
import d from './DreamClub.module.css';
import {minuteDuration} from '../../../../packages/presentation/src/highlights.ts';
import {useEffect,useRef,useState} from 'react';
import type {Dream,DreamRequest} from '../../../../packages/contracts/src/dream.ts';
import type {Command,InstalledRoster,PlayerId,Result,SaveEntry} from '../../../../packages/contracts/src/index.ts';
import {brand} from '../../../../packages/contracts/src/index.ts';
import {text as t} from '../../../../packages/presentation/src/text.ts';
import {overall} from '../../../../packages/simulation/src/ratings.ts';
import {rewardOdds} from '../../../../packages/simulation/src/dream.ts';
import {rewardPool} from '../../../../packages/simulation/src/dreamSeason.ts';
import {nextManagedFixture,seasonComplete} from '../../../../packages/simulation/src/competition.ts';
import {autoPick} from '../../../../packages/simulation/src/selection.ts';
import {selectionPlayers} from '../../../../packages/simulation/src/discipline.ts';
import {needsDecision} from '../../../../packages/simulation/src/availability.ts';
import {MatchScreen} from './MatchScreen.tsx';
import {SquadScreen,TableScreen} from './Screens.tsx';
import {TacticsMenu} from './TacticsMenu.tsx';
import {MatchReport} from './MatchReport.tsx';
import {BenchMenu} from './BenchMenu.tsx';
import s from './App.module.css';
type Action<T>=T extends Command?Omit<T,'careerId'|'commandId'|'expectedRevision'>:never;
export function DreamClub({packs,exit,cue,ambience}:{packs:InstalledRoster[];exit:()=>void;cue:(kind:MatchCue)=>void;ambience:(value:boolean)=>void}){
 const [state,setState]=useState<Dream|null>(null),latest=useRef<Dream|null>(null),worker=useRef<Worker|null>(null),occupied=useRef(false);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[durable,setDurable]=useState(true),[screen,setScreen]=useState('home');
 const [name,setName]=useState('Dream FC'),[tier,setTier]=useState<Dream['tier']>('starter'),[pack,setPack]=useState('');
 const [saves,setSaves]=useState<SaveEntry[]|null>(null),[lineup,setLineup]=useState<PlayerId[]>([]),[tactics,setTactics]=useState(false),[bench,setBench]=useState(false),[report,setReport]=useState(false),[collection,setCollection]=useState(false);
 const [continuous,setContinuous]=useState(false),continuousRef=useRef(false);
 const [playing,setPlaying]=useState(false),running=useRef(false),hold=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const sound=useRef(ambience);sound.current=ambience;
 const cancelRequest=useRef<(()=>void)|null>(null);
 function stop(){ambience(false);running.current=false;setPlaying(false);if(timer.current)clearTimeout(timer.current);}
 useEffect(()=>()=>{running.current=false;sound.current(false);cancelRequest.current?.();worker.current?.terminate();if(timer.current)clearTimeout(timer.current);},[]);
 function send(request:DreamRequest):Promise<Result<Dream>>{
  worker.current??=new Worker(new URL('../worker/dream.ts',import.meta.url),{type:'module'});
  const target=worker.current;
  return new Promise(resolve=>{
   const finish=(result:Result<Dream>)=>{clearTimeout(timeout);target.onmessage=null;target.onerror=null;cancelRequest.current=null;resolve(result);};
   const fail=()=>{target.terminate();worker.current=null;finish({ok:false,error:'WORKER_FAILED'});};
   const timeout=setTimeout(fail,10000);cancelRequest.current=fail;
   target.onmessage=(event:MessageEvent<Result<Dream>>)=>finish(event.data);target.onerror=fail;target.postMessage(request);
  });
 }
 async function persist(value:Dream){const result=await window.fcu.dreamSave(value);setDurable(result.ok);setNotice(result.ok?t.saved:t.errors[result.error]);return result.ok;}
 async function act(request:DreamRequest){
  if(occupied.current)return false;occupied.current=true;setBusy(true);
  try{const result=await send(request);if(!result.ok){setNotice(t.errors[result.error]);stop();return false;}
   const value=result.value,prior=latest.current;
   const checkpoint=request.type!=='Match'&&request.type!=='Load'||value.game.round!==(prior?.game.round??0);
   if(checkpoint)await persist(value);
   latest.current=value;setState(value);setLineup(value.game.lineup);
   if(value.game.match&&(needsDecision(value.game.match)||value.game.match.phase==='finished'||!continuousRef.current&&value.game.match.phase==='interval'))stop();
   return true;
  }finally{occupied.current=false;setBusy(false);}
 }
 async function match(action:Action<Command>){const g=latest.current!.game;return act({type:'Match',command:{...action,careerId:g.careerId,commandId:crypto.randomUUID(),expectedRevision:g.revision} as Command});}
 async function tick(){if(!running.current)return;if(document.hidden){timer.current=setTimeout(()=>void tick(),250);return;}if(!hold.current)await match({type:'AdvanceMatch',minutes:1});if(running.current)timer.current=setTimeout(()=>void tick(),hold.current?50:minuteDuration(latest.current!.game.match!.events,latest.current!.game.match!.tick));}
 function play(){if(running.current){stop();return;}ambience(true);running.current=true;setPlaying(true);void tick();}
 async function list(){stop();const result=await window.fcu.dreamList();if(result.ok)setSaves(result.value);else setNotice(t.errors[result.error]);}
 async function load(entry:SaveEntry){stop();const result=await window.fcu.dreamLoad(entry.careerId,entry.commitId);if(result.ok&&await act({type:'Load',state:result.value})){setSaves(null);setScreen('home');setDurable(true);}else if(!result.ok)setNotice(t.errors[result.error]);}
 const g=state?.game;
 return <section className={d.root}><header><div><h1>{brand.dreamClub}</h1><p role="status">{notice}</p></div><div><button data-input-back disabled={busy} onClick={()=>{stop();if(saves){setSaves(null);}else if(collection){setCollection(false);}else if(state&&screen!=='home'){setCollection(false);setScreen('home');}else exit();}}>{t.back}</button><button disabled={busy} onClick={()=>void list()}>{t.load}</button>{state&&<button disabled={busy} onClick={()=>{stop();if(!occupied.current){occupied.current=true;setBusy(true);void persist(state).finally(()=>{occupied.current=false;setBusy(false);});}}}>{t.save}</button>}</div></header>
 {saves?<section>{saves.map(entry=><button key={entry.commitId} disabled={!entry.valid||busy} onClick={()=>void load(entry)}>{entry.club} / {entry.savedAtUTC} / {entry.round} {t.played}{!entry.valid&&t.errors[entry.error??'INVALID_SAVE']}</button>)}<button onClick={()=>setSaves(null)}>{t.close}</button></section>:!state?<section className={d.home}><p>{t.dreamIntro}</p><label>{t.clubName}<input value={name} maxLength={40} onChange={e=>setName(e.target.value)}/></label><label>{t.dreamTier}<select value={tier} onChange={e=>setTier(e.target.value as Dream['tier'])}>{(['starter','club','elite'] as const).map(v=><option key={v} value={v}>{t.dreamTiers[v]}</option>)}</select></label><label>{t.dreamSnapshot}<select value={pack} onChange={e=>setPack(e.target.value)}><option value="">{t.dreamFictional}</option>{packs.map(p=><option key={p.snapshotId} value={p.snapshotId}>{p.snapshotId}</option>)}</select></label><button className={s.primary} disabled={busy||!name.trim()} onClick={()=>void act({type:'New',id:crypto.randomUUID(),seed:2026,name:name.trim(),tier,pack:packs.find(p=>p.snapshotId===pack)??null})}>{t.dreamBegin}</button></section>:!durable?<p>{t.dreamSaveRequired}</p>:g&&<>
 {screen!=='match'&&<nav>{!seasonComplete(g)&&<button disabled={busy} onClick={()=>{stop();void act({type:'Instant'}).then(ok=>{if(ok)setScreen('home');});}}>{t.dreamInstant}</button>}<button disabled={busy} onClick={()=>{stop();setScreen('home');}}>{t.back}</button><button disabled={busy} onClick={()=>{stop();setScreen('squad');}}>{t.squad}</button><button disabled={busy} onClick={()=>{stop();setScreen('table');}}>{t.table}</button><button disabled={busy} onClick={()=>{stop();setCollection(!collection);}}>{t.dreamCollection}</button></nav>}
 {collection&&screen!=='match'&&<Collection key={g.revision} state={state} busy={busy} confirm={players=>act({type:'Squad',players})}/>}
 {screen==='home'&&<section className={d.home}><h2>{g.clubs[0]!.name}</h2><p>{g.season} / {g.round}/14 / {t.dreamTiers[state.tier]}</p><p>{t.dreamSnapshot}: {state.snapshotId}</p><p>{t.dreamProgress}: {state.collection.progress}/3 / {t.dreamQueued}: {state.collection.queued.length}</p><p>{t.dreamOdds}: {rewardOdds(state.collection,rewardPool(state)).map((o,i)=>`${t.dreamBands[i]} ${o.total?Math.round(100*o.weight/o.total):0}%`).join(' / ')}</p><p>{t.dreamGuarantee}</p>
 {state.collection.pending?<div role="group" aria-label={t.dreamChoices} className={s.actionTiles}>{state.collection.pending.candidates.map(id=>{const p=state.pool.find(p=>p.id===id)!;return <button key={id} disabled={busy} onClick={()=>void act({type:'Choose',packId:state.collection.pending!.id,playerId:id})}><strong>{p.player.name}</strong><span>{p.player.role} / {overall(p.player)}</span><small>{state.snapshotId}</small></button>;})}</div>:<button disabled={busy||!state.collection.queued.length} onClick={()=>void act({type:'Reveal'})}>{t.dreamReveal}</button>}
 {rewardOdds(state.collection,rewardPool(state)).every(o=>o.total===0)&&<strong>{t.dreamComplete}</strong>}
 {seasonComplete(g)?<><label>{t.dreamTier}<select value={tier} onChange={e=>setTier(e.target.value as Dream['tier'])}>{(['starter','club','elite'] as const).map(v=><option key={v} value={v}>{t.dreamTiers[v]}</option>)}</select></label><button disabled={busy} onClick={()=>void act({type:'Season',tier})}>{t.seasonStarted}</button></>:g.match&&g.match.phase!=='finished'?<button onClick={()=>setScreen('match')}>{t.continue}</button>:<button disabled={busy} onClick={()=>{void (async()=>{if(g.date!==nextManagedFixture(g)?.date&&!await act({type:'Next'}))return;if(await match({type:'StartMatch'}))setScreen('match');})();}}>{t.dreamKickoff}</button>}</section>}
 {screen==='table'&&<TableScreen state={g}/>}
 {screen==='squad'&&<SquadScreen dream state={g} busy={busy} lineup={lineup} change={setLineup} registration={()=>setCollection(true)} contracts={()=>{}} forfeit={()=>{}} callUp={()=>{}} training={()=>{}} focus={()=>{}} bench={()=>setBench(true)} tactics={()=>setTactics(true)} suggest={()=>setLineup(autoPick(selectionPlayers(g),g.clubId,g.tactics.formation,g.date))} confirm={()=>void match({type:'SelectLineup',lineup})}/>}
 {screen==='match'&&g.match&&<MatchScreen state={g} busy={busy} playing={playing} hold={value=>{hold.current=value;}} play={play} pause={stop} continuousHalf={continuous} changeContinuous={value=>{continuousRef.current=value;setContinuous(value);}} acknowledge={()=>void match({type:'AcknowledgeMatch'})} substitute={(out,incoming)=>match({type:'Substitute',out,in:incoming})} tactics={()=>{stop();setTactics(true);}} report={()=>setReport(true)} done={()=>setScreen('home')} goal={cue}/>}
 {tactics&&<TacticsMenu state={g} busy={busy} draftLineup={lineup} store={(slot,tactics)=>match({type:'StoreTacticPreset',slot,tactics})} confirm={tactics=>match({type:'SetTactics',tactics})} close={()=>setTactics(false)}/>}
 {bench&&<BenchMenu state={g} busy={busy} confirm={bench=>match({type:'SelectBench',bench})} close={()=>setBench(false)}/>}
 {report&&<MatchReport state={g} close={()=>setReport(false)}/>}
 </>}
 </section>;
}
function Collection({state,busy,confirm}:{state:Dream;busy:boolean;confirm:(players:string[])=>Promise<boolean>}){
 const [active,setActive]=useState(state.game.players.filter(p=>p.clubId===state.game.clubId&&p.registered).map(p=>state.instances[p.id]!));
 return <details open><summary>{t.dreamCollection} / {active.length}/30</summary><div className={s.squadList}>{state.collection.unlocked.map(id=>{const p=state.pool.find(p=>p.id===id)!;return <label key={id}><input type="checkbox" checked={active.includes(id)} disabled={busy} onChange={e=>setActive(e.target.checked?[...active,id]:active.filter(v=>v!==id))}/>{p.player.name} / {p.player.role} / {overall(p.player)}</label>;})}</div><button disabled={busy||active.length>30||active.length<11} onClick={()=>void confirm(active)}>{t.confirmLineup}</button></details>;
}
