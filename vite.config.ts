import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
  define: {
    __VALIDATION_MODE__: JSON.stringify(process.env.VITE_VALIDATION_MODE ?? 'client'),
  },
});
