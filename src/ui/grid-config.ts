import { getDefaultGridSettings, saveDefaultGridSettings } from '../storage/practice-scores.js';
import { runSession } from '../modes/session.js';
import { renderMenu } from './menu.js';

export async function showGridConfig(container: HTMLElement): Promise<void> {
  const defaults = await getDefaultGridSettings();

  container.innerHTML = `
    <div class="grid-config">
      <button class="btn btn-ghost" id="back-btn">← Menu</button>
      <h2>Free Play Setup</h2>
      <form id="config-form" class="config-form">
        <label>
          Word length (columns)
          <input type="number" name="cols" min="3" max="8" value="${defaults.defaultCols}" required />
        </label>
        <label>
          Rows
          <input type="number" name="rows" min="3" max="10" value="${defaults.defaultRows}" required />
        </label>
        <button type="submit" class="btn btn-primary">Start</button>
      </form>
      <p class="hint">Word length = columns. Each row must be a valid dictionary word.</p>
    </div>
  `;

  container.querySelector('#back-btn')?.addEventListener('click', () => renderMenu(container));

  container.querySelector('#config-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const cols = Number(new FormData(form).get('cols'));
    const rows = Number(new FormData(form).get('rows'));
    if (cols < 3 || cols > 8 || rows < 3 || rows > 10) {
      alert('Columns: 3–8, Rows: 3–10');
      return;
    }
    saveDefaultGridSettings(cols, rows);
    runSession(container, { rows, cols }, null);
  });
}
