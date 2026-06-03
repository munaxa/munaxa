import nest from '@munaxa/config-eslint/nest.js';

export default [
  ...nest,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    ignores: ['dist/**', 'coverage/**', 'eslint.config.mjs'],
  },
];
