// The renderer is painted with the design system's tokens. These rules are
// what keeps a hand-written colour out of the stylesheet; ESLint's
// no-hardcoded-colors does the same for values written in components.

const COLOR_FUNCTIONS = '/^(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|device-cmyk)$/i';

export default {
	plugins: [
		'@wordpress/theme/stylelint-plugins/no-unknown-ds-tokens',
		'@wordpress/theme/stylelint-plugins/no-setting-wpds-custom-properties',
		'@wordpress/theme/stylelint-plugins/no-token-fallback-values'
	],
	rules: {
		'plugin-wpds/no-unknown-ds-tokens': true,
		'plugin-wpds/no-setting-wpds-custom-properties': true,
		'plugin-wpds/no-token-fallback-values': true,
		'color-no-hex': true,
		'color-named': 'never',
		'function-disallowed-list': [ COLOR_FUNCTIONS ]
	}
};
