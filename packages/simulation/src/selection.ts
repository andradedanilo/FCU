import {formationCounts,type Player,type ClubId,type PlayerId,type Tactics} from '../../contracts/src/index.ts';
import {available} from './availability.ts';
import {effectiveRating} from './ratings.ts';
const compare=(a:string,b:string)=>a<b?-1:a>b?1:0;
export function autoPick(players: Player[], club: ClubId,formation:Tactics['formation']='4-4-2',date='2026-07-01'): PlayerId[] {
  const natural=(['GK','DEF','MID','FWD'] as const).flatMap((role, i) => players.filter(p => p.clubId === club && p.role === role && available(p,date)).sort((a,b) => effectiveRating(b)-effectiveRating(a) || compare(a.id,b.id)).slice(0, formationCounts[formation][i]).map(p => p.id));
  const extras=players.filter(p=>p.clubId===club&&p.role!=='GK'&&available(p,date)&&!natural.includes(p.id)).sort((a,b)=>effectiveRating(b)-effectiveRating(a)||compare(a.id,b.id));
  return [...natural,...extras.map(p=>p.id)].slice(0,11);
}
export function validLineup(players: Player[], club: ClubId, lineup: PlayerId[]): boolean {
  if (lineup.length < 7 || lineup.length > 11 || new Set(lineup).size !== lineup.length) return false;
  const selected = lineup.map(id => players.find(p => p.id === id && p.clubId === club));
  return selected.every(p => p !== undefined) && selected.filter(p => p?.role === 'GK').length <= 1;
}
// Reserve one goalkeeper and the eight highest-rated remaining outfield players.
export function pickBench(players:Player[],club:ClubId,lineup:PlayerId[],date='2026-07-01'):PlayerId[] {
 const reserves=players.filter(p=>p.clubId===club&&!lineup.includes(p.id)&&available(p,date)).sort((a,b)=>effectiveRating(b)-effectiveRating(a)||compare(a.id,b.id));
 return [...reserves.filter(p=>p.role==='GK').slice(0,1),...reserves.filter(p=>p.role!=='GK').slice(0,8)].map(p=>p.id);
}
