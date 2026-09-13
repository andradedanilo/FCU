import type {SaveEntry} from '../../../../packages/contracts/src/index.ts';
import {alternateSaveHeads} from '../../../../packages/presentation/src/saveHistory.ts';
import {text as t} from '../../../../packages/presentation/src/text.ts';
import s from './App.module.css';
export function SaveHistory({entries,busy,load}:{entries:SaveEntry[];busy:boolean;load:(entry:SaveEntry)=>void}){
 const alternatives=alternateSaveHeads(entries);
 return <section className={s.saveHistory} aria-label={t.saveCheckpoints}>
  {alternatives.size>0&&<p className={s.saveNotice}>{t.saveAlternatives}</p>}
  <div className={s.saveList}>{entries.length===0?<p>{t.noSaves}</p>:entries.map(entry=><div className={s.saveRow} key={entry.commitId}>{entry.valid?<><span><strong>{entry.club}</strong>{alternatives.has(entry.commitId)&&<b className={s.saveBranch}>{t.saveBranch}</b>}<small>{entry.savedAtUTC.replace('T',' ').slice(0,19)} UTC / {t[entry.kind]} / {entry.season} / {t.round} {entry.round} / {entry.tick}'</small><small>{t.saveCheckpoint}: {entry.commitId.slice(0,8)}</small></span><button disabled={busy} onClick={()=>load(entry)}>{t.load}</button></>:<p>{entry.error==='FUTURE_SAVE'?t.future:t.corrupt}<small>{entry.commitId}</small></p>}</div>)}</div>
 </section>;
}
