import {useRef} from 'react';
import {useModal} from './input.ts';
import {audioAssets} from './audioAssets.ts';
import {text as t} from '../../../../packages/presentation/src/text.ts';
import s from './App.module.css';
export function AudioCredits({close}:{close:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);useModal(dialog);
 return <dialog ref={dialog} className={s.dialog} aria-label={t.soundLibrary} onCancel={close}><header><h2>{t.soundLibrary}</h2><button onClick={close}>{t.close}</button></header><p>{t.soundLibraryHint}</p>{Object.entries(audioAssets).map(([key,asset])=><section className={s.audioCredit} key={key}><h3>{t.soundNames[key as keyof typeof t.soundNames]}</h3><audio controls preload="metadata" src={asset.url} aria-label={t.soundNames[key as keyof typeof t.soundNames]} onPlay={event=>{dialog.current?.querySelectorAll('audio').forEach(audio=>{if(audio!==event.currentTarget)audio.pause();});}}/><p>{asset.title} / {asset.author} / {asset.license}</p><p>{asset.source}<br/>{asset.licenseUrl}</p><p>{asset.edit}</p></section>)}</dialog>;
}
