# Football Club Universe (FCU)

A fast, offline football management prototype for Windows and native Linux.

**Status: v0.1 playable prototype.** Windows development and packaged launch have been tested. Native Linux packaging is configured but not yet built or tested on Linux. No public release or Steam compatibility claim is made.

## Play the exhibition

Choose one of eight city-based clubs, select your starting eleven and play a 14-round home-and-away exhibition season. Every club has 22 fictional test players with generated abilities. This cross-country development league is not an actual national competition.

Matches run minute by minute in a deterministic worker. Live commentary fills the match screen. Important chances briefly show pixel-art highlights, then return automatically to commentary. Use Play/Pause at the fixed 2x pace. The running MM:SS clock freezes on pause. Half-time pauses by default; enable Continue through half-time to play on automatically. Canvas initialization failure leaves commentary available without losing the career.

The game starts fullscreen; **F11** toggles window mode. The layout fills the available display. The retro title screen leads to club selection and a clubhouse with large action tiles. Squad selection uses a lineup board, and the match broadcast puts statistics below the central commentary. Original 320x180 pixel scenes use articulated running, kicking and reaction poses. Goals and saves take priority; every third off-target attempt is eligible for a cutaway. All attempts still appear in the commentary and statistics. While paused, expand Art preview and use Preview goal, Preview save or Preview miss to audition the art without changing your career. Skip highlight returns to the board without advancing time. Original synthesized music is optional; Music and SFX have independent toggles and pause while the game is hidden. Sound settings currently last for the session. Clubhouse, Squad, Match centre and League table are playable. Manual Save and Load support checkpoints during matches; completed rounds save automatically. Load lists previous checkpoints and identifies unreadable ones for recovery. Saves stay outside the installation folder, under Electron user data (`%APPDATA%\fcu\saves` on Windows, normally `~/.config/fcu/saves` on Linux). Save before closing to retain progress since the latest automatic checkpoint.

The prototype stops after one small season. Transfers, tactics, injuries, cards, roster sync, Dream Club and substitutions are not implemented.

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

The suite registers 14 unit/integration cases plus one Electron journey in four files. The E2E journey covers offline play, lineup rejection, save/restart, normal/fallback match equivalence, Canvas failure recovery and a complete exhibition season. Typechecking explicitly runs TypeScript 7.0.2; ESLint uses Microsoft's separate TypeScript 6 compatibility API.

## Prototype limits

- Pixel art is the chosen direction; the original goal/save/miss audition is ready for feedback. Three.js and the old stadium renderer have been removed. The scenes illustrate resolved events; they do not physically simulate football.
- The fixed 500-match probe produced 1.73 goals per match, below the later balance target. No artificial score correction is applied.
- All immutable saves are retained in v0.1, including autosaves. Automatic pruning is not implemented yet.
- Linux, low-end graphics, controllers and Steam Deck remain unverified. Reduced-motion preference keeps commentary visible without animated overlays.

FCU is an independent project and does not claim affiliation with existing football games, clubs or leagues.
