import type { ScoreBreakdown } from '@shared/types.js';
import type { GridSize } from '@shared/types.js';

export const TUTORIAL_GRID: GridSize = { rows: 5, cols: 5 };

export type TutorialStep =
  | {
      id: string;
      kind: 'lock-word';
      target: string;
      prompt: string;
      callout?: string[];
      successPrompt?: string;
    }
  | {
      id: string;
      kind: 'force-invalid';
      target: string;
      prompt: string;
      successPrompt: string;
    }
  | {
      id: string;
      kind: 'outro';
      prompt: string;
    };

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'row1',
    kind: 'lock-word',
    target: 'TRAIN',
    prompt:
      'Welcome! Type <strong>TRAIN</strong> using the keyboard or on-screen keys, then press <strong>Enter</strong> to lock the row.',
  },
  {
    id: 'row2-invalid',
    kind: 'force-invalid',
    target: 'RAXXX',
    prompt:
      'Try typing <strong>RAXXX</strong> and press Enter — it\'s not in the dictionary. You\'ll see an error.',
    successPrompt:
      'Use <strong>Backspace</strong> to delete letters, then type <strong>RAINS</strong> and press Enter.',
  },
  {
    id: 'row2-fix',
    kind: 'lock-word',
    target: 'RAINS',
    prompt:
      'Use <strong>Backspace</strong> to delete letters, then type <strong>RAINS</strong> and press Enter.',
  },
  {
    id: 'row3',
    kind: 'lock-word',
    target: 'ANGER',
    callout: ['RAN'],
    prompt:
      'Vertical words score too. Type <strong>ANGER</strong> and press Enter — look for <strong>RAN</strong> going down column 2.',
    successPrompt:
      'Nice! You scored <strong>RAN</strong> vertically — see the blue highlight in column 2.',
  },
  {
    id: 'row4',
    kind: 'lock-word',
    target: 'INERT',
    callout: ['TAG', 'SEE'],
    prompt:
      'Diagonals run both ways — cross-words are the real aim: vertical 1.5×, diagonal 2×. Type <strong>INERT</strong> and press Enter. Look for <strong>TAG</strong> (↘) and <strong>SEE</strong> (↙).',
    successPrompt:
      'You scored <strong>TAG</strong> and <strong>SEE</strong> diagonally — yellow highlights in both directions.',
  },
  {
    id: 'row5',
    kind: 'lock-word',
    target: 'NERDS',
    prompt:
      'Last row! Type <strong>NERDS</strong> and press Enter to complete the grid and see your full score.',
  },
];

export function tutorialStepCount(): number {
  return TUTORIAL_STEPS.length;
}

export function getTutorialStep(index: number): TutorialStep | undefined {
  return TUTORIAL_STEPS[index];
}

export function calloutSuccessPrompt(
  step: TutorialStep,
  breakdown: ScoreBreakdown[],
): string | null {
  if (step.kind !== 'lock-word' || !step.callout?.length) return null;
  const found = step.callout.filter((word) => breakdown.some((entry) => entry.word === word));
  if (!found.length) return step.successPrompt ?? null;
  return step.successPrompt ?? null;
}

/** Words to show as capsule overlays for the current tutorial step. */
export function visibleTutorialHighlights(
  stepIndex: number,
  breakdown: ScoreBreakdown[],
): ScoreBreakdown[] {
  const cross = breakdown.filter(
    (w) => w.direction === 'vertical' || w.direction === 'diagonal',
  );
  if (stepIndex <= 3) return cross;
  if (stepIndex === 4) return cross.filter((w) => w.word === 'RAN');
  return cross;
}

export function buildTutorialPrompt(
  step: TutorialStep | undefined,
  postLockMessage: string | null,
): string {
  const taskPrompt = step?.prompt ?? '';
  if (!postLockMessage) return taskPrompt;
  return `
    <p class="tutorial-success">${postLockMessage}</p>
    <p class="tutorial-next"><strong>Your turn:</strong> ${taskPrompt}</p>
  `;
}

export type EnterAttemptResult =
  | { action: 'reject'; error: string }
  | { action: 'invalid-advance'; nextPrompt: string }
  | { action: 'lock'; target: string };

/** Evaluate Enter on the active tutorial step. */
export function evaluateTutorialEnter(
  step: TutorialStep,
  rowWord: string,
  cols: number,
  isValidWord: (word: string) => boolean,
): EnterAttemptResult {
  if (step.kind === 'outro') {
    return { action: 'reject', error: 'Tutorial complete' };
  }

  if (rowWord.length !== cols) {
    return { action: 'reject', error: `Enter ${cols} letters` };
  }

  if (!/^[A-Z]+$/.test(rowWord)) {
    return { action: 'reject', error: 'Letters only' };
  }

  if (step.kind === 'force-invalid') {
    if (rowWord !== step.target) {
      return {
        action: 'reject',
        error: `Type ${step.target} first to see what happens with an invalid word`,
      };
    }
    if (isValidWord(rowWord)) {
      return { action: 'reject', error: 'That word is valid — use an invalid word' };
    }
    return { action: 'invalid-advance', nextPrompt: step.successPrompt };
  }

  if (step.kind === 'lock-word') {
    if (!isValidWord(rowWord)) {
      return { action: 'reject', error: 'Not in dictionary' };
    }
    if (rowWord !== step.target) {
      return { action: 'reject', error: `Enter ${step.target} for this step` };
    }
    return { action: 'lock', target: step.target };
  }

  return { action: 'reject', error: 'Invalid step' };
}
