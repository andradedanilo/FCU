import { useRef, useState, useEffect } from 'react';
import { brand, type Career, type ClubId, type PlayerId, type SaveEntry, type Command } from '../../../../packages/contracts/src/index.ts';
import { clubs } from '../../../../packages/contracts/src/identity.ts';
import { autoPick, overall, standings } from '../../../../packages/simulation/src/engine.ts';
import { text as t, describeEvent } from '../../../../packages/presentation/src/text.ts';
import { request, resetWorker } from './client.ts';
import styles from './App.module.css';

type Screen='home'|'squad'|'table'|'match';
type Action={type:'StartMatch'}|{type:'SelectLineup';lineup:PlayerId[]}|{type:'AdvanceMatch';minutes:number};
export function App() {
  const [state,setState]=useState<Career|null>(null);const latest=useRef<Career|null>(null);
  const [screen,setScreen]=useState<Screen>('home');const [setup,setSetup]=useState(true);const [club,setClub]=useState<ClubId>(clubs[0]!.id);const [seed,setSeed]=useState('2026');
  const [lineup,setLineup]=useState<PlayerId[]>([]);const [busy,setBusy]=useState(false);const occupied=useRef(false);const [notice,setNotice]=useState('');const [dirty,setDirty]=useState(false);
  const [saves,setSaves]=useState<SaveEntry[]|null>(null);const [playing,setPlaying]=useState(false);const timer=useRef<ReturnType<typeof setTimeout>|null>(null);const running=useRef(false);
  const [speed,setSpeed]=useState(1);const speedRef=useRef(1);
  const stop=()=>{running.current=false;setPlaying(false);if(timer.current)clearTimeout(timer.current);};
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);resetWorker();},[]);
  const accept=(value:Career)=>{latest.current=value;setState(value);setLineup(value.lineup);setSetup(false);};
  async function save(value=latest.current,kind:'manual'|'auto'='manual') {
    if(!value)return;setNotice(t.saving);const result=await window.fcu.save(value,kind);
    setNotice(result.ok?t.saved:t.errors[result.error]);setDirty(!result.ok);
  }
  async function command(action:Action) {
    const current=latest.current;if(!current||occupied.current)return;
    occupied.current=true;setBusy(true);setNotice('');
    const result=await request({type:'Command',command:{...action,careerId:current.careerId,expectedRevision:current.revision,commandId:crypto.randomUUID()} as Command});
    if(result.ok){accept(result.value);setDirty(true);if(result.value.round>current.round)await save(result.value,'auto');if(action.type==='StartMatch')setScreen('match');if(result.value.match?.tick===45||result.value.match?.tick===90)stop();}
    else{setNotice(t.errors[result.error]);stop();}
    occupied.current=false;setBusy(false);
  }
  const tick=async()=>{if(!running.current)return;await command({type:'AdvanceMatch',minutes:1});if(running.current)timer.current=setTimeout(()=>void tick(),800/speedRef.current);};
  const play=()=>{if(running.current){stop();return;}running.current=true;setPlaying(true);void tick();};
  async function newCareer() {
    if(!/^\d+$/.test(seed)||Number(seed)>4294967295){setNotice(t.seedInvalid);return;}
    stop();setBusy(true);const result=await request({type:'NewCareer',careerId:crypto.randomUUID(),seed:Number(seed),clubId:club});
    if(result.ok){accept(result.value);setScreen('home');await save(result.value,'auto');}else setNotice(t.errors[result.error]);setBusy(false);
  }
  async function showSaves(){stop();setBusy(true);const result=await window.fcu.list();if(result.ok)setSaves(result.value);else setNotice(t.errors[result.error]);setBusy(false);}
  async function load(entry:SaveEntry) {
    setBusy(true);const result=await window.fcu.load(entry.careerId,entry.commitId);
    if(result.ok){resetWorker();const loaded=await request({type:'LoadCareer',state:result.value});if(loaded.ok){accept(loaded.value);setDirty(false);setSaves(null);setScreen(loaded.value.match?'match':'home');setNotice(t.savedStatus);}else setNotice(t.errors[loaded.error]);}else setNotice(t.errors[result.error]);setBusy(false);
  }
  const table=state?standings(state):[];const myClub=state?.clubs.find(c=>c.id===state.clubId);const row=table.find(r=>r.clubId===state?.clubId);
  const next=state?.fixtures.find(f=>f.round===state.round&&(f.home===state.clubId||f.away===state.clubId));const match=state?.match;
  const name=(id:ClubId)=>state!.clubs.find(c=>c.id===id)!.name;
  const navigate=(nextScreen:Screen)=>{stop();setScreen(nextScreen);};
  return <div className={styles.app}>
    <aside className={styles.sidebar}><div className={styles.logo}>{brand.short}<span> / </span></div><div className={styles.brand}>{brand.title}</div><div className={styles.edition}>{t.edition}</div>
      {state&&!setup&&<><div className={styles.clubMark} style={{borderColor:myClub?.color}}><span style={{color:myClub?.color}}>{myClub?.short}</span><strong>{myClub?.name}</strong><small>{brand.career}</small></div><nav aria-label={brand.career}>{(['home','squad','table','match'] as const).map((item,i)=><button key={item} aria-current={screen===item?'page':undefined} onClick={()=>navigate(item)}><span>0{i+1}</span>{t[item]}</button>)}</nav></>}
      <div className={styles.sidebarBottom}><span className={styles.statusDot}/>{t.exhibition}<small>{t.profile}</small></div>
    </aside>
    <main className={styles.main}>
      <header className={styles.topbar}><span>{t.season}{state&&` / ${state.date}`}</span><div>{state&&<small>{dirty?t.unsaved:t.savedStatus}</small>}<button disabled={busy} onClick={()=>{stop();setSetup(true);}}>{t.newCareer}</button><button disabled={busy} onClick={()=>void showSaves()}>{t.load}</button>{state&&<button disabled={busy} onClick={()=>{stop();void save();}}>{t.save}</button>}</div></header>
      <div role="status" className={styles.notice}>{notice}</div>
      {setup?<section className={styles.setup}><p className={styles.eyebrow}>{t.welcome}</p><h1>{t.intro}</h1><p className={styles.lead}>{t.introBody}</p><div className={styles.setupGrid}><div><label>{t.club}<select value={club} onChange={e=>setClub(e.target.value as ClubId)}>{clubs.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>{t.seed}<input inputMode="numeric" value={seed} onChange={e=>setSeed(e.target.value)}/></label><small>{t.seedHint}</small><button className={styles.primary} disabled={busy} onClick={()=>void newCareer()}>{t.begin} <span>→</span></button>{state&&<button onClick={()=>setSetup(false)}>{t.continue}</button>}</div><div className={styles.identityArt}><div className={styles.pitchDiagram}><div/><strong>{clubs.find(c=>c.id===club)?.short}</strong><span>XI</span></div><p>{t.roster}</p></div></div><p className={styles.footnote}>{t.fixtureNotice}<br/>{t.setupNotice}<br/>{t.newHint}</p></section>:
      state&&<>
        {screen==='home'&&<><p className={styles.eyebrow}>{brand.career} / {t.home}</p><h1>{myClub?.name}</h1><p className={styles.lead}>{t.exhibition}</p><div className={styles.statsCards}><article><span>{t.currentPosition}</span><strong>{table.findIndex(r=>r.clubId===state.clubId)+1}<small> / 8</small></strong></article><article><span>{t.record}</span><strong>{row?.won}<small> {t.won} / </small>{row?.drawn}<small> {t.drawn} / </small>{row?.lost}<small> {t.lost}</small></strong></article><article><span>{t.playedRounds}</span><strong>{state.round}<small> / 14</small></strong></article></div><section className={styles.fixtureCard}><div><p className={styles.eyebrow}>{state.round===14?t.seasonComplete:t.nextFixture}</p>{next?<><h2>{name(next.home)}<span className={styles.vs}>{t.versus}</span>{name(next.away)}</h2><p>{t.round} {state.round+1} / 14</p><button className={styles.primary} disabled={busy} onClick={()=>match&&match.tick<90?navigate('match'):void command({type:'StartMatch'})}>{match&&match.tick<90?t.continue:t.kickoff} →</button></>:<><h2>{name(table[0]!.clubId)}</h2><p>{t.seasonBody}</p></>}</div><div className={styles.largeNumber}>{String(Math.min(state.round+1,14)).padStart(2,'0')}<span>/14</span></div></section><p className={styles.footnote}>{t.fixtureNotice}</p></>}
        {screen==='squad'&&<><p className={styles.eyebrow}>{myClub?.name} / {t.squad}</p><h1>{t.squadTitle}</h1><p className={styles.lead}>{t.squadHint}</p><div className={styles.actions}><strong>{lineup.length}/11 {t.selection}</strong><button disabled={busy||Boolean(match&&match.tick<90)} onClick={()=>setLineup(autoPick(state.players,state.clubId))}>{t.autoPick}</button><button className={styles.primary} disabled={busy||Boolean(match&&match.tick<90)} onClick={()=>void command({type:'SelectLineup',lineup})}>{t.confirmLineup}</button></div>{match&&match.tick<90&&<p>{t.matchLocked}</p>}<div className={styles.tableWrap}><table><thead><tr><th>{t.starting}</th><th>{t.position}</th><th>{t.player}</th><th>{t.ability}</th></tr></thead><tbody>{state.players.filter(p=>p.clubId===state.clubId).map(p=><tr key={p.id}><td><input aria-label={`${t.starting} ${p.name}`} type="checkbox" checked={lineup.includes(p.id)} disabled={busy||Boolean(match&&match.tick<90)} onChange={e=>setLineup(e.target.checked?[...lineup,p.id]:lineup.filter(id=>id!==p.id))}/></td><td><span className={styles.role}>{p.role}</span></td><td>{p.name}</td><td><strong>{overall(p)}</strong></td></tr>)}</tbody></table></div></>}
        {screen==='table'&&<><p className={styles.eyebrow}>{t.exhibition}</p><h1>{t.table}</h1><p className={styles.lead}>{state.round} / 14 {t.completed}</p><div className={styles.tableWrap}><table><thead><tr>{['#',t.clubName,t.played,t.won,t.drawn,t.lost,t.goalsFor,t.goalsAgainst,t.difference,t.points].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{table.map((r,i)=><tr key={r.clubId} className={r.clubId===state.clubId?styles.selected:undefined}><td>{i+1}</td><td>{name(r.clubId)}</td><td>{r.played}</td><td>{r.won}</td><td>{r.drawn}</td><td>{r.lost}</td><td>{r.gf}</td><td>{r.ga}</td><td>{r.gf-r.ga}</td><td><strong>{r.points}</strong></td></tr>)}</tbody></table></div><p className={styles.footnote}>{t.ranking}</p><div className={styles.results}>{state.fixtures.filter(f=>f.round===Math.max(0,state.round-1)).map(f=><div key={f.id}><span>{name(f.home)}</span><strong>{f.score?f.score.join(' - '):t.versus}</strong><span>{name(f.away)}</span></div>)}</div></>}
        {screen==='match'&&<>{match?<><div className={styles.matchHeading}><p className={styles.eyebrow}>{t.match} / {t.round} {match.tick===90?state.round:state.round+1}</p><span>{match.tick===90?t.final:playing?t.live:t.paused}</span></div><div className={styles.scoreboard}><h2>{name(match.home)}</h2><div><strong data-testid="score">{match.homeGoals} - {match.awayGoals}</strong><span data-testid="minute">{match.tick===90?t.fullTime:match.tick===45?t.halfTime:`${match.tick}'`}</span></div><h2>{name(match.away)}</h2></div><div className={styles.actions}>{match.tick<90?<><button className={styles.primary} disabled={busy} onClick={play}>{playing?t.pause:match.tick===45?t.continue:t.play}</button><button disabled={busy||playing} onClick={()=>void command({type:'AdvanceMatch',minutes:1})}>{t.minute}</button><button disabled={busy||playing} onClick={()=>void command({type:'AdvanceMatch',minutes:90})}>{t.finish}</button><label>{t.speed}<select value={speed} onChange={e=>{setSpeed(Number(e.target.value));speedRef.current=Number(e.target.value);}}><option value={1}>1x</option><option value={3}>3x</option><option value={8}>8x</option></select></label></>:<button className={styles.primary} onClick={()=>navigate('home')}>{t.continue} →</button>}</div><div className={styles.matchStats}>{([['shots',t.shots],['onTarget',t.onTarget],['possession',t.possession],['quality',t.quality]] as const).map(([key,label])=>{const format=(n:number)=>key==='quality'?(n/10000).toFixed(2):key==='possession'?`${match.tick?Math.round(n/match.tick/100):50}%`:n;return <div key={key}><strong>{format(match.homeStats[key])}</strong><span>{label}</span><strong>{format(match.awayStats[key])}</strong></div>;})}</div><section className={styles.commentary}><h3>{t.events}</h3>{match.events.length===0?<p>{t.noEvents}</p>:<ol>{[...match.events].reverse().map(e=><li key={e.order} className={e.type==='goal'?styles.goal:undefined}>{describeEvent(state,e)}</li>)}</ol>}</section></>:<><h1>{t.matchIntro}</h1><p>{t.matchEmpty}</p></>}</>}
      </>}
      {saves!==null&&<dialog open className={styles.dialog} onKeyDown={e=>{if(e.key==='Escape')setSaves(null);}} aria-label={t.saves}><div className={styles.actions}><h2>{t.saves}</h2><button onClick={()=>setSaves(null)}>{t.close}</button></div><p>{t.recovery}</p>{saves.length===0?<p>{t.noSaves}</p>:saves.map(entry=><div className={styles.saveRow} key={entry.commitId}>{entry.valid?<><span><strong>{entry.club}</strong><small>{entry.savedAtUTC.replace('T',' ').slice(0,19)} UTC / {t[entry.kind]} / {t.round} {entry.round} / {entry.tick}'</small></span><button disabled={busy} onClick={()=>void load(entry)}>{t.load}</button></>:<p>{entry.error==='FUTURE_SAVE'?t.future:t.corrupt}<small>{entry.commitId}</small></p>}</div>)}</dialog>}
    </main>
  </div>;
}
