import type {Career} from '../../contracts/src/index.ts';

function records<T extends object>(source:Record<string,T>):Record<string,T>{
 const result:Record<string,T>={};for(const id of Object.keys(source))result[id]={...source[id]!};return result;
}
// Large flat records need independent writable objects, not a general structured clone.
// Committed ledger entries and archived seasons/transfers are immutable and append-only.
export function copyCareer(state:Career):Career{
 const {players,fixtures,contracts,history,marketArchive,personnel,economy,offers,...rest}=state;
 return {...structuredClone(rest),
  players:players.map(p=>({...p})),
  fixtures:fixtures.map(f=>({...f,score:f.score?[...f.score]:null,shootout:f.shootout?[...f.shootout]:null})),
  contracts:records(contracts),history:[...history],marketArchive:[...marketArchive],
  personnel:{...personnel,players:records(personnel.players),training:records(personnel.training),reports:personnel.reports.map(r=>({...r}))},
  economy:{clubs:economy.clubs.map(c=>({...c})),wages:{...economy.wages},ledger:[...economy.ledger]},
  offers:offers.map(o=>({...o,terms:o.terms?{...o.terms}:null}))
 };
}
