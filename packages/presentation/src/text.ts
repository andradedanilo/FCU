import { brand, type Career, type MatchEvent } from '../../contracts/src/index.ts';
export const text = {
  tactics:'Tactics',formation:'Formation',mentality:'Mentality',tempo:'Tempo',pressing:'Pressing',applyTactics:'Apply tactics',tacticsConfirmed:'Tactics confirmed. Changes affect the next minute.',tacticsHint:'Arrange the current eleven. Use Suggest lineup in Squad to pick natural roles before kickoff. Changes also carry into the next fixture.',positionWarning:'Out of position: 80% effectiveness',pressingHint:'Pressing affects midfield strength. Fatigue costs arrive in v0.3.',mentalityHint:'Cautious reduces chances for both teams; attacking increases them.',tempoHint:'Slow creates fewer attempts; fast creates more.',tacticalMigration:'Earlier saves load with balanced tactics. Future play uses the new tactical rules; original checkpoints are preserved.',choices:{cautious:'Cautious',balanced:'Balanced',attacking:'Attacking',slow:'Slow',normal:'Normal',fast:'Fast',low:'Low',high:'High'},
  substitutions:'Substitutions',onPitch:'On the pitch',matchBench:'Match bench',makeChange:'Confirm substitution',subHint:'Choose a player to take off and a replacement. Changes affect the next minute. The nine-player bench is selected at kickoff.',subCount:'Changes',windows:'Stoppages',subConfirmed:'Substitution confirmed. Resume when ready.',
  pixelBoards:`${brand.short}  /  HALF TIME SODA  /  ONE MORE MATCH`, artPreview:'Art preview', previewGoal:'Preview goal', previewSave:'Preview save', previewMiss:'Preview miss', previewNote:'Art preview - does not affect your match', saveBanner:'WHAT A SAVE!', missBanner:'OFF TARGET', skipHighlight:'Skip highlight', canvasFailed:'Highlights are unavailable. Live commentary continues.',
  titleTag:'A whole season of possibilities', startGame:'Start a career', titleMenu:'Title screen', clubhouse:'Clubhouse', back:'Back',
  chooseClub:'Choose your club', chooseHint:'Eight clubs. One trophy. Your story starts here.', prevClub:'Previous club', nextClub:'Next club',
  ready:'Ready for the touchline?', beginHint:'Your eleven. Your season.', squadAction:'Pick the eleven', tableAction:'Chase the trophy',
  seasonTag:'Exhibition season / 2026', gameNote:'Fictional exhibition / 14 rounds / offline',
  matchClock:'Match clock', fixedSpeed:'Match pace: 2x', matchStats:'Match statistics', noChance:'Play continues. Waiting for the next chance.', music:'Music', effects:'SFX', on:'On', off:'Off', musicHint:'Original chiptune',
  bench:'Squad list', starters:'Starting eleven', rosterShort:'22 players', broadcast:'FCU LIVE', goalBanner:'GOAL!',
  retroMode:'RETRO EXHIBITION', scored:'Goal scorer',
  exhibition:'Development exhibition league', edition:'FIRST PLAYABLE / v0.2', home:'Home', squad:'Squad', table:'League table', match:'Match centre',
  newCareer:'New career', begin:'Begin career', club:'Your club', seed:'World seed', seedHint:'Whole number from 0 to 4294967295. Same seed and decisions, same football.',
  intro:'Eight clubs. One small football universe.', introBody:'Take the touchline for a 14-round exhibition season. Pick your eleven and see what happens next.',
  fixtureNotice:'Fictional test players. Balanced generated abilities. A cross-country exhibition, not an actual national league.',
  setupNotice:'Starts 1 July 2026 with a fixed fictional roster and city identity profile. This is an alternate starting world, not a replay of real results.',
  save:'Save', load:'Load', saves:'Saved careers', close:'Close', saved:'Saved to disk.', saving:'Saving...', unsaved:'Unsaved progress', savedStatus:'Checkpoint confirmed', noSaves:'No saved careers yet.',
  corrupt:'Unreadable checkpoint preserved. Choose an earlier valid save.', future:'This checkpoint needs a newer FCU version. It has been preserved.', recovery:'Every checkpoint is listed below. If a newer save is damaged, choose an earlier valid one to recover.',
  nextFixture:'Next fixture', round:'Round', completed:'completed', seasonComplete:'Season complete', seasonBody:'Fourteen rounds played. Your exhibition season is finished. Start a new career to try another club or seed.',
  kickoff:'Kick off', continue:'Continue', play:'Play', pause:'Pause', continuousHalf:'Continue through half-time', fullscreenHint:'F11: fullscreen / window', fullTime:'Full time', halfTime:'Half-time', halfTimeBody:'The first half is complete. Continue when you are ready.',
  squadTitle:'Choose your eleven', squadHint:'Select exactly 11 players, including one goalkeeper. Choose a formation in Tactics. Changes apply at the next kickoff.',
  selection:'selected', confirmLineup:'Confirm lineup', autoPick:'Suggest lineup', position:'Role', player:'Player', ability:'Ability', starting:'Start', confirmed:'Lineup confirmed.',
  matchLocked:'Your lineup is locked during this match.', clubName:'Club', played:'P', won:'W', drawn:'D', lost:'L', goalsFor:'GF', goalsAgainst:'GA', difference:'GD', points:'Pts',
  ranking:'Ranking: points, goal difference, goals scored, head-to-head points, then stable club ID (draw-lot fallback).',
  matchIntro:'Your next ninety minutes', matchEmpty:'Kick off from Home to enter the match centre.', events:'Live commentary', noEvents:'The teams are settling into the match.', highlights:'Stylized event highlights',
  visualNote:'Short pixel-art scenes illustrate committed chances. The simulation decides results.',
  speed:'Speed', shots:'Shots', onTarget:'On target', possession:'Possession', quality:'Chance quality', currentPosition:'League position', record:'Season record', playedRounds:'Rounds played',
  welcome:'THE TOUCHLINE IS YOURS', versus:'vs', live:'LIVE', final:'FINAL', season:'EXHIBITION 2026', roster:'22 fictional players', profile:'City identity profile', next:'Up next',
  errors:{INVALID_SUBSTITUTION:'Choose an active player and an unused bench player, keeping one goalkeeper. Maximum five changes in three stoppages; half-time is free.',INVALID_LINEUP:'Select eleven distinct players from your club, including exactly one goalkeeper.',STALE_STATE:'The career changed. Review the refreshed state and try again.',DUPLICATE_COMMAND:'This action has already been applied.',INVALID_COMMAND:'This action is not available now.',INVALID_SAVE:'This save is invalid. Choose an earlier checkpoint.',FUTURE_SAVE:'This save needs a newer version of FCU.',IO_ERROR:'The save operation failed. Progress is unsaved; retry Save or choose another checkpoint.',WORKER_FAILED:'The simulation worker stopped. Load a confirmed checkpoint to recover.'},
  event:{pass:'plays the pass',shot:'shoots off target',save:'has a shot saved',goal:'scores'},
  manual:'Manual',auto:'Automatic',newHint:'Existing saved careers remain available under Load.',paused:'Paused',seedInvalid:'Enter a valid whole-number seed.',
} as const;
export function describeEvent(state:Career,event:MatchEvent):string {
  const club=state.clubs.find(c=>c.id===event.clubId)!.short;
  const player=state.players.find(p=>p.id===event.playerId)!.name;
  return `${event.tick}' ${club} / ${player} ${text.event[event.type]}${event.type==='goal'?` (${event.homeGoals}-${event.awayGoals})`:''}`;
}
