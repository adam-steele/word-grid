/** Dev default — must match between encode script and client decode. */
export const DEFAULT_LEVEL_ENCODE_KEY = 'dev-level-key-change-me';

export function resolveLevelEncodeKey(value?: string): string {
  return value || DEFAULT_LEVEL_ENCODE_KEY;
}
