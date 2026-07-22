import type { GridSize } from '@shared/types.js';
import type { ScoreBreakdown } from '@shared/types.js';
import { getLetterPoints } from '@shared/scoring.js';
import type { HighlightKind } from '@shared/word-finder.js';

export function renderCellContent(letter: string): string {
  if (!letter) return '';
  const points = getLetterPoints(letter);
  const highValue = points >= 4 ? ' cell-points-high' : '';
  return `
    <span class="cell-letter">${letter}</span>
    <span class="cell-points${highValue}" aria-hidden="true">${points}</span>
  `;
}

const STROKE = {
  vertical: { color: 'rgba(96, 165, 250, 0.55)', dash: '' },
  diagonal: { color: 'rgba(251, 191, 36, 0.6)', dash: '0.15 0.1' },
} as const;

export type OverlayIntensity = 'play' | 'final';

/** Crossword-style paths — rendered behind cells */
export function renderWordOverlay(
  size: GridSize,
  breakdown: ScoreBreakdown[],
  intensity: OverlayIntensity = 'play',
): string {
  const words = breakdown.filter(
    (w) => w.direction === 'vertical' || w.direction === 'diagonal',
  );
  if (!words.length) return '';

  const strokeWidth = intensity === 'play' ? 0.1 : 0.14;
  const opacity = intensity === 'play' ? 0.7 : 0.85;

  const vertical = words.filter((w) => w.direction === 'vertical');
  const diagonal = words.filter((w) => w.direction === 'diagonal');

  const shapes = [...vertical, ...diagonal]
    .map((word) => {
      const style =
        word.direction === 'vertical' ? STROKE.vertical : STROKE.diagonal;
      const points = word.cells.map((c) => `${c.col + 0.5},${c.row + 0.5}`).join(' ');
      return `
        <polyline
          class="word-path word-path-${word.direction}"
          points="${points}"
          fill="none"
          stroke="${style.color}"
          stroke-width="${strokeWidth}"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-dasharray="${style.dash}"
          opacity="${opacity}"
        />
      `;
    })
    .join('');

  return `
    <svg
      class="word-overlay word-overlay-${intensity}"
      viewBox="0 0 ${size.cols} ${size.rows}"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      ${shapes}
    </svg>
  `;
}

export const HIGHLIGHT_RING: Record<HighlightKind, string> = {
  vertical: 'ring-vertical',
  diagonal: 'ring-diagonal',
  horizontal: '',
  'vertical-diagonal': 'ring-v-d',
  none: '',
};

/** Inset ring on scored vertical/diagonal cells — play and final */
export function ringClassFor(kind: HighlightKind): string {
  if (kind === 'none' || kind === 'horizontal') return '';
  return HIGHLIGHT_RING[kind] ?? '';
}
