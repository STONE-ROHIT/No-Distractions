import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Flat ESLint config for a Node/Express backend — same base as the client
// (typescript-eslint + eslint-config-prettier) minus the React-specific
// plugins, so both packages share one linting philosophy.
export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.node,
    },
    rules: {
      // Express identifies error-handling middleware by function arity (4
      // params), so an intentionally-unused `next` is sometimes required.
      // Leading underscore is the shared convention with tsconfig's
      // noUnusedParameters (see middleware/errorHandler.ts).
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  eslintConfigPrettier,
);
