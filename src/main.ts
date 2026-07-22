import { getValidationMode } from '@shared/config.js';
import { getValidationProvider } from './validation/index.js';
import { renderMenu } from './ui/menu.js';

async function boot(): Promise<void> {
  const badge = document.getElementById('mode-badge');
  const mode = getValidationMode();
  if (badge) {
    badge.textContent = `Validation: ${mode}`;
    badge.className = mode === 'server' ? 'badge badge-server' : 'badge badge-client';
  }

  // Warm progress load (validates signature early)
  const provider = getValidationProvider();
  await provider.loadProgress();

  const main = document.getElementById('main');
  if (!main) return;
  renderMenu(main);
}

boot().catch(console.error);
