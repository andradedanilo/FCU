import {useState} from 'react';
import type {Career,Cup,Fixture,ClubId} from '../../../../packages/contracts/src/index.ts';
import {cupChampion} from '../../../../packages/simulation/src/cups.ts';
import {text as t} from '../../../../packages/presentation/src/text.ts';
import s from './App.module.css';
export function CupBoard({cup,state,fixtures}:{cup:Cup;state:Career;fixtures:Fixture[]}){
 const [selected,setSelected]=useState(cup.rounds.length-1),round=cup.rounds[Math.min(selected,cup.rounds.length-1)]!,champion=cupChampion(cup);
 const name=(id:ClubId)=>state.clubs.find(c=>c.id===id)!.name;
 const labels=cup.kind==='domestic'?t.domesticRounds:t.continentalRounds;
 return <section aria-label={t.cupNames[cup.id]} className={s.cupBoard}>
  <h2>{t.cupNames[cup.id]}</h2>{champion&&<h3>{t.cupChampion}: {name(champion)}</h3>}
  <label>{t.cupRound}<select value={selected} onChange={event=>setSelected(Number(event.target.value))}>{cup.rounds.map((r,i)=><option key={r.number} value={i}>{labels[r.number]}</option>)}</select></label>
  {round.byes.length>0&&<details><summary>{t.cupBye}: {round.byes.length}</summary><p>{round.byes.map(name).join(', ')}</p></details>}
  <table><thead><tr><th>{t.date}</th><th>{t.homeTeam}</th><th>{t.result}</th><th>{t.awayTeam}</th></tr></thead><tbody>{round.ties.flatMap(tie=>tie.legs.map(leg=>{const fixture=fixtures.find(f=>f.id===leg.fixtureId)!;return <tr key={leg.fixtureId}><td>{leg.date}{leg.neutral&&<small>{t.neutralFinal}</small>}</td><td><strong>{name(leg.home)}</strong></td><td>{fixture.score?fixture.score.join(' - '):t.cupPending}{fixture.shootout&&<small>{t.penalties}: {fixture.shootout.join(' - ')}</small>}</td><td><strong>{name(leg.away)}</strong>{tie.winner&&<small>{t.tieWinner}: {name(tie.winner)}</small>}</td></tr>;}))}</tbody></table>
 </section>;
}
