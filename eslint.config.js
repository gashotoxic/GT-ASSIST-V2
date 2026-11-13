import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'prefer-const': 'off',
      'no-case-declarations': 'off',
    },
  },
  {
    // ValidationResult narrowing contract (services/AGENTS.md): the failure
    // branch must be narrowed with `ok === false` — with strictNullChecks off,
    // `!x.ok` does not narrow the discriminated union, so any later direct
    // read of `.errors`/`.value` is a latent TS2339. Name-scoped to the
    // ValidationResult variable names used in services/ so legitimate
    // `!response.ok` / `!res.ok` fetch checks stay untouched; extend the
    // selector list when a new ValidationResult variable is introduced.
    files: ['services/**/*.ts'],
    rules: {
      'no-restricted-syntax': ['error',
        {
          selector: "UnaryExpression[operator='!'] > MemberExpression[property.name='ok'][object.name='validated']",
          message: "Narrow ValidationResult with 'validated.ok === false', never '!validated.ok' — '!ok' does not narrow the union with strictNullChecks off (services/AGENTS.md).",
        },
        {
          selector: "UnaryExpression[operator='!'] > MemberExpression[property.name='ok'][object.name='validatedEmbedding']",
          message: "Narrow ValidationResult with 'validatedEmbedding.ok === false', never '!validatedEmbedding.ok' (services/AGENTS.md).",
        },
        {
          selector: "UnaryExpression[operator='!'] > MemberExpression[property.name='ok'][object.name='validatedRows']",
          message: "Narrow ValidationResult with 'validatedRows.ok === false', never '!validatedRows.ok' (services/AGENTS.md).",
        },
        {
          selector: "UnaryExpression[operator='!'] > MemberExpression[property.name='ok'][object.name='check']",
          message: "Narrow ValidationResult with 'check.ok === false', never '!check.ok' (services/AGENTS.md).",
        },
      ],
    },
  },
];
