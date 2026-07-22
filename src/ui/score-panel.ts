import type { ScoreBreakdown } from '@shared/types.js';

export function renderScorePanel(
  container: HTMLElement,
  total: number,
  breakdown: ScoreBreakdown[],
  threshold: number | null,
): void {
  const thresholdLine =
    threshold !== null ? `<p class="threshold">Target: ${threshold}</p>` : '';

  const vertical = breakdown.filter((w) => w.direction === 'vertical');
  const diagonal = breakdown.filter((w) => w.direction === 'diagonal');
  const featured = [...vertical, ...diagonal].slice(-4);

  const words =
    featured.length > 0
      ? `<ul class="word-list">${featured
          .map(
            (w) =>
              `<li><span class="dir dir-${w.direction}" title="${w.direction}">${dirLabel(w.direction)}</span> ${w.word} +${w.score}</li>`,
          )
          .join('')}</ul>`
      : breakdown.length > 0
        ? `<p class="hint">Lock more rows to reveal vertical &amp; diagonal words</p>`
        : '';

  container.innerHTML = `
    <div class="score-panel">
      <p class="score-total">Score: <strong>${total}</strong></p>
      ${thresholdLine}
      ${words}
    </div>
  `;
}

function dirLabel(direction: ScoreBreakdown['direction']): string {
  if (direction === 'horizontal') return 'H';
  if (direction === 'vertical') return 'V';
  return 'D';
}
