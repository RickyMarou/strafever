import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const projectRoot = process.cwd();
const engineDir = path.join(projectRoot, 'engine');
const targetDir = path.join(engineDir, 'ioq3');

async function run(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
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
  await mkdir(engineDir, { recursive: true });

  await run('gh', ['repo', 'clone', 'ioquake/ioq3', targetDir]);
  await rm(path.join(targetDir, '.git'), { recursive: true, force: true });
  console.log(`[vendor:engine] cloned ioquake/ioq3 into ${targetDir}`);
}

void main();
