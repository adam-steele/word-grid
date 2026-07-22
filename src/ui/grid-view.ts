import type { ScoreBreakdown } from '@shared/types.js';
import { buildHighlightMap } from '@shared/word-finder.js';
import type { GameGrid } from '../core/grid.js';
import {
  renderCellContent,
  renderWordOverlay,
  ringClassFor,
  type OverlayIntensity,
} from './cell-tile.js';

export interface GridRenderOptions {
  highlights?: ScoreBreakdown[];
  showAllLocked?: boolean;
  showLegend?: boolean;
  showWordPaths?: boolean;
  /** play = thinner paths; final = slightly bolder paths. Rings show in both. */
  overlayIntensity?: OverlayIntensity;
}

function visibleHighlights(breakdown: ScoreBreakdown[]): ScoreBreakdown[] {
  return breakdown.filter(
    (w) => w.direction === 'vertical' || w.direction === 'diagonal',
  );
}

export function renderGrid(
  container: HTMLElement,
  grid: GameGrid,
  options: GridRenderOptions = {},
): void {
  const { cells, activeRow, size } = grid;
  const intensity = options.overlayIntensity ?? (options.showAllLocked ? 'final' : 'play');
  const scored = options.highlights ? visibleHighlights(options.highlights) : [];
  const highlightMap = scored.length ? buildHighlightMap(scored) : null;
  const showPaths = options.showWordPaths !== false && scored.length > 0;

  const legend =
    options.showLegend && intensity === 'final'
      ? `
    <div class="highlight-legend" aria-label="Word direction legend">
      <span class="legend-item"><i class="swatch swatch-v"></i> Vertical</span>
      <span class="legend-item"><i class="swatch swatch-d"></i> Diagonal</span>
      <span class="legend-item"><i class="swatch swatch-vd"></i> Both</span>
    </div>`
      : '';

  const overlay = showPaths ? renderWordOverlay(size, scored, intensity) : '';

  container.innerHTML = `
    ${legend}
    <div class="grid-wrap ${intensity === 'final' ? 'grid-wrap-final' : ''}">
      ${overlay}
      <div class="grid ${intensity === 'final' ? 'grid-final' : ''}" style="--cols: ${size.cols}; --rows: ${size.rows}" role="grid" aria-label="Word grid">
        ${cells
          .map((row, ri) =>
            row
              .map((cell, ci) => {
                const kind = highlightMap?.get(`${ri},${ci}`) ?? 'none';
                const ringClass = ringClassFor(kind);
                const classes = [
                  'cell',
                  cell.state,
                  intensity === 'final' ? 'locked' : '',
                  ri === activeRow && intensity === 'play' ? 'active-row' : '',
                  ringClass,
                ]
                  .filter(Boolean)
                  .join(' ');
                return `<div class="${classes}" role="gridcell" data-row="${ri}" data-col="${ci}">${renderCellContent(cell.letter)}</div>`;
              })
              .join(''),
          )
          .join('')}
      </div>
    </div>
  `;
}
