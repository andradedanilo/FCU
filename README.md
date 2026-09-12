# Football Club Universe (FCU)

A fast, offline football management prototype for Windows and native Linux.

**Status: v0.1 playable prototype.** Windows development and packaged launch have been tested. Native Linux packaging is configured but not yet built or tested on Linux. No public release or Steam compatibility claim is made.

## Play the exhibition

Choose one of eight city-based clubs, select your starting eleven and play a 14-round home-and-away exhibition season. Every club has 22 fictional test players with generated abilities. This cross-country development league is not an actual national competition.

Matches run minute by minute in a deterministic worker. Watch stylized Three.js highlights or switch to text; both use the same match events and results. Pause, change playback speed, advance a minute or finish the current half. Half-time stops for your input. WebGL failure falls back to text without losing the career.

The retro title screen leads to club selection and a clubhouse with large action tiles. Squad selection uses a lineup board, and the match broadcast has 1x/3x/8x speed buttons. The horizontal camera keeps the complete pitch visible, surrounded by tiered stands, club-colored supporters, waving flags and fictional advertising boards. Short pass/run/shot sequences illustrate goals, saves and misses. Pause and choose Replay play to watch the latest sequence for three seconds without advancing the match. Goals trigger a short, skippable pixel celebration. Original synthesized music is optional; Music and SFX have independent toggles and pause while the game is hidden. Sound settings currently last for the session. Clubhouse, Squad, Match centre and League table are playable. Manual Save and Load support checkpoints during matches; completed rounds save automatically. Load lists previous checkpoints and identifies unreadable ones for recovery. Saves stay outside the installation folder, under Electron user data (`%APPDATA%\fcu\saves` on Windows, normally `~/.config/fcu/saves` on Linux). Save before closing to retain progress since the latest automatic checkpoint.

The prototype stops after one small season. Transfers, tactics, injuries, cards, roster sync, Dream Club and advanced 3D are not implemented.

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

Choose **Start a career**, select a club and seed, then **Begin career**. Open **Squad** to edit the eleven and choose **Confirm lineup**. Return to **Clubhouse**, choose **Kick off**, then **Play**. **Finish half** stops at minute 45 or 90; choose **Continue** after full time to reach the next fixture.

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

The suite registers 12 unit/integration cases plus one Electron journey in four files. The E2E journey covers offline play, lineup rejection, save/restart, text/3D equivalence, actual WebGL context loss and a complete exhibition season. Typechecking explicitly runs TypeScript 7.0.2; ESLint uses Microsoft's separate TypeScript 6 compatibility API.

## Prototype limits

- Three.js is retained for the retro direction. The retro layout is approved; the stadium and linked-play batch is ready for feedback. It illustrates events rather than physically reconstructing football.
- The fixed 500-match probe produced 1.73 goals per match, below the later balance target. No artificial score correction is applied.
- All immutable saves are retained in v0.1, including autosaves. Automatic pruning is not implemented yet.
- Linux, low-end graphics, controllers and Steam Deck remain unverified. Reduced-motion preference starts in text mode.

FCU is an independent project and does not claim affiliation with existing football games, clubs or leagues.
