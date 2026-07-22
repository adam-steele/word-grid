import { getValidationProvider } from '../validation/index.js';
import { isServerValidation } from '@shared/config.js';
import { startPracticeSession } from '../modes/practice.js';
import { renderLevelSelect } from '../modes/levels.js';

export function renderMenu(container: HTMLElement): void {
  container.innerHTML = `
    <nav class="menu">
      <button class="btn btn-primary" data-action="practice">Practice Mode</button>
      <button class="btn btn-primary" data-action="levels">Level Mode</button>
    </nav>
    <p class="hint">
      ${isServerValidation()
        ? 'Server validation active — scores verified by Cloudflare Worker.'
        : 'Client validation — progress signed locally; levels loaded on demand.'}
    </p>
  `;

  container.querySelector('[data-action="practice"]')?.addEventListener('click', () => {
    startPracticeSession(container);
  });

  container.querySelector('[data-action="levels"]')?.addEventListener('click', async () => {
    const provider = getValidationProvider();
    const progress = await provider.loadProgress();
    renderLevelSelect(container, progress.unlockedLevel);
  });
}
