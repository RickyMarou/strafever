import { access, copyFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const webDir = path.join(projectRoot, 'web');
const distDir = path.join(projectRoot, 'dist');
const distEngineDir = path.join(distDir, 'engine');
const distAssetsBaseq3Dir = path.join(distDir, 'assets', 'baseq3');
const standaloneGameDir = 'strafever';

type ClientConfig = Record<
  string,
  {
    files: Array<{
      src: string;
      dst: string;
    }>;
  }
>;

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function stitchRuntime(): Promise<void> {
  const pk3Names: string[] = [];
  if (await fileExists(distAssetsBaseq3Dir)) {
    const entries = await readdir(distAssetsBaseq3Dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.pk3')) {
        continue;
      }
      pk3Names.push(entry.name);
    }
  }

  pk3Names.sort();

  for (const pk3Name of pk3Names) {
    const pk3SourcePath = path.join(distAssetsBaseq3Dir, pk3Name);
    const pk3DestPath = path.join(distEngineDir, standaloneGameDir, pk3Name);
    await mkdir(path.dirname(pk3DestPath), { recursive: true });
    await copyFile(pk3SourcePath, pk3DestPath);
  }

  const pk3Files = pk3Names.map((pk3Name) => ({
    src: `${standaloneGameDir}/${pk3Name}`,
    dst: `/${standaloneGameDir}`
  }));

  const clientConfig: ClientConfig = {
    [standaloneGameDir]: {
      files: [
        ...pk3Files,
        { src: 'baseq3/vm/cgame.qvm', dst: `/${standaloneGameDir}/vm` },
        { src: 'baseq3/vm/qagame.qvm', dst: `/${standaloneGameDir}/vm` },
        { src: 'baseq3/vm/ui.qvm', dst: `/${standaloneGameDir}/vm` }
      ]
    }
  };

  const configJson = `${JSON.stringify(clientConfig, null, 2)}\n`;
  await writeFile(path.join(distEngineDir, 'client-config.json'), configJson, 'utf8');
  await writeFile(path.join(distEngineDir, 'ioquake3-config.json'), configJson, 'utf8');
}

async function buildWebShell(): Promise<void> {
  await mkdir(distDir, { recursive: true });
  await copyFile(path.join(webDir, 'index.html'), path.join(distDir, 'index.html'));
  await copyFile(path.join(webDir, 'shell.js'), path.join(distDir, 'shell.js'));
  await stitchRuntime();

  console.log('[build:web-shell] copied web shell and stitched dist/engine runtime config');
}

void buildWebShell();
