import globals from 'globals';
import wordpress from '@wordpress/eslint-plugin';
import toolkit from './eslint-rules/index.cjs';

export default [
	{
		ignores: [
			'dist/',
			'node_modules/',
			'release/',
			'vendor/',
			'build/',
			'coverage/',
			'engine/dist/',
			'engine/php-bin/',
			'engine/wp-files/'
		]
	},

	...wordpress.configs.recommended,

	{
		languageOptions: {
			globals: globals.node
		},
		settings: {
			react: { version: 'detect' }
		},
		rules: {
			// The WordPress preset turns Prettier on when it is installed. This
			// repository does not use Prettier, so the rule is switched off
			// rather than left to depend on a transitive dependency.
			'prettier/prettier': 'off',
			curly: 'off',
			'import/no-extraneous-dependencies': 'off',
			'jsdoc/require-param-description': 'off',
			'jsdoc/require-returns-description': 'off',
			// Comments here explain intent in prose; a tag per argument would
			// repeat the signature and bury the reason the code exists.
			'jsdoc/require-param': 'off',
			'jsdoc/require-returns': 'off'
		}
	},

	{
		// The engine is Studio's CLI, kept close to upstream so its patches stay
		// portable. It prints progress to stdout rather than the console API,
		// and its strings are translated upstream, so those rules stay off here.
		files: [ 'engine/**/*.ts' ],
		rules: {
			'no-console': 'off',
			'@wordpress/i18n-translator-comments': 'off',
			'@wordpress/i18n-no-flanking-whitespace': 'off',
			'@wordpress/i18n-no-collapsible-whitespace': 'off',
			'@wordpress/valid-sprintf': 'off',
			'@wordpress/no-unused-vars-before-return': 'off',
			camelcase: 'off',
			'dot-notation': 'off',
			'@typescript-eslint/no-shadow': 'off',
			'@typescript-eslint/method-signature-style': 'off',
			'object-shorthand': 'off',
			'jsdoc/check-line-alignment': 'off',
			'jsdoc/check-tag-names': 'off',
			'no-else-return': 'off',
			'no-nested-ternary': 'off',
			'no-useless-return': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', caughtErrors: 'none', varsIgnorePattern: '^_' }
			]
		}
	},

	{
		files: [ 'src/**/*.ts', 'src/**/*.tsx', 'tests/**/*.ts' ],
		languageOptions: {
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
				ecmaFeatures: { jsx: true }
			}
		},
		rules: {
			// A word the UI says that is not translated is a word someone
			// cannot read. The rule knows the WordPress i18n functions.
			'@wordpress/i18n-translator-comments': 'error',
			'@wordpress/i18n-no-variables': 'off',
			'@wordpress/i18n-text-domain': [ 'error', { allowedTextDomain: [ 'siterun' ] } ],

			// Timers, promises and event listeners are the source of the
			// leaks that make a desktop app feel slow after an hour.
			'no-restricted-syntax': [
				'error',
				{
					selector: 'CallExpression[callee.name="eval"]',
					message: 'eval executes remote code in a window that has a bridge to the main process.'
				},
				{
					selector: 'NewExpression[callee.name="Function"]',
					message: 'A dynamic Function is eval with a friendlier name.'
				}
			]
		}
	},

	{
		files: [ 'src/renderer/**/*.tsx' ],
		plugins: { toolkit },
		rules: {
			'react/react-in-jsx-scope': 'off',
			// The window follows the theme, and the theme is the design
			// system's tokens. A colour or a style written into a component
			// is one the theme cannot reach.
			'toolkit/no-hardcoded-colors': 'error',
			'toolkit/no-inline-styles': 'error',
			// The renderer never receives markup from anywhere else, so there
			// is no reason to opt into dangerouslySetInnerHTML.
			'react/no-danger': 'error',
			// A ref written during render can hold a value from a render that
			// was thrown away. Write it in an effect or a handler.
			'react-hooks/refs': 'error'
		}
	},

	{
		files: [ 'src/main/log.ts' ],
		rules: {
			// This file is the log sink; writing to the console is its job.
			'no-console': 'off'
		}
	},

	{
		files: [ 'scripts/**/*.mjs' ],
		languageOptions: {
			globals: globals.node
		},
		rules: {
			'no-console': 'off'
		}
	}
];
