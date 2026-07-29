import { getValidationProvider } from '../validation/index.js';
import { isServerValidation } from '@shared/config.js';
import { startPracticeSession } from '../modes/practice.js';
import { renderLevelSelect } from '../modes/levels.js';
import { startTutorialSession } from '../modes/tutorial.js';

export function renderMenu(container: HTMLElement): void {
  container.innerHTML = `
    <nav class="menu menu-split">
      <div class="menu-primary">
        <button class="btn btn-primary" data-action="practice">Free Play</button>
        <button class="btn btn-primary" data-action="levels">Level Mode</button>
      </div>
      <div class="menu-secondary">
        <button class="btn btn-primary" data-action="tutorial">Tutorial</button>
        <p class="hint">Learn how to play in ~2 minutes</p>
      </div>
    </nav>
    <p class="hint menu-footer-hint">
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

  container.querySelector('[data-action="tutorial"]')?.addEventListener('click', () => {
    startTutorialSession(container);
  });
}
