import type {
  LevelCompleteRequest,
  LevelCompleteResponse,
  LevelPayload,
  ProgressData,
  UnlockToken,
} from '@shared/types.js';
import { isServerValidation, getApiBaseUrl } from '@shared/config.js';
import { ClientValidationProvider } from './client-provider.js';
import { ServerValidationProvider } from './server-provider.js';

export interface ValidationProvider {
  /** Load and decode a level blob (client) or fetch from API (server) */
  loadLevel(levelId: number): Promise<LevelPayload>;

  /** Verify level completion — recompute score client-side or via API */
  completeLevel(
    levelId: number,
    grid: string[][],
    priorToken?: UnlockToken,
  ): Promise<LevelCompleteResponse>;

  /** Read/write progress — signed locally; server mode also validates tokens */
  loadProgress(): Promise<ProgressData>;
  saveProgress(data: ProgressData): Promise<void>;

  /** After passing a level, persist unlock */
  unlockLevel(data: ProgressData, levelId: number, score: number): Promise<ProgressData>;
}

let instance: ValidationProvider | null = null;

export function getValidationProvider(): ValidationProvider {
  if (!instance) {
    instance = isServerValidation()
      ? new ServerValidationProvider(getApiBaseUrl())
      : new ClientValidationProvider();
  }
  return instance;
}

/** For tests — reset singleton */
export function resetValidationProvider(): void {
  instance = null;
}

export async function submitLevelComplete(
  req: LevelCompleteRequest,
): Promise<LevelCompleteResponse> {
  const provider = getValidationProvider();
  return provider.completeLevel(req.levelId, req.grid, req.unlockToken);
}
