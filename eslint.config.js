import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'public',
      'tests/e2e/report',
      'tests/e2e/results',
      'tools',
      'scripts',
      '.claude',   // bundled skill/plugin scripts — not our code
      '.github',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  // 'essential' = bug-prevention only (no formatting/style rules — we don't use Prettier).
  ...pluginVue.configs['flat/essential'],

  // Parse <script lang="ts"> blocks in .vue files with the TS parser.
  // no-undef is off here: TS/vue-tsc handles undefined references and type-only
  // names (e.g. EventListener) that the core rule can't see.
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
    },
    rules: { 'no-undef': 'off' },
  },

  // `any` is tolerated (common in tests/HTTP plumbing) but flagged, not blocking.
  // Allow `_`-prefixed identifiers to be intentionally unused (params, catch vars).
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },

  // Browser globals for app code; node globals for config/build files.
  {
    files: ['src/**/*.{ts,vue,js}'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['*.config.{js,ts}', 'env.d.ts'],
    languageOptions: { globals: { ...globals.node } },
  },

  // Playwright/Vitest specs run in Node but also touch browser globals.
  {
    files: ['tests/**/*.ts'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },

  // src/three/ is plain JS (the Three.js engine). Keep it lint-clean but
  // don't impose TS-flavored rules that don't fit hand-written JS.
  {
    files: ['src/three/**/*.js'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
);
