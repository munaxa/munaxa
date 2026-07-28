import next from '@axa/config-eslint/next.js';
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
    // Munaxa Design System governance guardrails (mechanical enforcement of GOVERNANCE.md):
    // app source must use design-system token classes — never hardcoded hex colors nor raw
    // Tailwind palette colors. Tokens: @axa/design-system/tokens (css/theme.oklch.css) + globals.css,
    // sourced from munaxadesignsystem/. See /GOVERNANCE.md.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Literal[value=/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![0-9a-fA-F])/]',
          message:
            'No hardcoded hex colors — use design-system token classes (e.g. text-coral, bg-card, border-border). Tokens: @axa/design-system/tokens (css/theme.oklch.css) + globals.css.',
        },
        {
          selector:
            'TemplateElement[value.raw=/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![0-9a-fA-F])/]',
          message:
            'No hardcoded hex colors — use design-system token classes (e.g. text-coral, bg-card, border-border). Tokens: @axa/design-system/tokens (css/theme.oklch.css) + globals.css.',
        },
        {
          selector:
            'Literal[value=/\\b(?:bg|text|border|ring|divide|from|via|to|fill|stroke|outline|accent|caret|decoration)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950)\\b/]',
          message:
            'No raw Tailwind palette colors — use design-system token/semantic classes (bg-primary, text-muted-foreground, bg-success, text-warning, …). Tokens: @axa/design-system/tokens (css/theme.oklch.css) + globals.css.',
        },
        {
          selector:
            'TemplateElement[value.raw=/\\b(?:bg|text|border|ring|divide|from|via|to|fill|stroke|outline|accent|caret|decoration)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950)\\b/]',
          message:
            'No raw Tailwind palette colors — use design-system token/semantic classes (bg-primary, text-muted-foreground, bg-success, text-warning, …). Tokens: @axa/design-system/tokens (css/theme.oklch.css) + globals.css.',
        },
      ],
    },
  },
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts', '*.config.*', 'sentry.*.config.ts'],
  },
];
