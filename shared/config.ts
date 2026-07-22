import type { ValidationMode } from './types.js';

export function getValidationMode(): ValidationMode {
  return typeof __VALIDATION_MODE__ !== 'undefined'
    ? __VALIDATION_MODE__
    : 'client';
}

export function getApiUrl(): string | undefined {
  const url = import.meta.env.VITE_API_URL as string | undefined;
  if (!url) return undefined;
  return url.replace(/\/$/, '');
}

/** Same-origin API when VITE_API_URL is unset */
export function getApiBaseUrl(): string {
  return getApiUrl() ?? '';
}

export function isServerValidation(): boolean {
  return getValidationMode() === 'server';
}

export function getProgressSecret(): string {
  return import.meta.env.VITE_PROGRESS_SECRET as string;
}

export function getLevelEncodeKey(): string {
  return import.meta.env.VITE_LEVEL_ENCODE_KEY as string;
}
