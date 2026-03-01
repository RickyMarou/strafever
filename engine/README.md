# Engine Source

This project vendors engine source under `engine/ioq3`.

Fetch it with:

```bash
pnpm run vendor:engine
```

This command uses GitHub CLI (`gh`) and clones `ioquake/ioq3` into this directory.

## Build Prerequisites

To produce real web engine artifacts, install:

1. CMake
2. Emscripten SDK (`emcmake` must be on `PATH`)

## Build Modes

`build:engine:web` supports `STRAFEVER_ENGINE_BUILD_MODE`:

1. `auto` (default): real build when tools are available, otherwise stub artifact.
2. `stub`: always emit stub artifact.
3. `real`: require real build; fails if prerequisites are missing.
