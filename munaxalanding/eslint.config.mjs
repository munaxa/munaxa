import next from '@munaxa/config-eslint/next.js';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * Munaxa Landing Page ESLint (flat config). Mirrors the Admin Portal setup so the
 * landing page follows the same lint rules and design-token guardrails.
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
    // Design-system guardrail: no hardcoded hex colors — use token classes (text-coral, bg-card,
    // border-border, …). Tokens live in packages/config-tailwind/preset.ts + globals.css.
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
    ignores: [
      '.next/**',
      'node_modules/**',
      'next-env.d.ts',
      'cloudflare-env.d.ts',
      '.open-next/**',
      '.wrangler/**',
      '*.config.*',
    ],
  },
];
