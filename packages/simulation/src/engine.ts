import { careerSchema, type Career, type ClubId, type Player, type PlayerId, type Role, type Fixture, type Match, type Command, type Result } from '../../contracts/src/index.ts';
import { clubs } from '../../contracts/src/identity.ts';
import { draw, stream } from './rng.ts';

export const rules = { version: 'exhibition-1', chance: 1200, minChance: 400, maxChance: 2400, homeFactor: 10800, target: 3200, goal: 3000, assist: 7000 } as const;
const roles: Role[] = ['GK','GK', ...Array<Role>(8).fill('DEF'), ...Array<Role>(8).fill('MID'), ...Array<Role>(4).fill('FWD')];
const firstNames = ['Alex','Robin','Sam','Jamie','Morgan','Casey','Drew','Ellis','Jules','Riley','Taylor','Noel','Avery','Cameron','Jordan','Rowan','Finley','Lee','Remy','Sasha','Micah','Quinn'];
const surnames = ['Ashford','Bellwick','Creston','Dalehurst','Elmbridge','Fenwick','Greyford','Harrowell'];
export function overall(p: Player): number {
  if (p.role === 'GK') return Math.round((70*p.goalkeeping+15*p.passing+15*p.stamina)/100);
  if (p.role === 'DEF') return Math.round((60*p.tackling+20*p.pace+20*p.passing)/100);
  if (p.role === 'MID') return Math.round((60*p.passing+20*p.stamina+20*p.tackling)/100);
  return Math.round((60*p.shooting+20*p.pace+20*p.passing)/100);
}
export function autoPick(players: Player[], club: ClubId): PlayerId[] {
  return (['GK','DEF','MID','FWD'] as const).flatMap((role, i) => players.filter(p => p.clubId === club && p.role === role).sort((a,b) => overall(b)-overall(a) || compare(a.id,b.id)).slice(0, [1,4,4,2][i]).map(p => p.id));
}
export function validLineup(players: Player[], club: ClubId, lineup: PlayerId[]): boolean {
  if (lineup.length !== 11 || new Set(lineup).size !== 11) return false;
  const selected = lineup.map(id => players.find(p => p.id === id && p.clubId === club));
  return selected.every(p => p !== undefined) && selected.filter(p => p?.role === 'GK').length === 1;
}
export function schedule(ids: ClubId[]): Fixture[] {
  const rotation = [...ids]; const first: Fixture[] = [];
  for (let round=0; round<7; round++) {
    for (let i=0;i<4;i++) {
      const a=rotation[i]!; const b=rotation[7-i]!;
      first.push({ id:`fixture-${String(round).padStart(2,'0')}-${i}`, round, home:round%2 ? b:a, away:round%2 ? a:b, score:null });
    }
    rotation.splice(1,0,rotation.pop()!);
  }
  return [...first, ...first.map((f,i) => ({ ...f, id:`fixture-${String(f.round+7).padStart(2,'0')}-${i%4}`, round:f.round+7, home:f.away, away:f.home }))];
}
export function createCareer(careerId: string, seed: number, club: ClubId): Career {
  const players = clubs.flatMap((c, ci) => roles.map((role, i) => {
    let rng = stream(1, `players/${ci}/${i}`);
    const rating = () => { let value; [rng,value]=draw(rng); return 55+value%16; };
    return {id:`player-${String(ci+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}` as PlayerId, clubId:c.id, name:`${firstNames[i]} ${surnames[ci]}`, role, goalkeeping:role==='GK'?rating():15, tackling:rating(), passing:rating(), shooting:rating(), pace:rating(), stamina:rating(), discipline:rating()};
  }));
  if (!clubs.some(c => c.id === club)) throw new Error('INVALID_COMMAND');
  return careerSchema.parse({ careerId, seed, clubId:club, revision:0, appliedCommands:[], engineVersion:'0.1.0', rulesetVersion:rules.version, snapshotId:'fictional-2026-v1', identityProfileId:'fcu-city-v1', identityProfileVersion:1, date:'2026-07-01', clubs, players, lineup:autoPick(players,club), fixtures:schedule(clubs.map(c=>c.id)), round:0, match:null });
}
const emptyStats = () => ({shots:0,onTarget:0,quality:0,possession:0});
export function startMatch(state: Career, fixture: Fixture): Match {
  return {fixtureId:fixture.id, home:fixture.home, away:fixture.away, tick:0, rng:stream(state.seed,`match/${fixture.id}`), homeLineup:fixture.home===state.clubId?state.lineup:autoPick(state.players,fixture.home), awayLineup:fixture.away===state.clubId?state.lineup:autoPick(state.players,fixture.away), homeGoals:0,awayGoals:0,homeStats:emptyStats(),awayStats:emptyStats(),events:[]};
}
function strength(players: Player[]) {
  const mean = (role: Role) => { const group=players.filter(p=>p.role===role); return group.length ? Math.round(group.reduce((n,p)=>n+overall(p)*104,0)/group.length)/100:10; };
  return { A:mean('FWD'),M:mean('MID'),D:mean('DEF'),K:mean('GK') };
}
const clamp = (n:number,lo:number,hi:number) => Math.max(lo,Math.min(hi,Math.round(n)));
export function advanceMatch(previous: Match, players: Player[], minutes: number): Match {
  const match=structuredClone(previous);
  const lineups=[match.homeLineup,match.awayLineup].map(ids=>ids.map(id=>players.find(p=>p.id===id)!));
  const strengths=lineups.map(strength);
  const roll=()=>{let value; [match.rng,value]=draw(match.rng); return value%10000;};
  const weighted=(pool:Player[],weight:(p:Player)=>number):Player=>{
    const total=pool.reduce((n,p)=>n+weight(p),0); let target=roll()*total/10000;
    for (const p of pool) {target-=weight(p);if(target<0)return p;} return pool[pool.length-1]!;
  };
  const end=Math.min(90,match.tick+minutes,match.tick<45?45:90);
  while(match.tick<end) {
    match.tick++;
    const homePossession=Math.round(10000*strengths[0]!.M/(strengths[0]!.M+strengths[1]!.M));
    match.homeStats.possession+=homePossession; match.awayStats.possession+=10000-homePossession;
    const order=roll()<5000?[0,1]:[1,0];
    for(const side of order) {
      const own=strengths[side]!; const other=strengths[1-side]!;
      const chance=clamp(rules.chance*(own.A+own.M)/(other.D+other.M)*(side===0?rules.homeFactor/10000:1),rules.minChance,rules.maxChance);
      if(roll()>=chance) continue;
      const shooter=weighted(lineups[side]!.filter(p=>p.role!=='GK'),p=>p.shooting*(p.role==='FWD'?3:p.role==='MID'?2:1));
      const passer=weighted(lineups[side]!.filter(p=>p.id!==shooter.id),p=>p.passing);
      const team=side===0?match.home:match.away;
      const emit=(type:'pass'|'shot'|'save'|'goal', id:PlayerId, assistId:PlayerId|null=null)=>match.events.push({tick:match.tick,order:match.events.length,clubId:team,playerId:id,assistId,type,homeGoals:match.homeGoals,awayGoals:match.awayGoals});
      emit('pass',passer.id);
      const target=clamp(rules.target+(shooter.shooting-other.D)*40,2000,6000);
      const goal=clamp(rules.goal+(shooter.shooting-other.K)*40,1200,5500);
      const stats=side===0?match.homeStats:match.awayStats;
      stats.shots++;stats.quality+=Math.round(target*goal/10000);
      if(roll()>=target){emit('shot',shooter.id);continue;}
      stats.onTarget++;
      if(roll()>=goal){emit('save',shooter.id);continue;}
      if(side===0)match.homeGoals++;else match.awayGoals++;
      emit('goal',shooter.id,roll()<rules.assist?passer.id:null);
    }
  }
  return match;
}
export function applyCommand(state: Career, command: Command): Result<Career> {
  if(command.careerId!==state.careerId||command.expectedRevision!==state.revision)return {ok:false,error:'STALE_STATE'};
  if(state.appliedCommands.includes(command.commandId))return {ok:false,error:'DUPLICATE_COMMAND'};
  const next=structuredClone(state);
  if(command.type==='SelectLineup') {
    if(state.match && state.match.tick<90)return {ok:false,error:'INVALID_COMMAND'};
    if(!validLineup(state.players,state.clubId,command.lineup))return {ok:false,error:'INVALID_LINEUP'};
    next.lineup=command.lineup;
  } else if(command.type==='StartMatch') {
    if(state.round>=14||(state.match&&state.match.tick<90))return {ok:false,error:'INVALID_COMMAND'};
    if(!validLineup(state.players,state.clubId,state.lineup))return {ok:false,error:'INVALID_LINEUP'};
    next.match=startMatch(state,state.fixtures.find(f=>f.round===state.round&&(f.home===state.clubId||f.away===state.clubId))!);
  } else {
    if(!state.match||state.match.tick===90)return {ok:false,error:'INVALID_COMMAND'};
    next.match=advanceMatch(state.match,state.players,command.minutes);
    if(next.match.tick===90) {
      next.fixtures=state.fixtures.map(f=>{
        if(f.round!==state.round)return f;
        let m=f.id===next.match!.fixtureId?next.match!:startMatch(state,f);
        if(m.tick<90){m=advanceMatch(m,state.players,90);m=advanceMatch(m,state.players,90);}
        return {...f,score:[m.homeGoals,m.awayGoals]};
      });
      next.round++;
      // Date-only calendar arithmetic; no host timezone or wall clock.
      const day=1+next.round*7; const month=day<=31?7:day<=62?8:day<=92?9:10;
      const date=day-(month===7?0:month===8?31:month===9?62:92);
      next.date=`2026-${String(month).padStart(2,'0')}-${String(date).padStart(2,'0')}`;
    }
  }
  next.revision++;next.appliedCommands=[...state.appliedCommands,command.commandId].slice(-256);
  return {ok:true,value:next};
}
function compare(a:string,b:string){return a<b?-1:a>b?1:0;}
export function standings(state: Career) {
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
export function validateCareer(input: unknown): Career {
  const state=careerSchema.parse(input);
  const ids=state.clubs.map(c=>c.id);
  if(new Set(ids).size!==8||new Set(state.players.map(p=>p.id)).size!==176||!ids.includes(state.clubId)||!validLineup(state.players,state.clubId,state.lineup))throw new Error('INVALID_SAVE');
  if(ids.some(id=>state.players.filter(p=>p.clubId===id).length!==22))throw new Error('INVALID_SAVE');
  const expected=schedule(ids);
  if(state.fixtures.some((f,i)=>{const e=expected[i]!;return f.id!==e.id||f.home!==e.home||f.away!==e.away||f.round!==e.round||(f.score!==null)!==(f.round<state.round);}))throw new Error('INVALID_SAVE');
  if(state.match){const m=state.match;const f=state.fixtures.find(f=>f.id===m.fixtureId);if(!f||f.home!==m.home||f.away!==m.away||f.round!==(m.tick===90?state.round-1:state.round)||!validLineup(state.players,m.home,m.homeLineup)||!validLineup(state.players,m.away,m.awayLineup)||m.events.some((e,i)=>e.order!==i||e.tick>m.tick||!state.players.some(p=>p.id===e.playerId&&p.clubId===e.clubId)))throw new Error('INVALID_SAVE');}
  return state;
}
