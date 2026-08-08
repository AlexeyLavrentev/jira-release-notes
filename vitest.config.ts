import { defineConfig } from 'vitest/config';

/**
 * Vitest config (CONTEXT.md D-04): node env for server/shared, jsdom for client.
 * Tests are co-located with source (*.test.ts / *.test.tsx).
 */
export default defineConfig({
  test: {
    globals: true,
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    environmentMatchGlobs: [
      ['client/**', 'jsdom'],
      ['**/*.tsx', 'jsdom'],
    ],
    setupFiles: ['client/src/test-setup.ts'],
  },
});
