import type { Career, ClubId, PlayerId } from '../../../../packages/contracts/src/index.ts';
import { brand } from '../../../../packages/contracts/src/index.ts';
import { clubs } from '../../../../packages/contracts/src/identity.ts';
import { overall, standings, arrangeLineup, validLineup } from '../../../../packages/simulation/src/engine.ts';
import { text as t } from '../../../../packages/presentation/src/text.ts';
import { ClubBadge, Shirt, StadiumArt } from './GameArt.tsx';
import s from './App.module.css';

export function TitleScreen({start,load,resume}:{start:()=>void;load:()=>void;resume:(()=>void)|null}) {
  return <section className={s.titleScene}>
    <div className={s.titleGlow}/><StadiumArt/>
    <div className={s.titleContent}><p className={s.eyebrow}>{t.retroMode}</p><h1 className={s.titleLogo}>{brand.short}<span>{brand.title}</span></h1><p className={s.tagline}>{t.titleTag}</p>
      <div className={s.titleButtons}><button className={s.primary} onClick={start}><span aria-hidden="true">▶</span> {t.startGame}</button><button onClick={load}>{t.load}</button>{resume&&<button onClick={resume}>{t.continue}</button>}</div>
    </div><p className={s.titleFoot}>{t.gameNote}</p>
  </section>;
}
export function ClubSelect({club,seed,changeClub,changeSeed,begin,busy}:{club:ClubId;seed:string;changeClub:(id:ClubId)=>void;changeSeed:(seed:string)=>void;begin:()=>void;busy:boolean}) {
  const selected=clubs.find(c=>c.id===club)!;
  return <section className={s.selectionScreen}>
    <div className={s.sectionTitle}><p className={s.eyebrow}>{brand.career}</p><h1>{t.chooseClub}</h1><p>{t.chooseHint}</p></div>
    <div className={s.selectBody}><div className={s.clubGrid} role="group" aria-label={t.club}>{clubs.map(c=><button key={c.id} aria-pressed={c.id===club} onClick={()=>changeClub(c.id)} disabled={busy}><ClubBadge color={c.color} short={c.short}/><strong>{c.name}</strong></button>)}</div>
      <div className={s.clubPreview}><Shirt color={selected.color}/><h2>{selected.name}</h2><p>{t.rosterShort} / {t.profile}</p><label>{t.seed}<input inputMode="numeric" value={seed} onChange={e=>changeSeed(e.target.value)} disabled={busy}/></label><button className={s.primary} onClick={begin} disabled={busy}>{t.begin} <span aria-hidden="true">▶</span></button></div>
    </div><p className={s.smallPrint}>{t.fixtureNotice}</p>
  </section>;
}
export function Clubhouse({state,squad,table,match,busy}:{state:Career;squad:()=>void;table:()=>void;match:()=>void;busy:boolean}) {
  const club=state.clubs.find(c=>c.id===state.clubId)!;const rankings=standings(state);const row=rankings.find(r=>r.clubId===state.clubId)!;
  const next=state.fixtures.find(f=>f.round===state.round&&(f.home===state.clubId||f.away===state.clubId));
  const name=(id:ClubId)=>state.clubs.find(c=>c.id===id)!;
  return <section className={s.clubhouse}>
    <div className={s.clubHero}><ClubBadge color={club.color} short={club.short}/><div><p className={s.eyebrow}>{brand.career} / {t.clubhouse}</p><h1>{club.name}</h1><p>{t.seasonTag} <span>/</span> {state.date}</p></div><div className={s.rankStamp}><strong>#{rankings.findIndex(r=>r.clubId===club.id)+1}</strong><small>{t.currentPosition}</small></div></div>
    <div className={s.clubhouseBody}><section className={s.fixtureBoard}><p className={s.eyebrow}>{next?t.nextFixture:t.seasonComplete}</p>{next?<><div className={s.versus}><div><ClubBadge color={name(next.home).color} short={name(next.home).short}/><strong>{name(next.home).name}</strong></div><b>{t.versus}</b><div><ClubBadge color={name(next.away).color} short={name(next.away).short}/><strong>{name(next.away).name}</strong></div></div><p>{t.round} {state.round+1} / 14</p><button disabled={busy} className={s.primary} onClick={match}>{state.match&&state.match.tick<90?t.continue:t.kickoff} <span aria-hidden="true">▶</span></button></>:<><div className={s.trophy} aria-hidden="true">★</div><h2>{name(rankings[0]!.clubId).name}</h2><p>{t.seasonBody}</p></>}</section>
      <div className={s.actionTiles}><button aria-label={t.squad} onClick={squad}><span className={s.tileIcon} aria-hidden="true">XI</span><span><strong>{t.squad}</strong><small>{t.squadAction}</small></span><b aria-hidden="true">›</b></button><button aria-label={t.table} onClick={table}><span className={s.tileIcon} aria-hidden="true">★</span><span><strong>{t.table}</strong><small>{t.tableAction}</small></span><b aria-hidden="true">›</b></button><div className={s.seasonNumbers}><div><b>{row.won}-{row.drawn}-{row.lost}</b><small>{t.record}</small></div><div><b>{state.round}/14</b><small>{t.playedRounds}</small></div><div><b>{row.points}</b><small>{t.points}</small></div></div></div>
    </div>
  </section>;
}
export function SquadScreen({state,tactics,lineup,change,suggest,confirm,busy}:{state:Career;tactics:()=>void;lineup:PlayerId[];change:(ids:PlayerId[])=>void;suggest:()=>void;confirm:()=>void;busy:boolean}) {
  const players=state.players.filter(p=>p.clubId===state.clubId);const club=state.clubs.find(c=>c.id===state.clubId)!;const locked=busy||Boolean(state.match&&state.match.tick<90);
  const slots=validLineup(state.players,state.clubId,lineup)?arrangeLineup(state.players,lineup,state.tactics.formation):lineup.map(id=>({role:state.players.find(p=>p.id===id)!.role,player:state.players.find(p=>p.id===id)!}));
  return <section className={s.squadScreen}><div className={s.sectionTitle}><p className={s.eyebrow}>{club.name}</p><h1>{t.squadTitle}</h1><p>{locked?t.matchLocked:t.squadHint}</p></div>
    <div className={s.squadBody}><div className={s.squadList}>{players.map(p=><label className={lineup.includes(p.id)?s.picked:undefined} key={p.id}><input type="checkbox" checked={lineup.includes(p.id)} disabled={locked} aria-label={`${t.starting} ${p.name}`} onChange={e=>change(e.target.checked?[...lineup,p.id]:lineup.filter(id=>id!==p.id))}/><span className={s.role}>{p.role}</span><strong>{p.name}</strong><b>{overall(p)}</b></label>)}</div>
      <div className={s.lineupPanel}><p className={s.eyebrow}>{t.starters} / {state.tactics.formation} <button disabled={locked} onClick={tactics}>{t.tactics}</button></p><div className={s.tacticsPitch}>{(['FWD','MID','DEF','GK'] as const).map(role=><div key={role}>{slots.filter(s=>s.role===role).map(({player:p})=><div key={p.id} title={p.name}><span style={{background:club.color}}>{p.id.slice(-2)}</span><small>{p.name.split(' ')[0]}</small></div>)}</div>)}</div><div className={s.lineupActions}><strong>{lineup.length}/11 {t.selection}</strong><button disabled={locked} onClick={suggest}>{t.autoPick}</button><button className={s.primary} disabled={locked} onClick={confirm}>{t.confirmLineup}</button></div></div>
    </div>
  </section>;
}
export function TableScreen({state}:{state:Career}) {
  const rows=standings(state);const name=(id:ClubId)=>state.clubs.find(c=>c.id===id)!;
  return <section className={s.tableScreen}><div className={s.sectionTitle}><p className={s.eyebrow}>{t.exhibition}</p><h1>{t.table}</h1><p>{state.round} / 14 {t.completed}</p></div><div className={s.tableWrap}><table><thead><tr>{['#',t.clubName,t.played,t.won,t.drawn,t.lost,t.goalsFor,t.goalsAgainst,t.difference,t.points].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={r.clubId} className={r.clubId===state.clubId?s.selected:undefined}><td>{i+1}</td><td><span className={s.tableClub}><ClubBadge color={name(r.clubId).color} short={name(r.clubId).short}/>{name(r.clubId).name}</span></td><td>{r.played}</td><td>{r.won}</td><td>{r.drawn}</td><td>{r.lost}</td><td>{r.gf}</td><td>{r.ga}</td><td>{r.gf-r.ga}</td><td><strong>{r.points}</strong></td></tr>)}</tbody></table></div><p className={s.smallPrint}>{t.ranking}</p></section>;
}
