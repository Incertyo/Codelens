import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
export default defineConfig([
  ...nextVitals,
  ...nextTs,
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
