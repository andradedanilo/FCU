# Football Club Universe (FCU)

A fast, offline football management prototype for Windows and native Linux.

The match board places statistics above team management on the left, and commentary above highlights on the right. Play/Pause is beside the central clock. Match effects are available as individual WAV files in `apps/game/src/renderer/assets/audio`: `kick`, `whistle`, `crowd`, `cheer`, `groan` and `tackle`. They play at normal audio speed even while the match runs at 2x. Open Sound library in the footer to audition the recorded effects and view their source credits.

**Status: v0.9.0 in development on Windows.** Windows development and packaged launch have been tested. Native Linux packaging is configured but not yet built or tested on Linux. No public release or Steam compatibility claim is made.

## Build your club

Choose a club in England, Spain, France, Italy or Germany. The development world has 176 city-based clubs across five top divisions and five fictional second divisions, with 22 generated players per club at the start. All ten leagues stay active. Top divisions contain 20, 20, 18, 20 and 18 clubs respectively; second divisions contain 16 each. The top two second-division clubs swap places with the bottom two top-division clubs after each season. You can also choose the compact eight-club, 14-round exhibition. These are simplified fictional competitions.

Matches run minute by minute in a deterministic worker. A larger permanent highlight screen fills the left panel. Live commentary sits above compact statistics in the right column; both stay visible during highlights. Use Play/Pause at the fixed 2x pace. The running clock freezes on pause and shows 45+ and 90+ stoppage time. After kickoff, open Substitutions to pause and replace players. You have five changes across three stoppages; multiple changes at the same paused minute share a stoppage, and half-time changes use none. No re-entry. Choose up to nine eligible reserves, ideally including a goalkeeper, in Squad before kickoff; the match freezes that bench. Changes affect future minutes; close the panel and press Play to resume. Half-time pauses by default; enable Continue through half-time to play on automatically. Artwork loading failure leaves commentary available without losing the career.

Tactics is available from Squad before kickoff and during a match. Choose 4-4-2, 4-3-3 or 4-2-3-1, plus mentality, tempo and pressing. Formation changes rearrange your current eleven; Suggest lineup picks natural roles before kickoff. Out-of-position assignments reduce role strength to 80%. Live changes apply from the next minute and carry into the next fixture. Players now lose condition during matches. High pressing and fast tempo increase that cost; effective strength follows condition and morale. Squad shows condition/morale, and Training controls recovery before the next fixture. Save up to three tactical setups. Use setup previews the saved controls; Apply tactics commits them. Opponents make one score-based mentality change after minute 60.

Club finances shows cash, weekly wages, the wage budget, available transfer funds and a dated transaction history. Home gates, Monday wages/overheads and monthly sponsorship change cash as rounds progress. Figures are fictional game estimates. Squad includes Player contracts: inspect age, expiry and wage, review renewal costs, then confirm a longer term. Signing bonuses and wage changes are real financial commitments. Scouting provides a shortlist, position filters and uncertain ability comparisons. One scout completes a report in seven days. Between fixtures, Next day or Advance to next event processes recovery and operating costs, stopping at a report or match day. Match completion no longer skips the week automatically. Scouting also lets you negotiate club bids and player contracts, review all costs and register a signing. Twelve fictional free agents are available. Club replies arrive next day; offers expire after seven days. Closed-window club deals wait for the next opening and recheck finances before payment. Club news links to negotiations and completed reports. AI clubs fill squad gaps with at most two targets each Monday during the window, using the same money checks. Your players are never sold automatically. Request a loan with 0%, 50% or 100% wage contribution. The parent retains ownership, and the player returns automatically on June 30. Loan players can be selected normally; returning players are removed from the borrower's lineup and bench. At June 30, Start next season pays league prizes, releases expired contracts and begins a new July. Season history retains each completed table and results. Browse any division in League table or Season history. Annual closing balances and prizes remain in history; Club finances shows the current season ledger.

Development builds can import unsigned FCU roster ZIPs and select an installed version when starting a new five-country career. Existing careers retain their own players and snapshot identity. Imported squads keep every player: up to 30 seniors are active, with extra players retained under contract and available through Squad registration. Loaned players retain their parent club; returning loans reserve active places. Packaged builds reject unsigned development packs.

The game starts fullscreen; **F11** toggles window mode. The layout fills the available display. The retro title screen leads to club selection and a clubhouse with large action tiles. Squad selection uses a lineup board, and the match broadcast pairs commentary with large statistical comparisons and a prominent scoreboard. Detailed original pixel-art stills show a player preparing a shot, then cut to celebration, a held save or disappointment. Players, ball and crowd do not animate. Action scenes clear between chances. Blue/white represents your team and red/white the opponent, including supporter colors. Before Play, the teams line up with the referees. Score, commentary and statistics reveal a selected chance at its outcome cut. Cards and injuries take priority over simultaneous chances; every third off-target attempt is eligible for a cutaway. All attempts still appear in the commentary and statistics. While paused, expand Art preview and use Preview goal, Preview save or Preview miss to audition the art without changing your career. Skip highlight clears the action still without advancing time. The 29 bundled stills also show tackles and referee decisions, injuries, substitutions, tactical coaching, halftime, the winning side and ordered penalty-shootout reveals. Additional scenes can be auditioned from Art preview. Recorded crowd ambience, whistles and kick sounds accompany play. Synthesized music is optional; Music and SFX have independent toggles and pause while the game is hidden. Music and SFX choices are retained on this computer between sessions, separately from game saves. Clubhouse, Squad, Match centre and League table are playable. Manual Save and Load retain mid-match substitutions. Existing v0.1 and v0.2.0 checkpoints load with balanced tactics and preserved benches/substitution history where present. Future play uses the new tactical rules; a notice explains the change. Original files stay untouched, and the next save creates a v0.7.4 checkpoint. Older builds cannot open these newer saves. Existing country careers gain cups at the next season rollover, preserving their current fixtures. Exhibition careers remain cup-free. Manual Save and Load support checkpoints during matches; completed rounds save automatically. Load lists previous checkpoints and identifies unreadable ones for recovery. Alternate continuations with a shared ancestor are marked; choosing one preserves the others. Saves stay outside the installation folder, under Electron user data (`%APPDATA%\fcu\saves` on Windows, normally `~/.config/fcu/saves` on Linux). Closing requests a final checkpoint. If saving fails, retry, return to the game or explicitly quit without saving; earlier confirmed checkpoints remain available. System suspend pauses play and requests a save; resume leaves the match paused. Hardware sleep can interrupt a write before completion, so retain confirmed checkpoints.

Seasons repeat with promotion, relegation, contract expiry and preseason recruitment. Five domestic cups include both tiers. A 16-club continental cup uses two legs through the semi-finals and a neutral final, with no away-goals rule. Level deciding ties continue into two 15-minute extra-time periods and, if needed, a penalty shootout. Penalties appear in commentary and the scoreboard, separately from open-play goals. Browse draws, byes, results and winners from the League table competition selector. Cup prizes and histories carry through season closing.

At full time, Match report shows points earned, league position, scorers and chance figures. Reopen the last result from the clubhouse.

Keyboard: arrows or Tab move focus, Enter confirms, Esc goes back, P plays/pauses, and Q/E change sections. Standard gamepads use D-pad/left stick, south button to confirm, east button to go back, shoulders for sections and Start for Play/Pause. Controller confirm on a name or numeric field opens an offline keyboard; dropdowns open a controller-friendly chooser. Steam-specific integration and physical controller verification remain future work.

Injuries and dismissals pause the match for your decision. Replace an injured player or continue short-handed; sent-off players cannot return. League, domestic-cup and continental-cup bookings accumulate toward separate bans. Squad identifies unavailable players and offers bounded fictional academy cover for severe shortages. Added time is simulated, and match probabilities have been checked with a fixed 500-match development batch.

Club finances also offers academy and recovery upgrades, paid from available funds and completed after 30 in-game days. Squad also shows training focus, potential and senior minutes. Players develop or decline annually, retire with age, and clubs receive four academy prospects each new season.

Board and career shows your season objective and confidence. Poor results or prolonged negative cash can end your job; choose an offered club to continue with your manager history intact, or retire. Assisted career prevents dismissal. Recovery loans are capped at annual sponsorship and repaid in 52 weekly installments without interest.

Scouting includes an Assistant review with two squad priorities and up to three affordable candidate links. Review the estimated ability and costs, then scout or negotiate through the normal controls.

FCU Dream Club is a separate fantasy league with eight clubs and 14 rounds. Name your club, choose an opponent tier and earn one player-choice pack every three completed matches, plus one at season end. Wins and losses count equally. Watch matches or use Instant result. Pick one of the saved candidates and activate the new player from Collection and active squad. Rewards never carry into Career. Dream saves use the dream-saves folder under the same user-data root. Save and Load are available inside Dream Club; mandatory reward checkpoints save automatically. Returning to the title also saves current Dream progress; a failed save keeps the game open for retry.

Training intensity also affects injury risk on non-match days. Calendar advancement stops when someone in your team is hurt; Club news shows recovery dates. In June it also warns about academy contract expiry and possible releases after the next intake.

Open Diagnostics in the footer to inspect the build identity and export a local technical report. It includes recent file-operation timings and error codes, without saves, names, paths or credentials. No report is uploaded.

## Run from source

Tested development tools: Node.js 26.8.2 and npm 12.0.2. Dependencies are pinned in the lockfile. The first launch may download Electron; installed gameplay is offline.

```sh
npm ci
npm run dev
```

For a production build without the development server:

```sh
npm run build
npm start
```

Choose **Start a career**, select a club and seed, then **Begin career**. Open **Squad** to edit the eleven and choose **Confirm lineup**. Return to **Clubhouse**, use **Advance to next event** until match day, choose **Kick off**, then **Play**. Use **Play/Pause** to control the action; choose **Continue** after full time to reach the next fixture.

## Build a portable folder

Run the corresponding command on its native OS, after `npm ci` and `npm run build`:

```sh
# Windows
npm run package:win
# Linux
npm run package:linux
```

Run `npm run start:packaged` to open the most recently built native folder.
The packaging command prints its unique `release/build-*` folder. Windows uses `Football Club Universe.exe`; Linux uses `fcu` (configured; unverified on Linux).
Keep the complete output folder together. These are unsigned local prototype builds, not published installers. No GitHub Actions or hosted build service is used.

npm 12.0.2 or newer is required. If npm offers an update, use `npm install --global npm@12.0.2` for this recorded setup. Install scripts are restricted to the pinned esbuild version. Audit reporting stays enabled; funding reminders are disabled. `npm audit` reports known advisories, not a guarantee against all vulnerabilities.

## Local checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
npm run check:docs
```

The suite registers 79 unit/integration cases plus three Electron journeys in fourteen files. The E2E journey covers offline play, lineup rejection, save/restart, normal/fallback match equivalence, missing-artwork recovery and a complete exhibition season. Typechecking explicitly runs TypeScript 7.0.2; ESLint uses Microsoft's separate TypeScript 6 compatibility API.

Portable builds include a file checksum manifest and bundled dependency/audio notices. Packaging refuses stale build inputs; rebuild after source changes. These are local prototypes, not signed public releases.

## Prototype limits

- Original pixel-art still sequences illustrate important match events. Three.js and the old stadium renderer have been removed. The scenes illustrate resolved events; they do not physically simulate football.
- Fictional-player and economic balance remain provisional. No artificial score correction is applied.
- All immutable saves are retained in this prototype, including autosaves. Automatic pruning is not implemented yet.
- Linux, low-end graphics, physical controllers and Steam Deck remain unverified. Standard gamepad mapping has a synthetic Electron check. Reduced-motion preference keeps commentary visible without animated highlights.

FCU is an independent project and does not claim affiliation with existing football games, clubs or leagues.

## Match sound credits

The shipped WAV effects are excerpts from the following free recordings, with level adjustment and edge fades. Freesound inputs use the publicly served HQ MP3 previews; the kick uses the source WAV. Exact excerpt times and source hashes are in `apps/game/src/renderer/assets/audio/edits.json`. Credits also ship in the in-game Sound library.

- Kick: [Ball Kicked](https://bigsoundbank.com/ball-kicked-s1044.html), Joseph SARDIN, [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
- Whistle: [referee-whistle.wav](https://freesound.org/people/Pablo-F/sounds/90743/), Pablo-F, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
- Goal cheer: [goalloop.wav](https://freesound.org/people/huubjeroen/sounds/113698/), huubjeroen, CC0 1.0.
- Crowd disappointment: [crowd oh - disappointed](https://freesound.org/people/mrrap4food/sounds/619007/), mrrap4food, CC0 1.0.
- Sliding-tackle foley: [Grass Slide,Grass Scuff](https://freesound.org/people/yeemeng/sounds/530467/), yeemeng, CC0 1.0.
- Stadium ambience: [noise#01.aif](https://freesound.org/people/huubjeroen/sounds/39733/), huubjeroen, CC0 1.0.
