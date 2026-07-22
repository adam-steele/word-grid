import { isValidWord } from './dictionary.js';
import { getRowWord, type GameGrid } from './grid.js';

export function validateRowForLock(
  grid: GameGrid,
  dict: Set<string>,
): { valid: boolean; word: string; error?: string } {
  const word = getRowWord(grid, grid.activeRow);
  const cols = grid.size.cols;

  if (word.length !== cols) {
    return { valid: false, word, error: `Enter ${cols} letters` };
  }

  if (!/^[A-Z]+$/.test(word)) {
    return { valid: false, word, error: 'Letters only' };
  }

  if (!isValidWord(word, dict)) {
    return { valid: false, word, error: 'Not in dictionary' };
  }

  return { valid: true, word };
}
