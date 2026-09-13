# Football Club Universe (FCU) - project contract

Documentation edition 1.6 | Research cutoff: 11 September 2026 | Implementation status: v0.6 roster publisher and initial game import implemented on Windows; active/inactive registration, imported loans and publisher snapshot comparison work; live verification deferred by owner, provider fixture integration works; Windows offline development gate checked; v0.7 facilities, personnel lifecycle and board/jobs, assistant advice and playable Dream Club implemented; Windows ten-season workload, automated suites and packaged persistence pass; owner accepted the Dream prototype on 2026-09-13; broader participant evidence and balance review remain. v0.8 Windows technical accessibility checks pass; visual design remains unfinished. These checks are not owner UI acceptance, including persistent Music/SFX settings, handheld match/squad/collection readability, Dream comparisons, offline controller form entry and suspend checkpoints; physical handheld and native Linux checks remain unverified. Independent v0.9 now exposes save alternatives and local diagnostic export/build provenance; external checks remain deferred. Training-day injuries and academy-release warnings now work. Current Career schema 25 and separate Dream envelope 5 record the writer application independently from engine 0.7.5. Offside, disallowed goals, corners, woodwork and in-play penalties now have authoritative events and commentary; dedicated new artwork is deferred to the UI pass. Completed permanent transfers are archived and expired academy contracts become recruitable free agents. Latest owner scope (2026-09-13): continue autonomously until manually stopped or told to stop. Do not pause at slices or milestones. Defer items needing owner input, record them in ROADMAP for later review, and continue independent work. Approved visual revision: event-driven anticipation and 29 detailed pixel-art stills, with blue/white managed side and red/white opponent. GAME records supported scenes and requested future match rules. Record unverified external checks. Linux remains unverified. See ROADMAP evidence.

Owner-selected title: **Football Club Universe**, abbreviated **FCU**. Modes are **FCU Career** and **FCU Dream Club**. Keep the title in one configuration value so future branding changes do not rename save IDs or packages. This records the creative decision, not a trademark availability check.

Build a fast, offline football management game for Steam, inspired by the feeling of Elifoot 98: select a team, make a few meaningful decisions, experience a match, and want another season. This is an original game, not a reproduction of Elifoot assets, code, screens, names, or database. Football Manager informs selected depth, not the size of the feature list.

## Current completion priority

Owner direction: complete pending match rules and automate broader Career/Dream progression, economy and balance checks before the dedicated UI/audio pass. Those rules and reproducible workloads are now implemented; native Windows packaging and offline Save/restart verification also pass. The next local development focus is UI/audio. Steam integration, live provider verification and unavailable platforms remain explicit deferred items, not completed gates. Test ceilings no longer block meaningful verification. Preserve the approved visual direction; technical and external release checks still require actual evidence. Automated balance signals do not certify enjoyment.

## Approved visual direction

The owner approved the navy/gold manager-and-stadium artwork for the main screen. Reuse the original master with large accessible menu controls and preserve its composition. Apply a coherent game identity to the clubhouse, squad/tactics/player details, market/finance/board and Dream screens in complete visual slices. Preserve the approved match stills and four-panel layout. UI quality and owner visual acceptance are release criteria, not optional polish after functionality. Continue independent implementation; record feedback-dependent decisions for later review.

## Start here

Work in the existing repository on main. Read AGENTS.md and the current ROADMAP status before choosing the next complete slice. The project now contains the five-country Career world, isolated Dream Club and Windows release-preparation work. Preserve existing saves and the accepted match presentation. Continue autonomously through ordered milestones; record unavailable external checks instead of waiting for routine approval. README.md remains the public introduction; agent guidance belongs here and in the specifications.

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

The playable Career loop includes squad/bench selection, tactics, substitutions, condition, injuries, discipline, training, finance, contracts, scouting, negotiations, loans, ten divisions, cups, season history, facilities, player development and board/jobs. Dream Club has separate earned choices and collection saves; the owner accepted its prototype on 2026-09-13. The roster publisher/import pipeline works with fixtures; live provider verification remains deferred. ROADMAP owns milestone-by-milestone evidence and remaining gates. ARCHITECTURE owns current save formats, engine identity and compatibility.

Current owner match controls: Play/Pause, fixed 2x and optional continuous half-time, fullscreen/F11. Follow the latest owner sketch: centered score/clock and adjacent Play/Pause; left statistics above team management, right commentary above highlights. All four panels share equal width and height in a two-by-two grid; the scoreboard occupies its own content-sized row with a clear gap. Latest visual direction is detailed athletic modern-retro pixel-art STILL illustrations: preparation, then a clean cut to celebration or lament, with no animated shooting, ball travel or crowd. Clear scenes between chances; show the aligned teams before Play. Hide score/commentary spoilers until the outcome cut. GAME's Pixel-art highlights section is the art bible for all future assets and records the supplied Example1-5 reference principles. Blue/white represents the managed club; red/white represents the opponent, including crowd colors. Captions retain actual event identity. Audio direction: retain real stadium crowds, with expressive anime-style action effects for shots and tackles. The owner approved the St Mary's near-miss audition and rejected the latest tackle/shot candidates. Professionally designed paid libraries are now candidates; the rejected homemade synthesized effects are not the target. Preserve bundled source credits and direct audition controls. No purchase has been authorized. Audio improvements are deferred under the latest owner direction; focus on the match layout. Curate every third miss without changing probabilities. Keep the accepted match layout and deferred audio refinement during current release preparation.

## Working defaults

Windows/Linux launch, the FCU name, recognizable city-based fictional club names, and pixel-art highlight presentation are owner-confirmed. Other choices below are explicit recommended defaults until changed:

- Windows 11 x64 and native Linux x64, keyboard and mouse, single-player, English first, premium purchase. Linux validation targets Ubuntu 26.04 LTS using its default Wayland session; test the selected Electron XWayland fallback if used. Final distribution support follows testing. No server, accounts, subscriptions, advertising, or live-service requirement.
- Electron + React + TypeScript + Vite. Pure deterministic TypeScript simulation in a worker; local files for saves. No server components.
- Use the city-based fictional club identity profile as the default direction, with the approved starter names in GAME.md. Preserve the five-league/current-roster data target and an optional real-name profile. Club display names are separate from source data and player identities. Rights/provider arrangements remain assumed handled. Each country also has a clearly fictional playable second division for promotion/relegation; this mixed-world choice is a recommended scope limit, not a claim of authentic lower leagues.
- Real-data targets are **Premier League, LaLiga, Ligue 1, Serie A and Bundesliga**. This does not promise every youth, reserve, women's or lower-division squad. First-team senior roster membership is the target; completeness must be proven for each selected season.
- The owner selected pixel-art highlights after evaluating and rejecting the moving 3D stadium. Remove Three.js and its unused rendering code. Focus on the Elifoot-style management loop, a match board between chances and original short goal/save/miss scenes. Still images and text use identical committed match events; no save migration.
- Custom simplified competition rules are displayed honestly. A real roster pack does not imply exact national registration, tax, transfer or competition rules.
- Separate Dream Club mode: earn player-choice packs through completed fixtures and build a fantasy squad. No purchases or shared Career economy. See GAME section 11 for the initial experiment and complete rules.
- Steam Deck Verified is a compatibility goal. Ship controller navigation and a handheld layout, test real hardware, and request Valve review; do not promise a badge before Valve grants it.

All eight Markdown files and .gitignore use basic ASCII, saved as UTF-8 without BOM. Player names and future translations in game data remain Unicode. Desktop Linux validation targets [Ubuntu 26.04 LTS](https://documentation.ubuntu.com/release-notes/26.04/); Steam Linux Runtime compatibility is validated separately.

## Current continuation instruction

Continue Football Club Universe autonomously until the owner manually stops work or says to stop. Inspect the current ROADMAP gate and repository status, choose the next concrete independent slice, implement it, check only the affected risks, update the existing references, commit and verify the push to origin/main. Do not pause after a slice or milestone for routine approval. When credentials, hardware, feedback or publication authorization are unavailable, defer that item in ROADMAP and continue other authorized work. Never invent external verification or mark an incomplete gate passed. Publication, purchases and external messages still require their separate authorization. The original v0.1-only starter request is superseded and must not govern current work.

Remove numerical test ceilings and per-task allowances as blockers; retain focused verification and recorded workloads. Complete the owner-requested gameplay and automated validation work before the dedicated UI/audio pass; the earlier feature freeze does not block this scope. Working systems and version numbers do not establish v1.0 completion. Requested future match rules remain recorded separately from current supported events.

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
