import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import importPlugin from 'eslint-plugin-import'

export default tseslint.config(
{
  ignores: [
    'node_modules',
    'dist',
    'build',
    'coverage',
    'storybook-static',
    'build-storybook.log',
  ],
},
{
extends: [
// JS 기본 + TS 기본 + React 추천(flat)
js.configs.recommended,
...tseslint.configs.recommended,
// React 전용 flat config (JSX 룰들)
react.configs.flat.recommended,
// 새 JSX transform(React 17+) 쓰면 jsx-runtime도 같이
react.configs.flat['jsx-runtime'],

// 가장 마지막에 prettier (ESLint 룰과 충돌나는 것들 OFF)
eslintPluginPrettierRecommended,
],
files: ['**/*.{ts,tsx}'],
languageOptions: {
ecmaVersion: 2020,
globals: globals.browser,
},
plugins: {
'react-hooks': reactHooks,
'react-refresh': reactRefresh,
'jsx-a11y': jsxA11y,
import: importPlugin,
},
settings: { react: { version: 'detect' } },
rules: {
// React Hooks 기본 룰
...reactHooks.configs.recommended.rules,
'react-hooks/exhaustive-deps': 'off',

// React Refresh (Vite/CRA Fast Refresh용)
'react-refresh/only-export-components': ['error', { allowConstantExport: true }],

'react/display-name': 'off',
'react/no-unescaped-entities': ['error', { forbid: ['>', '}'] }],
'react/jsx-curly-brace-presence': 'error',

'@typescript-eslint/no-explicit-any': 'off',
'@typescript-eslint/no-unsafe-function-type': 'off',

curly: ['error', 'all'],
'no-case-declarations': 'error',
'no-restricted-syntax': [
'error',
{
selector: 'SwitchCase > :statement:not(BlockStatement)',
message: 'Switch cases must contain only a block statement.',
},
],

// 'jsx-a11y/alt-text': 'warn',
// 'jsx-a11y/anchor-is-valid': 'warn',

// 모듈 경로 잘못된 거 잡기
'import/order': [
'error',
{
groups: [
'builtin', // node 내장 모듈 (fs, path 등)
'external', // npm 패키지 (react, lodash 등)
'internal', // 절대경로 alias(@src/* 등), monorepo 패키지
'parent', // ../foo
'sibling', // ./foo
'index', // ./ 또는 파일명 없는 index
'object', // import * as Foo from 'foo'
'type', // import type { Foo } from 'bar'
],
pathGroups: [
{
pattern: 'react',
group: 'external',
position: 'before', // react를 external 맨 위로
},
{
pattern: '@front/**',
group: 'internal',
position: 'after', // 내부 패키지들
},
{
pattern: '@src/**',
group: 'internal',
position: 'after',
},
],
pathGroupsExcludedImportTypes: ['react'],
'newlines-between': 'always', // 그룹 사이에 한 줄 띄우기
alphabetize: {
order: 'asc',
caseInsensitive: true,
},
},
],
},
},
{
files: ['**/*.test.{ts,tsx,js,jsx}', '**/__tests__/**/*.{ts,tsx,js,jsx}'],
rules: {
'import/order': 'off',
},
},
)
