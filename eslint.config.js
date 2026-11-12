import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import ts from 'typescript-eslint'
import globals from 'globals'
export default [
  { ignores: ['dist/**', 'demo-dist/**', 'coverage/**', 'playwright-report/**', 'test-results/**', 'node_modules/**'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...vue.configs['flat/essential'],
  { files: ['**/*.{js,ts,vue}'], languageOptions: { globals: { ...globals.browser, ...globals.node }, parserOptions: { parser: ts.parser, extraFileExtensions: ['.vue'] } }, rules: { '@typescript-eslint/no-unused-expressions': 'off', '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }], 'vue/multi-word-component-names': 'off' } },
]