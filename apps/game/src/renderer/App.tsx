import { useRef, useState, useEffect } from 'react';
import { brand, type Career, type ClubId, type PlayerId, type SaveEntry, type Command } from '../../../../packages/contracts/src/index.ts';
import { clubs } from '../../../../packages/contracts/src/identity.ts';
import { autoPick } from '../../../../packages/simulation/src/engine.ts';
import { text as t } from '../../../../packages/presentation/src/text.ts';
import { request, resetWorker } from './client.ts';
import { createGameAudio } from './audio.ts';
import { TitleScreen, ClubSelect, Clubhouse, SquadScreen, TableScreen } from './Screens.tsx';
import { MatchScreen } from './MatchScreen.tsx';
import s from './App.module.css';

type Screen = 'title' | 'setup' | 'home' | 'squad' | 'table' | 'match';
type Action = {type:'StartMatch'} | {type:'SelectLineup';lineup:PlayerId[]} | {type:'AdvanceMatch';minutes:number};
export function App() {
  const [state, setState] = useState<Career|null>(null);
  const latest = useRef<Career|null>(null);
  const [screen, setScreen] = useState<Screen>('title');
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
  const [speed, setSpeed] = useState(1);
  const speedRef = useRef(1);
  const audio = useRef<ReturnType<typeof createGameAudio>|null>(null);
  const [music, setMusic] = useState(false);
  const [effects, setEffects] = useState(true);
  const stop = () => { running.current=false;setPlaying(false);if(timer.current)clearTimeout(timer.current); };
  useEffect(() => {
    audio.current=createGameAudio();
    return () => {if(timer.current)clearTimeout(timer.current);resetWorker();audio.current?.dispose();};
  }, []);
  useEffect(() => { if(saves!==null)dialog.current?.showModal(); }, [saves]);
  const accept = (value:Career) => { latest.current=value;setState(value);setLineup(value.lineup); };
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
    const current=latest.current;if(!current||occupied.current)return;
    occupied.current=true;setBusy(true);setNotice('');
    const result=await request({type:'Command',command:{...action,careerId:current.careerId,expectedRevision:current.revision,commandId:crypto.randomUUID()} as Command});
    if(result.ok) {
      accept(result.value);setDirty(true);
      if(result.value.round>current.round)await save(result.value,'auto');
      if(action.type==='StartMatch')setScreen('match');
      if(action.type==='SelectLineup')setNotice(t.confirmed);
      if(result.value.match?.tick===45||result.value.match?.tick===90)stop();
    } else {setNotice(t.errors[result.error]);stop();}
    occupied.current=false;setBusy(false);
  }
  const tick=async()=>{if(!running.current)return;await command({type:'AdvanceMatch',minutes:1});if(running.current)timer.current=setTimeout(()=>void tick(),800/speedRef.current);};
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
      if(loaded.ok){accept(loaded.value);setDirty(false);setSaves(null);setScreen(loaded.value.match?'match':'home');setNotice(t.savedStatus);}else setNotice(t.errors[loaded.error]);
    }else setNotice(t.errors[result.error]);setBusy(false);
  }
  const title=screen==='title';
  return <div className={s.app} onClickCapture={event=>{if(event.target instanceof Element&&event.target.closest('button'))audio.current?.click();}}>
    <div className={s.cabinet}>
      <header className={s.hud}><button className={s.wordmark} disabled={busy} aria-label={t.titleMenu} onClick={()=>navigate('title')}>{brand.short}<span aria-hidden="true">★</span></button>
        <span className={s.hudLabel}>{t.retroMode}</span>
        <div className={s.hudActions}>
          <button aria-label={`${t.music} ${music?t.on:t.off}`} aria-pressed={music} onClick={()=>{audio.current?.music(!music);setMusic(!music);}}>{t.music}<span>{music?t.on:t.off}</span></button>
          <button aria-label={`${t.effects} ${effects?t.on:t.off}`} aria-pressed={effects} onClick={()=>{audio.current?.effects(!effects);setEffects(!effects);}}>{t.effects}<span>{effects?t.on:t.off}</span></button>
          {!title&&<button disabled={busy} onClick={()=>void showSaves()}>{t.load}</button>}
          {state&&!title&&<button disabled={busy} onClick={()=>void manualSave()}>{t.save}</button>}
          {!title&&<button disabled={busy} onClick={()=>navigate(screen==='setup'?'title':screen==='home'?'title':'home')}>{screen==='setup'||screen==='home'?t.back:t.clubhouse}</button>}
        </div>
      </header>
      <main className={s.gameScreen} key={screen}>
        {screen==='title'&&<TitleScreen start={()=>navigate('setup')} load={()=>void showSaves()} resume={state?()=>navigate('home'):null}/>}
        {screen==='setup'&&<ClubSelect club={club} seed={seed} changeClub={setClub} changeSeed={setSeed} begin={()=>void newCareer()} busy={busy}/>}
        {state&&screen==='home'&&<Clubhouse state={state} busy={busy} squad={()=>navigate('squad')} table={()=>navigate('table')} match={()=>state.match&&state.match.tick<90?navigate('match'):void command({type:'StartMatch'})}/>}
        {state&&screen==='squad'&&<SquadScreen state={state} lineup={lineup} change={setLineup} suggest={()=>setLineup(autoPick(state.players,state.clubId))} confirm={()=>void command({type:'SelectLineup',lineup})} busy={busy}/>}
        {state&&screen==='table'&&<TableScreen state={state}/>}
        {state?.match&&screen==='match'&&<MatchScreen state={state} busy={busy} playing={playing} speed={speed} play={play} minute={()=>void command({type:'AdvanceMatch',minutes:1})} finish={()=>void command({type:'AdvanceMatch',minutes:90})} changeSpeed={value=>{setSpeed(value);speedRef.current=value;}} done={()=>navigate('home')} goal={()=>audio.current?.goal()}/>}
      </main>
      <footer className={s.footer}><span>{t.edition}</span><div role="status">{notice}</div><span>{state?(dirty?t.unsaved:t.savedStatus):t.gameNote}</span></footer>
    </div>
    {saves!==null&&<dialog ref={dialog} className={s.dialog} onCancel={()=>setSaves(null)} aria-label={t.saves}><header><h2>{t.saves}</h2><button onClick={()=>setSaves(null)}>{t.close}</button></header><p>{t.recovery}</p><div className={s.saveList}>{saves.length===0?<p>{t.noSaves}</p>:saves.map(entry=><div className={s.saveRow} key={entry.commitId}>{entry.valid?<><span><strong>{entry.club}</strong><small>{entry.savedAtUTC.replace('T',' ').slice(0,19)} UTC / {t[entry.kind]} / {t.round} {entry.round} / {entry.tick}'</small></span><button disabled={busy} onClick={()=>void load(entry)}>{t.load}</button></>:<p>{entry.error==='FUTURE_SAVE'?t.future:t.corrupt}<small>{entry.commitId}</small></p>}</div>)}</div></dialog>}
  </div>;
}
