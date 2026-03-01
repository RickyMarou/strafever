const statusEl = document.getElementById('status');

if (!statusEl) {
  throw new Error('Missing status element');
}

const lines = [
  'Build pipeline is online.',
  'GitHub Pages deploy target: dist/',
  'Engine integration step: pending',
  'Assets pack step: pending',
  '',
  'Run locally:',
  '1) pnpm install',
  '2) pnpm build:all',
  '3) pnpm serve:local'
];

statusEl.textContent = lines.join('\n');
