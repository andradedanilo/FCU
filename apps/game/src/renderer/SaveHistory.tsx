import {useLayoutEffect,useMemo,useRef,useState} from 'react';
import type {SaveEntry} from '../../../../packages/contracts/src/index.ts';
import {alternateSaveHeads} from '../../../../packages/presentation/src/saveHistory.ts';
import {text as t} from '../../../../packages/presentation/src/text.ts';
import s from './App.module.css';
export function SaveHistory({entries,busy,loading=false,load}:{entries:SaveEntry[];busy:boolean;loading?:boolean;load:(entry:SaveEntry)=>void}){
 const [page,setPage]=useState(0),turned=useRef(false),list=useRef<HTMLDivElement|null>(null),previous=useRef<HTMLButtonElement|null>(null),next=useRef<HTMLButtonElement|null>(null);
 const alternatives=useMemo(()=>alternateSaveHeads(entries),[entries]),pages=Math.max(1,Math.ceil(entries.length/20)),current=Math.min(page,pages-1);
 useLayoutEffect(()=>{if(!turned.current)return;turned.current=false;list.current?.scrollTo(0,0);if(current===0)next.current?.focus();else if(current===pages-1)previous.current?.focus();},[current,pages]);
 function turn(target:number){turned.current=true;setPage(target);}
 return <section className={s.saveHistory} aria-label={t.saveCheckpoints} aria-busy={loading}>
  {alternatives.size>0&&<p className={s.saveNotice}>{t.saveAlternatives}</p>}
  {!loading&&pages>1&&<nav className={s.savePages} aria-label={t.savePages}><button ref={previous} disabled={busy||current===0} onClick={()=>turn(current-1)}>{t.previousPage}</button><span role="status">{current+1} / {pages} <small>{entries.length} {t.saveCheckpoints}</small></span><button ref={next} disabled={busy||current===pages-1} onClick={()=>turn(current+1)}>{t.nextPage}</button></nav>}
  {loading?<p className={s.saveLoading} role="status">{t.readingSaves}</p>:<div ref={list} className={s.saveList}>{entries.length===0?<p>{t.noSaves}</p>:entries.slice(current*20,(current+1)*20).map(entry=><div className={s.saveRow} key={entry.commitId}>{entry.valid?<><span><strong>{entry.club}</strong>{alternatives.has(entry.commitId)&&<b className={s.saveBranch}>{t.saveBranch}</b>}<small>{entry.savedAtUTC.replace('T',' ').slice(0,19)} UTC / {t[entry.kind]} / {entry.season} / {t.round} {entry.round} / {entry.tick}'</small><small>{t.saveCheckpoint}: {entry.commitId.slice(0,8)} / {t.saveApp}: {entry.appVersion??t.saveAppUnknown}</small></span><button disabled={busy} onClick={()=>load(entry)}>{t.load}</button></>:<p>{entry.error==='FUTURE_SAVE'?t.future:t.corrupt}<small>{entry.commitId}</small></p>}</div>)}</div>}
 </section>;
}
