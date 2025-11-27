import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettierPlugin from 'eslint-plugin-prettier';
import importPlugin from 'eslint-plugin-import';

export default [
  js.configs.recommended,
  {
    // Main source files - with TypeScript project
    files: ['src/**/*.ts'],
    ignores: ['**/*.test.ts', '**/*.spec.ts', '**/setup.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        node: true,
        console: true,
        process: true,
        Buffer: true,
        __dirname: true,
        __filename: true,
        setTimeout: true,
        clearTimeout: true,
        setInterval: true,
        clearInterval: true,
        crypto: true,
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      prettier: prettierPlugin,
      import: importPlugin,
    },
    rules: {
      ...typescript.configs['recommended'].rules,
      'prettier/prettier': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Allow console in CLI command files
    files: ['src/commands/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Test files - without TypeScript project (simpler config)
    files: ['**/*.test.ts', '**/*.spec.ts', '**/setup.ts', '**/__tests__/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        // Node.js globals
        console: true,
        process: true,
        setTimeout: true,
        __dirname: true,
        __filename: true,
        Buffer: true,
        // Jest globals
        describe: true,
        it: true,
        expect: true,
        beforeEach: true,
        afterEach: true,
        beforeAll: true,
        afterAll: true,
        jest: true,
        // Browser globals for e2e tests running in page context
        window: true,
        document: true,
        localStorage: true,
        sessionStorage: true,
        getComputedStyle: true,
        Element: true,
        HTMLElement: true,
        Event: true,
        MouseEvent: true,
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    ignores: [
      'dist/',
      'node_modules/',
      'coverage/',
      '*.config.js',
      '*.config.ts',
      'playwright.config.ts',
    ],
  },
];
