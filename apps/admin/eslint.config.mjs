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
    // Design-system guardrail: no hardcoded hex colors in app source — use the token classes
    // (text-coral, bg-card, border-border, …). Tokens live in packages/config-tailwind/preset.ts
    // + apps/admin/src/app/globals.css. See docs/design-system/README.md.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Literal[value=/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![0-9a-fA-F])/]',
          message:
            'No hardcoded hex colors — use design-system token classes (e.g. text-coral, bg-card, border-border). Tokens: packages/config-tailwind/preset.ts + globals.css.',
        },
        {
          selector:
            'TemplateElement[value.raw=/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![0-9a-fA-F])/]',
          message:
            'No hardcoded hex colors — use design-system token classes (e.g. text-coral, bg-card, border-border). Tokens: packages/config-tailwind/preset.ts + globals.css.',
        },
      ],
    },
  },
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', '*.config.*', 'sentry.*.config.ts'],
  },
];
