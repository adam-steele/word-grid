import {
  createGrid,
  gridToLetters,
  isGridComplete,
  lockRow,
  applyLetterToActiveRow,
  clearCell,
  type GameGrid,
} from '../core/grid.js';
import { loadDictionaryForGrid, loadRowDictionary } from '../core/dictionary.js';
import { validateRowForLock } from '../core/validator.js';
import { computeGridScore } from '../core/scorer.js';
import { getValidationProvider } from '../validation/index.js';
import { renderGrid } from '../ui/grid-view.js';
import { renderScorePanel } from '../ui/score-panel.js';
import { renderGameOver, shakeGrid } from '../ui/game-over.js';
import { renderOnScreenKeyboard } from '../ui/on-screen-keyboard.js';
import { renderMenu } from '../ui/menu.js';
import { renderLevelSelect, TOTAL_LEVELS } from '../modes/levels.js';
import { savePracticeHighScore, getPracticeHighScore } from '../storage/practice-scores.js';
import type { GridSize, ScoreResult } from '@shared/types.js';

export function startLevelSession(container: HTMLElement, levelId: number): void {
  runSession(container, null, levelId);
}

export async function runSession(
  container: HTMLElement,
  size: GridSize | null,
  levelId: number | null,
): Promise<void> {
  const provider = getValidationProvider();
  let levelName = 'Free Play';
  let threshold: number | null = null;
  let gridSize: GridSize;
  let gameGrid: GameGrid;
  let sessionActive = true;

  if (levelId !== null) {
    const level = await provider.loadLevel(levelId);
    gridSize = level.grid;
    levelName = level.name;
    threshold = level.threshold;
    gameGrid = createGrid(level.grid, level.prefilled);
  } else {
    gridSize = size!;
    gameGrid = createGrid(gridSize);
  }

  const rowDict = await loadRowDictionary(gridSize.cols);
  const scoreDict = await loadDictionaryForGrid(gridSize.rows, gridSize.cols);
  let scoreResult: ScoreResult = { total: 0, breakdown: [] };

  const cleanup = (): void => {
    sessionActive = false;
    document.removeEventListener('keydown', onKeyDown);
  };

  const showGameOver = async (
    final: ScoreResult,
    passed: boolean | null,
  ): Promise<void> => {
    cleanup();

    let highScore: number | undefined;
    let isNewHighScore = false;

    if (levelId === null) {
      const prev = await getPracticeHighScore(gridSize.cols, gridSize.rows);
      highScore = Math.max(prev, final.total);
      isNewHighScore = final.total > prev;
      if (isNewHighScore) await savePracticeHighScore(gridSize.cols, gridSize.rows, final.total);
    }

    renderGameOver(container, final, {
      title: levelId ? `${levelName} — Level ${levelId}` : 'Free Play Complete',
      score: final.total,
      threshold,
      passed,
      highScore,
      isNewHighScore,
      grid: gameGrid,
      onRetry:
        levelId !== null
          ? () => startLevelSession(container, levelId)
          : () => runSession(container, gridSize, null),
      onNext:
        passed && levelId !== null && levelId < TOTAL_LEVELS
          ? () => startLevelSession(container, levelId + 1)
          : undefined,
      onMenu: () => renderMenu(container),
    });
  };

  const rerender = (): void => {
    if (!sessionActive) return;

    container.innerHTML = `
      <div class="session">
        <header class="session-header">
          <button class="btn btn-ghost session-back" id="back-btn" type="button">← Menu</button>
          <div class="session-title-wrap">
            <h1 class="session-title">Word Grid</h1>
            <p class="session-subtitle">${levelName}${levelId ? ` · Level ${levelId}` : ''}</p>
          </div>
          <div id="score-panel"></div>
        </header>
        <div class="session-board">
          <div id="grid-root"></div>
        </div>
        <footer class="session-footer">
          <p class="session-hint">Type or click letters · Backspace to delete · Enter to lock row</p>
          <div id="message"></div>
          <div id="keyboard-root"></div>
        </footer>
      </div>
    `;

    renderScorePanel(
      container.querySelector('#score-panel')!,
      scoreResult.total,
      scoreResult.breakdown.slice(-5),
      threshold,
    );
    renderGrid(container.querySelector('#grid-root')!, gameGrid, {
      highlights: scoreResult.breakdown,
      showWordPaths: scoreResult.breakdown.some(
        (w) => w.direction === 'vertical' || w.direction === 'diagonal',
      ),
      overlayIntensity: 'play',
    });

    container.querySelector('#back-btn')?.addEventListener('click', () => {
      cleanup();
      if (levelId !== null) {
        provider.loadProgress().then((p) => renderLevelSelect(container, p.unlockedLevel));
      } else {
        renderMenu(container);
      }
    });

    const keyboardRoot = container.querySelector('#keyboard-root');
    if (keyboardRoot) {
      renderOnScreenKeyboard(keyboardRoot as HTMLElement, {
        onLetter: handleLetter,
        onBackspace: handleBackspace,
        onEnter: () => {
          void handleEnter();
        },
      });
    }
  };

  const handleEnter = async (): Promise<void> => {
    if (!sessionActive || isGridComplete(gameGrid)) return;

    const check = validateRowForLock(gameGrid, rowDict);
    if (!check.valid) {
      const msg = container.querySelector('#message');
      if (msg) {
        msg.textContent = check.error ?? 'Invalid word';
        msg.className = 'message error';
      }
      shakeGrid(container);
      return;
    }

    gameGrid = lockRow(gameGrid);
    scoreResult = computeGridScore(gameGrid, scoreDict);

    if (isGridComplete(gameGrid)) {
      const letters = gridToLetters(gameGrid);
      if (levelId !== null) {
        const result = await provider.completeLevel(levelId, letters);
        if (result.passed) {
          await provider.unlockLevel(await provider.loadProgress(), levelId, result.score);
        }
        await showGameOver(
          { total: result.score, breakdown: scoreResult.breakdown },
          result.passed,
        );
      } else {
        await showGameOver(scoreResult, null);
      }
      return;
    }

    rerender();
  };

  const handleBackspace = (): void => {
    if (!sessionActive || isGridComplete(gameGrid)) return;
    const row = gameGrid.activeRow;
    const cols = gridSize.cols;

    for (let c = cols - 1; c >= 0; c--) {
      const cell = gameGrid.cells[row]![c]!;
      if (cell.state !== 'prefilled' && cell.letter) {
        gameGrid = clearCell(gameGrid, row, c);
        rerender();
        break;
      }
    }
  };

  const handleLetter = (letter: string): void => {
    if (!sessionActive || isGridComplete(gameGrid)) return;

    const next = applyLetterToActiveRow(gameGrid, letter);
    if (next !== gameGrid) {
      gameGrid = next;
      rerender();
    }
  };

  const onKeyDown = async (e: KeyboardEvent): Promise<void> => {
    if (!sessionActive || isGridComplete(gameGrid)) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      await handleEnter();
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      handleBackspace();
      return;
    }

    if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
      handleLetter(e.key);
    }
  };

  document.addEventListener('keydown', onKeyDown);
  rerender();
}
