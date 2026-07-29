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

const CAPSULE = {
  vertical: 'rgba(110, 117, 184, 0.95)',
  diagonal: 'rgba(255, 207, 64, 0.95)',
} as const;

/** Letter anchor as a fraction of cell height (matches play-session tile layout). */
export const LETTER_Y_RATIO = 0.553;
/** Capsule half-width as a fraction of cell width. */
export const CAPSULE_RADIUS_RATIO = 0.25;

export type OverlayIntensity = 'play' | 'final';

function axisSize(count: number, gapRatio: number): number {
  return count + Math.max(0, count - 1) * gapRatio;
}

export function letterCenter(
  row: number,
  col: number,
  gapRatio: number,
): { x: number; y: number } {
  return {
    x: col * (1 + gapRatio) + 0.5,
    y: row * (1 + gapRatio) + LETTER_Y_RATIO,
  };
}

export function semicircleSweep(
  from: { x: number; y: number },
  to: { x: number; y: number },
  pivot: { x: number; y: number },
  via: { x: number; y: number },
): 0 | 1 {
  const chordX = to.x - from.x;
  const chordY = to.y - from.y;
  const viaX = via.x - pivot.x;
  const viaY = via.y - pivot.y;
  const cross = chordX * viaY - chordY * viaX;
  return cross > 0 ? 0 : 1;
}

/** Hollow capsule outline along a scored word path (viewBox cell units). */
export function capsuleOutlinePath(
  cells: Array<{ row: number; col: number }>,
  gapRatio: number,
  radius = CAPSULE_RADIUS_RATIO,
): string {
  if (cells.length < 2) return '';

  const pts = cells.map((c) => letterCenter(c.row, c.col, gapRatio));
  const start = pts[0]!;
  const end = pts[pts.length - 1]!;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return '';

  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;

  const ls = { x: start.x + px * radius, y: start.y + py * radius };
  const rs = { x: start.x - px * radius, y: start.y - py * radius };
  const le = { x: end.x + px * radius, y: end.y + py * radius };
  const re = { x: end.x - px * radius, y: end.y - py * radius };

  const startBack = { x: start.x - ux * radius, y: start.y - uy * radius };
  const endForward = { x: end.x + ux * radius, y: end.y + uy * radius };

  const sweepStart = semicircleSweep(ls, rs, start, startBack);
  const sweepEnd = semicircleSweep(re, le, end, endForward);

  return [
    `M ${ls.x} ${ls.y}`,
    `A ${radius} ${radius} 0 0 ${sweepStart} ${rs.x} ${rs.y}`,
    `L ${re.x} ${re.y}`,
    `A ${radius} ${radius} 0 0 ${sweepEnd} ${le.x} ${le.y}`,
    'Z',
  ].join(' ');
}

/** Word-search capsule outlines — rendered between tile fill and border */
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

  const viewW = axisSize(size.cols, gapRatio);
  const viewH = axisSize(size.rows, gapRatio);
  const clipId = `grid-clip-${size.cols}x${size.rows}`;
  const strokeClass =
    intensity === 'play' ? 'word-capsule word-capsule-play' : 'word-capsule word-capsule-final';

  const shapes = words
    .map((word) => {
      const d = capsuleOutlinePath(word.cells, gapRatio);
      if (!d) return '';
      const color =
        word.direction === 'vertical' ? CAPSULE.vertical : CAPSULE.diagonal;
      return `
        <path
          class="${strokeClass} word-capsule-${word.direction}"
          d="${d}"
          fill="none"
          stroke="${color}"
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
  vertical: '',
  diagonal: '',
  horizontal: '',
  'vertical-diagonal': 'ring-v-d',
  none: '',
};

/** Inset ring only when a cell is in both a vertical and diagonal word */
export function ringClassFor(kind: HighlightKind): string {
  if (kind === 'vertical-diagonal') return HIGHLIGHT_RING['vertical-diagonal'];
  return '';
}
