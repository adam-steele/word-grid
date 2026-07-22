import type { ScoreResult } from '@shared/types.js';
import type { GameGrid } from '../core/grid.js';
import { renderGrid } from './grid-view.js';

interface GameOverOptions {
  title: string;
  score: number;
  threshold: number | null;
  passed: boolean | null;
  highScore?: number;
  isNewHighScore?: boolean;
  grid?: GameGrid;
  onRetry?: () => void;
  onNext?: () => void;
  onMenu: () => void;
}

export function renderGameOver(
  container: HTMLElement,
  result: ScoreResult,
  options: GameOverOptions,
): void {
  const { breakdown, total } = result;
  const grouped = {
    horizontal: breakdown.filter((w) => w.direction === 'horizontal'),
    vertical: breakdown.filter((w) => w.direction === 'vertical'),
    diagonal: breakdown.filter((w) => w.direction === 'diagonal'),
  };

  const statusClass =
    options.passed === true ? 'success' : options.passed === false ? 'error' : 'neutral';
  const statusText =
    options.passed === true
      ? `Level passed! (${total}${options.threshold !== null ? ` / ${options.threshold}` : ''})`
      : options.passed === false
        ? `Need ${options.threshold} — scored ${total}`
        : `Final score: ${total}`;

  const highScoreLine =
    options.highScore !== undefined
      ? `<p class="high-score ${options.isNewHighScore ? 'new-record' : ''}">
          ${options.isNewHighScore ? 'New high score!' : 'Best for this grid size'}: ${options.highScore}
        </p>`
      : '';

  container.innerHTML = `
    <div class="game-over ${statusClass}">
      <h2>${options.title}</h2>
      <p class="status-message">${statusText}</p>
      ${highScoreLine}
      ${options.grid ? '<div id="final-grid" class="final-grid"></div>' : ''}
      <div class="breakdown">
        ${renderGroup('Vertical', grouped.vertical, 'vertical')}
        ${renderGroup('Diagonal', grouped.diagonal, 'diagonal')}
        ${renderGroup('Horizontal', grouped.horizontal, 'horizontal')}
      </div>
      <div class="game-over-actions">
        ${options.onRetry ? '<button class="btn btn-primary" id="retry-btn">Retry</button>' : ''}
        ${options.onNext ? '<button class="btn btn-primary" id="next-btn">Next Level</button>' : ''}
        <button class="btn btn-ghost" id="menu-btn">Menu</button>
      </div>
    </div>
  `;

  if (options.grid) {
    renderGrid(container.querySelector('#final-grid')!, options.grid, {
      highlights: breakdown,
      showLegend: true,
      showWordPaths: true,
      overlayIntensity: 'final',
    });
  }

  container.querySelector('#retry-btn')?.addEventListener('click', () => options.onRetry?.());
  container.querySelector('#next-btn')?.addEventListener('click', () => options.onNext?.());
  container.querySelector('#menu-btn')?.addEventListener('click', options.onMenu);
}

function renderGroup(
  title: string,
  words: ScoreResult['breakdown'],
  dirClass: string,
): string {
  if (!words.length) {
    return `
      <section class="breakdown-group breakdown-empty">
        <h3>${title}</h3>
        <p class="hint">None found</p>
      </section>
    `;
  }

  const sorted = [...words].sort((a, b) => b.score - a.score);
  const items = sorted
    .map((w) => `<li class="word-${dirClass}">${w.word} <span class="pts">+${w.score}</span></li>`)
    .join('');
  const subtotal = words.reduce((s, w) => s + w.score, 0);
  return `
    <section class="breakdown-group breakdown-${dirClass}">
      <h3>${title} <span class="pts">${subtotal} pts</span></h3>
      <ul>${items}</ul>
    </section>
  `;
}

export function shakeGrid(container: HTMLElement): void {
  const grid = container.querySelector('.grid');
  if (!grid) return;
  grid.classList.remove('shake');
  void (grid as HTMLElement).offsetWidth;
  grid.classList.add('shake');
}
