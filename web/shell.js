const statusEl = document.getElementById('status');

if (!statusEl) {
  throw new Error('Missing status element');
}

async function render() {
  let engineStatus = 'unknown';

  try {
    const response = await fetch('./engine/build-note.json', { cache: 'no-store' });
    if (response.ok) {
      const note = await response.json();
      engineStatus = `${note.status} (${note.reason ?? note.message ?? 'no details'})`;
    } else {
      engineStatus = `missing build-note.json (HTTP ${response.status})`;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'fetch failed';
    engineStatus = `build-note unavailable (${message})`;
  }

  const lines = [
    'Build pipeline is online.',
    'GitHub Pages deploy target: dist/',
    `Engine integration step: ${engineStatus}`,
    'Assets pack step: scaffolded',
    '',
    'Launch engine:',
    '- /engine/ioquake3.html?com_basegame=strafever&args=%2bdevmap%20mvp_box',
    'Try in console:',
    '- /devmap mvp_box',
    '',
    'Run locally:',
    '1) pnpm install',
    '2) pnpm build:all',
    '3) pnpm serve:local'
  ];

  statusEl.textContent = lines.join('\n');
}

void render();
