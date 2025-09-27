// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Reduce noise from generated/output folders in the editor
    ignores: ['dist/*', 'node_modules/*', '.expo/*'],
  },
  {
    // Project-specific rule tweaks to keep the editor signal useful
    rules: {
      // Allow console statements during development
      'no-console': 'off',
      // Inline styles are idiomatic in React Native
      'react-native/no-inline-styles': 'off',
      // Allow using `any` when iterating quickly; tighten later if needed
      '@typescript-eslint/no-explicit-any': 'off',
      // Downgrade unused vars and ignore underscored placeholders
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      // Keep hooks deps helpful but non-blocking
      'react-hooks/exhaustive-deps': 'warn',
      // React 17+ / 19 automatic JSX runtime – no need to import React
      'react/react-in-jsx-scope': 'off',
    },
  },
]);
