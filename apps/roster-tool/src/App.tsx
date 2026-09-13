import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {text as t} from './text.ts';
import type {Action,Reply,View} from './contract.ts';
import s from './style.module.css';

function App(){
  const [view,setView]=useState<View|null>(null),[error,setError]=useState<string|null>(null),[busy,setBusy]=useState(false),[selected,setSelected]=useState('');
  const accept=(reply:Reply)=>{if(reply.ok){setView(reply.view);setError(null);}else setError(reply.message);};
  useEffect(()=>{void window.publisher.read().then(accept).catch(()=>setError(t.error));},[]);
  async function act(action:Action){setBusy(true);try{accept(await window.publisher.act(action));}catch{setError(t.error);}finally{setBusy(false);}}
  const roster=view?.roster, team=roster?.teams.find(t=>t.id===selected)??roster?.teams[0];
  const members=new Set(roster?.memberships.filter(m=>m.playingTeamId===team?.id).map(m=>m.playerId));
  return <main className={s.app}><header><h1>{t.title}</h1><p>{t.subtitle}</p></header><p className={s.notice}>{t.notice}</p>
    <nav aria-label={t.title}><button disabled={busy} onClick={()=>void act({type:'fixture'})}>{t.fixture}</button><button disabled={busy} onClick={()=>void act({type:'import'})}>{t.import}</button>{view?.hash&&<><button disabled={busy||view.issues.length>0||view.approved} onClick={()=>void act({type:'approve',hash:view.hash!})}>{t.approve}</button><button disabled={busy||!view.approved} onClick={()=>void act({type:'export',hash:view.hash!})}>{t.export}</button></>}</nav>
    <div role="status">{busy?t.working:error??view?.message}</div>{view?.exported&&<p>{t.exported} <code>{view.exported}</code></p>}
    {!roster?<p>{t.empty}</p>:<><p>{t.source}: {view.provider} / {roster.teams.length} {t.clubs} / {roster.players.length} {t.playerCount} / {view.approved?t.approved:t.reviewing}</p><p className={s.hash}>{t.hash}: {view.hash}</p>
    <section className={s.board}><aside><h2>{t.clubs}</h2>{roster.teams.map(team=><button key={team.id} aria-pressed={team.id===(selected||roster.teams[0]?.id)} onClick={()=>setSelected(team.id)}>{team.displayName}<small>{view.reviewedTeamIds.includes(team.id)?t.reviewed:t.pending}</small></button>)}</aside>
      <section><h2>{team?.displayName}</h2><p>{t.generated}</p>{team&&<button disabled={busy||view.reviewedTeamIds.includes(team.id)} onClick={()=>void act({type:'review',hash:view.hash!,teamId:team.id})}>{t.review}</button>}<table><thead><tr><th>{t.players}</th><th>{t.role}</th><th>{t.born}</th></tr></thead><tbody>{roster.players.filter(p=>members.has(p.id)).map(p=><tr key={p.id}><td>{p.displayName}</td><td>{p.primaryRole}</td><td>{p.dateOfBirth}</td></tr>)}</tbody></table></section>
      <section><h2>{t.issues}</h2>{view.provider==='fictional'&&<button disabled={busy||view.reviewedTeamIds.length===roster.teams.length} onClick={()=>void act({type:'reviewFixture',hash:view.hash!})}>{t.reviewFixture}</button>}{view.issues.length?<ul>{view.issues.map((issue,i)=><li key={i}>{issue.code}: {issue.message}</li>)}</ul>:<p>{t.noIssues}</p>}</section>
    </section></>}
  </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
