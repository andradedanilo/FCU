import {useRef,useState} from 'react';
import type {Career} from '../../../../packages/contracts/src/index.ts';
import {text as t} from '../../../../packages/presentation/src/text.ts';
import {useModal} from './input.ts';
import s from './FinanceMenu.module.css';
export function SeasonHistory({state,close}:{state:Career;close:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);useModal(dialog);const [year,setYear]=useState(state.history.at(-1)?.year??state.season);
 const history=state.history.find(h=>h.year===year);
 return <dialog ref={dialog} className={s.dialog} aria-label={t.seasonHistory} onCancel={close}><header><h2>{t.seasonHistory}</h2><button onClick={close}>{t.close}</button></header>{history?<><label>{t.season}<select value={year} onChange={e=>setYear(Number(e.target.value))}>{state.history.map(h=><option value={h.year} key={h.year}>{h.year}-{h.year+1}</option>)}</select></label><div className={s.history}><table><thead><tr>{['#',t.clubName,t.played,t.won,t.drawn,t.lost,t.goalsFor,t.goalsAgainst,t.points].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{history.table.map((row,i)=><tr key={row.clubId}><td>{i+1}</td><td>{state.clubs.find(c=>c.id===row.clubId)!.name}</td><td>{row.played}</td><td>{row.won}</td><td>{row.drawn}</td><td>{row.lost}</td><td>{row.gf}</td><td>{row.ga}</td><td>{row.points}</td></tr>)}</tbody></table></div></>:<p>{t.noSeasonHistory}</p>}</dialog>;
}
