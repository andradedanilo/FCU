import type {Career,PlayerId} from '../../../../packages/contracts/src/index.ts';
import {text as t} from '../../../../packages/presentation/src/text.ts';
import s from './App.module.css';
import {academyReview} from '../../../../packages/simulation/src/personnel.ts';
export function MarketNews({state,open}:{state:Career;open:(id:PlayerId)=>void}){
 const own=state.offers.filter(o=>(o.buyerId===state.clubId||o.sellerId===state.clubId)).slice(-3).reverse();
 const other=state.offers.filter(o=>o.buyerId!==state.clubId&&o.sellerId!==state.clubId&&o.status==='completed').slice(-2).reverse();
 const reports=Object.entries(state.scouting.reports).sort((a,b)=>b[1].date.localeCompare(a[1].date)).slice(0,1);
 const academy=academyReview(state),injured=state.players.filter(p=>p.clubId===state.clubId&&p.injuryUntil&&p.injuryUntil>state.date);
 if(!own.length&&!other.length&&!reports.length&&!academy.expiring.length&&!academy.overflow&&!injured.length)return null;
 return <section className={s.marketNews} aria-label={t.marketNews}><h3>{t.marketNews}</h3>{injured.length>0&&<p>{t.squadRecovery}: {injured.map(p=>`${p.name} (${p.injuryUntil})`).join(", ")}</p>}{academy.expiring.length>0&&<p>{t.academyExpiry} {academy.date}: {academy.expiring.map(p=>p.name).join(", ")}</p>}{academy.overflow>0&&<p>{t.academyOverflow} {academy.overflow}. {t.academyReleaseOrder}</p>}{own.map(o=><button key={o.id} onClick={()=>open(o.playerId)}><strong>{state.players.find(p=>p.id===o.playerId)!.name}</strong><span>{state.loans.some(l=>l.id===o.id&&l.status==='returned')?t.loanReturned:o.sellerId===state.clubId&&o.status==='submitted'?t.incomingBidPending:t.offerStatuses[o.status]}{o.reason?` / ${t.offerReasons[o.reason]}`:''}</span></button>)}{reports.map(([id,r])=><button key={id} onClick={()=>open(id as PlayerId)}><strong>{t.reportReady} / {state.players.find(p=>p.id===id)!.name}</strong><span>{r.date} / {t.estimatedAbility}: {r.low}-{r.high}</span></button>)}{other.map(o=><p key={o.id}>{state.clubs.find(c=>c.id===o.buyerId)!.short}: {state.players.find(p=>p.id===o.playerId)!.name} / {t.signed}</p>)}</section>;
}
