import next from '@munaxa/config-eslint/next.js';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * Admin Portal ESLint (flat config). Uses the shared Munaxa base plus the official
 * Next.js and React Hooks rules. Self-contained so `eslint .` and editors behave
 * identically (no reliance on the legacy `next lint` config patching).
 */
export default [
  ...next,
  {
    plugins: {
      '@next/next': nextPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      ...reactHooks.configs.recommended.rules,
    },
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', '*.config.*', 'sentry.*.config.ts'],
  },
];
