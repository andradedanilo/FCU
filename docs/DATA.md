# Roster data, rights and publisher workflow

Research checked 11 September 2026. Planning assumption, owner-directed: rights and adequate provider availability are handled. Do not add procurement/legal approval steps or launch blockers. The reference notes below describe source terms; they do not certify any rights or imply an authenticated API audit occurred.

## 1. Source decision

Evaluate **Sportmonks first**, API-Football second, football-data.org as a narrower alternative, and Sportradar as an enterprise alternative. Assume access and commercial arrangements are handled. Select the adapter by actual required fields and membership semantics; do not gate development on quotes or rights paperwork.

| Candidate | Practical roster access | Commercial limitation / decision |
| --- | --- | --- |
| Sportmonks v3 | Current and season-specific team squads, player includes and stable provider IDs. Public coverage advertises all five targets. | Terms permit building revenue-generating games and storing/distributing data, but prohibit resale without consent. Offline archive redistribution and rights after cancellation are distinct contract topics. Club/player images need separate permission. First technical candidate; commercial arrangements assumed handled. |
| API-Football v3 | `/players/squads?team=...` gives current squad; season player statistics are a different dataset. Discover teams through league/season, paginate other endpoints as documented. Coverage lists the five targets. | Terms expressly do not grant publication licences/commercial competition rights; separate permissions may be necessary. Paying for access is insufficient. Technical alternative; commercial arrangements assumed handled. |
| football-data.org v4 | Team resource with squad; the five leagues appear on coverage page. Verify exact squad fields, season semantics and plan access with sample requests. | Attribution required. Terms section 9.1 restrict continued reference to obtained data after cancellation. This is a poor default for durable offline saves without a negotiated amendment. |
| Sportradar Soccer | Player profiles contain current/historical memberships; coverage matrix distinguishes current squads and partial coverage. | League scope, desktop simulation, offline redistribution and survival rights are contract-specific. Public technical documentation is not redistribution permission. Enterprise option, not assumed affordable or complete. |

Supporting primary sources: [Sportmonks squads](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/team-squads/get-team-squad-by-team-and-season-id), [coverage overview](https://www.sportmonks.com/football-api/), [terms](https://www.sportmonks.com/terms-of-service/), [API-Football current squads](https://www.api-football.com/news/post/football-players-squads), [coverage](https://www.api-football.com/coverage), [terms](https://www.api-football.com/terms), [football-data team API](https://www.football-data.org/documentation/api), [coverage](https://www.football-data.org/coverage), [terms](https://www.football-data.org/about), [attribution FAQ](https://www.football-data.org/documentation/faq), [Sportradar profiles](https://developer.sportradar.com/soccer/reference/soccer-player-profile), [coverage matrix](https://coverage-matrix-master.api-frontend-prod.sm-row-prod.sportradar.com/).

### Five-league acceptance matrix

Public coverage is a shortlist signal, not authenticated verification. During adapter integration fill all cells with the selected provider's IDs, season, entitlement and audit result. Do not hardcode league names as identity keys or confuse similarly named leagues in other countries.

| Canonical key | Country / intended competition | Advertised by Sportmonks / API-Football / football-data.org | Current season/team/squad audit |
| --- | --- | --- | --- |
| ENG-T1 | England / Premier League | Yes / Yes / Yes | Pending |
| ESP-T1 | Spain / LaLiga | Yes / Yes / Yes | Pending |
| FRA-T1 | France / Ligue 1 | Yes / Yes / Yes | Pending |
| ITA-T1 | Italy / Serie A | Yes / Yes / Yes | Pending |
| DEU-T1 | Germany / Bundesliga | Yes / Yes / Yes | Pending |

Discover active season and participating teams from the provider, compare against an editor-maintained expected-membership list sourced lawfully for that season, then retrieve every first-team squad. A "players who appeared this season" endpoint can omit unused new signings and include departed players; it is not a current roster. A historical season squad may include everyone who belonged during the year; it is not necessarily a point-in-time squad. In particular, check [football-data's policies](https://docs.football-data.org/general/v4/policies.html). No provider is assumed to support arbitrary historical as-of snapshots unless verified.

No scraping of FM/EA databases, Transfermarkt, unofficial mirrors or community roster mods as a shortcut. A CSV in a public repository is not evidence of commercial rights. Open event datasets are not assumed to provide complete current rosters. Manual original fictional fixtures are the reliable engineering fallback, not the requested commercial launch content. Do not ship a player-facing "bring your own API key" workaround to bypass licensing or publish unapproved fan packs.

## 2. Rights are separate from connectivity

Reference context only: provider contractual permission, database rights, trademarks, personality/publicity rights and privacy requirements are distinct, and depend on territories/use. API access alone is not proof of redistribution rights. This project assumes arrangements are handled externally; Codex does not request or audit them as a gate.

[FIFPRO Commercial](https://www.fifpro.org/en/who-we-are/commercial) offers player name/image/likeness licensing enquiries for game developers. This is a contact route, not proof that it covers every player, club, competition or territory. Sportmonks' own [integrity page](https://www.sportmonks.com/integrity-support/) says it does not claim official league rights. Real team names alone can require a different analysis from badges; do not assume replacing only a logo clears the whole product.

Optional background topics for the owner, outside the development and launch gates:

1. Contract/licence reference, contracting party, authorized product/app ID, platforms and territories; permitted fields and asset categories.
2. Explicit paid desktop-game use, local caching, transformed ratings, bundled/exportable snapshots, patch redistribution, end-user saves, cross-device Steam Cloud copying and offline use.
3. Whether existing customers may retain/use saves and packs after subscription cancellation or licence expiry, and whether future sales/downloads/updates may continue. Seek durable end-user use rights; do not assume them.
4. Attribution wording/location, mandatory notices, audit requirements, retention limits, correction/takedown obligations and termination procedure.
5. Whether a publisher-only pipeline counts as a permitted application/domain, how contractors may access it, and what must never be passed to consumers.

Keep any supplied private contract material outside builds. Public manifests may carry a rightsRef and supplied attribution as informational metadata. Do not implement a legal-clearance state machine, rights-based export lock or recurring approval prompt. Never silently delete customer saves.

## 3. Two applications, no gameplay backend

Terminology: a **roster snapshot/archive** in this document is publisher data, not a gameplay reward. A **player-choice pack** in GAME section 11 is an earned Dream Club reward drawn from the installed snapshot. Opening rewards makes no API call, changes no roster archive and spends no money. Dream Club pins its source snapshot and rating model just as Career does.

The player game reads installed/imported approved packs. It does not query roster providers, carry API keys or offer live season sync. The **publisher roster tool** is a separate developer-only Electron app with the same UI stack and a Node pipeline. It exposes "Sync latest squads", "Review changes", "Approve candidate", and "Export release pack". Do not add a hosted admin dashboard.

Credentials live in an OS credential store or explicitly supplied environment on the publisher machine. Redact URL query tokens. Raw responses and editorial mappings live in an ignored private working directory under the provider's retention rules. Never bundle them in Steam depots. The separate tool can run on either supported development OS; it is not a consumer feature.

## 4. Adapter and normalized contract

Add an editorial `identityProfileId` and `identityProfileVersion` to the release manifest and new-game save. Profiles map stable entity IDs to display name, short name and original/approved visual references. Keep provider-to-entity mappings private to the publisher pipeline. Export resolves the chosen profile before serialization; a fictional-profile archive must not accidentally expose replaced real display names through alternate fields, asset filenames or source URLs. Preserve private provenance separately. This is presentation/export separation, not a mechanism that creates legal permission for the source data.

The default identity profile is `fcu-city-v1`, using the city-based starter mapping in GAME.md; keep a real-name profile optional. Club aliases alone do not imply that player identities or source-data permissions change. Do not automatically pseudonymize players unless separately requested. Existing saves freeze the chosen profile and remain readable without access to the publisher mapping table. The development exhibition fixture uses local synthetic IDs rather than invented provider IDs.

Every provider implements these logical operations; exact HTTP routes belong inside the adapter:

```ts
interface RosterProvider {
  id: string;
  capabilities(): Promise<Capabilities>;
  listSeasons(competitionRef: string): Promise<ProviderSeason[]>;
  listTeams(seasonRef: string, cursor?: string): Promise<Page<ProviderTeam>>;
  fetchSquad(teamRef: string, seasonRef: string,
             cursor?: string): Promise<Page<ProviderMembership>>;
  fetchPlayers(ids: readonly string[], cursor?: string): Promise<Page<ProviderPlayer>>;
}
```

Capabilities declares current-versus-season membership semantics, supported fields, pagination, maximum batch size, rate limits and optional source timestamps. There is no fake universal `asOf(date)` capability. If unavailable return UnsupportedCapability, not fabricated history. `Page<T>` contains items, nextCursor, requestFingerprint, fetchedAtUTC and nullable sourceUpdatedAtUTC. Provider types stay inside pipeline packages; simulation consumes normalized contracts only.

Canonical IDs are publisher UUIDs. A private mapping table links `(providerId, entityType, providerEntityId)` to canonical ID. Never use display name as key. Provider switch needs deliberate reconciliation. Exact DOB/name/nationality/team similarity may propose a match, but never auto-merge ambiguous people. Preserve aliases and merged-ID redirects; retired/departed players keep their identity. A transfer between included teams yields one player with updated membership, not a deletion/new person.

Normalized pack contains:

| Entity | Required fields |
| --- | --- |
| Competition | id, countryCode, displayName, seasonStartYear, participatingTeamIds, rulesProfileRef |
| Team | id, displayName, countryCode, competitionId, originalVisualRef or clearedAssetRef |
| Player | id, displayName, dateOfBirth, nationalityCodes, primaryRole, secondaryRoles |
| Membership | playerId, playingTeamId, owningTeamId or explicit unknown, isLoan, validFrom/validTo nullable, shirtNumber nullable |
| GameProfile | playerId, seven attributes, potential, generatedContract, ratingModelVersion, assumptions |
| Provenance | entityId, fieldPath, sourceKind, providerRef, observedAtUTC, sourceUpdatedAtUTC nullable, confidence, rightsRef |

SourceKind is provider/editorial/generated. Unknown salary, contract duration, ability, potential or loan owner must never be presented as verified. Public roster APIs rarely provide a complete management-game attribute set. Ratings are deterministic original estimates: baseline role templates with a seeded +/-5 adjustment; editorial team-strength baseline 40-80, curated independently with permitted inputs, then clamped. Stats-based model may replace this only in a versioned change with legal permission and calibration. Do not label generated financial or medical data as facts about a real person. Actual ongoing injuries/suspensions are excluded from first release imports; start all players eligible under this game's rules.

Raw roster facts may exceed the game 30-player active limit. Retain the full normalized senior roster in the pack; the new-career wizard clearly selects 30 active players by eligible role coverage then rating, and moves extras to an inactive contracted list which can be registered when space opens. Inactive players retain wages/ownership and are ineligible for matches, not deleted. Show this simplified registration rule in setup. Development academy capacity is separate.

## 5. Sync state machine and failure behavior

`idle -> preflight -> fetching -> normalizing -> validating -> review -> approved -> exported`.
Errors lead to `failed`; operator cancellation to `cancelled`. Only a complete reviewed candidate can be approved. No button automatically publishes to Steam.

1. **Preflight:** choose provider, five competitions, explicit season per competition and intended current-squad or historical-season semantics. Check working token, endpoint access and quota. Capture expected teams and rules mapping. Warn that requests span time; there is no atomic provider-wide timestamp.
2. **Fetch:** enumerate every page of teams, squads and required player profiles. Concurrency two initially; enforce provider rate limit, honor Retry-After, exponential backoff 1/2/4/8 seconds plus bounded jitter, at most four retries per request for 429/5xx/timeouts. 401/403 stops. Detect repeated cursors and contradictory counts. Record success/failure per team. Resume a run only within 24 hours and same parameters; otherwise restart to avoid mixed stale generations.
3. **Normalize:** apply stable ID mapping, role translation and deterministic rating generation. Preserve source dates separately from fetch dates. Missing provider timestamps are unknown, never "updated today". Store extractionStartedAt and extractionCompletedAt; "snapshot as of" means observed during that interval unless the provider guarantees historical validity.
4. **Validate:** all five competitions fetched; expected membership exactly reconciled; all pages completed; no orphan/duplicate canonical IDs; one active playing-club membership per player in this snapshot; names/DOB/roles present; DOB sensible 14-60 as a data guard, otherwise review; at least 18 senior players and two GKs per team as a plausibility check. This is not proof of completeness. Compare every team against approved roster evidence, with reviewer status per team. Missing or ambiguous identities/loan memberships block export until resolved. Large changes (>20% squad turnover or >5-point team-average rating shift) require explicit review, not automatic rejection.
5. **Review:** show team-by-team additions, departures, transfers, field edits, generated assumptions, exceptions, licence status and extraction interval. Never silently copy an old squad into a failed league. A manually accepted incomplete private candidate is labeled incomplete and cannot become the full-five-league release. An authenticated provider sample plus all-team reconciliation is necessary to claim complete senior rosters.
6. **Approve:** owner selects an exact candidate hash. Record reviewer/time, quality results, editorial patches and supplied metadata. Modifying anything invalidates approval. Export requires no unresolved blocking data errors; rightsRef is informational and does not trigger a software approval gate.
7. **Export:** canonicalize payload, generate manifest, hash and sign using publisher key; write an immutable local pack. A separate owner-authorized Steam build includes it. Previous approved pack remains available until retention/rights policy says otherwise. A failed export cannot change the selected public version.

## 6. Snapshot identity and release format

Example identity: `roster-2026-27.20260911.r1`; game app version may independently be `0.6.0`. Monotonic revision per season/date; never overwrite an existing ID. If normalized content and applicable rules/rights fingerprint are unchanged, report "No roster changes", retain the previous snapshot and keep only the private sync audit. Do not generate artificial updates merely because fetchedAt changed.

Pack is a ZIP with `manifest.json`, `roster.json`, approved notices and optional cleared assets. Manifest fields: rosterSchemaVersion, snapshotId, contentHash, createdAtUTC, extraction interval, seasonByCompetition, providerId/adapterVersion, ratingModelVersion, rulesProfileVersion, previousSnapshotId, team/player counts, qualitySummary, rightsRef, permittedDistribution, attribution, compatibleSaveSchemaMin/Max, payload sizes, signingKeyId, signature. Hash covers exact canonical roster payload and sorted asset hashes; signed manifest excludes its own signature field. Metadata timestamps are not part of normalized content equivalence.

Use Ed25519 signing for official packs; public keys ship with app, private key stays outside repository/build output. Hash detects corruption; signature identifies publisher; neither proves legal rights. Imports cap compressed size 50 MB, expanded size 200 MB, entity counts 50,000 players/1,000 teams, nesting depth 32. Reject path traversal, absolute paths, symlinks, executable content, unknown schema, bad signature and unexpected file types. Local unsigned development packs are allowed only in developer builds, visibly marked, never official launch content.

New Career lists installed pack versions, season, observed dates and original-estimate notice. Selecting a new default pack affects only new careers. Example: career A starts on r1; sync produces r2 after a transfer; a new career B sees r2, A retains its own football history and transferred players. No button updates an existing career's roster. Steam patch rollback changes offered new-career packs, not existing saves.

## 7. Operational integration

When integrating a provider, verify all current senior registrants including unused signings, loan owner versus borrower, update timestamps, season semantics, correction/merge IDs and pagination/quota cost. Commercial arrangements are assumed handled; no quote or legal review is a Codex milestone.

For request sizing estimate `season/team discovery + all squad pages + all player-detail pages + retries`; do not assume one request per player when batch/includes exist. Run a quota forecast before sync. Expected operation is owner-triggered preseason and optional post-window update, not continuous polling.

v0.6 delivers the adapter, sync workflow and versioned data checks. Use controlled fixtures while live access is unavailable and do not claim that as a live API pass. v0.9/v1.0 require working game content and packaging, not a procurement or legal approval gate. Do not manufacture fetched rosters or successful provider responses.

### Development world expansion

v0.5.1 introduced the fictional-world-2026-v1 development snapshot: 176 club identities, ten divisions and 3,884 generated players including twelve free agents. packages/contracts/src/world.ts centralizes city profiles and starting membership; original eight-club saves retain fictional-2026-v1 and the exhibition schedule. Identity profile version 2 adds countries without changing the approved starter IDs. This generated world is offline fixture content, not a provider integration or an authentic roster claim.

Cup schedules and qualification are career state, not mutable roster-provider data. v0.5.2 retains both development snapshot IDs. Schema-15 country saves enable cups next season; their frozen roster, current fixtures and archived results remain intact. No live provider response or imported roster is claimed by this milestone.

### v0.6 pipeline implementation

The first slice lives in packages/roster-pipeline/src. Schema 1 separates canonical UUID entities, memberships, generated game profiles and the private extraction/provenance audit. Validation reconciles five target leagues and exact expected teams, rejects duplicate membership/unknown loan ownership and requires complete fetching plus per-team review. Review hashes include the exact audit; content hashes exclude extraction times and canonicalize entity ordering. Player diffs retain identity through transfers. The bounded page collector rejects duplicate IDs, repeated cursors/fingerprints and inconsistent totals.

npm run roster:check audits a synthetic 96-team / 2112-player fixture using centralized FCU club names. Its explicit fixture-review flag is development evidence, not release approval or provider verification. The live adapter, publisher UI, signed ZIP archives and consumer import remain subsequent v0.6 slices. No API credentials or provider responses have been used.

Archive slice: archive.ts produces manifest.json, roster.json and notices.txt ZIP entries using fflate 0.8.3. Official mode requires an Ed25519 private key supplied by the publisher; readers require a trusted public key. Unsigned archives require an explicit development-reader flag. Imports bound compressed/expanded sizes and JSON depth, reject extra/path-traversal/link entries, and verify signatures plus payload/notices hashes. store.ts verifies a temporary file before exclusive hard-link publication, preserving prior snapshot IDs. Private audit/provenance is not included in public ZIPs. No official key has been created or pack published. Consumer game import remains pending.

Publisher UI slice: npm run roster:build then npm run roster:start opens the separate local Electron tool. Create a fictional candidate, review squads (bulk review is restricted to the unchanged synthetic fixture), approve the exact hash, then export an unsigned development ZIP. Open candidate JSON accepts the strict {roster,audit} document, capped at 20 MB. Publisher state and immutable exports stay under ignored apps/roster-tool/.local; FCU_PUBLISHER_DIR can isolate development inspection. Restart restores the candidate and export path. No live Sync button, official-key UI or consumer Import button is presented before it works. The tool is excluded from game build/package entry points.

Consumer import slice: development game builds can install unsigned ZIPs and select versions at New Career. Packaged builds reject unsigned packs; no official trust root is configured yet. The worker receives only normalized contracts, not provider/pipeline code. Career schema 17 freezes source UUID mappings, snapshot hash and observation date; Save/Load needs no installed pack. The first conversion supports the current 96-team top-division shape, 18-30 players per squad and non-loan ownership. Bigger squads and imported loans fail explicitly pending the next slice; no players are silently dropped. Fictional second divisions remain generated. The owner explicitly deferred live provider verification; continue with fictional data.

Registration slice supersedes the initial 30-total/non-loan conversion limit above. All normalized players are retained in the career. Role coverage then ability selects up to 30 active seniors; the rest are inactive with full wages/ownership. Squad registration changes active selection before a match and rebuilds lineup/bench. Active outgoing loans reserve return places; academy capacity remains separate. Imported loans have source=roster and no invented transfer-offer history. Their game assumptions are borrower pays 100 percent of the generated wage and return on the next June 30; generated contracts extend to that boundary if needed. Unknown/out-of-pack owners remain unresolved data and cannot import. Schema 18 migrates all schema-17 players as registered and existing loans as market-origin. New publisher exports target schema 18, so unchanged roster data is re-exported when its prior archive compatibility is obsolete.

The fictional provider now implements the adapter contract with ten-item pages. Publisher candidate creation fetches all five seasons, 96 teams, squads and batched profiles; missing or mismatched facts stop the run without replacing existing candidate state. This is synthetic protocol evidence, not a live provider audit. Live verification is deferred by owner.

Sportmonks fixture adapter: season membership only; one player per request, explicit role mapping, null source timestamps. League seasons include, teams-by-season and season-squad routes follow the official endpoint documentation. Unexpected pagination is refused rather than silently truncated. Transport uses header authentication, a configured conservative per-minute cap, four retries for 429/5xx/network failures and Retry-After; delays above one minute stop for later retry. Body read failures stop the extraction. Credentials and HTTP are not wired into the game. Full provider-to-canonical normalization and live entitlement/coverage evidence remain outstanding.

Reference: [Sportmonks authentication](https://docs.sportmonks.com/v3/welcome/authentication), [league seasons include](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/leagues/get-league-by-id), [player endpoint](https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/players/get-player-by-id). Fixture-only checks do not establish current coverage.

Provider normalization now uses a private sync plan: roster and audit plus competitions keyed by canonical UUID with league/season source references, and teams/players maps from canonical UUID to provider reference. This explicit bootstrap preserves namespaced identities and editorial ownership/nationality. Unknown people, departed players or changed playing membership require a revised plan; there is no name-based merge or guessed loan owner. Fetched name, DOB and role receive observed provenance; generated ratings/contracts remain estimates. All team review flags reset.

Run npm run roster:sync -- <private-config.json>. Configuration contains plan, roles (provider position ID to GK/DEF/MID/FWD), requestsPerMinute and responses (path-to-JSON fixture map or null). For actual requests additionally pass --live and set SPORTMONKS_API_TOKEN outside the repository. Live verification remains deferred. Successful runs write a new candidate JSON under apps/roster-tool/.local/candidates; open it in the publisher for review. No previous candidate or exported pack is overwritten on failure. There is no resume across partial runs yet; restart performs a fresh extraction.

## Fictional development snapshot v2

New country careers and the shared default Dream pool use fictional-world-2026-v2. Deterministic per-club rating anchors vary by tier, providing actual 55-64, 65-74 and 75-84 role coverage instead of labeling a sub-70 pool Elite. Top-tier anchor is 62 + 5 * (club index mod 4), second-tier anchor 48 + 5 * (club index mod 3); each original seeded attribute draw adds 0..15. The eight-club exhibition keeps fictional-2026-v1 and its original 55..70 attributes. This is authored test content, not a provider rating claim. Existing Career/Dream saves retain their frozen players and snapshot ID; loading never regenerates their attributes. Imported packs keep their supplied values.

Runtime secondary positions are retained from primaryRole/secondaryRoles in imported snapshots and in the frozen Dream pool. Duplicate secondary roles and a repeated primary role are rejected. No secondary positions are invented when an older or fictional runtime player has none. In-game performance history is simulated data, never provider statistics or a reason to mutate the frozen source pool.
