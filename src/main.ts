import { getValidationMode } from '@shared/config.js';
import { getValidationProvider } from './validation/index.js';
import { renderMenu } from './ui/menu.js';

async function boot(): Promise<void> {
  document.documentElement.dataset.validationMode = getValidationMode();

  const provider = getValidationProvider();
  await provider.loadProgress();

  const main = document.getElementById('main');
  if (!main) return;
  renderMenu(main);
}

boot().catch(console.error);
