import base from '@axa/config-eslint/base.js';

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
    // Design-system guardrail: components, patterns and the structural token scales must never
    // hardcode a hex color. Use token-driven classes (bg-primary, text-foreground, border-border,
    // …) whose values come from the active theme. The `themes/` layer is the one place where raw
    // brand hexes are allowed — that is precisely what a theme is.
    files: ['components/**/*.{ts,tsx}', 'patterns/**/*.{ts,tsx}', 'tokens/**/*.ts', 'lib/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Literal[value=/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![0-9a-fA-F])/]',
          message:
            'No hardcoded hex colors outside themes/ — use token-driven classes (bg-primary, text-foreground, …).',
        },
        {
          selector:
            'TemplateElement[value.raw=/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![0-9a-fA-F])/]',
          message:
            'No hardcoded hex colors outside themes/ — use token-driven classes (bg-primary, text-foreground, …).',
        },
      ],
    },
  },
];
