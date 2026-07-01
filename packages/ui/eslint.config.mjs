import base from '@munaxa/config-eslint/base.js';

export default [
  ...base,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    // Design-system guardrail: the canonical component library must never hardcode a hex color.
    // Use token-driven classes (bg-primary, text-foreground, border-border, …) whose values come
    // from @munaxa/design-tokens. (The token package itself is the one place hexes are allowed.)
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Literal[value=/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![0-9a-fA-F])/]',
          message:
            'No hardcoded hex colors in @munaxa/ui — use token-driven classes (bg-primary, text-foreground, …) from @munaxa/design-tokens.',
        },
        {
          selector:
            'TemplateElement[value.raw=/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![0-9a-fA-F])/]',
          message:
            'No hardcoded hex colors in @munaxa/ui — use token-driven classes (bg-primary, text-foreground, …) from @munaxa/design-tokens.',
        },
      ],
    },
  },
];
