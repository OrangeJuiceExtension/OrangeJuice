// noinspection JSCheckFunctionSignatures

import eslint from '@eslint/js';
import pluginRouter from '@tanstack/eslint-plugin-router';
import { globalIgnores } from 'eslint/config';
import configPrettier from 'eslint-config-prettier';
import pluginImport from 'eslint-plugin-import';
import pluginPromise from 'eslint-plugin-promise';
import pluginReact from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import pluginUnusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import tseslint from 'typescript-eslint';

import autoImports from './.wxt/eslint-auto-imports.mjs';

export default tseslint.config(
	autoImports,
	globalIgnores(['node_modules/', '.output/', '.wxt/', '*.d.ts', 'types/', '**/*.d.ts']),
	eslint.configs.recommended,
	tseslint.configs.strictTypeChecked,
	tseslint.configs.stylisticTypeChecked,
	reactHooks.configs['recommended-latest'],
	...pluginRouter.configs['flat/recommended'],
	reactRefresh.configs.vite,
	{
		files: ['**/*.{ts,tsx,js}'],
		languageOptions: {
			ecmaVersion: 'latest',
			globals: globals.browser,
			parserOptions: {
				projectService: {
					allowDefaultProject: ['*.js', '*.json'],
				},
				extraFileExtensions: ['.json'],
				tsconfigRootDir: import.meta.dirname,
			},
		},
		plugins: {
			'@typescript-eslint': tseslint.plugin,
			'unused-imports': pluginUnusedImports,
			import: pluginImport,
			promise: pluginPromise,
			react: pluginReact,
			router: pluginRouter,
		},
		rules: {
			// React hooks rules
			'react-hooks/rules-of-hooks': 'error',
			'react-hooks/exhaustive-deps': 'error',

			// React rules
			'react/react-in-jsx-scope': 'off',
			'react/jsx-uses-react': 'off',
			'react/prop-types': 'off',
			'react/jsx-no-undef': 'error',
			'react/jsx-no-duplicate-props': ['error', { ignoreCase: true }],
			'react/no-unknown-property': 'error',
			'react/self-closing-comp': 'warn',
			'react/jsx-curly-brace-presence': ['warn', { props: 'never', children: 'never' }],
			'react/jsx-no-constructed-context-values': 'warn',

			// TypeScript rules
			'@typescript-eslint/no-empty-function': 'off',
			'@typescript-eslint/await-thenable': 'warn',
			'@typescript-eslint/no-floating-promises': 'warn',
			'@typescript-eslint/require-await': 'warn',

			// Unused imports rules
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': 'off',
			'unused-imports/no-unused-imports': 'error',
			'unused-imports/no-unused-vars': [
				'warn',
				{
					vars: 'all',
					varsIgnorePattern: '^_',
					args: 'after-used',
					argsIgnorePattern: '^_',
				},
			],

			// Import rules
			'import/order': [
				'error',
				{
					groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
					'newlines-between': 'always',
					alphabetize: { order: 'asc', caseInsensitive: true },
				},
			],
			'no-duplicate-imports': 'warn',
		},
		settings: {
			react: {
				version: 'detect',
				runtime: 'automatic', // For React 17+ JSX transform
			},
		},
	},
	// Apply prettier config last to override formatting rules
	configPrettier,
);
