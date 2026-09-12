import {needsDecision} from '../../../../packages/simulation/src/availability.ts';
import { useRef, useState, useEffect } from 'react';
import { brand, type Career, type ClubId, type PlayerId, type SaveEntry, type Command, type Tactics } from '../../../../packages/contracts/src/index.ts';
import { clubs } from '../../../../packages/contracts/src/identity.ts';
import { minuteDuration } from '../../../../packages/presentation/src/highlights.ts';
import { autoPick } from '../../../../packages/simulation/src/engine.ts';
import { text as t } from '../../../../packages/presentation/src/text.ts';
import { request, resetWorker } from './client.ts';
import { createGameAudio } from './audio.ts';
import { TitleScreen, ClubSelect, Clubhouse, SquadScreen, TableScreen } from './Screens.tsx';
import { useGameInput } from './input.ts';
import { MatchReport } from './MatchReport.tsx';
import { BenchMenu } from './BenchMenu.tsx';
import { TacticsMenu } from './TacticsMenu.tsx';
import { MatchScreen } from './MatchScreen.tsx';
import s from './App.module.css';

type Screen = 'title' | 'setup' | 'home' | 'squad' | 'table' | 'match';
type Action = {type:'ForfeitMatch'} | {type:'CallUp'} | {type:'AcknowledgeMatch'} | {type:'SetTraining';training:Career['training']} | {type:'StartMatch'} | {type:'SelectLineup';lineup:PlayerId[]} | {type:'AdvanceMatch';minutes:number} | {type:'Substitute';out:PlayerId;in:PlayerId} | {type:'SetTactics';tactics:Tactics} | {type:'SelectBench';bench:PlayerId[]} | {type:'StoreTacticPreset';slot:number;tactics:Tactics|null};
export function App() {
  const [state, setState] = useState<Career|null>(null);
  const latest = useRef<Career|null>(null);
  const [benchOpen,setBenchOpen]=useState(false);
  const [tacticsOpen,setTacticsOpen]=useState(false);
  const [screen, setScreen] = useState<Screen>('title');
  useGameInput(screen);
  const [reportOpen,setReportOpen]=useState(false);
  const [club, setClub] = useState<ClubId>(clubs[0]!.id);
  const [seed, setSeed] = useState('2026');
  const [lineup, setLineup] = useState<PlayerId[]>([]);
  const [busy, setBusy] = useState(false);
  const occupied = useRef(false);
  const [notice, setNotice] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saves, setSaves] = useState<SaveEntry[]|null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const running = useRef(false);
  const [continuousHalf,setContinuousHalf]=useState(false);
  const continuousRef=useRef(false);
  const audio = useRef<ReturnType<typeof createGameAudio>|null>(null);
  const [music, setMusic] = useState(false);
  const [effects, setEffects] = useState(true);
  const stop = () => { running.current=false;setPlaying(false);if(timer.current)clearTimeout(timer.current); };
  useEffect(() => {
    audio.current=createGameAudio();
    return () => {if(timer.current)clearTimeout(timer.current);resetWorker();audio.current?.dispose();};
  }, []);
  useEffect(() => { if(saves===null)return;const previous=document.activeElement;const modal=dialog.current;modal?.showModal();return()=>{modal?.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();}; }, [saves]);
  const accept = (value:Career,keepDraft=false) => { latest.current=value;setState(value);if(!keepDraft)setLineup(value.lineup); };
  async function save(value=latest.current, kind:'manual'|'auto'='manual') {
    if(!value)return;
    setNotice(t.saving);
    const result=await window.fcu.save(value,kind);
    setNotice(result.ok?t.saved:t.errors[result.error]);setDirty(!result.ok);
  }
  async function manualSave() {
    if(occupied.current)return;
    stop();occupied.current=true;setBusy(true);
    try {await save();} finally {occupied.current=false;setBusy(false);}
  }
  async function command(action:Action) {
    const current=latest.current;if(!current||occupied.current)return false;
    occupied.current=true;setBusy(true);setNotice('');
    const result=await request({type:'Command',command:{...action,careerId:current.careerId,expectedRevision:current.revision,commandId:crypto.randomUUID()} as Command});
    if(result.ok) {
      accept(result.value,action.type==='SetTactics'||action.type==='StoreTacticPreset'||action.type==='SelectBench'||action.type==='SetTraining');setDirty(true);
      if(result.value.round>current.round)await save(result.value,'auto');
      if(action.type==='StartMatch')setScreen('match');
      if(action.type==='SelectLineup')setNotice(t.confirmed);
      if(action.type==='SelectBench')setNotice(t.benchConfirmed);
      if(action.type==='Substitute')setNotice(t.subConfirmed);
      if(action.type==='SetTactics')setNotice(t.tacticsConfirmed);
      if(result.value.match&&needsDecision(result.value.match))stop();
      if((result.value.match?.phase==='interval'&&!continuousRef.current)||result.value.match?.phase==='finished')stop();
    } else {setNotice(t.errors[result.error]);stop();}
    occupied.current=false;setBusy(false);return result.ok;
  }
  const tick=async()=>{if(!running.current)return;await command({type:'AdvanceMatch',minutes:1});const match=latest.current?.match;if(running.current&&match)timer.current=setTimeout(()=>void tick(),minuteDuration(match.events,match.tick));};
  const play=()=>{if(running.current){stop();return;}running.current=true;setPlaying(true);void tick();};
  const navigate=(next:Screen)=>{stop();setNotice('');setScreen(next);};
  async function newCareer() {
    if(!/^\d+$/.test(seed)||Number(seed)>4294967295){setNotice(t.seedInvalid);return;}
    stop();setBusy(true);const result=await request({type:'NewCareer',careerId:crypto.randomUUID(),seed:Number(seed),clubId:club});
    if(result.ok){accept(result.value);setScreen('home');await save(result.value,'auto');}else setNotice(t.errors[result.error]);setBusy(false);
  }
  async function showSaves() {
    stop();setBusy(true);const result=await window.fcu.list();
    if(result.ok)setSaves(result.value);else setNotice(t.errors[result.error]);setBusy(false);
  }
  async function load(entry:SaveEntry) {
    setBusy(true);const result=await window.fcu.load(entry.careerId,entry.commitId);
    if(result.ok) {
      resetWorker();const loaded=await request({type:'LoadCareer',state:result.value});
      if(loaded.ok){accept(loaded.value);setDirty(false);setSaves(null);setScreen(loaded.value.match?'match':'home');setNotice(entry.engineVersion===loaded.value.engineVersion?t.savedStatus:t.tacticalMigration);}else setNotice(t.errors[loaded.error]);
    }else setNotice(t.errors[result.error]);setBusy(false);
  }
  const title=screen==='title';
  return <div className={s.app} onClickCapture={event=>{if(event.target instanceof Element&&event.target.closest('button'))audio.current?.click();}}>
    <div className={s.cabinet}>
      <header data-input-section className={s.hud}><button className={s.wordmark} disabled={busy} aria-label={t.titleMenu} onClick={()=>navigate('title')}>{brand.short}<span aria-hidden="true">★</span></button>
        <span className={s.hudLabel}>{t.retroMode}</span>
        <div className={s.hudActions}>
          <button aria-label={`${t.music} ${music?t.on:t.off}`} aria-pressed={music} onClick={()=>{audio.current?.music(!music);setMusic(!music);}}>{t.music}<span>{music?t.on:t.off}</span></button>
          <button aria-label={`${t.effects} ${effects?t.on:t.off}`} aria-pressed={effects} onClick={()=>{audio.current?.effects(!effects);setEffects(!effects);}}>{t.effects}<span>{effects?t.on:t.off}</span></button>
          {!title&&<button disabled={busy} onClick={()=>void showSaves()}>{t.load}</button>}
          {state&&!title&&<button disabled={busy} onClick={()=>void manualSave()}>{t.save}</button>}
          {!title&&<button data-input-back disabled={busy} onClick={()=>navigate(screen==='setup'?'title':screen==='home'?'title':'home')}>{screen==='setup'||screen==='home'?t.back:t.clubhouse}</button>}
        </div>
      </header>
      <main data-input-section className={s.gameScreen} key={screen}>
        {screen==='title'&&<TitleScreen start={()=>navigate('setup')} load={()=>void showSaves()} resume={state?()=>navigate('home'):null}/>}
        {screen==='setup'&&<ClubSelect club={club} seed={seed} changeClub={setClub} changeSeed={setSeed} begin={()=>void newCareer()} busy={busy}/>}
        {state&&screen==='home'&&<Clubhouse report={()=>setReportOpen(true)} state={state} busy={busy} squad={()=>navigate('squad')} table={()=>navigate('table')} match={()=>state.match&&state.match.phase!=='finished'?navigate('match'):void command({type:'StartMatch'})}/>}
        {state&&screen==='squad'&&<SquadScreen forfeit={()=>{void command({type:'ForfeitMatch'}).then(ok=>{if(ok)setScreen('match');});}} callUp={()=>{void command({type:'CallUp'});}} training={training=>{void command({type:'SetTraining',training});}} bench={()=>setBenchOpen(true)} tactics={()=>{stop();setTacticsOpen(true);}} state={state} lineup={lineup} change={setLineup} suggest={()=>setLineup(autoPick(state.players,state.clubId,state.tactics.formation,state.date))} confirm={()=>void command({type:'SelectLineup',lineup})} busy={busy}/>}
        {state&&screen==='table'&&<TableScreen state={state}/>}
        {state?.match&&screen==='match'&&<MatchScreen acknowledge={()=>{void command({type:'AcknowledgeMatch'});}} report={()=>setReportOpen(true)} tactics={()=>{stop();setTacticsOpen(true);}} state={state} busy={busy} playing={playing} play={play} pause={stop} substitute={(out,incoming)=>command({type:'Substitute',out,in:incoming})} continuousHalf={continuousHalf} changeContinuous={value=>{setContinuousHalf(value);continuousRef.current=value;}} done={()=>navigate('home')} goal={kind=>audio.current?.highlight(kind)}/>}
      </main>
      <footer className={s.footer}><span>{t.edition} / {t.fullscreenHint}<small title={t.controllerHint}>{t.inputHint}</small></span><div role="status">{notice}</div><span>{state?(dirty?t.unsaved:t.savedStatus):t.gameNote}</span></footer>
    </div>
    {state&&tacticsOpen&&<TacticsMenu store={(slot,tactics)=>command({type:'StoreTacticPreset',slot,tactics})} draftLineup={screen==='squad'?lineup:state.lineup} state={state} busy={busy} close={()=>setTacticsOpen(false)} confirm={tactics=>command({type:'SetTactics',tactics})}/>}
    {state&&reportOpen&&<MatchReport state={state} close={()=>setReportOpen(false)}/>}
    {state&&benchOpen&&<BenchMenu state={state} busy={busy} close={()=>setBenchOpen(false)} confirm={bench=>command({type:'SelectBench',bench})}/>}
    {saves!==null&&<dialog ref={dialog} className={s.dialog} onCancel={()=>setSaves(null)} aria-label={t.saves}><header><h2>{t.saves}</h2><button onClick={()=>setSaves(null)}>{t.close}</button></header><p>{t.recovery}</p><div className={s.saveList}>{saves.length===0?<p>{t.noSaves}</p>:saves.map(entry=><div className={s.saveRow} key={entry.commitId}>{entry.valid?<><span><strong>{entry.club}</strong><small>{entry.savedAtUTC.replace('T',' ').slice(0,19)} UTC / {t[entry.kind]} / {t.round} {entry.round} / {entry.tick}'</small></span><button disabled={busy} onClick={()=>void load(entry)}>{t.load}</button></>:<p>{entry.error==='FUTURE_SAVE'?t.future:t.corrupt}<small>{entry.commitId}</small></p>}</div>)}</div></dialog>}
  </div>;
}
