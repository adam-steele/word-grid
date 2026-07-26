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
  vertical: { color: 'rgba(110, 117, 184, 0.92)', dash: '' },
  diagonal: { color: 'rgba(255, 207, 64, 0.92)', dash: '0.15 0.1' },
} as const;

export type OverlayIntensity = 'play' | 'final';

function axisSize(count: number, gapRatio: number): number {
  return count + Math.max(0, count - 1) * gapRatio;
}

function cellCenter(index: number, gapRatio: number): number {
  return index * (1 + gapRatio) + 0.5;
}

/** Crossword-style paths — rendered behind cells */
export function renderWordOverlay(
  size: GridSize,
  breakdown: ScoreBreakdown[],
  intensity: OverlayIntensity = 'play',
  gapRatio = 0.1,
): string {
  const words = breakdown.filter(
    (w) => w.direction === 'vertical' || w.direction === 'diagonal',
  );
  if (!words.length) return '';

  const strokeWidth = intensity === 'play' ? 0.08 : 0.11;
  const opacity = intensity === 'play' ? 0.85 : 0.95;
  const viewW = axisSize(size.cols, gapRatio);
  const viewH = axisSize(size.rows, gapRatio);
  const clipId = `grid-clip-${size.cols}x${size.rows}`;

  const vertical = words.filter((w) => w.direction === 'vertical');
  const diagonal = words.filter((w) => w.direction === 'diagonal');

  const shapes = [...vertical, ...diagonal]
    .map((word) => {
      const style =
        word.direction === 'vertical' ? STROKE.vertical : STROKE.diagonal;
      const points = word.cells
        .map((c) => `${cellCenter(c.col, gapRatio)},${cellCenter(c.row, gapRatio)}`)
        .join(' ');
      return `
        <polyline
          class="word-path word-path-${word.direction}"
          points="${points}"
          fill="none"
          stroke="${style.color}"
          stroke-width="${strokeWidth}"
          stroke-linecap="butt"
          stroke-linejoin="miter"
          stroke-dasharray="${style.dash}"
          opacity="${opacity}"
          vector-effect="non-scaling-stroke"
        />
      `;
    })
    .join('');

  return `
    <svg
      class="word-overlay word-overlay-${intensity}"
      viewBox="0 0 ${viewW} ${viewH}"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <clipPath id="${clipId}">
          <rect x="0" y="0" width="${viewW}" height="${viewH}" />
        </clipPath>
      </defs>
      <g clip-path="url(#${clipId})">
        ${shapes}
      </g>
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
