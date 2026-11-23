import { useEffect, useState, type ReactNode } from 'react';
import { ThemeProvider } from '@wordpress/theme';
import type { ThemePreference } from '@shared/types';
import { DARK_BACKGROUND, isDarkPreference } from '../lib/theme';

function useSystemDark(): boolean {
	const [ dark, setDark ] = useState(
		() => window.matchMedia( '(prefers-color-scheme: dark)' ).matches
	);

	useEffect( () => {
		const media = window.matchMedia( '(prefers-color-scheme: dark)' );
		const onChange = ( event: MediaQueryListEvent ) => setDark( event.matches );
		media.addEventListener( 'change', onChange );
		setDark( media.matches );
		return () => media.removeEventListener( 'change', onChange );
	}, [] );

	return dark;
}

/**
 * The design system's provider at the root of the window. In the light theme
 * it is given no seed, so the tokens stylesheet's values stand as they ship;
 * in the dark theme it is given the dark background and builds every colour
 * token from it, including for modals portalled outside this tree.
 * @param root0
 * @param root0.preference
 * @param root0.children
 */
export function AppTheme( {
	preference,
	children
}: {
	preference: ThemePreference;
	children: ReactNode;
} ) {
	const dark = isDarkPreference( preference, useSystemDark() );
	return (
		<ThemeProvider isRoot color={ dark ? { background: DARK_BACKGROUND } : undefined }>
			{ children }
		</ThemeProvider>
	);
}
