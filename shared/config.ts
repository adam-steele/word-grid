import type { ValidationMode } from './types.js';

export function getValidationMode(): ValidationMode {
  return typeof __VALIDATION_MODE__ !== 'undefined'
    ? __VALIDATION_MODE__
    : 'client';
}

export function getApiUrl(): string | undefined {
  return import.meta.env.VITE_API_URL as string | undefined;
}

export function isServerValidation(): boolean {
  return getValidationMode() === 'server' && Boolean(getApiUrl());
}

export function getProgressSecret(): string {
  return import.meta.env.VITE_PROGRESS_SECRET as string;
}

export function getLevelEncodeKey(): string {
  return import.meta.env.VITE_LEVEL_ENCODE_KEY as string;
}
