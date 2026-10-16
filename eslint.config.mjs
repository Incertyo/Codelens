import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import architecture from './scripts/eslint-architecture.mjs';
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { architecture },
    rules: {
      'architecture/boundaries': 'error',
      'architecture/limit-owner': 'error',
    },
  },
  globalIgnores([
    '.next/**',
    'public/pyodide/**',
    'public/monaco/**',
    'public/language-detection/**',
    'test-results/**',
    'playwright-report/**',
    'next-env.d.ts',
    'artifacts/**',
  ]),
  {
    files: ['public/*.js'],
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off',
    },
    languageOptions: {
      globals: {
        self: 'readonly',
        importScripts: 'readonly',
        fetch: 'readonly',
        XMLHttpRequest: 'readonly',
        loadPyodide: 'readonly',
      },
    },
  },
]);
