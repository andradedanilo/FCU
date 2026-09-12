# Technical architecture

## 1. Decisions and boundaries

Use Electron + React + TypeScript + Vite, npm workspaces, Vitest for domain/integration checks, Playwright's Electron support for the small end-to-end suite, and @electron/packager for distributable folders. Vite builds the renderer and worker; build main/preload as separate Node-targeted bundles with a minimal esbuild configuration. Do not add Next.js, React server components, a web backend, SQLite or an ORM initially. Keep the simulation state in memory and serialize whole stable checkpoints; revisit storage only against the measured ten-season save-size/performance gate.

This is a design choice for a table-heavy management game and a TypeScript workflow. Electron carries a larger runtime and requires active security/native-module maintenance. Godot becomes attractive if interactive 3D football becomes the product, but that is outside this design. Tauri adds a Rust boundary and differing system webviews; there is no demonstrated need to trade Electron's shared Chromium behavior for it here. The choice is reasoned, not a benchmark claim.

Select exact compatible stable package releases at project initialization and commit a lockfile. Do not bake an unverified React release from the prior conversation into the project. Record Electron/Chromium/Node, React, Vite, TypeScript, builders, test runners and native Steam binding versions in the decision log. Use official documentation for their selected releases. Supported version selection is a v0.1 task, not an assumption that package versions never change. Sources: [Electron security](https://www.electronjs.org/docs/latest/tutorial/security), [React](https://react.dev/learn), [Vite](https://vite.dev/guide/), [Electron Packager](https://packages.electronjs.org/packager/).

## 2. Repository layout

```text
README.md                                # public game overview and actual status
AGENTS.md, PROJECT_BRIEF.md, docs/         # seven agent/specification documents
.gitignore                               # generated/private exclusions
apps/game/src/main/                       # lifecycle, file persistence, Steam adapter
apps/game/src/preload/                    # narrow typed bridge
apps/game/src/renderer/                   # React screens and transient state
apps/game/src/worker/                     # serial simulation host, no Node access
apps/roster-tool/                         # separate developer-only local tool, v0.6
packages/simulation/src/                  # pure game functions and deterministic RNG
packages/contracts/src/                   # schema validation, IDs, DTOs, versions
packages/presentation/src/                # event projection; pixel-art event highlights and text
packages/roster-pipeline/src/             # normalization, adapters, data quality checks and provenance
assets/original/                         # original art/audio with provenance
data/fictional/                           # small committed development fixtures
tests/                                   # shared risk scenarios; obey AGENTS ceilings
work/                                    # ignored build/research/probe artifacts
```

Tests may instead be colocated when clearer, but never duplicate shared risk scenarios. Licensed raw responses, tokens and private contracts are outside version control and shipping paths. Public cleared packs are separate release artifacts, not fixtures embedded in unit tests. Build allowlists must exclude roster-tool, provider code, raw data and credentials from the game.

## 3. Runtime topology and authority

```text
React screen -> typed preload request -> main validation/router -> simulation worker
                                                            <- result/view model
worker stable checkpoint -> main save writer -> local filesystem
worker events -> presentation projector -> pixel art / text
main -> optional Steam adapter
publisher roster tool -> provider adapters -> staging/review -> cleared pack
cleared pack -> main validates -> worker creates NEW career
```

Main is privileged I/O only. One Web Worker owns one active career and processes commands serially. Main creates/routes a transferred MessagePort during trusted renderer startup; renderer cannot replace the authoritative host with arbitrary external content. A simpler initial implementation may let the renderer relay typed worker messages to main, but main revalidates every privileged request and trusts no arbitrary path or payload. Worker can restart from the most recent confirmed stable save; unexpected worker failure stops play with recovery choices, not silently generates a new career.

Simulation exports `createCareer(snapshot, seed, rules)`, `applyCommand(state, command)` and `advanceUntil(state, stopCondition)`. Functions return new state plus domain events, or a structured error with no mutation. No global mutable state. Within a tick, collect outcomes then commit once; use structural sharing where useful instead of cloning the entire world per player operation. Commit full state to disk only at stable boundaries.

Commands: SelectLineup, SetTactics, AdvanceDay, StartMatch, AdvanceMatch, Substitute, SubmitOffer, CounterOffer, ConfirmDeal, SetTraining, ScoutPlayer, UpgradeFacility, AcceptJob. Payload always includes commandId, careerId and expected stateRevision. Return new revision, result/error, events and necessary view projections. Reject stale revision with `STALE_STATE`, refresh UI, never retry spending automatically. Keep an applied-command ID ring of last 256 commands in the save; revision checks prevent older requests from being reapplied outside that ring.

The authoritative match advances only to the next requested tick/chunk. Never simulate future goals ahead of an allowed tactical interruption. Automatic playback requests one minute at a time. No public instant-finish or single-step controls; half-time continuation is a renderer pacing preference. Mandatory decisions still stop playback. Each worker chunk yields within 50 ms. Visualization can lag; it cannot skip mandatory decision stops or mutate the match.

## 4. Reproducibility and versions

Use one documented uint32 PRNG implementation with test vectors (e.g. xoshiro128**, carefully preserving unsigned arithmetic). Seed domain-separated streams for fixtures, matches, transfer AI, injuries, youth and development with a stable hash, not host-language hash functions. Save all active stream state. Match streams are keyed by fixture ID so scheduling UI presentation does not alter other matches. The presentation RNG is entirely independent.

No `Math.random()`, `Date.now()`, locale comparisons, unordered iteration or wall-clock-based decisions in simulation. Sort by normalized ASCII stable IDs, never localized names. Store probabilities in basis points and use deterministic rounding rules; clamp at boundaries. The same commands must reproduce the same domain checksum across the supported Windows/Linux builds. Do not promise replay compatibility across different engine versions.

Versions are independent:

| Version | Meaning / change rule |
| --- | --- |
| appVersion | Shipped application semantic version |
| saveSchemaVersion | Integer disk structure; migration required for change |
| engineVersion | Domain behavior implementation; changes when outcomes can change |
| rulesetVersion | Balance and competition parameters; copied into a career |
| rosterSchemaVersion | Integer normalized pack structure |
| snapshotId/contentHash | Identity and integrity of immutable starting data |

Updating roster packs never modifies a career. Updating the engine may change future outcomes even with unchanged rules. Pre-1.0 saves are supported from the immediately previous milestone with an explicit migration; older unsupported development saves fail helpfully and remain on disk. From 1.0, support forward migrations for all 1.x saves. Retain source file and back up before migration. Migration creates a new commit, records old/new engine and schema versions, and tells the player when simulation behavior changes. No downgrading writes; reject future schemas read-only.

Current schema is 4, app/engine 0.2.2 and rules exhibition-3. Schema-3 saves retain tactics/history and gain a default career bench, three empty setup slots and the managed club ID; schema-1/2 migrations chain through that upgrade. Schema-1 saves derive benches and empty substitution history; schema-2 saves retain benches/history. Both explicitly migrate to balanced tactics after original checksum and legacy-schema validation. New saves require all tactics/bench/history fields; missing current fields are invalid. Load reports an engine change to the player. Future outcomes may differ under the tactical rules. Save history links record original/new versions; source checkpoints remain untouched.

## 5. Persistence and recovery

Use gzip-compressed canonical UTF-8 JSON, with SHA-256 checksum of uncompressed canonical payload. Canonicalization sorts object keys and ID-keyed collections, preserves explicitly ordered event arrays and excludes volatile timestamps from domain hash. File envelope contains schema, app/engine/rules versions, careerId, saveCommitId, parentCommitId, stateRevision, savedAtUTC, snapshot identity, checksum and payload. Payload includes complete mutable world, rules, remaining fixtures, RNG states and bounded history. It must not require fetching the original roster pack to load a career.

Directory under Electron userData: `saves/<careerId>/`, machine settings separately in `settings/`. Save filenames are immutable unique commit IDs, never club names or unsanitized imported text. Maintain three latest autosaves, manual slots and one pre-migration backup. Enforce one active game instance to prevent concurrent local writers.

Write a new same-directory `.tmp`, flush the file handle, validate by reading/checksum, then rename to a new `.save` filename that does not already exist. Only complete `.save` files are candidates. An optional index is reconstructible and never the only source of truth. Do not overwrite the only good save, depend on platform-specific replacement rename, or prune before the new commit verifies. Interrupted write leaves the previous complete commit intact. On startup ignore temporaries; if the newest commit is corrupt, offer the previous valid one and preserve the corrupt file for diagnosis. Disk-full/permission errors show unsaved progress and Retry/Save Copy options; never display "saved" before completion.

Autosave after a match, weekly stable boundary and season rollover; manual Save is available whenever no atomic command is in progress. Saving mid-match records exact tick, pending decisions, lineups and RNG; resuming must not reapply finance or injury events. Quit waits for an in-flight save or lets the player explicitly quit without saving after failure.

Steam Auto-Cloud syncs complete save files only; exclude `.tmp`, settings, caches, raw provider data and logs. Use Steam user-specific roots and Windows/Linux root overrides when configuring cloud. Immutable filenames preserve branches rather than a single contested mutable file. At load, two valid commits with the same ancestor but neither descending from the other are a conflict: show dates, season, club and progress, offer either or Keep Both. Do not automatically merge careers or choose by device clock. Prune only recognized ancestors after successful local writes; never delete an unresolved branch. Steam may present its own conflict UI before game launch; game-level detection supplements it. Test actual cross-OS sync rather than assuming it from configuration. [Valve cloud documentation](https://partner.steamgames.com/doc/features/cloud?l=english).

## 6. Presentation contract

Pure selectHighlight curates events by miss ordinal (every third), with goals/saves prioritized and no domain RNG use. The same selector controls renderer pacing: omitted misses use the quiet-minute interval. Pure projectHighlight maps a committed event to a small display value: outcome, player, club colors, tick and score. sampleHighlight supplies bounded phase/ball positions; neither imports DOM or alters the career. Canvas paintHighlight draws original 320x180 sprites and scenery. React owns clip selection and a cancellable animation loop, not per-frame domain updates.

No Three.js or WebGL runtime is retained. A larger highlight panel occupies the left; commentary sits above compact statistics on the right. MatchScreen owns statistics formatting and passes the panel to MatchVisual; responsive CSS composes the view without changing simulation state. Reduced motion disables the cutaways. Canvas initialization failure leaves commentary visible with a notice. Stop animation on hidden/unmount and freeze actual clips on pause. Explicit art previews are presentation-only, run for 4.8 seconds and never write to the worker or save store. Ending or dismissing a clip restores the same Canvas scenery inside the reserved frame; statistics and commentary do not move. The shared painter accepts a null highlight to draw only scenery, once without an animation loop. Canvas failure retains the frame with a text notice, and commentary remains playable. Do not autoplay old events on load.

Compare seeded pixel/text matches and saved state. Keep one Electron journey within the test budget, replacing obsolete 3D geometry/context-loss assertions with Canvas failure recovery, preview isolation and pixel/text equivalence. Historical decisions below document the superseded experiments; current code and contracts use pixel art only.

## 7. Security and distribution

Renderer: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. Use a strict production CSP, local packaged resources and no remote script execution. Disable unexpected navigation/new windows and permissions. Validate requesting sender/frame for every IPC handler. Expose named methods, not raw `ipcRenderer`, shell execution or arbitrary filesystem access. Limit parsed save/pack size and nesting. Render external names as text, not HTML. No external URLs opened without an allowed HTTPS scheme and explicit user action.

Keep `steamworks.js` behind main-process `SteamService` and a no-op development adapter. The repository's Electron example relaxes renderer isolation; **do not copy that configuration**. Its native binding and overlay need packaged compatibility proof on both OSs. If secure main-process integration fails, retain the secure boundary, record the missing feature and evaluate the adapter; do not silently enable Node in the renderer. [Binding source](https://github.com/ceifa/steamworks.js/) and [Electron's security guidance](https://www.electronjs.org/docs/latest/tutorial/security).

Build native Windows and Linux folders; Steam delivers those folders through separate depots with executable permissions retained on Linux. Developer preview may use ZIP/tar or AppImage, but Steam runtime validation is a separate gate. Build Linux on Linux against the selected Steam Linux Runtime compatibility target and Windows on Windows. Verify native module ABI, redistributable paths, writable saves outside the install folder, case-sensitive asset paths and absence of developer-machine absolute paths. Do not promise Proton as a substitute for native Linux. [Valve Linux guidance](https://partner.steamgames.com/doc/store/application/platforms/linux).

Use Steam for application/roster-pack updates, not an independent Electron auto-updater. No mandatory network entitlement check in gameplay. Steam-specific achievement delivery may retry next connected session from local unlocked IDs. Achievement proposals are First Win, Promotion, Domestic Champion, Cup Winner, Continental Champion and Ten Seasons. No anti-cheat or leaderboards in an offline moddable game.

## 8. Performance targets and diagnostics

Reference baseline to obtain by v0.1: Windows 11 and Ubuntu 26.04 on a four-core x64 machine with 8 GB RAM, SSD and integrated graphics; record actual CPU/GPU/driver/OS versions in ROADMAP. This is a development target, not a published minimum spec yet.

Warm menu actions p95 <100 ms; first launch to menu <5 seconds excluding Steam startup; 10-division ordinary day <500 ms and matchday <2 seconds with presentation disabled; new season <5 seconds; stable save/load <2 seconds each; game memory <800 MB; ten-season compressed career <25 MB. Idle menus must not run a free animation loop. v0.8 pixel-art target >=30 fps at 1280*720; use original sprites and reduce visual detail before raising system requirements.

Measure five warm repetitions for ordinary performance checks; report machine, medians/p95 and dataset. Long-career runs follow AGENTS fixed workload, not continuous benchmarking. Diagnostics opt-in export includes versions, error codes, timings and checksums; save content only with player consent. No telemetry server at launch. Rotate logs at 5 MB *3 and redact credentials/provider URLs with tokens. Retain coarse season records while pruning old detailed events; verify no retained scene growth after ten match-screen mount/unmount cycles.

## 9. Steam Deck and Dream Club extensions

### Steam Deck and controller implementation

Target Ubuntu 26.04 desktop separately from SteamOS on actual Steam Deck hardware. Use the current SteamOS stable release installed at validation and record its version. Check the shipped native Linux build through Steam and its selected Steam Linux Runtime; do not assume an Ubuntu package behaves identically on Deck. If Valve evaluates a different launch path, record and test that path explicitly.

Controller actions: move focus, confirm, back, next/previous section, open contextual actions, continue, pause match and adjust playback speed. Centralize them in one input adapter. Use Steam Input mappings and appropriate controller glyphs; all features must be reachable without an external keyboard/mouse. Deck trackpads are supplementary, not the sole solution for inaccessible controls. Use Steam text input/onscreen keyboard for names and search; restore focus when it closes. Never require a desktop launcher to choose a mode.

Provide a 1280x800 handheld layout: essential text >=16 physical pixels as an internal design target, single-column player panels, readable table summaries with detail views, generous focus targets and all primary actions onscreen. Prefer 1280x800; 1280x720 remains supported. Verify text legibility on the actual screen, not only screenshots. Aim for stable 30 fps in Canvas highlights; text fallback remains available. Pause and checkpoint on suspend when possible, and always support interruption recovery because suspension may arrive without time to save. On resume restore audio, graphics context, controller focus and pending pack choices.

v0.8 manual pass: title-to-match, transfer, search/name entry, save/load, Dream Club pack choice, suspend/resume and offline play on real Deck. v0.9 submit the compatible build for Valve review and record outcome/actions. Deck Verified is the desired external result, not a badge the project can self-certify. Unless the owner changes this requirement, waiting for the external badge alone does not block the Windows/Linux release; fix demonstrated compatibility defects and describe tested support accurately. Official references: [compatibility guidance](https://partner.steamgames.com/doc/steamhardware/compat?l=english) and [controller recommendations](https://partner.steamgames.com/doc/steamhardware/recommendations?language=english).

### Dream Club state isolation

Add `gameMode: career | dreamClub` to the versioned save envelope. Add mode-specific commands EarnFixtureReward (internal only), RevealPack, ChoosePlayer and SetCollectionSquad. Use a separate reward RNG stream and persist it, earned fixture IDs, progress remainder, pack sequence, queued pack IDs, pending candidate IDs and unlocked-player IDs. Resolve reward draws outside the match RNG. Validate ChoosePlayer against the saved pending candidates; atomically commit the unlock and consumed pack ID. Retry returns the existing result, never a second player. Do not redraw from a new roster snapshot when loading an old save.

At fixture completion atomically commit result, reward progress and new pack entitlement. Revealing the next queued pack also commits its candidates before animation begins. This lets unrevealed queued rewards avoid players unlocked from earlier packs without allowing revealed results to reroll. Put reward rules in a pure Dream Club module; no provider calls, online account or payment interface. Presenter effects consume saved results only. Mode dispatch runs only its own progression processors; sharing match code must not accidentally activate Career wages/development in Dream Club.

## 10. Decision log - edit here

| ID | Decision | Status / revisit |
| --- | --- | --- |
| A01 | Electron/React/TS/Vite; pure worker simulation | Accepted design; exact versions pending v0.1 |
| A02 | Windows + native Linux | Owner-required; both platform gates mandatory |
| A03 | Three.js first-look, shared event stream and fallback | Owner-required experiment; preference pending demo |
| A04 | Compressed complete file checkpoints | Accepted baseline; revisit only if measured limits fail |
| A05 | Approved city-based fictional identity profile by default | Real-name profile optional; rights/provider arrangements assumed handled |
| A06 | Fixed seven-document set and test ceilings | Accepted working contract |
| A07 | Fictional second tiers and simplified rules | Proposed baseline; owner can replace before competition scope expansion |
| A08 | Ubuntu 26.04 LTS desktop; actual Steam Deck validation | Updated owner preference; Steam Linux Runtime remains separate |
| A09 | Separate Dream Club with earned choice packs | Owner-selected; bounded v0.7 prototype, no purchases or shared Career economy |
| A10 | Basic ASCII authored documentation | Owner-requested; preserve Unicode in roster/localization data |
| A11 | Football Club Universe (FCU); immutable identity profile per save | Owner-selected title and city-based naming direction; no renaming stable IDs when branding changes |
| A12 | Main-only GitHub backup after completed changes | Owner-directed; no Actions/PRs/worktrees, plain descriptive commit subjects |
| A13 | Public README separate from tracked PROJECT_BRIEF | Owner-directed; all guidance tracked, generated/private paths ignored |
| A14 | 2026-09-11: exact registry-verified stable dependencies: Electron 44.3.0, React/DOM 19.3.0, Vite 8.3.0, TypeScript 7.0.2, Three.js 0.186.0, esbuild 0.28.2, electron-builder 26.15.3, Vitest 5.0.0, Playwright 1.63.0, Zod 4.6.2, ESLint 10.10.0, typescript-eslint 8.70.0 | v0.1; Owner requested latest stable tools. TypeScript 7.0.2 runs tsc through @typescript/native; the documented npm alias supplies @typescript/typescript6 6.0.2 only for the ESLint API. Host Node 26.8.2/npm 11.19.1. No native Steam binding. Official runtime/API docs checked; exact pins/lockfile authoritative. |
| A15 | 2026-09-11: Mulberry32 uint32 RNG with FNV-1a domain-separated fixture match seeds; minute ticks and explicit half-time stop | v0.1 engine/rules pinned. Conditions fixed at 100 and morale at 70 (effective multiplier 1.04); cards, injury, tactics and substitutions deferred to their gates. Synthetic roster is fixed across career seeds. |

| A16 | 2026-09-11: renderer relays typed worker checkpoints to a sender-validated main save service; sandboxed CJS preload, ESM main | v0.1 permitted relay topology. Main parses all disk payloads. Typecheck explicitly invokes the 7.0.2 binary to avoid npm compatibility-package bin collisions. Electron runtime: Chromium 152.0.7977.78 / Node 24.20.0. |
| A17 | 2026-09-11: immutable checkpoints retained in v0.1, including all autosaves, with explicit recovery selection | Conservative first playable policy preserves older and branched files. Three-autosave pruning deferred until ancestry-aware cleanup; disk use grows within this bounded single season. No pre-v0.1 schema exists to migrate. |

| A18 | 2026-09-11: lazy plain Three.js with separate stable visual offset, original primitives, bounded animation and context-loss cleanup | v0.1 experiment only. No simulation dependency on rendering or external art. 30 fps default, 60 optional, shadows off. Reduced-motion starts in text. Owner evaluation pending. |

| A19 | 2026-09-12: replace electron-builder with @electron/packager 20.3.0 for native portable folders; npm 12.0.2, explicit esbuild 0.28.2 script approval and strict script policy | Removes the deprecated installer/asar/proxy dependency chains rather than overriding incompatible transitive APIs. Bundle-only staging and unique release/build-* outputs; start:packaged reads release/latest.json. Save root explicitly remains appData/fcu regardless of packaging productName. Three.js core split into a separate lazy chunk, no warning suppression. |
| A20 | 2026-09-12: owner prioritizes original retro game presentation before new mechanics; replace sidebar with a bounded game shell and action boards | First visual batch only; Three.js retained. Orthographic horizontal camera fits the stadium footprint; goal cut-in is ephemeral committed-event presentation and does not replay on loading. No engine/rules/save migration. Richer stadium and event storytelling await batch review. |
| A21 | 2026-09-12: original Web Audio square/triangle phrases and short SFX, optional music and independent effects toggle | No audio library or external recordings. Music starts on user input, voices are released after playback, all sounds stop while hidden or on unmount. Settings are session-only in this first audition; richer soundscape and persistent volume controls remain later visual work. |

| A22 | 2026-09-12: owner approved the retro shell and requested continuously maintained reference documents; stadium batch follows | Pure samplePlay projects committed events into positions; Three.js owns rendering only. Instanced supporters, flag pivots and local canvas boards share resources with explicit disposal. Animation runs only during playback or bounded three-second replay, pauses when hidden, and never sends simulation commands. No engine/save version change. |

| A23 | 2026-09-12: owner requests fullscreen, larger stadium scale and fluent match pacing; removes skip controls | Fullscreen default with native F11 toggle and fluid shell; full-pitch camera may crop outer decks. Pure choreography accepts previous visual positions; articulated block figures and instanced crowd arms stay presentation-only. Six-second highlights and 1.2-second quiet ticks at 1x, capped 3x; optional half-time continuation. Engine/rules/save versions unchanged. Supersedes A22 replay duration (now six seconds). |

| A24 | 2026-09-12: owner selects pixel-art highlights and requests removal of unused tools | Supersedes A03/A18/A20/A22/A23 presentation experiments. Remove Three.js, its types, stadium, figure projector, choreography, GPU controls and build split. Original Canvas 2D goal/save/miss audition plus text; labeled previews never affect careers. Engine/rules/save versions unchanged. |

| A25 | 2026-09-12: owner requests ISS Deluxe-informed anatomy and less repetitive miss cutaways | Original jointed sprite poses with six-frame gait, shaded slim bodies and planted-leg kick. Every third miss is eligible; goals/saves take priority within a minute. All attempts stay recorded; no probability/rules/save change. Off Target replaces the unsupported narrow-miss claim. |

| A26 | 2026-09-12: central commentary, fixed 2x, running clock and bottom-to-top highlights | Remove mode/speed selectors and idle art. Shared minuteDuration sets 600 ms quiet ticks or 3000 ms selected chances. Clock seconds are transient interpolation clamped before the next minute, frozen on pause and reset to tick:00 on load. Real highlights overlay for 2.4 seconds, then reveal commentary. No engine/rules/save change; blocks/post outcomes deferred. |
| A27 | 2026-09-12: persistent commentary beside highlights and prominent metrics | Enlarge score/clock; left event feed and right statistics with temporary highlights above. Adapt metric rows to a two-column comparison during clips and scale clips for short windows. No engine, clock, save or playback changes. |
| A28 | 2026-09-12: fixed highlight frame and close attacker/keeper scene | Reserve frame and label height at all times, retaining two-column metrics. Remove defender and unused opponent-color projection. Show approach, shot and reactions on the same pitch; no penalty or simulation changes. |
| A29 | 2026-09-12: large left highlights, right commentary/statistics and shared idle scenery | Split the right column vertically, keeping statistics compact and stationary. Use the same Canvas painter for idle scenery and active scenes; remove the separate CSS pitch. Idle draws once, with no animation or domain writes. |
| A30 | 2026-09-12: v0.2 begins with paused substitutions and schema-2 checkpoints | Freeze nine-player benches at kickoff; enforce five changes, three distinct non-half-time ticks and no re-entry. Store ordered substitutions separately from chance events, preserving existing highlight logic and RNG. Engine/app 0.2.0, unchanged exhibition-1 probabilities. Schema-1 decode validates the original checksum then explicitly adds benches/empty history; subsequent saves are schema 2 and old files remain intact. |
| A31 | 2026-09-12: registered test budgets enforced by both runner configurations | Before execution, discover Vitest and Playwright registrations without executing bodies. Combine counts and file paths, including parameterized cases. v0.2 limits 45 cases, nine files and two Electron journeys; empty/failed discovery fails closed. No source-text counting or new registry document. |
| A32 | 2026-09-12: formation and tactical control slice | SetTactics changes only future ticks and next-fixture defaults, without RNG draws or replacing participants. Natural-slot assignment and 0.80 mismatch role strength; chance factors follow GAME, pressing modifies M. Original lineup order remains the weighted-draw order. Schema 3 supports explicit schema-1/2 migrations; preserve source files and show changed-engine notice. Fatigue costs, AI minute-60 policy and custom saved presets deferred. |

Append a dated row only for consequential changes: reason, alternatives rejected, affected gate and migration impact. Routine implementation details belong in code.

| A33 | 2026-09-12: match planning and opponent decisions | SelectBench validates nine unique club reserves and one GK outside the committed eleven. Lineup edits retain eligible reserves; kickoff freezes them. Three nullable tactic slots persist through StoreTacticPreset without applying tactics or consuming RNG. Match managedClubId keeps the minute-60 score-based AI policy away from human controls and allows both AI sides in background fixtures. Schema 4 migrates schema 1/2/3 explicitly, preserving original checkpoints. |
