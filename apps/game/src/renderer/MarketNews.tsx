import type {Career,PlayerId} from '../../../../packages/contracts/src/index.ts';
import {text as t} from '../../../../packages/presentation/src/text.ts';
import s from './App.module.css';
export function MarketNews({state,open}:{state:Career;open:(id:PlayerId)=>void}){
 const own=state.offers.filter(o=>o.buyerId===state.clubId).slice(-3).reverse();
 const other=state.offers.filter(o=>o.buyerId!==state.clubId&&o.status==='completed').slice(-2).reverse();
 const reports=Object.entries(state.scouting.reports).sort((a,b)=>b[1].date.localeCompare(a[1].date)).slice(0,1);
 if(!own.length&&!other.length&&!reports.length)return null;
 return <section className={s.marketNews} aria-label={t.marketNews}><h3>{t.marketNews}</h3>{own.map(o=><button key={o.id} onClick={()=>open(o.playerId)}><strong>{state.players.find(p=>p.id===o.playerId)!.name}</strong><span>{state.loans.some(l=>l.id===o.id&&l.status==='returned')?t.loanReturned:t.offerStatuses[o.status]}{o.reason?` / ${t.offerReasons[o.reason]}`:''}</span></button>)}{reports.map(([id,r])=><button key={id} onClick={()=>open(id as PlayerId)}><strong>{t.reportReady} / {state.players.find(p=>p.id===id)!.name}</strong><span>{r.date} / {t.estimatedAbility}: {r.low}-{r.high}</span></button>)}{other.map(o=><p key={o.id}>{state.clubs.find(c=>c.id===o.buyerId)!.short}: {state.players.find(p=>p.id===o.playerId)!.name} / {t.signed}</p>)}</section>;
}
