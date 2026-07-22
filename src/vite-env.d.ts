/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VALIDATION_MODE: 'client' | 'server';
  readonly VITE_PROGRESS_SECRET: string;
  readonly VITE_LEVEL_ENCODE_KEY: string;
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
