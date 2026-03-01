import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const assetsOutDir = path.join(projectRoot, 'dist', 'assets');

async function buildAssets(): Promise<void> {
  await mkdir(assetsOutDir, { recursive: true });

  const manifest = {
    pack: 'mvp_base',
    source: 'assets/mvp_base',
    status: 'scaffolded',
    message: 'Custom textures/shaders/map generation will be added in the next step.'
  };

  await writeFile(path.join(assetsOutDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log('[build:assets] scaffold artifact written to dist/assets/manifest.json');
}

void buildAssets();
