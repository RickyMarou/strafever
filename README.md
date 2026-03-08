https://rickymarou.github.io/strafever/

## Runtime Contract

- Site URL: `https://rickymarou.github.io/strafever/`
- Current gameplay entrypoint: `https://rickymarou.github.io/strafever/engine/ioquake3.html?com_basegame=strafever&args=%2bdevmap%20mvp_box`
- Jump2 shortcut: `https://rickymarou.github.io/strafever/jump2/`
- Speedtraining shortcut: `https://rickymarou.github.io/strafever/speedtraining/`
- The gameplay runtime is currently the Emscripten-generated `ioquake3.html` page.
- `web/index.html` is a shell/status page and not the primary gameplay bootstrap.

## Required Build Outputs

- `dist/engine/ioquake3.html`
- `dist/engine/ioquake3.js`
- `dist/engine/ioquake3.wasm`
- `dist/engine/ioquake3.data`
- `dist/assets/baseq3/mvp_base-dev.pk3` containing `maps/mvp_box.bsp`
