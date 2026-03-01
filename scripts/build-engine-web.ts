import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const engineOutDir = path.join(projectRoot, 'dist', 'engine');

async function buildEngineWeb(): Promise<void> {
  await mkdir(engineOutDir, { recursive: true });

  const note = {
    step: 'build:engine:web',
    status: 'scaffolded',
    message: 'ioq3 WASM compilation will be integrated in this step during next Phase 0 tasks.'
  };

  await writeFile(path.join(engineOutDir, 'build-note.json'), `${JSON.stringify(note, null, 2)}\n`, 'utf8');
  console.log('[build:engine:web] scaffold artifact written to dist/engine/build-note.json');
}

void buildEngineWeb();
