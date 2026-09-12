import type { Career, MatchEvent } from '../../contracts/src/index.ts';
export const text = {
  titleTag:'A whole season of possibilities', startGame:'Start a career', titleMenu:'Title screen', clubhouse:'Clubhouse', back:'Back',
  chooseClub:'Choose your club', chooseHint:'Eight clubs. One trophy. Your story starts here.', prevClub:'Previous club', nextClub:'Next club',
  ready:'Ready for the touchline?', beginHint:'Your eleven. Your season.', squadAction:'Pick the eleven', tableAction:'Chase the trophy',
  seasonTag:'Exhibition season / 2026', gameNote:'Fictional exhibition / 14 rounds / offline',
  speedLabels:{1:'Matchday',3:'Quick play',8:'Fast forward'}, music:'Music', effects:'SFX', on:'On', off:'Off', musicHint:'Original chiptune',
  bench:'Squad list', starters:'Starting eleven', rosterShort:'22 players', broadcast:'FCU LIVE', goalBanner:'GOAL!', replayLabel:'Event celebration', skip:'Skip celebration',
  fps:'Frame rate', retroMode:'RETRO EXHIBITION', scored:'Goal scorer',
  exhibition:'Development exhibition league', edition:'FIRST PLAYABLE / v0.1', home:'Home', squad:'Squad', table:'League table', match:'Match centre',
  newCareer:'New career', begin:'Begin career', club:'Your club', seed:'World seed', seedHint:'Whole number from 0 to 4294967295. Same seed and decisions, same football.',
  intro:'Eight clubs. One small football universe.', introBody:'Take the touchline for a 14-round exhibition season. Pick your eleven and see what happens next.',
  fixtureNotice:'Fictional test players. Balanced generated abilities. A cross-country exhibition, not an actual national league.',
  setupNotice:'Starts 1 July 2026 with a fixed fictional roster and city identity profile. This is an alternate starting world, not a replay of real results.',
  save:'Save', load:'Load', saves:'Saved careers', close:'Close', saved:'Saved to disk.', saving:'Saving...', unsaved:'Unsaved progress', savedStatus:'Checkpoint confirmed', noSaves:'No saved careers yet.',
  corrupt:'Unreadable checkpoint preserved. Choose an earlier valid save.', future:'This checkpoint needs a newer FCU version. It has been preserved.', recovery:'Every checkpoint is listed below. If a newer save is damaged, choose an earlier valid one to recover.',
  nextFixture:'Next fixture', round:'Round', completed:'completed', seasonComplete:'Season complete', seasonBody:'Fourteen rounds played. Your exhibition season is finished. Start a new career to try another club or seed.',
  kickoff:'Kick off', continue:'Continue', play:'Play', pause:'Pause', minute:'Next minute', finish:'Finish half', fullTime:'Full time', halfTime:'Half-time', halfTimeBody:'The first half is complete. Continue when you are ready.',
  squadTitle:'Choose your eleven', squadHint:'Select exactly 11 players, including one goalkeeper. The suggested shape is 4-4-2. Changes apply at the next kickoff.',
  selection:'selected', confirmLineup:'Confirm lineup', autoPick:'Suggest 4-4-2', position:'Role', player:'Player', ability:'Ability', starting:'Start', confirmed:'Lineup confirmed.',
  matchLocked:'Your lineup is locked during this match.', clubName:'Club', played:'P', won:'W', drawn:'D', lost:'L', goalsFor:'GF', goalsAgainst:'GA', difference:'GD', points:'Pts',
  ranking:'Ranking: points, goal difference, goals scored, head-to-head points, then stable club ID (draw-lot fallback).',
  matchIntro:'Your next ninety minutes', matchEmpty:'Kick off from Home to enter the match centre.', events:'Live commentary', noEvents:'The teams are settling into the match.', highlights:'Stylized event highlights', textMode:'Text', threeMode:'3D',
  visualNote:'Animation follows committed match events. Ball movement does not decide the result.', graphicsFailed:'3D is unavailable. Text play remains available and your career is unchanged.',
  shadows:'Shadows', speed:'Speed', shots:'Shots', onTarget:'On target', possession:'Possession', quality:'Chance quality', currentPosition:'League position', record:'Season record', playedRounds:'Rounds played',
  welcome:'THE TOUCHLINE IS YOURS', versus:'vs', live:'LIVE', final:'FINAL', season:'EXHIBITION 2026', roster:'22 fictional players', profile:'City identity profile', next:'Up next',
  errors:{INVALID_LINEUP:'Select eleven distinct players from your club, including exactly one goalkeeper.',STALE_STATE:'The career changed. Review the refreshed state and try again.',DUPLICATE_COMMAND:'This action has already been applied.',INVALID_COMMAND:'This action is not available now.',INVALID_SAVE:'This save is invalid. Choose an earlier checkpoint.',FUTURE_SAVE:'This save needs a newer version of FCU.',IO_ERROR:'The save operation failed. Progress is unsaved; retry Save or choose another checkpoint.',WORKER_FAILED:'The simulation worker stopped. Load a confirmed checkpoint to recover.'},
  event:{pass:'plays the pass',shot:'shoots wide',save:'has a shot saved',goal:'scores'},
  manual:'Manual',auto:'Automatic',newHint:'Existing saved careers remain available under Load.',paused:'Paused',seedInvalid:'Enter a valid whole-number seed.',
} as const;
export function describeEvent(state:Career,event:MatchEvent):string {
  const club=state.clubs.find(c=>c.id===event.clubId)!.short;
  const player=state.players.find(p=>p.id===event.playerId)!.name;
  return `${event.tick}' ${club} / ${player} ${text.event[event.type]}${event.type==='goal'?` (${event.homeGoals}-${event.awayGoals})`:''}`;
}
