import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  TUTORIAL_STEPS,
  calloutSuccessPrompt,
  evaluateTutorialEnter,
  tutorialStepCount,
  visibleTutorialHighlights,
} from './tutorial-steps.js';
import { createGrid, lockRow, applyLetterToActiveRow } from '../core/grid.js';
import { computeGridScore } from '../core/scorer.js';

function loadCombinedScoringDict(lengths: number[]): Set<string> {
  const combined = new Set<string>();
  for (const len of lengths) {
    const words = JSON.parse(
      readFileSync(`public/dictionary/scoring/${len}.json`, 'utf8'),
    ) as string[];
    for (const w of words) combined.add(w);
  }
  return combined;
}

const rowDict = loadCombinedScoringDict([5]);
const scoreDict = loadCombinedScoringDict([3, 4, 5]);

describe('tutorial steps', () => {
  it('defines six interactive steps', () => {
    expect(tutorialStepCount()).toBe(6);
    expect(TUTORIAL_STEPS.map((step) => step.id)).toEqual([
      'row1',
      'row2-invalid',
      'row2-fix',
      'row3',
      'row4',
      'row5',
    ]);
  });
});

describe('evaluateTutorialEnter', () => {
  const isValid = (word: string) => rowDict.has(word);

  it('requires TRAIN on row 1', () => {
    const step = TUTORIAL_STEPS[0]!;
    expect(evaluateTutorialEnter(step, 'TRAIN', 5, isValid)).toEqual({
      action: 'lock',
      target: 'TRAIN',
    });
    expect(evaluateTutorialEnter(step, 'RAINS', 5, isValid).action).toBe('reject');
  });

  it('advances after invalid RAXXX attempt', () => {
    const step = TUTORIAL_STEPS[1]!;
    const result = evaluateTutorialEnter(step, 'RAXXX', 5, isValid);
    expect(result.action).toBe('invalid-advance');
    if (result.action === 'invalid-advance') {
      expect(result.nextPrompt).toContain('RAINS');
    }
  });

  it('rejects valid words during force-invalid step', () => {
    const step = TUTORIAL_STEPS[1]!;
    const result = evaluateTutorialEnter(step, 'RAINS', 5, isValid);
    expect(result.action).toBe('reject');
  });

  it('locks RAINS on row2-fix step', () => {
    const step = TUTORIAL_STEPS[2]!;
    expect(evaluateTutorialEnter(step, 'RAINS', 5, isValid)).toEqual({
      action: 'lock',
      target: 'RAINS',
    });
  });
});

describe('tutorial scoring callouts', () => {
  function scoreAfterRows(words: string[]) {
    let grid = createGrid({ rows: 5, cols: 5 });
    for (const word of words) {
      for (const ch of word) grid = applyLetterToActiveRow(grid, ch);
      grid = lockRow(grid);
    }
    return computeGridScore(grid, scoreDict);
  }

  it('finds RAN after ANGER but not TAG until INERT step completes', () => {
    const afterAnger = scoreAfterRows(['TRAIN', 'RAINS', 'ANGER']);
    const words = afterAnger.breakdown.map((entry) => entry.word);
    expect(words).toContain('RAN');
    expect(words).toContain('TAG');

    const duringInertStep = visibleTutorialHighlights(4, afterAnger.breakdown);
    expect(duringInertStep.map((entry) => entry.word)).toEqual(['RAN']);

    const afterInert = scoreAfterRows(['TRAIN', 'RAINS', 'ANGER', 'INERT']);
    expect(afterInert.breakdown.map((entry) => entry.word)).toContain('SEE');
    const afterInertStep = visibleTutorialHighlights(5, afterInert.breakdown);
    expect(afterInertStep.map((entry) => entry.word)).toContain('TAG');
    expect(afterInertStep.map((entry) => entry.word)).toContain('SEE');
  });

  it('finds TRAIN vertically after all five rows', () => {
    const result = scoreAfterRows(['TRAIN', 'RAINS', 'ANGER', 'INERT', 'NERDS']);
    const vertical = result.breakdown.filter((entry) => entry.direction === 'vertical');
    expect(vertical.map((entry) => entry.word)).toContain('TRAIN');
    expect(result.breakdown.map((entry) => entry.word)).toContain('NERDS');
    expect(result.total).toBeGreaterThan(0);
  });
});
