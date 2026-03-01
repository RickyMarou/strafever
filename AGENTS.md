# AGENTS.md

Execution contract for this repo. Use this file as the day-to-day implementation guardrail.
Primary roadmap lives in [agents/mvp-plan-ioq3-browser.md](./agents/mvp-plan-ioq3-browser.md).

## Project Goal
Ship a playable browser MVP for **strafever** (ioq3 + WASM) with custom assets and custom movement spec, fully client-side runtime, deployed via GitHub Pages.

## Locked Decisions
1. Engine: vendored `ioquake3` source (no submodules).
2. Movement: own Warsow-inspired spec (not DeFRaG clone).
3. Assets: fully custom only; no Q3A/OpenArena assets.
4. Map: first map is a dead-simple box map generated programmatically.
5. Platform: desktop-only for MVP.
6. UI: no React for MVP; engine HUD + minimal web shell.
7. Package manager: `pnpm` only.
8. Deploy: build to `dist/` (gitignored), deploy to GitHub Pages via GitHub Actions.

## Current Phase Workflow
1. Work one phase at a time.
2. Do not begin next phase until current phase exit criteria pass.
3. Update the plan doc when scope or decisions change.

## Build and Repo Conventions
1. Keep generated artifacts out of git.
2. `dist/` is local/CI output only.
3. Use deterministic scripts:
   - `pnpm build:engine:web`
   - `pnpm build:assets`
   - `pnpm build:web-shell`
   - `pnpm build:all`
   - `pnpm serve:local`
4. Prefer readable, testable code with simple control flow and early exits.
5. GitHub operations must use GitHub CLI (`gh`) rather than browser/manual flow.

## Repository
- GitHub remote: `https://github.com/RickyMarou/strafever`

## Input Handling Requirements (MVP)
1. Pointer lock lifecycle must be handled explicitly.
2. Focus/visibility loss must be handled safely.
3. Keyboard + mouse only.

## Asset Policy
1. Track provenance for every non-generated asset.
2. Keep asset pack minimal and intentional.
3. If source/license is unclear, do not include the asset.

## Definition of Done (per milestone)
1. Local run works from documented command(s).
2. CI passes.
3. Pages deploy works from Actions.
4. Relevant docs/plan are updated.
