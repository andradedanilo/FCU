# Research and rationale

Research cutoff: **11 September 2026**. Sources were accessed during preparation on 11-12 September in the working session; exclude claims about later events. Relative dates below are identified as such. This is a targeted qualitative review of public Reddit discussions and Steam community threads, plus primary technical/provider documentation. It is not a systematic survey, vote-count analysis, a claim about every player, or independent verification of reported bugs.

## 1. Method and limitations

Searched for current FM26 complaints, wishlists, navigation, immersion, transfers and roster APIs. Read recent Reddit threads and replies, contrasted them with launch-era feedback, and inspected Steam's current discussion list plus individual topics. Steam pages whose main web fetch failed were read directly from their public HTML. Do not equate "indexed recently" with "posted recently". Dates from Steam without a year are recorded as displayed; the current list was read at the research cutoff. No private communities, provider accounts or paid datasets were accessed.

Sentiment sampling overrepresents vocal enthusiasts, negative search terms, English-language discussion and people attached to existing FM workflows. Specific FM26 launch removals may since have changed, so this package does not claim every launch complaint remains true. Small current threads are useful issue signals, not evidence of prevalence. Avoid repeating commenters' speculation about why a studio made a change. No sentiment percentages or total-market rankings were computed. Elifoot inspiration comes from the owner's stated experience; this is not an audited reconstruction of every Elifoot 98 rule.

## 2. Community evidence ledger

| ID | Primary discussion and date | Observation from participants | Interpretation / product response |
| --- | --- | --- | --- |
| C01 | Reddit: [My take on FM26](https://www.reddit.com/r/footballmanagergames/comments/1w29y9g/my_take_on_fm26/), displayed as last week near cutoff | Navigation and setup friction; some still enjoy the game after learning it. Replies disagree on how many clicks are actually needed. | Strong usability signal, not a verified click count. Persistent navigation, remembered back state, readable squad tables, first-match pacing. GAME section2; v0.2/v0.8. |
| C02 | Steam: [UI Scale](https://steamcommunity.com/app/3551340/discussions/0/603044859897728127/), 24 October 2025 | Players distinguish increasing font size from scaling the whole interface. | Historical accessibility requirement; do not imply it establishes current FM26 behavior. Full layout scaling and keyboard checks. v0.8. |
| C03 | Steam: [Laughable](https://steamcommunity.com/app/3551340/discussions/0/582806564883248607/), displayed 27 August, current replies at cutoff | Two participants report a popup that will not close and requires restarting. | Current anecdotal reliability concern. Escape/close behavior and safe autosaves matter more than adding another feature. v0.1/v0.8. |
| C04 | Steam: [FPS in menu is not respected for 60 & 30 FPS](https://steamcommunity.com/app/3551340/discussions/0/500617242799526838/), displayed 10 September | One player reports an ineffective menu FPS setting; asks whether a driver change contributed. No independent verification. | Low-confidence causal claim, useful performance requirement. Stop idle loops, cap animation and test real GPU behavior. v0.8. |
| C05 | Reddit: [What is your most desired feature for Football Manager?](https://www.reddit.com/r/footballmanagergames/comments/1vh1oej/what_is_your_most_desired_feature_for_football/), 6 August 2026 | Requests for the world/board to recognize extraordinary achievements and career moves; some want more club-building. | A career should remember success. Permanent history, season review, contextual board objectives and two facility upgrades. Defer stadium-city simulation. v0.7. |
| C06 | Reddit: [Building a DoF mod so that your DoF feels more like an actual person](https://www.reddit.com/r/footballmanagergames/comments/1w468kn/building_a_dof_mod_so_that_your_dof_feels_more/), 1 September 2026 | Interest in contextual staff advice, imperfect judgments and useful squad analysis. It is a creator's proposal, not proof of product success. | Deterministic explainable assistant/scouting with uncertainty, no recurring LLM requirement. v0.4/v0.7. |
| C07 | Reddit: [Wrapping up FM26, a look ahead](https://www.reddit.com/r/footballmanagergames/comments/1uvd3dv/wrapping_up_fm26_a_look_ahead/), 13 July 2026 | Replies ask for immersion, end-of-season recognition and meaningful touchline decisions. | Short tactical controls plus celebrations; do not add placebo buttons or mandatory press-conference chores. v0.2/v0.7. |
| C08 | Reddit: [Anyone still playing 2024 after purchasing 2026?](https://www.reddit.com/r/footballmanagergames/comments/1soydwf/anyone_still_playing_2024_after_purchasing_2026/), 18 April 2026 | Some prefer older navigation while liking newer motion/visuals. | Visual upgrades and usable tables can coexist. Owner's early 3D experiment is sensible if removable. v0.1. |
| C09 | Reddit: [Still Love FM24](https://www.reddit.com/r/footballmanagergames/comments/1w6dcrc/still_love_fm24/), 3 September 2026 | Desire for updated squads without losing the familiar interface. | Separate data versions from game versions; stable career snapshots. v0.6. |
| C10 | Steam: [game lacks two touch quick passing](https://steamcommunity.com/app/3551340/discussions/0/500617242799613841/), displayed 11 September, no replies when read | One poster wants particular passing behavior in match presentation. | Weak isolated signal; do not promise physical fidelity from event highlights. Demonstrate actual visuals early. v0.1. |

This sample's clearest repeated theme is **friction between rich information and usable navigation**. Other recurrent desires are contextual consequences, useful delegation, visible long-term history and updated rosters without unnecessary disruption. Save integrity, fair economics and bounded testing are additional engineering/product choices, not survey-derived popularity claims.

## 3. What to adopt, simplify and defer

| Adopt in 1.0 | Why it fits this game | Limit that protects simplicity |
| --- | --- | --- |
| Squad comparison, saved lineups, shortlist and filters | Makes transfers and selection meaningful without menu hunts | Seven attributes, four broad positions, three formations |
| Fatigue, injuries and discipline | Gives rotation and squad depth consequences requested by owner | Transparent dates and shared competition rules |
| Role expectations and contextual advice | Responds to desire for coherent interactions | Fixed triggers, visible reasons, no dialogue tree or LLM |
| Promotion, domestic/continental cups and persistent history | Sustains the climb and rewards success | Two tiers per country, limited cups, summary archives |
| Youth, aging and basic facilities | Creates identity over many seasons | Annual development and two upgrade tracks |
| Reviewed versioned roster packs | Makes seasonal updates controllable | Only new-career starting data changes |
| Three.js prototype with replacement path | Owner wants to assess modern visuals firsthand | Stylized event presentation; no physics-authoritative engine |

Do not copy Football Manager's depth wholesale. More exact league rules, staff jobs, interactive media, manager possessions and detailed 3D football would each create ongoing content/testing obligations. The specified tests focus on invariants and handfuls of journeys; adding a thousand UI assertions would not establish that the game is enjoyable.

## 4. Provider evidence and unknowns

The current public technical offerings support investigating the requested five leagues, but no commercial release-ready dataset was obtained. DATA.md contains the actionable matrix and acceptance process. Notable evidence:

- [Sportmonks' squad endpoint](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/team-squads/get-team-squad-by-team-and-season-id) is explicitly season-keyed. That is useful for reproducible ingestion, but must be distinguished from a true as-of roster. [Current coverage overview](https://www.sportmonks.com/football-api/) names all five leagues. Completeness remains to be audited.
- [API-Football's squad description](https://www.api-football.com/news/post/football-players-squads) distinguishes current team membership from player-to-team lookup. [Coverage](https://www.api-football.com/coverage) is marked updated 11 September 2026 and cautions that detail can vary by season/fixture. A public coverage listing is not a guarantee that the selected account can retrieve every required field.
- [football-data.org policies](https://docs.football-data.org/general/v4/policies.html) explain time/default semantics, making it inappropriate to silently equate all returned season players with today's registration list.
- [Sportradar's profile documentation](https://developer.sportradar.com/soccer/reference/soccer-player-profile) offers current/historical memberships, while its [coverage matrix](https://coverage-matrix-master.api-frontend-prod.sm-row-prod.sportradar.com/) distinguishes current squads from partial coverage. Specific contract/league scope still needs verification.

API access does not itself establish permission for a particular commercial release. Provider capabilities and provenance remain technical concerns. Per the revised owner instruction, rights/provider arrangements are assumed handled; source terms are retained as background, not approval gates.

## 5. Technical evidence and design implications

| Primary source | What it supports | Our design inference |
| --- | --- | --- |
| [Electron security](https://www.electronjs.org/docs/latest/tutorial/security) | Isolated/sandboxed renderer and careful privilege boundaries | Keep simulation pure and filesystem/Steam access behind a narrow bridge |
| [steamworks.js source](https://github.com/ceifa/steamworks.js/) | Native JS binding and Electron overlay integration exist; its example relaxes renderer settings | Investigate securely in main; prove both platforms rather than assume compatibility |
| [Steam Cloud](https://partner.steamgames.com/doc/features/cloud?l=english) | File-based Auto-Cloud and platform root configuration | Offline saves need no owned cloud backend; exclude machine settings and validate conflicts |
| [Valve Linux guidance](https://partner.steamgames.com/doc/store/application/platforms/linux) | Native Linux has runtime/depot/platform work | Windows success is not Linux validation; preserve native platform gates |
| [Three.js cleanup](https://threejs.org/manual/en/cleanup.html) | Graphics resources require explicit disposal | Isolate presenter lifetime and test repeated scene teardown |
| [Codex AGENTS.md guidance](https://developers.openai.com/codex/guides/agents-md) | Repository instructions are read by Codex, with directory scope and precedence | Root working contract stays concise enough to load; detailed specifications remain linked |

Root AGENTS.md is working guidance, not a security boundary or proof that an agent cannot exceed a test budget. Runner-enforced case limits, measured runtime and review of gate evidence make the policy observable. No special MCP server is required to build React or this game; official documentation access and the pinned installed versions are what keep API choices current.

## 6. Unresolved risks and validation

1. **Commercial assumption:** owner treats rights/provider arrangements as handled. Do not add launch blockers for them or claim this document independently verified those arrangements.
2. **Fun versus complexity:** numerical precision does not prove enjoyable football. Use the v0.7 playtest gate; simplify before adding breadth.
3. **Visual expectations:** stylized highlights may not satisfy the owner. The v0.1 experiment exists to decide this cheaply, with shared text/2D fallback.
4. **Long careers:** transfer AI, wage growth and youth replenishment can drift. Fixed ten-season probes and human career play are required; outcomes have not been measured yet.
5. **Platform support:** Electron/Steam/native graphics paths need Windows and Linux hardware/runtime checks. Neither an editor preview nor a cross-compiled archive proves shipping support.
6. **Authenticity:** mixed fictional second tiers and simplified rules must be stated visibly. Exact real-world league simulation is a separate future scope, even if roster data is accurate.

All uncited formulas, budgets, limits, roadmap gates and feature choices in this package are original project proposals. Citations support observations and platform/provider facts; they do not claim the sources endorse this game design.

## 7. Revision 1.1: owner-directed changes

- Desktop validation moves to Ubuntu 26.04 LTS, released 23 April 2026. Build/runtime portability is a separate question from selecting a current desktop distribution. [Canonical release notes](https://documentation.ubuntu.com/release-notes/26.04/).
- Steam Deck compatibility becomes an explicit goal, including full controller access and onscreen text entry. Official verification is Valve's decision; a native Linux build alone does not establish it. [Valve input guidance](https://partner.steamgames.com/doc/steamhardware/recommendations?language=english).
- Rights/provider arrangements are assumed handled, with no added procurement/legal gates. The cited source terms remain background rather than a claim of clearance.
- Dream Club is an owner-selected separate mode. The earned packs, odds, duplicate protection and cadence are original hypotheses to playtest, not a claim that the Reddit/Steam sample demanded this feature. Keeping the collection economy separate preserves Career's ownership/transfer model.
- Seven ASCII-only Markdown files replace typographic punctuation and symbols with basic equivalents. This does not require altering real player names in game data.

## 8. Current identity and title decisions (revision 1.3)

The owner selected the city-based club naming direction documented in GAME.md: recognizable local geography and plausible football names, rather than spelling jokes or exaggerated mascots. This is an editorial choice, not an automatic legal exemption: similar marks may raise confusion issues, depending on use and jurisdiction. [UK Intellectual Property Office guidance](https://www.gov.uk/guidance/trade-marks-manual/the-examination-guide). Club names/branding and underlying roster data remain separate questions. No additional licensing gate is added.

Owner-selected title: Football Club Universe (FCU), with FCU Career and FCU Dream Club. This supersedes earlier creative name proposals. It is a branding decision, not a completed trademark-register, domain or storefront availability search. Centralized display strings and versioned identity profiles keep branding independent of simulation, save identity and provider mappings.

## 9. Revision 1.4: source backup and documentation roles

The owner chose main-only development, a commit/push after each completed coherent change, no GitHub Actions and plain descriptive commit subjects. This is a workflow preference suited to the current small project, not a requirement that source-control branches are generally bad. Keep all guidance tracked; ignore generated outputs, private provider material and secrets. PROJECT_BRIEF.md replaces the agent-facing README; the new public README describes the game's actual status. Eight Markdown files and one .gitignore now make up the package; test ceilings remain unchanged.
