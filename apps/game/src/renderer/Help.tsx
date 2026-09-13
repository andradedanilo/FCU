import {useRef} from 'react';
import {text as t} from '../../../../packages/presentation/src/text.ts';
import {useModal} from './input.ts';
import s from './App.module.css';
export function Help({close}:{close:()=>void}){
 const dialog=useRef<HTMLDialogElement|null>(null);useModal(dialog);
 return <dialog ref={dialog} className={s.help} aria-label={t.help} onCancel={close}><header><h2>{t.help}</h2><button onClick={close}>{t.close}</button></header><p>{t.helpIntro}</p><div>{t.helpTopics.map(topic=><details key={topic.title} name="help-topic"><summary>{topic.title}</summary>{topic.paragraphs.map(paragraph=><p key={paragraph}>{paragraph}</p>)}</details>)}</div></dialog>;
}
