# Football Club Universe (FCU)

A fast, offline football management prototype for Windows and native Linux.

**Status: v0.4 work in progress.** Windows development and packaged launch have been tested. Native Linux packaging is configured but not yet built or tested on Linux. No public release or Steam compatibility claim is made.

## Play the exhibition

Choose one of eight city-based clubs, select your starting eleven and play a 14-round home-and-away exhibition season. Every club has 22 fictional test players with generated abilities. This cross-country development league is not an actual national competition.

Matches run minute by minute in a deterministic worker. A larger permanent highlight screen fills the left panel. Live commentary sits above compact statistics in the right column; both stay visible during highlights. Use Play/Pause at the fixed 2x pace. The running clock freezes on pause and shows 45+ and 90+ stoppage time. After kickoff, open Substitutions to pause and replace players. You have five changes across three stoppages; multiple changes at the same paused minute share a stoppage, and half-time changes use none. No re-entry. Choose up to nine eligible reserves, ideally including a goalkeeper, in Squad before kickoff; the match freezes that bench. Changes affect future minutes; close the panel and press Play to resume. Half-time pauses by default; enable Continue through half-time to play on automatically. Canvas initialization failure leaves commentary available without losing the career.

Tactics is available from Squad before kickoff and during a match. Choose 4-4-2, 4-3-3 or 4-2-3-1, plus mentality, tempo and pressing. Formation changes rearrange your current eleven; Suggest lineup picks natural roles before kickoff. Out-of-position assignments reduce role strength to 80%. Live changes apply from the next minute and carry into the next fixture. Players now lose condition during matches. High pressing and fast tempo increase that cost; effective strength follows condition and morale. Squad shows condition/morale, and Training controls recovery before the next fixture. Save up to three tactical setups. Use setup previews the saved controls; Apply tactics commits them. Opponents make one score-based mentality change after minute 60.

Club finances shows cash, weekly wages, the wage budget, available transfer funds and a dated transaction history. Home gates, Monday wages/overheads and monthly sponsorship change cash as rounds progress. Figures are fictional game estimates. Squad includes Player contracts: inspect age, expiry and wage, review renewal costs, then confirm a longer term. Signing bonuses and wage changes are real financial commitments. Scouting provides a shortlist, position filters and uncertain ability comparisons. One scout completes a report in seven days. Between fixtures, Next day or Advance to next event processes recovery and operating costs, stopping at a report or match day. Match completion no longer skips the week automatically. Scouting also lets you negotiate club bids and player contracts, review all costs and register a signing. Twelve fictional free agents are available. Club replies arrive next day; offers expire after seven days. Closed-window club deals wait for the next opening and recheck finances before payment. Club news links to negotiations and completed reports. AI clubs fill squad gaps with at most two targets each Monday during the window, using the same money checks. Your players are never sold automatically. Request a loan with 0%, 50% or 100% wage contribution. The parent retains ownership, and the player returns automatically on June 30. Loan players can be selected normally; returning players are removed from the borrower's lineup and bench. At June 30, Start next season pays league prizes, releases expired contracts and begins a new July. Season history retains each completed table and results. The playable world is still the eight-club exhibition while the larger competition world is being built.

The game starts fullscreen; **F11** toggles window mode. The layout fills the available display. The retro title screen leads to club selection and a clubhouse with large action tiles. Squad selection uses a lineup board, and the match broadcast pairs commentary with large statistical comparisons and a prominent scoreboard. Original 320x180 pixel scenes show a close attacker-versus-keeper approach, shot and on-pitch celebration or disappointment. The same renderer draws the goal, net, crowd and pitch between chances, without idle animation. Goals and saves take priority; every third off-target attempt is eligible for a cutaway. All attempts still appear in the commentary and statistics. While paused, expand Art preview and use Preview goal, Preview save or Preview miss to audition the art without changing your career. Skip highlight returns to the board without advancing time. Original synthesized music is optional; Music and SFX have independent toggles and pause while the game is hidden. Sound settings currently last for the session. Clubhouse, Squad, Match centre and League table are playable. Manual Save and Load retain mid-match substitutions. Existing v0.1 and v0.2.0 checkpoints load with balanced tactics and preserved benches/substitution history where present. Future play uses the new tactical rules; a notice explains the change. Original files stay untouched, and the next save creates a v0.4.2 checkpoint. Older builds cannot open these newer saves. Manual Save and Load support checkpoints during matches; completed rounds save automatically. Load lists previous checkpoints and identifies unreadable ones for recovery. Saves stay outside the installation folder, under Electron user data (`%APPDATA%\fcu\saves` on Windows, normally `~/.config/fcu/saves` on Linux). Save before closing to retain progress since the latest automatic checkpoint.

The prototype stops after one small season. Transfers, roster sync and Dream Club are not implemented.

At full time, Match report shows points earned, league position, scorers and chance figures. Reopen the last result from the clubhouse.

Keyboard: arrows or Tab move focus, Enter confirms, Esc goes back, P plays/pauses, and Q/E change sections. Standard gamepads use D-pad/left stick, south button to confirm, east button to go back, shoulders for sections and Start for Play/Pause. Steam Input text entry and polish remain future work.

Injuries and dismissals pause the match for your decision. Replace an injured player or continue short-handed; sent-off players cannot return. League bookings accumulate toward bans. Squad identifies unavailable players and offers bounded fictional academy cover for severe shortages. Added time and balance calibration are still in progress.

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

Choose **Start a career**, select a club and seed, then **Begin career**. Open **Squad** to edit the eleven and choose **Confirm lineup**. Return to **Clubhouse**, choose **Kick off**, then **Play**. Use **Play/Pause** to control the action; choose **Continue** after full time to reach the next fixture.

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

The suite registers 39 unit/integration cases plus one Electron journey in eight files. The E2E journey covers offline play, lineup rejection, save/restart, normal/fallback match equivalence, Canvas failure recovery and a complete exhibition season. Typechecking explicitly runs TypeScript 7.0.2; ESLint uses Microsoft's separate TypeScript 6 compatibility API.

## Prototype limits

- Pixel art is the chosen direction; the original goal/save/miss audition is ready for feedback. Three.js and the old stadium renderer have been removed. The scenes illustrate resolved events; they do not physically simulate football.
- The fixed 500-match probe produced 1.866 goals per match, below the later balance target. No artificial score correction is applied.
- All immutable saves are retained in this prototype, including autosaves. Automatic pruning is not implemented yet.
- Linux, low-end graphics, physical controllers and Steam Deck remain unverified. Standard gamepad mapping has a synthetic Electron check. Reduced-motion preference keeps commentary visible without animated highlights.

FCU is an independent project and does not claim affiliation with existing football games, clubs or leagues.
