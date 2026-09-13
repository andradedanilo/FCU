import {lazy,Suspense} from 'react';
const PlayerRecords=lazy(()=>import('./PlayerRecords.tsx').then(module=>({default:module.PlayerRecords})));
import {SaveHistory} from './SaveHistory.tsx';
import {usePowerPause} from './usePowerPause.ts';
import type {MatchCue} from './useMatchBroadcast.ts';
import d from './DreamClub.module.css';
import {minuteDuration} from '../../../../packages/presentation/src/highlights.ts';
import {useEffect,useRef,useState,type RefObject} from 'react';
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
export function DreamClub({packs,exit,cue,ambience,overlayOpen,exitCheckpoint}:{exitCheckpoint:RefObject<(()=>Promise<boolean>)|null>;overlayOpen:boolean;packs:InstalledRoster[];exit:()=>void;cue:(kind:MatchCue)=>void;ambience:(value:boolean)=>void}){
 const [state,setState]=useState<Dream|null>(null),latest=useRef<Dream|null>(null),worker=useRef<Worker|null>(null),occupied=useRef(false);
 const [recordsOpen,setRecordsOpen]=useState(false);
 const [listing,setListing]=useState(false);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[durable,setDurable]=useState(true),[screen,setScreen]=useState('home');
 const [name,setName]=useState('Dream FC'),[tier,setTier]=useState<Dream['tier']>('starter'),[pack,setPack]=useState('');
 const [saves,setSaves]=useState<SaveEntry[]|null>(null),[lineup,setLineup]=useState<PlayerId[]>([]),[tactics,setTactics]=useState(false),[bench,setBench]=useState(false),[report,setReport]=useState(false),[collection,setCollection]=useState(false);
 const [continuous,setContinuous]=useState(false),continuousRef=useRef(false);
 const [playing,setPlaying]=useState(false),running=useRef(false),hold=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const waiters=useRef<(()=>void)[]>([]);
 function release(){occupied.current=false;setBusy(false);for(const resolve of waiters.current.splice(0))resolve();}
 const sound=useRef(ambience);sound.current=ambience;
 const cancelRequest=useRef<(()=>void)|null>(null);
 const choices=useRef<HTMLDivElement|null>(null),primary=useRef<HTMLButtonElement|null>(null),previousChoice=useRef<number|null>(null);
 const pendingId=state?.collection.pending?.id??null;
 useEffect(()=>{
  if(busy||screen!=='home'||saves||!durable)return;
  if(pendingId!==previousChoice.current){
   if(pendingId!==null)choices.current?.querySelector('button')?.focus();
   else if(previousChoice.current!==null)primary.current?.focus();
   previousChoice.current=pendingId;
  }
 },[pendingId,busy,screen,saves,durable]);
 function stop(){ambience(false);running.current=false;setPlaying(false);if(timer.current)clearTimeout(timer.current);}
 useEffect(()=>()=>{running.current=false;sound.current(false);cancelRequest.current?.();worker.current?.terminate();if(timer.current)clearTimeout(timer.current);},[]);
 const pause=useRef(stop);pause.current=stop;useEffect(()=>{if(overlayOpen)pause.current();},[overlayOpen]);
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
 async function checkpoint(){
  stop();while(occupied.current)await new Promise<void>(resolve=>waiters.current.push(resolve));
  if(!latest.current)return true;occupied.current=true;setBusy(true);
  try{return await persist(latest.current);}catch{setDurable(false);setNotice(t.errors.IO_ERROR);return false;}finally{release();}
 }
 const saveBeforeExit=useRef(checkpoint);saveBeforeExit.current=checkpoint;
 useEffect(()=>{const save=()=>saveBeforeExit.current();exitCheckpoint.current=save;return()=>{if(exitCheckpoint.current===save)exitCheckpoint.current=null;};},[exitCheckpoint]);
 usePowerPause(()=>stop(),()=>{void checkpoint();},busy);
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
  }finally{release();}
 }
 async function match(action:Action<Command>){const g=latest.current!.game;return act({type:'Match',command:{...action,careerId:g.careerId,commandId:crypto.randomUUID(),expectedRevision:g.revision} as Command});}
 async function tick(){if(!running.current)return;if(document.hidden){timer.current=setTimeout(()=>void tick(),250);return;}if(!hold.current)await match({type:'AdvanceMatch',minutes:1});if(running.current)timer.current=setTimeout(()=>void tick(),hold.current?50:minuteDuration(latest.current!.game.match!.events,latest.current!.game.match!.tick));}
 function play(){if(running.current){stop();return;}ambience(true);running.current=true;setPlaying(true);void tick();}
 async function list(){if(occupied.current)return;stop();occupied.current=true;setBusy(true);setListing(true);setSaves([]);try{const result=await window.fcu.dreamList();if(result.ok)setSaves(previous=>previous===null?null:result.value);else{setSaves(null);setNotice(t.errors[result.error]);}}catch{setSaves(null);setNotice(t.errors.IO_ERROR);}finally{setListing(false);release();}}
 async function load(entry:SaveEntry){
  if(occupied.current)return;stop();occupied.current=true;setBusy(true);let result:Result<Dream>;
  try{result=await window.fcu.dreamLoad(entry.careerId,entry.commitId);}catch{setNotice(t.errors.IO_ERROR);return;}finally{release();}
  if(result.ok&&await act({type:'Load',state:result.value})){setSaves(null);setScreen('home');setDurable(true);}else if(!result.ok)setNotice(t.errors[result.error]);
 }
 const g=state?.game;
 return <section className={d.root}><header><div><h1>{brand.dreamClub}</h1><p role="status">{notice}</p></div><div><button data-input-back disabled={busy&&!listing} onClick={()=>{stop();if(saves){setSaves(null);}else if(collection){setCollection(false);}else if(state&&screen!=='home'){setCollection(false);setScreen('home');}else exit();}}>{t.back}</button><button disabled={busy} onClick={()=>void list()}>{t.load}</button>{state&&<button disabled={busy} onClick={()=>void checkpoint()}>{t.save}</button>}</div></header>
 {saves?<SaveHistory entries={saves} busy={busy} loading={listing} load={entry=>void load(entry)}/>:!state?<section className={d.home}><p>{t.dreamIntro}</p><label>{t.clubName}<input value={name} maxLength={40} onChange={e=>setName(e.target.value)}/></label><label>{t.dreamTier}<select value={tier} onChange={e=>setTier(e.target.value as Dream['tier'])}>{(['starter','club','elite'] as const).map(v=><option key={v} value={v}>{t.dreamTiers[v]}</option>)}</select></label><label>{t.dreamSnapshot}<select value={pack} onChange={e=>setPack(e.target.value)}><option value="">{t.dreamFictional}</option>{packs.map(p=><option key={p.snapshotId} value={p.snapshotId}>{p.snapshotId}</option>)}</select></label><button className={s.primary} disabled={busy||!name.trim()} onClick={()=>void act({type:'New',id:crypto.randomUUID(),seed:2026,name:name.trim(),tier,pack:packs.find(p=>p.snapshotId===pack)??null})}>{t.dreamBegin}</button></section>:!durable?<p>{t.dreamSaveRequired}</p>:g&&<>
 {screen!=='match'&&<nav>{!seasonComplete(g)&&<button disabled={busy} onClick={()=>{stop();void act({type:'Instant'}).then(ok=>{if(ok)setScreen('home');});}}>{t.dreamInstant}</button>}<button disabled={busy} onClick={()=>{stop();setCollection(false);setScreen('home');}}>{t.back}</button><button disabled={busy} onClick={()=>{stop();setCollection(false);setScreen('squad');}}>{t.squad}</button><button disabled={busy} onClick={()=>{stop();setCollection(false);setScreen('table');}}>{t.table}</button><button disabled={busy} onClick={()=>{stop();setCollection(!collection);}}>{t.dreamCollection}</button></nav>}
 {collection&&screen!=='match'&&<Collection key={g.revision} state={state} busy={busy} confirm={async players=>{const ok=await act({type:'Squad',players});if(ok){setCollection(false);setScreen('squad');}return ok;}}/>}
 {!collection&&screen==='home'&&<section className={d.home}><h2>{g.clubs[0]!.name}</h2><p>{g.season} / {g.round}/14 / {t.dreamTiers[state.tier]}</p><p>{t.dreamSnapshot}: {state.snapshotId}</p><p>{t.dreamProgress}: {state.collection.progress}/3 / {t.dreamQueued}: {state.collection.queued.length}</p><p>{t.dreamOdds}: {rewardOdds(state.collection,rewardPool(state)).map((o,i)=>`${t.dreamBands[i]} ${o.total?Math.round(100*o.weight/o.total):0}%`).join(' / ')}</p><p>{t.dreamGuarantee}</p>
 {state.collection.pending?<div ref={choices} role="group" aria-label={t.dreamChoices} className={d.choices}>{state.collection.pending.candidates.map(id=>{
  const p=state.pool.find(p=>p.id===id)!.player,rating=overall(p);
  const best=g.players.filter(player=>player.clubId===g.clubId&&player.registered&&player.role===p.role).sort((a,b)=>overall(b)-overall(a)||a.id.localeCompare(b.id))[0];
  const difference=best?rating-overall(best):null;
  return <button key={id} disabled={busy} onClick={()=>void act({type:'Choose',packId:state.collection.pending!.id,playerId:id})}>
   <strong>{p.name}</strong><span className={d.rating}>{p.role} / {rating}</span>
   <span>{t.dreamBestRole}: {best?best.name+' / '+overall(best):t.dreamNoRole}</span>
   {difference!==null&&<span>{t.dreamRatingDifference}: {difference>0?'+':''}{difference}</span>}
   <span>{t.dreamChooseHint}</span>
  </button>;
 })}</div>:<button disabled={busy||!state.collection.queued.length} onClick={()=>void act({type:'Reveal'})}>{t.dreamReveal}</button>}
 {rewardOdds(state.collection,rewardPool(state)).every(o=>o.total===0)&&<strong>{t.dreamComplete}</strong>}
 {seasonComplete(g)?<><label>{t.dreamTier}<select value={tier} onChange={e=>setTier(e.target.value as Dream['tier'])}>{(['starter','club','elite'] as const).map(v=><option key={v} value={v}>{t.dreamTiers[v]}</option>)}</select></label><button ref={primary} disabled={busy} onClick={()=>void act({type:'Season',tier})}>{t.seasonStarted}</button></>:g.match&&g.match.phase!=='finished'?<button ref={primary} onClick={()=>setScreen('match')}>{t.continue}</button>:<button ref={primary} disabled={busy} onClick={()=>{void (async()=>{if(g.date!==nextManagedFixture(g)?.date&&!await act({type:'Next'}))return;if(await match({type:'StartMatch'}))setScreen('match');})();}}>{t.dreamKickoff}</button>}</section>}
 {!collection&&screen==='table'&&<TableScreen state={g}/>}
 {!collection&&screen==='squad'&&<SquadScreen records={()=>setRecordsOpen(true)} dream state={g} busy={busy} lineup={lineup} change={setLineup} registration={()=>setCollection(true)} contracts={()=>{}} forfeit={()=>{}} callUp={()=>{}} training={()=>{}} focus={()=>{}} bench={()=>setBench(true)} tactics={()=>setTactics(true)} suggest={()=>setLineup(autoPick(selectionPlayers(g),g.clubId,g.tactics.formation,g.date))} confirm={()=>void match({type:'SelectLineup',lineup})}/>}
 {screen==='match'&&g.match&&<MatchScreen state={g} busy={busy} playing={playing} hold={value=>{hold.current=value;}} play={play} pause={stop} continuousHalf={continuous} changeContinuous={value=>{continuousRef.current=value;setContinuous(value);}} acknowledge={()=>void match({type:'AcknowledgeMatch'})} substitute={(out,incoming)=>match({type:'Substitute',out,in:incoming})} tactics={()=>{stop();setTactics(true);}} report={()=>setReport(true)} done={()=>setScreen('home')} goal={cue}/>}
 {tactics&&<TacticsMenu state={g} busy={busy} draftLineup={lineup} store={(slot,tactics)=>match({type:'StoreTacticPreset',slot,tactics})} confirm={tactics=>match({type:'SetTactics',tactics})} close={()=>setTactics(false)}/>}
 {recordsOpen&&<Suspense fallback={<p>{t.loadingRecords}</p>}><PlayerRecords state={g} close={()=>setRecordsOpen(false)}/></Suspense>}
 {bench&&<BenchMenu state={g} busy={busy} confirm={bench=>match({type:'SelectBench',bench})} close={()=>setBench(false)}/>}
 {report&&<MatchReport state={g} close={()=>setReport(false)}/>}
 </>}
 </section>;
}
function Collection({state,busy,confirm}:{state:Dream;busy:boolean;confirm:(players:string[])=>Promise<boolean>}){
 const [active,setActive]=useState(state.game.players.filter(p=>p.clubId===state.game.clubId&&p.registered).map(p=>state.instances[p.id]!));
 const [search,setSearch]=useState(''),[role,setRole]=useState('all');
 const searchInput=useRef<HTMLInputElement|null>(null);
 useEffect(()=>{searchInput.current?.focus();},[]);
 const unlocked=new Set(state.collection.unlocked),query=search.trim().toLocaleLowerCase();
 const players=state.pool.filter(p=>unlocked.has(p.id));
 const visible=players.filter(p=>(role==='all'||p.player.role===role)&&p.player.name.toLocaleLowerCase().includes(query)).sort((a,b)=>overall(b.player)-overall(a.player)||a.id.localeCompare(b.id));
 const keepers=players.filter(p=>active.includes(p.id)&&p.player.role==='GK').length;
 return <section className={d.collection} aria-label={t.dreamCollection}>
  <header><div><h2>{t.dreamCollection}</h2><p>{active.length}/30 {t.dreamActive} / {keepers} {t.dreamKeepers}</p></div><button disabled={busy||active.length>30||active.length<11||keepers<2} onClick={()=>void confirm(active)}>{t.dreamConfirmSquad}</button></header>
  <p>{t.dreamCollectionHint}</p>
  <div className={d.filters} data-input-section><label>{t.dreamFindPlayer}<input ref={searchInput} value={search} onChange={e=>setSearch(e.target.value)}/></label><label>{t.dreamRole}<select value={role} onChange={e=>setRole(e.target.value)}><option value="all">{t.dreamAllRoles}</option>{(['GK','DEF','MID','FWD'] as const).map(value=><option key={value}>{value}</option>)}</select></label><span>{visible.length}/{players.length} {t.dreamShowing}</span></div>
  <div className={s.squadList} data-input-section>{visible.map(p=><label key={p.id}><input type="checkbox" checked={active.includes(p.id)} disabled={busy} onChange={e=>setActive(e.target.checked?[...active,p.id]:active.filter(v=>v!==p.id))}/><span className={s.role}>{p.player.role}</span><strong>{p.player.name}</strong><b title={t.ability}>{overall(p.player)}</b></label>)}</div>
 </section>;
}
