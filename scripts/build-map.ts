import { access, cp, mkdir } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const projectRoot = process.cwd();
const assetsRootDir = path.join(projectRoot, 'assets');
const baseAssetDir = path.join(projectRoot, 'assets', 'mvp_base');
const mapSourcePath = path.join(baseAssetDir, 'mapsrc', 'mvp_box.map');
const mapsOutDir = path.join(baseAssetDir, 'maps');
const mapName = 'mvp_box';

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function commandExists(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('sh', ['-lc', `command -v ${command}`], { stdio: 'ignore' });
    child.on('close', (code) => resolve(code === 0));
  });
}

async function run(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: assetsRootDir,
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed: ${command} ${args.join(' ')}`));
    });
  });
}

async function main(): Promise<void> {
  if (!(await fileExists(mapSourcePath))) {
    throw new Error('missing assets/mvp_base/mapsrc/mvp_box.map. Run `pnpm run build:assets` first.');
  }

  const q3map2Binary = process.env.STRAFEVER_Q3MAP2 || 'q3map2';
  const hasQ3Map2 = await commandExists(q3map2Binary);

  if (!hasQ3Map2) {
    throw new Error(`q3map2 not found (${q3map2Binary}). Install NetRadiant/q3map2 or set STRAFEVER_Q3MAP2.`);
  }

  await mkdir(mapsOutDir, { recursive: true });

  const mapRelativePath = `mvp_base/mapsrc/${mapName}.map`;
  const bspRelativePath = `mvp_base/mapsrc/${mapName}.bsp`;
  const commonArgs = ['-game', 'quake3', '-fs_basepath', assetsRootDir, '-fs_game', 'mvp_base'];

  await run(q3map2Binary, [...commonArgs, '-meta', mapRelativePath]);

  if (process.env.STRAFEVER_MAP_FULL_COMPILE === '1') {
    await run(q3map2Binary, [...commonArgs, '-vis', '-saveprt', bspRelativePath]);
    await run(q3map2Binary, [...commonArgs, '-light', '-fast', '-filter', bspRelativePath]);
  }

  const generatedBspPath = path.join(baseAssetDir, 'mapsrc', `${mapName}.bsp`);
  if (!(await fileExists(generatedBspPath))) {
    throw new Error(`expected compiled BSP at ${generatedBspPath}`);
  }

  const finalBspPath = path.join(mapsOutDir, `${mapName}.bsp`);
  await cp(generatedBspPath, finalBspPath);

  console.log(`[build:map] compiled ${mapName}.map into assets/mvp_base/maps/${mapName}.bsp`);
}

void main();
