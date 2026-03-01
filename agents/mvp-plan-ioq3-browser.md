# Browser Q3-like Movement Game MVP Plan (ioq3 + WASM)

Working title: **strafever**

## Goal
Ship a first playable MVP to GitHub Pages with:
- ioq3 running in browser (WASM)
- no original Q3A assets
- CPM-like movement in an OSS mod (not original DeFRaG)
- fully client-side runtime

Out of scope for this first iteration:
- online multiplayer
- server-side validation
- ghost/replay persistence (must keep architecture ready for it)

## Product Principles (KISS)
1. Prefer source ownership over binary-mod dependency.
2. Keep one map, one mode, one timer loop first.
3. Delay non-critical polish until movement feel is stable.
4. No backend for MVP runtime.

## Recommended Technical Direction

### Engine
- Base: `ioquake3` compiled to WebAssembly (Emscripten).
- Serve static artifacts from GitHub Pages.
- Keep build outputs deterministic and reproducible via scripts.

### Gameplay / Physics
- Create a custom mod namespace (`fs_game`) and own the gamecode.
- Define and implement our own movement spec (Warsow-inspired direction), rather than cloning DeFRaG/CPMA behavior exactly.
- Keep movement constants centralized and versioned to support future replay validation.

### Assets
- Use fully custom placeholder assets (flat colors + minimal shaders).
- Build a minimal replacement PK3 pack with only required assets.
- Ensure required shader names/material references are satisfied for selected map(s).
- Do not use OpenArena assets in MVP; maintain fully original visual identity from day one.

### Input Handling (Browser)
- Handle pointer lock lifecycle explicitly in web shell: acquire on play, recover cleanly after `Esc`/focus loss.
- Handle tab visibility/focus events and pause or resync safely on resume.
- Define minimal desktop input assumptions for MVP (keyboard + mouse only).
- Keep browser-layer input glue thin; defer advanced input customization until after core loop works.

### UI
- Decision: no React for MVP.
- Use engine HUD + minimal DOM overlay for boot/loading/settings.

Reasoning:
- React overhead is usually manageable, but avoid introducing reconciliation/event complexity in movement-critical UI paths early.

### TypeScript
- Use TypeScript for all web shell/orchestration scripts and tooling.
- Keep engine/gamecode in their native language/toolchain.
- Define typed contracts now for future replay/ghost APIs even if unimplemented.

## MVP Functional Scope
1. Launch page loads WASM engine and assets.
2. Start into one training map.
3. Player movement with CPM-like physics active.
4. Timer start/stop + restart command.
5. Basic HUD: time, speed, checkpoint count (if checkpoints included).
6. Runs on desktop Chrome/Firefox/Safari latest.

## Delivery Plan

### Phase 0: Repo and Build Baseline
- Add `dist/` as local build output (gitignored; never committed).
- Add scripts:
  - `build:engine:web`
  - `build:assets`
  - `build:web-shell`
  - `build:all`
  - `serve:local`
- Lock toolchain versions (Emscripten, Node, pnpm).
- Standardize package management on `pnpm` (single lockfile, single script runner).
- Add GitHub Pages deployment pipeline now using GitHub Actions artifact deploy from `dist/`.
- Output: reproducible local build command and local playable page.

Exit criteria:
- `npm run build:all` (or equivalent) produces a static site that launches engine locally.
- GitHub Actions deploys to Pages from Phase 0.
- Public URL is available in Phase 0 (even if content is minimal), with no build artifacts checked into git.

### Phase 1: Minimal Content Without Q3 Assets
- Create `mvp_base.pk3` with:
  - placeholder textures
  - minimal shader scripts
  - one dead-simple custom MVP box map generated programmatically
- Validate no proprietary Q3 assets are referenced at runtime.

Exit criteria:
- Game loads with no missing critical assets/errors for selected MVP map.

### Phase 2: OSS CPM-like Movement in Custom Mod
- Create mod folder (example: `mvpmod`).
- Implement movement feature set for MVP:
  - air control / strafe behavior
  - acceleration/friction params
  - jump behavior
- Add deterministic config surface (single source of truth constants).
- Add movement sanity tests where feasible (unit-ish tests around formulas if practical).

Exit criteria:
- Subjective movement feel and objective speed benchmarks pass agreed thresholds.

### Phase 3: Core Loop and HUD
- Implement timer lifecycle and restart flow.
- Add minimal HUD and command bindings.
- Keep UI intentionally thin.

Exit criteria:
- One complete run loop works without console intervention.

### Phase 4: Production Hardening
- Harden existing Pages pipeline (introduced in Phase 0).
- Cache-busting strategy for WASM/PK3.
- Compression + correct MIME headers (as supported by Pages workflow setup).
- Add basic smoke checks in CI.

Exit criteria:
- Public URL runs MVP from clean browser profile.

## Performance Strategy (MVP-appropriate)
1. Prioritize frame pacing and input consistency over max FPS.
2. Measure:
- boot time
- first interactive time
- frame time stability on target desktop hardware
3. Keep asset set tiny.
4. Avoid heavy DOM/UI updates during gameplay.

Initial perf targets:
- Stable 120 FPS on mid/high desktop where possible
- Acceptable fallback at 60 FPS on weaker machines
- No long stutters during core movement loop

## Architecture Hooks for Future Ghost/Replays
Design now, implement later:
1. Stable run schema:
- map id
- physics version
- input/event stream format version
- timing metadata
2. Deterministic settings fingerprint included in run data.
3. Export/import boundary in TypeScript (`RunEncoder`/`RunDecoder` interface).
4. Keep replay service integration as separate adapter layer.

## Risks and Mitigations
1. Closed-source DeFRaG parity risk
- Mitigation: define explicit movement acceptance tests for MVP rather than claiming exact parity.
2. Asset/legal contamination risk
- Mitigation: strict asset provenance list and CI check for forbidden paths/names.
3. Browser variance risk
- Mitigation: standardize test matrix early (browser versions + refresh rates).

## Suggested Directory Shape (Initial)
- `engine/` -> vendored ioq3 source in-repo
- `mod/` -> custom gameplay code (CPM-like behavior)
- `assets/` -> textures, shaders, maps, pk3 build scripts
- `web/` -> TypeScript launcher shell and static host glue
- `agents/` -> planning and decision docs

## Immediate Next Step (this week)
1. Stand up Phase 0 pipeline and verify local playable browser launch.
2. Add placeholder asset pack and make one programmatically generated box map reliably load.
3. Scaffold custom mod with physics constants and one movement delta.

## Locked Decisions
1. Movement target: own movement spec (Warsow-inspired direction), not DeFRaG clone.
2. Content: one custom simple map for MVP.
3. Platform: desktop-only for MVP.
4. Engine integration: vendored source, no submodules.
5. Deploy: `dist/` output, gitignored, deployed by GitHub Actions from Phase 0.
6. UI: no React for MVP; engine HUD + minimal shell.
7. Assets: no OpenArena assets; fully custom asset pack only.
8. Input strategy: explicit pointer lock/focus/visibility handling in web shell from the start.
9. Map strategy: first map is a dead-simple box map generated programmatically.
10. Package manager: `pnpm`.
