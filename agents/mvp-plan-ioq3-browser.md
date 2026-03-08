# Browser Q3-like Movement Game MVP Plan (ioq3 + WASM)

Working title: **strafever**

## Goal
Ship a playable MVP to GitHub Pages with:
- ioq3 running in browser (WASM)
- no original Q3A/OpenArena assets
- fully client-side runtime
- playable map selection (`jump2`, `speedtraining`)
- in-game run timer + local personal best per map

Out of scope for this MVP:
- online multiplayer
- server-side validation
- ghost/replay hosting (design hooks only)
- exact CPMA/DeFRaG parity

## Product Principles (KISS)
1. Ship a complete playable loop before deeper engine/perf work.
2. Keep runtime 100% client-side for MVP.
3. Prefer deterministic build scripts and minimal moving parts.
4. Preserve future replay/ghost architecture hooks without implementing backend now.

## Current Status
- Phase 0 (build/deploy baseline): **done**
- Phase 1 (custom assets + playable maps without original assets): **done**
- Phase 2 movement tuning: **partially done and frozen for MVP**

Current movement policy:
- Keep current tuned VQ3-style settings (`pm_airaccelerate`, `pm_friction`).
- No double jump.
- Defer CPM-lite aircontrol experiments until after MVP release.

## MVP Functional Scope (Re-prioritized)
1. Landing page lets user launch maps (`jump2`, `speedtraining`) without console.
2. In-game timer supports start, stop, and reset/restart flow.
3. Local best time is stored per map in browser storage.
4. HUD displays current run time and `best MM:SS.mmm` when available.
5. Desktop-only support (latest Chrome/Firefox/Safari).

## Delivery Plan

### Phase 0: Repo and Build Baseline (Done)
- `dist/` output, gitignored.
- Deterministic scripts (`pnpm`):
  - `build:engine:web`
  - `build:map`
  - `build:assets`
  - `build:web-shell`
  - `build:all`
  - `serve:local`
- GitHub Actions deploy to Pages from `dist/`.

Exit criteria: met.

### Phase 1: Minimal Content Without Q3 Assets (Done)
- Custom/generated assets and shader placeholders.
- Programmatic MVP box map.
- Imported external training maps with placeholder texture compatibility where needed.

Exit criteria: met.

### Phase 2: Playable Run Loop (Active)

#### Phase 2A: Timer + Personal Best (Do first)
- Implement run timer lifecycle in gamecode/HUD path:
  - run start trigger condition
  - run finish trigger condition
  - run reset/restart command path
- Implement map-aware local PB storage in browser layer:
  - key format includes map id and physics version
  - update PB only when run is valid and faster
- HUD display requirements:
  - current run timer
  - `best MM:SS.mmm` if PB exists

Exit criteria:
- Complete timed run can be done without manual console commands.
- PB persists across page reloads and updates only when beaten.

#### Phase 2B: Landing UI / Launch UX
- Replace status shell with minimal production landing page:
  - map cards/buttons (`jump2`, `speedtraining`)
  - clear "Play" action with pointer lock guidance
  - link directly into engine launch URL with selected map
- Keep UI framework-free (no React) and lightweight.

Exit criteria:
- User can choose map and start gameplay from landing page in one click path.

### Phase 3: Production Hardening
- Verify Pages deploy always includes required pk3/map assets.
- Cache-busting/versioning for wasm/js/pk3 assets.
- CI smoke checks for launch URLs (`/`, `/jump2/`, `/speedtraining/`).
- Update docs for local run + deploy + map import workflow.

Exit criteria:
- Fresh browser profile can load landing page, launch either map, and complete a timed run with PB persistence.

### Phase 4: Post-MVP Enhancements (Deferred, not removed)
- CPM-lite aircontrol experiments.
- Additional movement spec passes.
- Performance deep dive and optimization passes.
- Replay/ghost serialization and server-hosted leaderboard/ghost service.

## Performance Strategy (MVP-appropriate)
1. Defer heavy optimization until loop is complete and deployed.
2. Keep asset set small and UI updates cheap during gameplay.
3. Track regressions, but do not block MVP on perf tuning unless it breaks playability.

## Architecture Hooks for Future Ghost/Replays
Design now, implement later:
1. Stable run schema:
- map id
- physics version
- timing metadata
- optional input stream version
2. Deterministic settings fingerprint in run metadata.
3. TypeScript boundaries for serialization/deserialization.
4. Keep backend integration as a separate adapter layer.

## Re-organization vs Previous Plan
1. Movement work is no longer the immediate driver.
- Before: Phase 2 focused on OSS CPM-like movement implementation.
- Now: movement tuning is frozen at "good enough" for MVP.

2. Timer + PB moved earlier and made mandatory MVP scope.
- Before: timer existed as part of later core-loop phase.
- Now: timer + local PB is the primary active workstream.

3. Landing page UX promoted to core deliverable.
- Before: web shell was mostly status/utility.
- Now: landing UI is required to launch maps without console.

4. Production objective prioritized over deeper feature exploration.
- Before: stronger emphasis on movement parity and broader HUD ambitions.
- Now: "ship playable MVP" first; advanced movement/perf/replay moves to post-MVP.

## Locked Decisions
1. Movement target (long-term): own movement spec (Warsow-inspired direction), not DeFRaG clone.
2. Platform: desktop-only for MVP.
3. Engine integration: vendored source, no submodules.
4. Deploy: `dist/` output, gitignored, deployed by GitHub Actions.
5. UI: no React for MVP.
6. Assets: fully custom/generated placeholders + externally sourced maps only when legally acceptable.
7. Input strategy: explicit pointer lock/focus/visibility handling.
8. Package manager: `pnpm`.
