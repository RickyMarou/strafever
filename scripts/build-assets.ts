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
const gfx2dDir = path.join(assetSourceDir, 'gfx', '2d');
const menuArtDir = path.join(assetSourceDir, 'menu', 'art');
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
  return `( ${a[0]} ${a[1]} ${a[2]} ) ( ${b[0]} ${b[1]} ${b[2]} ) ( ${c[0]} ${c[1]} ${c[2]} ) ${texture} 0 0 0 1 1`;
}

function brushFromBounds(
  mins: [number, number, number],
  maxs: [number, number, number],
  texture: string
): string {
  const [x1, y1, z1] = mins;
  const [x2, y2, z2] = maxs;

  const faces = [
    plane([x1, y2, z2], [x1, y1, z2], [x1, y1, z1], texture),
    plane([x1, y1, z2], [x2, y1, z2], [x2, y1, z1], texture),
    plane([x2, y1, z1], [x2, y2, z1], [x1, y2, z1], texture),
    plane([x1, y2, z2], [x2, y2, z2], [x2, y1, z2], texture),
    plane([x2, y2, z1], [x2, y2, z2], [x1, y2, z2], texture),
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
"classname" "info_player_deathmatch"
"origin" "0 0 32"
"angle" "90"
}
// entity 3
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

function buildDefaultConfig(): string {
  return `seta com_introplayed "1"
seta sv_pure "0"
seta s_initsound "0"
seta cg_draw2D "1"
seta cg_drawStatus "0"
seta cg_drawIcons "0"
seta cg_draw3dIcons "0"
seta cg_drawCrosshair "1"
seta cg_crosshairSize "24"
seta cg_lagometer "0"
seta cl_run "1"
seta bot_enable "0"
bind w "+forward"
bind s "+back"
bind a "+moveleft"
bind d "+moveright"
bind SPACE "+moveup"
bind CTRL "+movedown"
bind MOUSE1 "+attack"
bind MOUSE2 "+zoom"
`;
}

const glyph5x7: Record<string, string[]> = {
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '00110', '00110', '00100'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  ';': ['00000', '01100', '01100', '00000', '00110', '00110', '00100'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '/': ['00001', '00010', '00100', '01000', '10000', '00000', '00000'],
  '\\': ['10000', '01000', '00100', '00010', '00001', '00000', '00000'],
  '=': ['00000', '11111', '00000', '11111', '00000', '00000', '00000'],
  '_': ['00000', '00000', '00000', '00000', '00000', '00000', '11111'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  '[': ['01110', '01000', '01000', '01000', '01000', '01000', '01110'],
  ']': ['01110', '00010', '00010', '00010', '00010', '00010', '01110'],
  '<': ['00010', '00100', '01000', '10000', '01000', '00100', '00010'],
  '>': ['01000', '00100', '00010', '00001', '00010', '00100', '01000'],
  '"': ['01010', '01010', '00000', '00000', '00000', '00000', '00000'],
  '\'': ['00100', '00100', '00000', '00000', '00000', '00000', '00000'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  'A': ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  'B': ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  'C': ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  'D': ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  'E': ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  'F': ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  'G': ['01110', '10001', '10000', '10000', '10011', '10001', '01110'],
  'H': ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  'I': ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  'J': ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  'K': ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  'L': ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  'M': ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  'N': ['10001', '10001', '11001', '10101', '10011', '10001', '10001'],
  'O': ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  'P': ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  'Q': ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  'R': ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  'S': ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  'T': ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  'U': ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  'V': ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  'W': ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  'X': ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  'Y': ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  'Z': ['11111', '00001', '00010', '00100', '01000', '10000', '11111']
};

async function writeSolidTga(filePath: string, width: number, height: number, rgb: RGB): Promise<void> {
  const header = Buffer.alloc(18);
  header[2] = 2;
  header.writeUInt16LE(width, 12);
  header.writeUInt16LE(height, 14);
  header[16] = 24;
  header[17] = 0;

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

async function writeRgbaTga(filePath: string, width: number, height: number, rgba: Uint8Array): Promise<void> {
  const header = Buffer.alloc(18);
  header[2] = 2;
  header.writeUInt16LE(width, 12);
  header.writeUInt16LE(height, 14);
  header[16] = 32;
  header[17] = 0x08;

  const pixels = Buffer.alloc(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    const srcY = height - 1 - y;
    for (let x = 0; x < width; x += 1) {
      const src = (srcY * width + x) * 4;
      const dst = (y * width + x) * 4;
      pixels[dst] = rgba[src + 2] ?? 0;
      pixels[dst + 1] = rgba[src + 1] ?? 0;
      pixels[dst + 2] = rgba[src] ?? 0;
      pixels[dst + 3] = rgba[src + 3] ?? 0;
    }
  }

  await writeFile(filePath, Buffer.concat([header, pixels]));
}

async function writeWhiteDotCrosshair(filePath: string, size: number): Promise<void> {
  const rgba = new Uint8Array(size * size * 4);
  const center = (size - 1) / 2;
  const radius = Math.max(1, size * 0.08);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - center;
      const dy = y - center;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const idx = (y * size + x) * 4;

      if (distance <= radius) {
        rgba[idx] = 255;
        rgba[idx + 1] = 255;
        rgba[idx + 2] = 255;
        rgba[idx + 3] = 255;
      } else {
        rgba[idx] = 255;
        rgba[idx + 1] = 255;
        rgba[idx + 2] = 255;
        rgba[idx + 3] = 0;
      }
    }
  }

  await writeRgbaTga(filePath, size, size, rgba);
}

async function writeBigCharsAtlas(filePath: string): Promise<void> {
  const size = 256;
  const cell = 16;
  const scale = 1.9;
  const glyphW = 5 * scale;
  const glyphH = 7 * scale;
  const offsetX = Math.floor((cell - glyphW) / 2);
  const offsetY = Math.floor((cell - glyphH) / 2);
  const rgba = new Uint8Array(size * size * 4);
  const sampleGrid = 4;
  const sampleCount = sampleGrid * sampleGrid;

  const glyphCoverage = (glyph: string[], localX: number, localY: number): number => {
    let hits = 0;

    for (let sy = 0; sy < sampleGrid; sy += 1) {
      for (let sx = 0; sx < sampleGrid; sx += 1) {
        const px = localX + (sx + 0.5) / sampleGrid;
        const py = localY + (sy + 0.5) / sampleGrid;
        const gx = Math.floor(px / scale);
        const gy = Math.floor(py / scale);
        if (gx < 0 || gx >= 5 || gy < 0 || gy >= 7) {
          continue;
        }
        if (glyph[gy]?.[gx] === '1') {
          hits += 1;
        }
      }
    }

    return hits / sampleCount;
  };

  for (let code = 32; code <= 126; code += 1) {
    const char = String.fromCharCode(code);
    const glyph = glyph5x7[char] ?? glyph5x7[char.toUpperCase()] ?? glyph5x7['?'];
    const cellX = (code & 15) * cell;
    const cellY = (code >> 4) * cell;

    for (let y = 0; y < cell; y += 1) {
      for (let x = 0; x < cell; x += 1) {
        const coverage = glyphCoverage(glyph, x - offsetX, y - offsetY);
        if (coverage <= 0) {
          continue;
        }

        const index = ((cellY + y) * size + (cellX + x)) * 4;
        const alpha = Math.round(coverage * 255);
        rgba[index] = 255;
        rgba[index + 1] = 255;
        rgba[index + 2] = 255;
        rgba[index + 3] = alpha;
      }
    }
  }

  await writeRgbaTga(filePath, size, size, rgba);
}

async function writeTransparentTga(filePath: string, width: number, height: number): Promise<void> {
  const rgba = new Uint8Array(width * height * 4);
  await writeRgbaTga(filePath, width, height, rgba);
}

async function writeConsoleBackground(filePath: string, width: number, height: number): Promise<void> {
  const rgba = new Uint8Array(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    const t = y / Math.max(1, height - 1);
    const shade = Math.round(14 + 8 * (1 - t));
    const alpha = Math.round(230 - 20 * t);

    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      rgba[index] = shade;
      rgba[index + 1] = shade;
      rgba[index + 2] = shade + 4;
      rgba[index + 3] = alpha;
    }
  }

  await writeRgbaTga(filePath, width, height, rgba);
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

async function existingAssetEntries(): Promise<string[]> {
  const dirCandidates = ['scripts', 'textures', 'gfx', 'menu', 'maps', 'mapsrc'];
  const fileCandidates = ['default.cfg', 'console.tga'];
  const entries = await readdir(assetSourceDir, { withFileTypes: true });
  const dirNames = new Set(entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name));
  const fileNames = new Set(entries.filter((entry) => entry.isFile()).map((entry) => entry.name));

  return [
    ...dirCandidates.filter((candidate) => dirNames.has(candidate)),
    ...fileCandidates.filter((candidate) => fileNames.has(candidate))
  ];
}

async function packagePk3(): Promise<string> {
  await mkdir(distBaseq3Dir, { recursive: true });
  const pk3Path = path.join(distBaseq3Dir, 'mvp_base-dev.pk3');

  await rm(pk3Path, { force: true });

  const entries = await existingAssetEntries();
  if (entries.length === 0) {
    return 'skipped (no source directories)';
  }

  await run('zip', ['-q', '-r', pk3Path, ...entries], assetSourceDir);
  return path.relative(projectRoot, pk3Path);
}

async function buildAssets(): Promise<void> {
  await mkdir(scriptsDir, { recursive: true });
  await mkdir(texturesDir, { recursive: true });
  await mkdir(gfx2dDir, { recursive: true });
  await mkdir(menuArtDir, { recursive: true });
  await mkdir(mapSourceDir, { recursive: true });

  await writeFile(path.join(scriptsDir, 'mvp.shader'), buildShaderSource(), 'utf8');
  await writeFile(path.join(assetSourceDir, 'default.cfg'), buildDefaultConfig(), 'utf8');
  await writeFile(path.join(mapSourceDir, 'mvp_box.map'), buildBoxMapSource(), 'utf8');

  await writeSolidTga(path.join(texturesDir, 'wall_plain.tga'), 64, 64, { r: 70, g: 104, b: 150 });
  await writeSolidTga(path.join(texturesDir, 'floor_plain.tga'), 64, 64, { r: 34, g: 52, b: 71 });
  await writeSolidTga(path.join(texturesDir, 'trim_plain.tga'), 64, 64, { r: 116, g: 154, b: 191 });
  for (const crosshairName of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j']) {
    await writeWhiteDotCrosshair(path.join(gfx2dDir, `crosshair${crosshairName}.tga`), 32);
  }
  await writeTransparentTga(path.join(gfx2dDir, 'net.tga'), 64, 32);
  await writeConsoleBackground(path.join(assetSourceDir, 'console.tga'), 512, 512);

  const bigCharsAtlasPath = path.join(gfx2dDir, 'bigchars.tga');
  await writeBigCharsAtlas(bigCharsAtlasPath);
  await cp(bigCharsAtlasPath, path.join(menuArtDir, 'font1_prop.tga'));
  await cp(bigCharsAtlasPath, path.join(menuArtDir, 'font1_prop_glo.tga'));
  await cp(bigCharsAtlasPath, path.join(menuArtDir, 'font2_prop.tga'));

  await rm(distAssetsDir, { recursive: true, force: true });
  await mkdir(distAssetsDir, { recursive: true });
  await cp(assetSourceDir, path.join(distAssetsDir, 'mvp_base_source'), { recursive: true });

  const pk3Result = await packagePk3();
  const compiledMapPath = path.join(mapsDir, 'mvp_box.bsp');
  const hasCompiledMap = await fileExists(compiledMapPath);
  const note = hasCompiledMap
    ? 'Compiled map detected. mvp_box.bsp is included in the PK3.'
    : 'Map source is generated. Run `pnpm run build:map` to compile mapsrc/mvp_box.map into maps/mvp_box.bsp.';
  const generated = [
    'default.cfg',
    'scripts/mvp.shader',
    'textures/mvp/*.tga',
    'gfx/2d/crosshair[a-j].tga',
    'gfx/2d/net.tga',
    'console.tga',
    'gfx/2d/bigchars.tga',
    'menu/art/font{1_prop,1_prop_glo,2_prop}.tga',
    'mapsrc/mvp_box.map'
  ];
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
