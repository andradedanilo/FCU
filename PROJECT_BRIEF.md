# Football Club Universe (FCU) - project contract

Documentation edition 1.5 | Research cutoff: 11 September 2026 | Implementation status: v0.4 scouting and calendar flow implemented on Windows. Owner authorizes autonomous development through successive roadmap milestones, retaining the accepted layout and recording unverified external checks. Linux remains unverified. See ROADMAP evidence.

Owner-selected title: **Football Club Universe**, abbreviated **FCU**. Modes are **FCU Career** and **FCU Dream Club**. Keep the title in one configuration value so future branding changes do not rename save IDs or packages. This records the creative decision, not a trademark availability check.

Build a fast, offline football management game for Steam, inspired by the feeling of Elifoot 98: select a team, make a few meaningful decisions, experience a match, and want another season. This is an original game, not a reproduction of Elifoot assets, code, screens, names, or database. Football Manager informs selected depth, not the size of the feature list.

## Start here

Extract this folder into the root of a new repository. `AGENTS.md` must be at the repository root, beside this project brief. Open that repository in Codex and use the starter request below. The repository now contains the v0.1 exhibition prototype with synthetic players. Real roster integration is deferred. Read the current ROADMAP status and keep the accepted match layout while progressing autonomously through ordered milestones in complete feature slices. `README.md` is the public game introduction shown on GitHub; keep agent setup instructions here.

| File | Authority |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Working rules, coding standards, test ceilings and completion policy |
| [GAME.md](docs/GAME.md) | Player experience, mechanics, exact launch scope and initial balance |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Runtime boundaries, persistence, determinism, security and performance |
| [DATA.md](docs/DATA.md) | Provider selection, rights reference notes, sync workflow and snapshot contracts |
| [ROADMAP.md](docs/ROADMAP.md) | Ordered milestones, acceptance gates and living project status |
| [RESEARCH.md](docs/RESEARCH.md) | Dated evidence, source links, limitations and design rationale |

Keep these seven agent/specification documents plus the public README (eight Markdown files total) and root `.gitignore`. Update existing sections instead of adding a plan or feature document for every task. Machine-generated reports and third-party notices are separate build evidence. Track README.md, PROJECT_BRIEF.md, AGENTS.md, docs/, .gitignore, source, original assets, sanitized fixtures and package-lock.json in Git. Ignore generated output, local runtime state, raw/private provider data and secrets as specified in .gitignore.

## GitHub backup workflow

Use `main` directly; no feature branches, worktrees, pull requests or GitHub Actions. After every completed coherent change, perform relevant local verification, commit with a descriptive plain-language subject and push to the configured GitHub remote. Example: `Add FCU squad selection`. Do not add `feat:`, `fix(dev):` or similar prefixes. Full behavior, safe synchronization and failure handling are in AGENTS.md. Ordinary source pushes are preauthorized; they do not publish the game to Steam or create a release.

The owner supplied https://github.com/andradedanilo/FCU.git during v0.1 setup. Verify the configured remote before backup. Keep local commits if a push cannot be completed, and state that remote backup is pending. Never force-push or change repository visibility. Keep all project guidance tracked as the owner requested; `.gitignore` does not exclude it.

v0.2 now includes paused substitutions, three formation presets, mentality/tempo/pressing controls and manual bench selection, three saved tactical setups, minute-60 opponent mentality and migration from schema-1/2/3 checkpoints. The short result report and shared keyboard/standard-gamepad navigation foundation are implemented. Windows software acceptance is verified; Linux, low-end performance and physical controller checks keep the cross-platform gate open. v0.3 now applies condition loss, condition/morale strength and training recovery. Injuries, league discipline/eligibility, mandatory incident decisions and academy shortage cover are implemented. Real added time and calibrated match probabilities are implemented, with explicit half phases and schema-7 migration. v0.4 now has generated wages, budget calculations and a balanced operating ledger in Club finances. Player contracts now support cost review and atomic renewal. Scouting, shortlists, uncertain comparison and dated calendar progression now work. Next: staged transfer/loan transactions and market news. The owner explicitly asks that work continue across completed slices and milestones until their input is actually required; do not end a run merely to report a routine boundary. Keep the accepted match presentation.

Current owner match controls: Play/Pause, fixed 2x playback and optional continuous half-time. No instant finish or manual minute skip. Start fullscreen with F11 window toggle; prioritize readable original pixel sprites and short expressive highlights. The match screen uses a prominent scoreboard, a larger permanent highlight screen on the left and a right column split between commentary and compact statistics; a running MM:SS clock is retained; no separate Pixel art/Text modes or speed selector. Attacks move bottom-to-top in a close attacker-versus-keeper scene, with no defender. Show the approach and the outcome reaction in the same pitch view. Use the owner's ISS Deluxe references for athletic pixel proportions and connected limb poses. Curate repeated misses rather than changing match probabilities for spectacle; keep all attempts in commentary/statistics. See GAME and ARCHITECTURE for current pacing choices.

## Working defaults

Windows/Linux launch, the FCU name, recognizable city-based fictional club names, and pixel-art highlight presentation are owner-confirmed. Other choices below are explicit recommended defaults until changed:

- Windows 11 x64 and native Linux x64, keyboard and mouse, single-player, English first, premium purchase. Linux validation targets Ubuntu 26.04 LTS using its default Wayland session; test the selected Electron XWayland fallback if used. Final distribution support follows testing. No server, accounts, subscriptions, advertising, or live-service requirement.
- Electron + React + TypeScript + Vite. Pure deterministic TypeScript simulation in a worker; local files for saves. No server components.
- Use the city-based fictional club identity profile as the default direction, with the approved starter names in GAME.md. Preserve the five-league/current-roster data target and an optional real-name profile. Club display names are separate from source data and player identities. Rights/provider arrangements remain assumed handled. Each country also has a clearly fictional playable second division for promotion/relegation; this mixed-world choice is a recommended scope limit, not a claim of authentic lower leagues.
- Real-data targets are **Premier League, LaLiga, Ligue 1, Serie A and Bundesliga**. This does not promise every youth, reserve, women's or lower-division squad. First-team senior roster membership is the target; completeness must be proven for each selected season.
- The owner selected pixel-art highlights after evaluating and rejecting the moving 3D stadium. Remove Three.js and its unused rendering code. Focus on the Elifoot-style management loop, a match board between chances and original short goal/save/miss scenes. Canvas 2D and text use identical committed match events; no save migration.
- Custom simplified competition rules are displayed honestly. A real roster pack does not imply exact national registration, tax, transfer or competition rules.
- Separate Dream Club mode: earn player-choice packs through completed fixtures and build a fantasy squad. No purchases or shared Career economy. See GAME section 11 for the initial experiment and complete rules.
- Steam Deck Verified is a compatibility goal. Ship controller navigation and a handheld layout, test real hardware, and request Valve review; do not promise a badge before Valve grants it.

All eight Markdown files and .gitignore use basic ASCII, saved as UTF-8 without BOM. Player names and future translations in game data remain Unicode. Desktop Linux validation targets [Ubuntu 26.04 LTS](https://documentation.ubuntu.com/release-notes/26.04/); Steam Linux Runtime compatibility is validated separately.

## Starter request to Codex

> Build Football Club Universe (FCU). Use main only and commit/push every completed coherent change to the verified GitHub remote with plain descriptive messages, no prefixes and no GitHub Actions. Keep all guidance tracked; honor .gitignore. If the remote is missing, ask for it once and continue local work while reporting backup as pending. Keep README.md public-facing. Read AGENTS.md, PROJECT_BRIEF.md and docs/ROADMAP.md, then the relevant GAME.md, ARCHITECTURE.md and DATA.md sections. Implement v0.1 only; do not stop at a plan. Inspect the workspace, preserve existing work and proceed with the smallest complete playable slice: eight development clubs using the approved city-based names, fictional test players, squad selection, deterministic league/match simulation in a worker, standings, Save/Load, and original pixel-art goal/save/miss highlights with a text fallback. Use GAME.md's specified eight-club exhibition fixture, not an invented real league. Keep presentation separate from simulation. Use Electron, React, TypeScript and Vite with pinned compatible versions and Windows/Linux packaging. Keep FCU branding and identity profiles centralized; prepare for future Steam Deck input without expanding scope. Do not implement transfers, roster sync, Dream Club or continuous physical match simulation yet. Follow the v0.1 budget: at most 20 registered cases, five test files and one E2E journey, no coverage quota or repeated successful full-suite runs. Use ASCII in authored docs/comments and preserve Unicode support in game data. Treat rights/provider arrangements as handled planning assumptions. Make routine decisions independently, update existing docs and report consequential choices. Run relevant checks on available platforms; report missing platform validation honestly. Show the runnable prototype and exact launch instructions. Stop after v0.1 so I can evaluate the pixel-art audition before v0.2.

For later work: "Implement v0.2 according to the package; keep within its scope and test budget." A broad request to implement several milestones authorizes proceeding through their gates in order. A failed gate must never be labeled passed.

## Decisions to revisit at the appropriate gate

| Decision | Default / trigger |
| --- | --- |
| Game name and modes | Football Club Universe (FCU), FCU Career, FCU Dream Club; owner-selected |
| Club identity | City-based fictional names by default; approved starter mapping in GAME.md. Real-name profile remains optional; player/source data unaffected |
| Provider and recurring budget | Sportmonks is the first adapter candidate. Assume access/budget are handled; implement and validate the actual adapter without a procurement gate |
| Exact real competition rules / lower leagues | Deferred; require a separate scope change and maintained season rule packs |
| Steam Deck / controllers | Aim for Deck Verified; include controller support and actual Deck checks before release, with Valve status tracked separately |
| Presentation direction | Owner selected pixel-art highlights; Three.js experiment removed. Focus on original goal/save/miss scenes and management pacing, with text fallback |
| Release price and date | Owner decision after v0.7 playtests; roadmap versions are gates, not dates |

Rights and adequate provider availability are assumed handled; do not reopen them as approval tasks or launch blockers. Provider/legal notes remain factual reference material, not a certification of rights. The remaining planning choices are art/audio budget, audience validation and playtest availability. Research and balance numbers are starting hypotheses, not proof of realism.
