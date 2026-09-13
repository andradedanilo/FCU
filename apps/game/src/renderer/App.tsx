import {Help} from './Help.tsx';
import {Diagnostics} from './Diagnostics.tsx';
import {SaveHistory} from './SaveHistory.tsx';
import {usePowerPause} from './usePowerPause.ts';
import {InputEditor} from './InputEditor.tsx';
import {DreamClub} from './DreamClub.tsx';
import {BoardMenu} from './BoardMenu.tsx';
import {RegistrationMenu} from './RegistrationMenu.tsx';
import {rosterClubs} from '../../../../packages/simulation/src/roster.ts';
import type {InstalledRoster} from '../../../../packages/contracts/src/index.ts';
import {selectionPlayers} from '../../../../packages/simulation/src/discipline.ts';
import {SeasonHistory} from './SeasonHistory.tsx';
import {ScoutingMenu} from './ScoutingMenu.tsx';
import {ContractsMenu} from './ContractsMenu.tsx';
import {FinanceMenu} from './FinanceMenu.tsx';
import {needsDecision} from '../../../../packages/simulation/src/availability.ts';
import { useRef, useState, useEffect } from 'react';
import { brand, type Career, type ClubId, type PlayerId, type SaveEntry, type Command } from '../../../../packages/contracts/src/index.ts';
import { clubs } from '../../../../packages/contracts/src/identity.ts';
import { minuteDuration } from '../../../../packages/presentation/src/highlights.ts';
import { autoPick } from '../../../../packages/simulation/src/engine.ts';
import { text as t } from '../../../../packages/presentation/src/text.ts';
import { request, resetWorker } from './client.ts';
import { createGameAudio } from './audio.ts';
import {AudioCredits} from './AudioCredits.tsx';
import { TitleScreen, ClubSelect, Clubhouse, SquadScreen, TableScreen } from './Screens.tsx';
import { useGameInput } from './input.ts';
import { MatchReport } from './MatchReport.tsx';
import { BenchMenu } from './BenchMenu.tsx';
import { TacticsMenu } from './TacticsMenu.tsx';
import { MatchScreen } from './MatchScreen.tsx';
import s from './App.module.css';

type Screen = 'dream' | 'title' | 'setup' | 'home' | 'squad' | 'table' | 'match';
type CommandPayload<T>=T extends Command?Omit<T,'careerId'|'commandId'|'expectedRevision'>:never;
type Action=CommandPayload<Command>;
export function App() {
  const dreamCheckpoint=useRef<(()=>Promise<boolean>)|null>(null),navigating=useRef(false);
  const [diagnosticsOpen,setDiagnosticsOpen]=useState(false);
  const [helpOpen,setHelpOpen]=useState(false);
  const [boardOpen,setBoardOpen]=useState(false);
  const [registrationOpen,setRegistrationOpen]=useState(false);
  const [packs,setPacks]=useState<InstalledRoster[]>([]),[packId,setPackId]=useState('');
  const selectedPack=packs.find(p=>p.snapshotId===packId);
  useEffect(()=>{void window.fcu.rosterList().then(result=>{if(result.ok)setPacks(result.value);});},[]);
  async function importPack(){setBusy(true);try{const result=await window.fcu.rosterImport();if(result.ok&&result.value){const pack=result.value;setPacks(previous=>[...previous.filter(p=>p.snapshotId!==pack.snapshotId),pack]);setPackId(pack.snapshotId);setWorldKind('countries');setClub(rosterClubs(pack)[0]!.id);}else if(!result.ok)setNotice(t.errors[result.error]);}finally{setBusy(false);}}
  const [soundLibrary,setSoundLibrary]=useState(false);
  const [state, setState] = useState<Career|null>(null);
  const latest = useRef<Career|null>(null);
  const [benchOpen,setBenchOpen]=useState(false);
  const [tacticsOpen,setTacticsOpen]=useState(false);
  const [screen, setScreen] = useState<Screen>('title');
  useGameInput(screen);
  const [historyOpen,setHistoryOpen]=useState(false);
  const [newsPlayer,setNewsPlayer]=useState<PlayerId|null>(null);
  const [scoutingOpen,setScoutingOpen]=useState(false);
  const [contractsOpen,setContractsOpen]=useState(false);
  const [financeOpen,setFinanceOpen]=useState(false);
  const [reportOpen,setReportOpen]=useState(false);
  const [club, setClub] = useState<ClubId>(clubs[0]!.id);
  const [worldKind,setWorldKind]=useState<Career['world']['kind']>('countries');
  const [seed, setSeed] = useState('2026');
  const [lineup, setLineup] = useState<PlayerId[]>([]);
  const [busy, setBusy] = useState(false);
  const occupied = useRef(false),waiters=useRef<(()=>void)[]>([]);
  function release(){occupied.current=false;setBusy(false);for(const resolve of waiters.current.splice(0))resolve();}
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
  const [audioReady,setAudioReady]=useState(false),[audioSaving,setAudioSaving]=useState(false);
  const audioWriting=useRef(false);
  async function persistAudio(nextMusic:boolean,nextEffects:boolean){
    if(audioWriting.current||!audioReady)return;audioWriting.current=true;setAudioSaving(true);
    try{const result=await window.fcu.saveAudioSettings({schema:1,music:nextMusic,effects:nextEffects});
      if(result.ok){setMusic(result.value.music);setEffects(result.value.effects);audio.current?.effects(result.value.effects);audio.current?.music(result.value.music);}
      else setNotice(t.audioSettingsFailed);
    }finally{audioWriting.current=false;setAudioSaving(false);}
  }
  const stop = () => { running.current=false;setPlaying(false);if(timer.current)clearTimeout(timer.current); };
  useEffect(() => {
    audio.current=createGameAudio();
    let active=true;
    void window.fcu.audioSettings().then(result=>{if(!active)return;if(result.ok){setMusic(result.value.music);setEffects(result.value.effects);audio.current?.effects(result.value.effects);audio.current?.music(result.value.music);}else setNotice(t.audioSettingsFailed);setAudioReady(true);});
    return () => {active=false;if(timer.current)clearTimeout(timer.current);resetWorker();audio.current?.dispose();};
  }, []);
  useEffect(() => { if(saves===null)return;const previous=document.activeElement;const modal=dialog.current;modal?.showModal();return()=>{modal?.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();}; }, [saves]);
  usePowerPause(value=>{stop();audio.current?.suspend(value==='suspend');},()=>{if(screen!=='dream')void manualSave('auto').catch(()=>setNotice(t.errors.IO_ERROR));},busy);
  const closeHandler=useRef<()=>Promise<boolean>>(async()=>true);
  closeHandler.current=async()=>{
    stop();if(screen==='dream'&&dreamCheckpoint.current)return dreamCheckpoint.current();
    while(occupied.current)await new Promise<void>(resolve=>waiters.current.push(resolve));
    occupied.current=true;setBusy(true);try{return await save(latest.current,'auto');}catch{setNotice(t.errors.IO_ERROR);return false;}finally{release();}
  };
  useEffect(()=>window.fcu.onCloseRequested(()=>closeHandler.current()),[]);
  const accept = (value:Career,keepDraft=false) => { latest.current=value;setState(value);if(!keepDraft)setLineup(value.lineup); };
  async function save(value=latest.current, kind:'manual'|'auto'='manual') {
    if(!value)return true;
    setNotice(t.saving);
    const result=await window.fcu.save(value,kind);
    setNotice(result.ok?t.saved:t.errors[result.error]);setDirty(!result.ok);return result.ok;
  }
  async function manualSave(kind:'manual'|'auto'='manual') {
    if(occupied.current)return;
    stop();occupied.current=true;setBusy(true);
    try {await save(latest.current,kind);} finally {release();}
  }
  async function command(action:Action) {
    const current=latest.current;if(!current||occupied.current)return false;
    occupied.current=true;setBusy(true);setNotice('');
    const result=await request({type:'Command',command:{...action,careerId:current.careerId,expectedRevision:current.revision,commandId:crypto.randomUUID()} as Command});
    if(result.ok) {
      accept(result.value,action.type==='SetTactics'||action.type==='StoreTacticPreset'||action.type==='SelectBench'||action.type==='SetTraining'||action.type==='SetTrainingFocus'||action.type==='RenewContract'||action.type==='ScoutPlayer'||action.type==='SetShortlist');setDirty(true);
      if(result.value.round>current.round||result.value.season>current.season)await save(result.value,'auto');
      if(action.type==='CloseSeason')setNotice(t.seasonStarted);
      if(action.type==='StartMatch')setScreen('match');
      if(action.type==='SelectLineup')setNotice(t.confirmed);
      if(action.type==='SelectBench')setNotice(t.benchConfirmed);
      if(action.type==='Substitute')setNotice(t.subConfirmed);
      if(action.type==='AdvanceCalendar')setNotice(t.calendarAdvanced);
      if(action.type==='ScoutPlayer')setNotice(t.scoutAssigned);
      if(action.type==='SetShortlist')setNotice(t.shortlistChanged);
      if(action.type==='RenewContract')setNotice(t.renewed);
      if(action.type==='SetTactics')setNotice(t.tacticsConfirmed);
      if(result.value.match&&needsDecision(result.value.match))stop();
      if(((result.value.match?.phase==='interval'||result.value.match?.phase==='extraInterval')&&!continuousRef.current)||result.value.match?.phase==='finished')stop();
    } else {setNotice(t.errors[result.error]);stop();}
    release();return result.ok;
  }
  useEffect(()=>{audio.current?.match(playing);},[playing]);
  const presentationBusy=useRef(false);
  const tick=async()=>{if(!running.current)return;if(presentationBusy.current){timer.current=setTimeout(()=>void tick(),50);return;}await command({type:'AdvanceMatch',minutes:1});const match=latest.current?.match;if(running.current&&match)timer.current=setTimeout(()=>void tick(),minuteDuration(match.events,match.tick));};
  const play=()=>{if(running.current){stop();return;}if(latest.current?.match&&(latest.current.match.tick===0||['interval','extraInterval'].includes(latest.current.match.phase)))audio.current?.highlight('whistle');if(latest.current?.match&&['interval','extraInterval'].includes(latest.current.match.phase))presentationBusy.current=false;running.current=true;setPlaying(true);void tick();};
  const navigate=(next:Screen)=>{
    if(navigating.current)return;stop();navigating.current=true;
    void (async()=>{try{
      if(screen==='dream'&&next!=='dream'){setBusy(true);if(dreamCheckpoint.current&&!await dreamCheckpoint.current())return;}
      else if(next==='title'&&dirty){setBusy(true);if(!await save(latest.current,'auto'))return;}
      setNotice('');setScreen(next);
    }catch{setNotice(t.errors.IO_ERROR);}finally{navigating.current=false;setBusy(false);}})();
  };
  async function newCareer() {
    if(!/^\d+$/.test(seed)||Number(seed)>4294967295){setNotice(t.seedInvalid);return;}
    stop();occupied.current=true;setBusy(true);const result=await request(selectedPack?{type:'NewPackedCareer',careerId:crypto.randomUUID(),seed:Number(seed),clubId:club,pack:selectedPack}:{type:'NewCareer',careerId:crypto.randomUUID(),seed:Number(seed),clubId:club,world:worldKind});
    if(result.ok){accept(result.value);setScreen('home');await save(result.value,'auto');}else setNotice(t.errors[result.error]);release();
  }
  async function showSaves() {
    stop();setBusy(true);const result=await window.fcu.list();
    if(result.ok)setSaves(result.value);else setNotice(t.errors[result.error]);setBusy(false);
  }
  async function load(entry:SaveEntry) {
    occupied.current=true;setBusy(true);const result=await window.fcu.load(entry.careerId,entry.commitId);
    if(result.ok) {
      resetWorker();const loaded=await request({type:'LoadCareer',state:result.value});
      if(loaded.ok){accept(loaded.value);setDirty(false);setSaves(null);setScreen(loaded.value.match?'match':'home');setNotice(entry.engineVersion===loaded.value.engineVersion?t.savedStatus:t.tacticalMigration);}else setNotice(t.errors[loaded.error]);
    }else setNotice(t.errors[result.error]);release();
  }
  const title=screen==='title';
  return <div className={s.app} onClickCapture={event=>{if(event.target instanceof Element&&event.target.closest('button'))audio.current?.click();}}>
    <div className={s.cabinet}>
      <header data-input-section className={s.hud}><button className={s.wordmark} disabled={busy} aria-label={t.titleMenu} onClick={()=>navigate('title')}>{brand.short}<span aria-hidden="true">★</span></button>
        <span className={s.hudLabel}>{t.retroMode}</span>
        <div className={s.hudActions}>
          <button disabled={!audioReady||audioSaving} aria-label={`${t.music} ${music?t.on:t.off}`} aria-pressed={music} onClick={()=>void persistAudio(!music,effects)}>{t.music}<span>{music?t.on:t.off}</span></button>
          <button disabled={!audioReady||audioSaving} aria-label={`${t.effects} ${effects?t.on:t.off}`} aria-pressed={effects} onClick={()=>void persistAudio(music,!effects)}>{t.effects}<span>{effects?t.on:t.off}</span></button>
          {!title&&screen!=='dream'&&<button disabled={busy} onClick={()=>void showSaves()}>{t.load}</button>}
          {state&&!title&&screen!=='dream'&&<button disabled={busy} onClick={()=>void manualSave()}>{t.save}</button>}
          {!title&&screen!=='dream'&&<button data-input-back disabled={busy} onClick={()=>navigate(screen==='setup'?'title':screen==='home'?'title':'home')}>{screen==='setup'||screen==='home'?t.back:t.clubhouse}</button>}
        </div>
      </header>
      <main data-input-section className={s.gameScreen} key={screen}>
        {screen==='title'&&<TitleScreen dream={()=>navigate('dream')} start={()=>navigate('setup')} load={()=>void showSaves()} resume={state?()=>navigate('home'):null}/>}
        {screen==='dream'&&<DreamClub exitCheckpoint={dreamCheckpoint} overlayOpen={diagnosticsOpen||soundLibrary||helpOpen} cue={kind=>audio.current?.highlight(kind)} ambience={value=>audio.current?.match(value)} packs={packs} exit={()=>navigate('title')}/>}
        {screen==='setup'&&<ClubSelect packs={packs} packId={packId} changePack={id=>{setPackId(id);setWorldKind('countries');setClub(clubs[0]!.id);}} importPack={()=>void importPack()} importedClubs={selectedPack?rosterClubs(selectedPack):null} worldKind={worldKind} changeWorld={kind=>{setPackId('');setWorldKind(kind);setClub(clubs[0]!.id);}} club={club} seed={seed} changeClub={setClub} changeSeed={setSeed} begin={()=>void newCareer()} busy={busy}/>}
        {state&&screen==='home'&&<Clubhouse board={()=>setBoardOpen(true)} closeSeason={()=>void command({type:'CloseSeason'})} history={()=>setHistoryOpen(true)} news={id=>{setNewsPlayer(id);setScoutingOpen(true);}} scouting={()=>{setNewsPlayer(null);setScoutingOpen(true);}} advance={target=>void command({type:'AdvanceCalendar',target})} finance={()=>setFinanceOpen(true)} report={()=>setReportOpen(true)} state={state} busy={busy} squad={()=>navigate('squad')} table={()=>navigate('table')} match={()=>state.match&&state.match.phase!=='finished'?navigate('match'):void command({type:'StartMatch'})}/>}
        {state&&screen==='squad'&&<SquadScreen registration={()=>setRegistrationOpen(true)} contracts={()=>setContractsOpen(true)} forfeit={()=>{void command({type:'ForfeitMatch'}).then(ok=>{if(ok)setScreen('match');});}} callUp={()=>{void command({type:'CallUp'});}} focus={focus=>{void command({type:'SetTrainingFocus',focus});}} training={training=>{void command({type:'SetTraining',training});}} bench={()=>setBenchOpen(true)} tactics={()=>{stop();setTacticsOpen(true);}} state={state} lineup={lineup} change={setLineup} suggest={()=>setLineup(autoPick(selectionPlayers(state),state.clubId,state.tactics.formation,state.date))} confirm={()=>void command({type:'SelectLineup',lineup})} busy={busy}/>}
        {state&&registrationOpen&&<RegistrationMenu state={state} busy={busy} confirm={players=>command({type:'SetRegistration',players})} close={()=>setRegistrationOpen(false)}/>}
        {state&&screen==='table'&&<TableScreen state={state}/>}
        {state?.match&&screen==='match'&&<MatchScreen hold={value=>{presentationBusy.current=value;}} acknowledge={()=>{void command({type:'AcknowledgeMatch'});}} report={()=>setReportOpen(true)} tactics={()=>{stop();setTacticsOpen(true);}} state={state} busy={busy} playing={playing} play={play} pause={stop} substitute={(out,incoming)=>command({type:'Substitute',out,in:incoming})} continuousHalf={continuousHalf} changeContinuous={value=>{setContinuousHalf(value);continuousRef.current=value;}} done={()=>navigate('home')} goal={kind=>audio.current?.highlight(kind)}/>}
      </main>
      {soundLibrary&&<AudioCredits close={()=>setSoundLibrary(false)}/>}<footer className={s.footer}><button onClick={()=>{stop();setHelpOpen(true);}}>{t.help}</button><button onClick={()=>{stop();setDiagnosticsOpen(true);}}>{t.diagnostics}</button><button onClick={()=>{stop();setSoundLibrary(true);}}>{t.soundLibrary}</button><span>{t.edition} / {t.fullscreenHint}<small title={t.controllerHint}>{t.inputHint}</small></span><div role="status">{notice}</div><span>{state?(dirty?t.unsaved:t.savedStatus):t.gameNote}</span></footer>
    </div>
    {state&&tacticsOpen&&<TacticsMenu store={(slot,tactics)=>command({type:'StoreTacticPreset',slot,tactics})} draftLineup={screen==='squad'?lineup:state.lineup} state={state} busy={busy} close={()=>setTacticsOpen(false)} confirm={tactics=>command({type:'SetTactics',tactics})}/>}
    {state&&historyOpen&&<SeasonHistory state={state} close={()=>setHistoryOpen(false)}/>}
    {state&&scoutingOpen&&<ScoutingMenu squad={()=>{setScoutingOpen(false);navigate('squad');}} initialPlayer={newsPlayer} state={state} busy={busy} command={command} close={()=>setScoutingOpen(false)}/>}
    {state&&contractsOpen&&<ContractsMenu state={state} busy={busy} confirm={command} close={()=>setContractsOpen(false)}/>}
    {state&&screen!=='title'&&screen!=='setup'&&screen!=='dream'&&(boardOpen||state.board.status!=='employed')&&<BoardMenu state={state} busy={busy} close={()=>setBoardOpen(false)} assisted={enabled=>void command({type:'SetAssisted',enabled})} job={clubId=>{void command({type:'AcceptJob',clubId}).then(ok=>{if(ok){setBoardOpen(false);setScreen('home');}});}} retire={()=>void command({type:'RetireManager'})} newCareer={()=>{setBoardOpen(false);navigate('setup');}}/>}
    {state&&financeOpen&&<FinanceMenu state={state} busy={busy} upgrade={kind=>void command({type:'UpgradeFacility',kind})} close={()=>setFinanceOpen(false)}/>}
    {state&&reportOpen&&<MatchReport state={state} close={()=>setReportOpen(false)}/>}
    {state&&benchOpen&&<BenchMenu state={state} busy={busy} close={()=>setBenchOpen(false)} confirm={bench=>command({type:'SelectBench',bench})}/>}
    {saves!==null&&<dialog ref={dialog} className={s.dialog} onCancel={()=>setSaves(null)} aria-label={t.saves}><header><h2>{t.saves}</h2><button onClick={()=>setSaves(null)}>{t.close}</button></header><p>{t.recovery}</p><SaveHistory entries={saves} busy={busy} load={entry=>void load(entry)}/></dialog>}
    {helpOpen&&<Help close={()=>setHelpOpen(false)}/>}
    {diagnosticsOpen&&<Diagnostics close={()=>setDiagnosticsOpen(false)}/>}<InputEditor/>
  </div>;
}
