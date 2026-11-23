/**
 * The design system builds the dark theme from this one seed. It lives here
 * rather than in a component so the only colour written by hand is a theme
 * seed, not a style.
 */
export const DARK_BACKGROUND = '#1e1e1e';

export function isDarkPreference( preference: 'system' | 'light' | 'dark', systemDark: boolean ) {
	return preference === 'dark' || ( preference === 'system' && systemDark );
}
