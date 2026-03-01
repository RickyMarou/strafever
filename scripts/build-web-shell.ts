import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const webDir = path.join(projectRoot, 'web');
const distDir = path.join(projectRoot, 'dist');

async function buildWebShell(): Promise<void> {
  await mkdir(distDir, { recursive: true });
  await copyFile(path.join(webDir, 'index.html'), path.join(distDir, 'index.html'));
  await copyFile(path.join(webDir, 'shell.js'), path.join(distDir, 'shell.js'));

  console.log('[build:web-shell] copied web/index.html and web/shell.js to dist/');
}

void buildWebShell();
