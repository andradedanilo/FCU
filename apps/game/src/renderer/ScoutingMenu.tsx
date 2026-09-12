import {OfferPanel,type MarketAction} from './OfferPanel.tsx';
import {useRef,useState} from 'react';
import type {Career,Command,Role,PlayerId} from '../../../../packages/contracts/src/index.ts';
import {knownAbility} from '../../../../packages/simulation/src/scouting.ts';
import {overall} from '../../../../packages/simulation/src/ratings.ts';
import {ageOn} from '../../../../packages/simulation/src/contracts.ts';
import {text as t} from '../../../../packages/presentation/src/text.ts';
import {useModal} from './input.ts';
import s from './ContractsMenu.module.css';
type ScoutAction=Omit<Extract<Command,{type:'ScoutPlayer'}>,'careerId'|'commandId'|'expectedRevision'>|Omit<Extract<Command,{type:'SetShortlist'}>,'careerId'|'commandId'|'expectedRevision'>;
export function ScoutingMenu({state,initialPlayer,busy,command,close}:{state:Career;initialPlayer:PlayerId|null;busy:boolean;command:(action:ScoutAction|MarketAction)=>Promise<boolean>;close:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);useModal(dialog);
 const [marketView,setMarketView]=useState(initialPlayer&&state.offers.some(o=>o.buyerId===state.clubId&&o.playerId===initialPlayer)?'offers':'all');
 const [negotiating,setNegotiating]=useState(!!initialPlayer&&state.offers.some(o=>o.buyerId===state.clubId&&o.playerId===initialPlayer));
 const [role,setRole]=useState<Role|'all'>('all'),[shortlisted,setShortlisted]=useState(false),[selected,setSelected]=useState(initialPlayer??state.players.find(p=>p.clubId!==state.clubId)!.id);
 const candidates=state.players.filter(p=>(p.clubId!==state.clubId||state.offers.some(o=>o.buyerId===state.clubId&&o.playerId===p.id))&&!p.academy&&(marketView==='all'||(marketView==='free'?p.clubId===null:state.offers.some(o=>o.buyerId===state.clubId&&o.playerId===p.id)))&&(role==='all'||p.role===role)&&(!shortlisted||state.scouting.shortlist.includes(p.id)));
 const player=candidates.find(p=>p.id===selected)??candidates[0];
 const report=player?state.scouting.reports[player.id]:null;
 const own=player?state.players.filter(p=>p.clubId===state.clubId&&p.role===player.role).sort((a,b)=>overall(b)-overall(a))[0]:null;
 const ability=player?knownAbility(state,player):null;
 return <dialog ref={dialog} className={s.dialog} aria-label={t.scouting} onCancel={close}><header><h2>{t.scouting}</h2><button onClick={close}>{t.close}</button></header>
  <p>{state.scouting.active?`${t.scoutDue}: ${state.players.find(p=>p.id===state.scouting.active!.playerId)!.name} / ${state.scouting.active.due}`:t.scoutFree}</p>
  <div className={s.fields}><label>{t.marketFilter}<select value={marketView} onChange={e=>setMarketView(e.target.value)}><option value="all">{t.allMarket}</option><option value="free">{t.freeAgents}</option><option value="offers">{t.negotiations}</option></select></label><label>{t.position}<select value={role} onChange={e=>setRole(e.target.value as Role|'all')}><option value="all">{t.allPositions}</option>{(['GK','DEF','MID','FWD'] as const).map(r=><option key={r}>{r}</option>)}</select></label><button aria-pressed={shortlisted} onClick={()=>setShortlisted(!shortlisted)}>{t.shortlistOnly}</button></div>
  <div className={s.body}><div className={s.players} role="group" aria-label={t.scoutCandidates}>{candidates.map(p=>{const known=knownAbility(state,p);return <button key={p.id} aria-pressed={player?.id===p.id} onClick={()=>setSelected(p.id)}><strong>{p.name}</strong><small>{state.clubs.find(c=>c.id===p.clubId)?.short??t.freeAgent} / {p.role}</small><span>{t.estimatedAbility}: {known.low}-{known.high}</span></button>;})}</div>
   <section className={s.terms}>{player&&ability?<><div className={s.actions}><button aria-pressed={!negotiating} onClick={()=>setNegotiating(false)}>{t.scoutTab}</button><button aria-pressed={negotiating} onClick={()=>setNegotiating(true)}>{t.negotiate}</button></div>{negotiating?<OfferPanel key={player.id} state={state} player={player} busy={busy} command={command}/>:<><h3>{player.name}</h3><p>{t.age}: {ageOn(state.contracts[player.id]!.birthDate,state.date)} / {player.role}</p><div className={s.review}><p>{t.estimatedAbility}<b>{ability.low}-{ability.high}</b></p><p>{report?t.reportDate:t.notScouted}<b>{report?.date??t.uncertainReport}</b></p></div>{own&&<p>{t.compareOwn}: {own.name} / {overall(own)}</p>}<p>{t.scoutingHint}</p><button disabled={busy||player.clubId===state.clubId} aria-pressed={state.scouting.shortlist.includes(player.id)} onClick={()=>void command({type:'SetShortlist',playerId:player.id,listed:!state.scouting.shortlist.includes(player.id)})}>{state.scouting.shortlist.includes(player.id)?t.removeShortlist:t.addShortlist}</button><button disabled={busy||player.clubId===state.clubId||!!state.scouting.active||!!report||state.round>=14} onClick={()=>void command({type:'ScoutPlayer',playerId:player.id})}>{report?t.reportReady:t.scoutPlayer}</button></>}</>:<p>{t.noCandidates}</p>}</section>
  </div></dialog>;
}
