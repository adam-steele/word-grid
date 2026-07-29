import {
  createGrid,
  isGridComplete,
  lockRow,
  applyLetterToActiveRow,
  clearCell,
  getRowWord,
  type GameGrid,
} from '../core/grid.js';
import { loadDictionaryForGrid, loadRowDictionary, isValidWord } from '../core/dictionary.js';
import { computeGridScore } from '../core/scorer.js';
import { renderGrid } from '../ui/grid-view.js';
import { renderScorePanel } from '../ui/score-panel.js';
import { renderOnScreenKeyboard } from '../ui/on-screen-keyboard.js';
import { renderTutorialComplete } from '../ui/tutorial-complete.js';
import { renderMenu } from '../ui/menu.js';
import { shakeGrid } from '../ui/game-over.js';
import {
  TUTORIAL_GRID,
  buildTutorialPrompt,
  calloutSuccessPrompt,
  evaluateTutorialEnter,
  getTutorialStep,
  tutorialStepCount,
  visibleTutorialHighlights,
} from './tutorial-steps.js';
import type { ScoreResult } from '@shared/types.js';

export function startTutorialSession(container: HTMLElement): void {
  void runTutorialSession(container);
}

export async function runTutorialSession(container: HTMLElement): Promise<void> {
  let gameGrid: GameGrid = createGrid(TUTORIAL_GRID);
  let stepIndex = 0;
  let sessionActive = true;
  let postLockMessage: string | null = null;

  const rowDict = await loadRowDictionary(TUTORIAL_GRID.cols);
  const scoreDict = await loadDictionaryForGrid(TUTORIAL_GRID.rows, TUTORIAL_GRID.cols);
  let scoreResult: ScoreResult = { total: 0, breakdown: [] };

  const cleanup = (): void => {
    sessionActive = false;
    document.removeEventListener('keydown', onKeyDown);
  };

  const currentStep = () => getTutorialStep(stepIndex);

  const showComplete = (): void => {
    cleanup();
    renderTutorialComplete(container, scoreResult, gameGrid, () => renderMenu(container));
  };

  const rerender = (): void => {
    if (!sessionActive) return;

    const step = currentStep();
    const stepNumber = Math.min(stepIndex + 1, tutorialStepCount());
    const promptHtml = buildTutorialPrompt(step, postLockMessage);
    const highlights = visibleTutorialHighlights(stepIndex, scoreResult.breakdown);

    container.innerHTML = `
      <div class="session tutorial-session">
        <header class="session-header">
          <button class="btn btn-ghost session-back" id="skip-btn" type="button">Skip</button>
          <div class="session-title-wrap">
            <h1 class="session-title">Word Grid</h1>
            <p class="session-subtitle">Tutorial</p>
          </div>
          <div id="score-panel"></div>
        </header>
        <div class="session-board">
          <div id="grid-root"></div>
        </div>
        <footer class="session-footer">
          <div class="tutorial-prompt" aria-live="polite">
            <p class="tutorial-step">Step ${stepNumber} of ${tutorialStepCount()}</p>
            <p class="tutorial-text">${promptHtml}</p>
          </div>
          <div id="message"></div>
          <div id="keyboard-root"></div>
        </footer>
      </div>
    `;

    renderScorePanel(
      container.querySelector('#score-panel')!,
      scoreResult.total,
      highlights.slice(-5),
      null,
    );
    renderGrid(container.querySelector('#grid-root')!, gameGrid, {
      highlights,
      showWordPaths: highlights.length > 0,
      overlayIntensity: 'play',
    });

    container.querySelector('#skip-btn')?.addEventListener('click', () => {
      cleanup();
      renderMenu(container);
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

  const setMessage = (text: string, kind: 'error' | 'success' | ''): void => {
    const msg = container.querySelector('#message');
    if (!msg) return;
    msg.textContent = text;
    msg.className = kind ? `message ${kind}` : 'message';
  };

  const handleEnter = async (): Promise<void> => {
    if (!sessionActive || isGridComplete(gameGrid)) return;

    const step = currentStep();
    if (!step || step.kind === 'outro') return;

    const rowWord = getRowWord(gameGrid, gameGrid.activeRow);
    const result = evaluateTutorialEnter(step, rowWord, TUTORIAL_GRID.cols, (word) =>
      isValidWord(word, rowDict),
    );

    if (result.action === 'reject') {
      setMessage(result.error, 'error');
      shakeGrid(container);
      return;
    }

    if (result.action === 'invalid-advance') {
      stepIndex += 1;
      postLockMessage = null;
      setMessage('Not in dictionary — use Backspace to fix it.', 'error');
      shakeGrid(container);
      rerender();
      return;
    }

    gameGrid = lockRow(gameGrid);
    scoreResult = computeGridScore(gameGrid, scoreDict);

    const finishedStep = step;
    stepIndex += 1;
    postLockMessage = calloutSuccessPrompt(finishedStep, scoreResult.breakdown);

    if (isGridComplete(gameGrid)) {
      showComplete();
      return;
    }

    setMessage('', '');
    rerender();
  };

  const handleBackspace = (): void => {
    if (!sessionActive || isGridComplete(gameGrid)) return;
    const row = gameGrid.activeRow;

    for (let c = TUTORIAL_GRID.cols - 1; c >= 0; c--) {
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
      setMessage('', '');
      rerender();
    }
  };

  const onKeyDown = (e: KeyboardEvent): void => {
    if (!sessionActive || isGridComplete(gameGrid)) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      void handleEnter();
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
