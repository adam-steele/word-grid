const STORAGE_KEY = 'word-grid-keyboard-minimized';

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'] as const;

export interface OnScreenKeyboardHandlers {
  onLetter: (letter: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
}

function loadMinimized(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function saveMinimized(minimized: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, minimized ? '1' : '0');
  } catch {
    // ignore
  }
}

export function renderOnScreenKeyboard(
  container: HTMLElement,
  handlers: OnScreenKeyboardHandlers,
): void {
  let minimized = loadMinimized();

  const render = (): void => {
    if (minimized) {
      container.innerHTML = `
        <div class="keyboard keyboard-collapsed">
          <button type="button" class="btn btn-ghost keyboard-toggle" id="keyboard-show">
            Show keyboard
          </button>
        </div>
      `;
      container.querySelector('#keyboard-show')?.addEventListener('click', () => {
        minimized = false;
        saveMinimized(false);
        render();
      });
      return;
    }

    const renderLetterKey = (ch: string): string =>
      `<button type="button" class="keyboard-key" data-key="${ch}" aria-label="${ch}">${ch}</button>`;

    const topRows = ROWS.slice(0, 2)
      .map(
        (row) => `
        <div class="keyboard-row" role="group" aria-label="Letter keys">
          ${[...row].map(renderLetterKey).join('')}
        </div>
      `,
      )
      .join('');

    const bottomRow = `
      <div class="keyboard-row keyboard-row-bottom" role="group" aria-label="Letter and action keys">
        <button type="button" class="keyboard-key keyboard-key-wide" data-key="Enter" aria-label="Enter">
          Enter
        </button>
        ${[...ROWS[2]!].map(renderLetterKey).join('')}
        <button type="button" class="keyboard-key keyboard-key-wide" data-key="Backspace" aria-label="Backspace">
          ⌫
        </button>
      </div>
    `;

    container.innerHTML = `
      <div class="keyboard">
        <div class="keyboard-toolbar">
          <button type="button" class="btn btn-ghost keyboard-toggle" id="keyboard-hide">
            Hide keyboard
          </button>
        </div>
        ${topRows}
        ${bottomRow}
      </div>
    `;

    container.querySelector('#keyboard-hide')?.addEventListener('click', () => {
      minimized = true;
      saveMinimized(true);
      render();
    });

    container.querySelectorAll<HTMLButtonElement>('.keyboard-key').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        if (!key) return;
        if (key === 'Enter') handlers.onEnter();
        else if (key === 'Backspace') handlers.onBackspace();
        else handlers.onLetter(key);
      });
    });
  };

  render();
}
