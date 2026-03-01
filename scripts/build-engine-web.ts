import { access, cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { constants as fsConstants } from 'node:fs';
import { spawn } from 'node:child_process';

const projectRoot = process.cwd();
const engineSourceDir = path.join(projectRoot, 'engine', 'ioq3');
const wasmBuildDir = path.join(engineSourceDir, 'build-wasm');
const distEngineDir = path.join(projectRoot, 'dist', 'engine');

type BuildMode = 'auto' | 'stub' | 'real';

type BuildNote = {
  step: 'build:engine:web';
  status: 'stubbed' | 'built';
  mode: BuildMode;
  reason?: string;
  artifacts?: string[];
  message: string;
};

function getMode(): BuildMode {
  const raw = process.env.STRAFEVER_ENGINE_BUILD_MODE;
  if (raw === 'stub' || raw === 'real' || raw === 'auto') {
    return raw;
  }

  return 'auto';
}

async function commandExists(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('sh', ['-lc', `command -v ${command}`], { stdio: 'ignore' });
    child.on('close', (code) => resolve(code === 0));
  });
}

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function run(command: string, args: string[], cwd: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit' });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed: ${command} ${args.join(' ')}`));
    });
  });
}

async function writeBuildNote(note: BuildNote): Promise<void> {
  await mkdir(distEngineDir, { recursive: true });
  await writeFile(path.join(distEngineDir, 'build-note.json'), `${JSON.stringify(note, null, 2)}\n`, 'utf8');
}

async function writeStub(reason: string, mode: BuildMode): Promise<void> {
  const note: BuildNote = {
    step: 'build:engine:web',
    status: 'stubbed',
    mode,
    reason,
    message:
      'Engine wasm build is not available yet in this environment. Install emscripten and clone ioq3 under engine/ioq3 to enable real builds.'
  };

  await rm(distEngineDir, { recursive: true, force: true });
  await writeBuildNote(note);
  console.log(`[build:engine:web] stub mode: ${reason}`);
}

async function copyArtifacts(): Promise<string[]> {
  const releaseDir = path.join(wasmBuildDir, 'Release');
  const sourceDir = (await fileExists(releaseDir)) ? releaseDir : wasmBuildDir;

  await rm(distEngineDir, { recursive: true, force: true });
  await mkdir(distEngineDir, { recursive: true });

  const artifactNames = ['ioquake3.html', 'ioquake3.js', 'ioquake3.wasm', 'ioquake3.data', 'client-config.json'];
  const copiedArtifacts: string[] = [];

  for (const artifactName of artifactNames) {
    const sourcePath = path.join(sourceDir, artifactName);
    if (await fileExists(sourcePath)) {
      await cp(sourcePath, path.join(distEngineDir, artifactName));
      copiedArtifacts.push(artifactName);
    }
  }

  const baseq3SourceDir = path.join(sourceDir, 'baseq3');
  if (await fileExists(baseq3SourceDir)) {
    await cp(baseq3SourceDir, path.join(distEngineDir, 'baseq3'), { recursive: true });
    copiedArtifacts.push('baseq3/');
  }

  return copiedArtifacts;
}

async function buildReal(mode: BuildMode): Promise<void> {
  await run('emcmake', ['cmake', '-S', '.', '-B', 'build-wasm', '-DCMAKE_BUILD_TYPE=Release'], engineSourceDir);
  await run('cmake', ['--build', 'build-wasm'], engineSourceDir);

  const copiedArtifacts = await copyArtifacts();
  const note: BuildNote = {
    step: 'build:engine:web',
    status: 'built',
    mode,
    artifacts: copiedArtifacts,
    message: 'Engine wasm artifacts were built and copied into dist/engine.'
  };

  await writeBuildNote(note);
  console.log('[build:engine:web] built ioq3 wasm artifacts into dist/engine');
}

async function buildEngineWeb(): Promise<void> {
  const mode = getMode();

  if (mode === 'stub') {
    await writeStub('STRAFEVER_ENGINE_BUILD_MODE=stub', mode);
    return;
  }

  if (!(await fileExists(engineSourceDir))) {
    if (mode === 'real') {
      throw new Error('missing engine/ioq3 source directory');
    }
    await writeStub('missing engine/ioq3 source directory', mode);
    return;
  }

  const hasEmscripten = await commandExists('emcmake');
  const hasCmake = await commandExists('cmake');
  if (!hasEmscripten || !hasCmake) {
    if (mode === 'real') {
      throw new Error('missing build tools (expected: emcmake and cmake)');
    }
    await writeStub('missing build tools (expected: emcmake and cmake)', mode);
    return;
  }

  try {
    await buildReal(mode);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown build error';

    if (mode === 'real') {
      throw error;
    }

    await writeStub(`real build failed in auto mode: ${message}`, mode);
  }
}

void buildEngineWeb();
