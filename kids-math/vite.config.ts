import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { target: 'es2020', assetsInlineLimit: 0 },
  test: { environment: 'jsdom', include: ['tests/**/*.test.ts'] },
} as any);
