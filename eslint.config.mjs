import root from '@munaxa/config-eslint/root.js';

/**
 * Root ESLint flat config. A fast, non-type-checked safety net for root-level sweeps
 * (notably the pre-commit lint-staged pass). `apps/web` defines its own stricter,
 * type-aware config, which takes precedence under `turbo lint`.
 */
export default [
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/.turbo/**',
      '**/*.config.{js,mjs,cjs,ts}',
      '**/*.d.ts',
    ],
  },
  ...root,
];
