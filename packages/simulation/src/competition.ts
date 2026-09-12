import type {Career,ClubId,Fixture} from '../../contracts/src/index.ts';
import {addDays} from './availability.ts';
import {monday} from './economy.ts';
const compare=(a:string,b:string)=>a<b?-1:a>b?1:0;
export const seasonEnd=(year:number)=>`${year+1}-06-30`;
export function firstFixtureDate(year:number){if(year===2026)return '2026-07-01';let date=`${year}-08-12`;while(!monday(addDays(date,2)))date=addDays(date,1);return date;}
export function schedule(ids: ClubId[],year=2026): Fixture[] {
  const rotation = [...ids]; const first: Fixture[] = [];
  for (let round=0; round<7; round++) {
    for (let i=0;i<4;i++) {
      const a=rotation[i]!; const b=rotation[7-i]!;
      first.push({ id:`fixture-${year===2026?'':year+'-'}${String(round).padStart(2,'0')}-${i}`, round,date:addDays(firstFixtureDate(year),round*7), home:round%2 ? b:a, away:round%2 ? a:b, score:null });
    }
    rotation.splice(1,0,rotation.pop()!);
  }
  return [...first, ...first.map((f,i) => ({ ...f, id:`fixture-${year===2026?'':year+'-'}${String(f.round+7).padStart(2,'0')}-${i%4}`, round:f.round+7,date:addDays(firstFixtureDate(year),(f.round+7)*7), home:f.away, away:f.home }))];
}
export function standings(state: Pick<Career,'clubs'|'fixtures'>) {
  const rows=state.clubs.map(club=>({clubId:club.id,played:0,won:0,drawn:0,lost:0,gf:0,ga:0,points:0}));
  for(const f of state.fixtures){if(!f.score)continue; const h=rows.find(r=>r.clubId===f.home)!;const a=rows.find(r=>r.clubId===f.away)!;const [hg,ag]=f.score;
    h.played++;a.played++;h.gf+=hg;h.ga+=ag;a.gf+=ag;a.ga+=hg;
    if(hg===ag){h.drawn++;a.drawn++;h.points++;a.points++;}else{const w=hg>ag?h:a;const l=hg>ag?a:h;w.won++;w.points+=3;l.lost++;}
  }
  const head=(id:ClubId,group:ClubId[])=>state.fixtures.reduce((n,f)=>{if(!f.score||!group.includes(f.home)||!group.includes(f.away))return n;const side=f.home===id?0:f.away===id?1:-1;if(side!==0&&side!==1)return n;const own=f.score[side]!;const other=f.score[1-side]!;return n+(own>other?3:own===other?1:0);},0);
  return rows.sort((a,b)=>{
    const primary=b.points-a.points||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf;if(primary)return primary;
    const group=rows.filter(r=>r.points===a.points&&r.gf-r.ga===a.gf-a.ga&&r.gf===a.gf).map(r=>r.clubId);
    return head(b.clubId,group)-head(a.clubId,group)||compare(a.clubId,b.clubId);
  });
}
