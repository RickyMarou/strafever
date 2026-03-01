import { access, cp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { constants as fsConstants } from 'node:fs';
import { spawn } from 'node:child_process';

type RGB = {
  r: number;
  g: number;
  b: number;
};

const projectRoot = process.cwd();
const assetSourceDir = path.join(projectRoot, 'assets', 'mvp_base');
const scriptsDir = path.join(assetSourceDir, 'scripts');
const texturesDir = path.join(assetSourceDir, 'textures', 'mvp');
const mapSourceDir = path.join(assetSourceDir, 'mapsrc');
const mapsDir = path.join(assetSourceDir, 'maps');
const distAssetsDir = path.join(projectRoot, 'dist', 'assets');
const distBaseq3Dir = path.join(distAssetsDir, 'baseq3');

async function fileExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function plane(a: [number, number, number], b: [number, number, number], c: [number, number, number], texture: string): string {
  return `( ${a[0]} ${a[1]} ${a[2]} ) ( ${b[0]} ${b[1]} ${b[2]} ) ( ${c[0]} ${c[1]} ${c[2]} ) ${texture} 0 0 0 1 1 0 0 0`;
}

function brushFromBounds(
  mins: [number, number, number],
  maxs: [number, number, number],
  texture: string
): string {
  const [x1, y1, z1] = mins;
  const [x2, y2, z2] = maxs;

  const faces = [
    plane([x1, y1, z1], [x1, y2, z1], [x2, y2, z1], texture),
    plane([x2, y2, z2], [x1, y2, z2], [x1, y1, z2], texture),
    plane([x1, y1, z1], [x2, y1, z1], [x2, y1, z2], texture),
    plane([x2, y2, z2], [x2, y2, z1], [x1, y2, z1], texture),
    plane([x1, y2, z1], [x1, y1, z1], [x1, y1, z2], texture),
    plane([x2, y1, z2], [x2, y2, z2], [x2, y2, z1], texture)
  ];

  return `{
${faces.join('\n')}
}`;
}

function buildBoxMapSource(): string {
  const floor = brushFromBounds([-1024, -1024, -32], [1024, 1024, 0], 'mvp/floor_plain');
  const ceiling = brushFromBounds([-1024, -1024, 256], [1024, 1024, 288], 'mvp/trim_plain');
  const westWall = brushFromBounds([-1024, -1024, 0], [-992, 1024, 256], 'mvp/wall_plain');
  const eastWall = brushFromBounds([992, -1024, 0], [1024, 1024, 256], 'mvp/wall_plain');
  const southWall = brushFromBounds([-1024, -1024, 0], [1024, -992, 256], 'mvp/wall_plain');
  const northWall = brushFromBounds([-1024, 992, 0], [1024, 1024, 256], 'mvp/wall_plain');

  return `// entity 0
{
"classname" "worldspawn"
"message" "strafever_mvp_box"
${floor}
${ceiling}
${westWall}
${eastWall}
${southWall}
${northWall}
}
// entity 1
{
"classname" "info_player_start"
"origin" "0 0 32"
"angle" "90"
}
// entity 2
{
"classname" "light"
"origin" "0 0 192"
"light" "500"
}
`;
}

function buildShaderSource(): string {
  return `textures/mvp/wall_plain
{
  qer_editorimage textures/mvp/wall_plain.tga
  {
    map textures/mvp/wall_plain.tga
    rgbGen identity
  }
}

textures/mvp/floor_plain
{
  qer_editorimage textures/mvp/floor_plain.tga
  {
    map textures/mvp/floor_plain.tga
    rgbGen identity
  }
}

textures/mvp/trim_plain
{
  qer_editorimage textures/mvp/trim_plain.tga
  {
    map textures/mvp/trim_plain.tga
    rgbGen identity
  }
}
`;
}

async function writeSolidTga(filePath: string, width: number, height: number, rgb: RGB): Promise<void> {
  const header = Buffer.alloc(18);
  header[2] = 2;
  header.writeUInt16LE(width, 12);
  header.writeUInt16LE(height, 14);
  header[16] = 24;
  header[17] = 0x20;

  const pixelCount = width * height;
  const pixels = Buffer.alloc(pixelCount * 3);

  for (let index = 0; index < pixelCount; index += 1) {
    const offset = index * 3;
    pixels[offset] = rgb.b;
    pixels[offset + 1] = rgb.g;
    pixels[offset + 2] = rgb.r;
  }

  await writeFile(filePath, Buffer.concat([header, pixels]));
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

async function existingAssetDirs(): Promise<string[]> {
  const candidates = ['scripts', 'textures', 'maps', 'mapsrc'];
  const entries = await readdir(assetSourceDir, { withFileTypes: true });
  const names = new Set(entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name));

  return candidates.filter((candidate) => names.has(candidate));
}

async function packagePk3(): Promise<string> {
  await mkdir(distBaseq3Dir, { recursive: true });
  const pk3Path = path.join(distBaseq3Dir, 'mvp_base-dev.pk3');

  await rm(pk3Path, { force: true });

  const dirs = await existingAssetDirs();
  if (dirs.length === 0) {
    return 'skipped (no source directories)';
  }

  await run('zip', ['-q', '-r', pk3Path, ...dirs], assetSourceDir);
  return path.relative(projectRoot, pk3Path);
}

async function buildAssets(): Promise<void> {
  await mkdir(scriptsDir, { recursive: true });
  await mkdir(texturesDir, { recursive: true });
  await mkdir(mapSourceDir, { recursive: true });

  await writeFile(path.join(scriptsDir, 'mvp.shader'), buildShaderSource(), 'utf8');
  await writeFile(path.join(mapSourceDir, 'mvp_box.map'), buildBoxMapSource(), 'utf8');

  await writeSolidTga(path.join(texturesDir, 'wall_plain.tga'), 64, 64, { r: 70, g: 104, b: 150 });
  await writeSolidTga(path.join(texturesDir, 'floor_plain.tga'), 64, 64, { r: 34, g: 52, b: 71 });
  await writeSolidTga(path.join(texturesDir, 'trim_plain.tga'), 64, 64, { r: 116, g: 154, b: 191 });

  await rm(distAssetsDir, { recursive: true, force: true });
  await mkdir(distAssetsDir, { recursive: true });
  await cp(assetSourceDir, path.join(distAssetsDir, 'mvp_base_source'), { recursive: true });

  const pk3Result = await packagePk3();
  const compiledMapPath = path.join(mapsDir, 'mvp_box.bsp');
  const hasCompiledMap = await fileExists(compiledMapPath);
  const note = hasCompiledMap
    ? 'Compiled map detected. mvp_box.bsp is included in the PK3.'
    : 'Map source is generated. Run `pnpm run build:map` to compile mapsrc/mvp_box.map into maps/mvp_box.bsp.';
  const generated = ['scripts/mvp.shader', 'textures/mvp/*.tga', 'mapsrc/mvp_box.map'];
  if (hasCompiledMap) {
    generated.push('maps/mvp_box.bsp');
  }

  const manifest = {
    pack: 'mvp_base',
    source: 'assets/mvp_base',
    generated,
    pk3: pk3Result,
    note
  };

  await writeFile(path.join(distAssetsDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log('[build:assets] generated mvp asset source and packaged dev pk3');
}

void buildAssets();
