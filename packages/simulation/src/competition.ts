import type {Career,ClubId,Fixture} from '../../contracts/src/index.ts';
import {addDays} from './availability.ts';
import {monday} from './economy.ts';
const compare=(a:string,b:string)=>a<b?-1:a>b?1:0;
export function compareFixtures(a:Pick<Fixture,'date'|'id'>,b:Pick<Fixture,'date'|'id'>){return compare(a.date,b.date)||compare(a.id,b.id);}
export const seasonEnd=(year:number)=>`${year+1}-06-30`;
export function firstFixtureDate(year:number,exhibition=true){if(exhibition&&year===2026)return '2026-07-01';let date=`${year}-08-12`;while(!monday(addDays(date,2)))date=addDays(date,1);return date;}
export function schedule(ids:ClubId[],year=2026,competitionId='EXH'):Fixture[]{
 if(ids.length<2||ids.length%2!==0||new Set(ids).size!==ids.length)throw Error('INVALID_COMMAND');
 const rotation=[...ids],first:Fixture[]=[],rounds=ids.length-1,half=ids.length/2,date=firstFixtureDate(year,competitionId==='EXH');
 const id=(round:number,index:number)=>competitionId==='EXH'?`fixture-${year===2026?'':year+'-'}${String(round).padStart(2,'0')}-${index}`:`fixture-${year}-${competitionId}-${String(round).padStart(2,'0')}-${index}`;
 for(let round=0;round<rounds;round++){for(let i=0;i<half;i++){const a=rotation[i]!,b=rotation[ids.length-1-i]!;first.push({id:id(round,i),competitionId,competitionClass:'league',neutral:false,decider:false,cupTieId:null,shootout:null,forfeit:null,round,date:addDays(date,round*7),home:round%2?b:a,away:round%2?a:b,score:null});}rotation.splice(1,0,rotation.pop()!);}
 return [...first,...first.map((f,i)=>({...f,id:id(f.round+rounds,i%half),round:f.round+rounds,date:addDays(date,(f.round+rounds)*7),home:f.away,away:f.home}))];
}
export function worldSchedule(world:Career['world'],year:number){return world.divisions.flatMap(d=>schedule(d.clubs,year,d.id)).sort((a,b)=>compare(a.date,b.date)||compare(a.id,b.id));}
export function divisionFor(state:Pick<Career,'world'|'clubId'>){return state.world.divisions.find(d=>d.clubs.includes(state.clubId))!;}
export function nextManagedFixture(state:Pick<Career,'fixtures'|'clubId'>){return state.fixtures.find(f=>f.score===null&&(f.home===state.clubId||f.away===state.clubId));}
export function seasonComplete(state:Pick<Career,'fixtures'>){return state.fixtures.every(f=>f.score!==null);}
export function standings(state:Pick<Career,'clubs'|'fixtures'>&Partial<Pick<Career,'world'|'clubId'>>,divisionId?:string) {
  const division=state.world?.divisions.find(d=>divisionId?d.id===divisionId:d.clubs.includes(state.clubId!));
  const fixtures=state.fixtures.filter(f=>!division||f.competitionId===division.id);
  const rows=state.clubs.filter(c=>!division||division.clubs.includes(c.id)).map(club=>({clubId:club.id,played:0,won:0,drawn:0,lost:0,gf:0,ga:0,points:0}));
  for(const f of fixtures){if(!f.score)continue; const h=rows.find(r=>r.clubId===f.home)!;const a=rows.find(r=>r.clubId===f.away)!;const [hg,ag]=f.score;
    h.played++;a.played++;h.gf+=hg;h.ga+=ag;a.gf+=ag;a.ga+=hg;
    if(hg===ag){h.drawn++;a.drawn++;h.points++;a.points++;}else{const w=hg>ag?h:a;const l=hg>ag?a:h;w.won++;w.points+=3;l.lost++;}
  }
  const head=(id:ClubId,group:ClubId[])=>fixtures.reduce((n,f)=>{if(!f.score||!group.includes(f.home)||!group.includes(f.away))return n;const side=f.home===id?0:f.away===id?1:-1;if(side!==0&&side!==1)return n;const own=f.score[side]!;const other=f.score[1-side]!;return n+(own>other?3:own===other?1:0);},0);
  return rows.sort((a,b)=>{
    const primary=b.points-a.points||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf;if(primary)return primary;
    const group=rows.filter(r=>r.points===a.points&&r.gf-r.ga===a.gf-a.ga&&r.gf===a.gf).map(r=>r.clubId);
    return head(b.clubId,group)-head(a.clubId,group)||compare(a.clubId,b.clubId);
  });
}
