import { useCallback, useEffect, useRef, useState } from 'react';
import type { Site } from '@shared/types';
import { messageFrom } from '../lib/errors';

/**
 * The site list is the CLI's, not the window's. It is read when the window
 * asks, when main says something changed, and on a slow poll for changes made
 * in a terminal. The poll is slow because each read starts the CLI's daemon.
 */
export function useSites() {
	const [ sites, setSites ] = useState< Site[] >( [] );
	const [ loading, setLoading ] = useState( true );
	const [ error, setError ] = useState< string | null >( null );
	const latest = useRef( 0 );

	const refresh = useCallback( async () => {
		const request = ++latest.current;
		try {
			const next = await window.studio.getSites();
			if ( request === latest.current ) {
				setSites( next );
				setError( null );
			}
		} catch ( failure ) {
			if ( request === latest.current ) {
				setError( messageFrom( failure ) );
			}
		} finally {
			if ( request === latest.current ) {
				setLoading( false );
			}
		}
	}, [] );

	useEffect( () => {
		void refresh();
		const off = window.studio.onSitesChanged( () => void refresh() );
		const timer = window.setInterval( () => {
			if ( document.visibilityState === 'visible' ) {
				void refresh();
			}
		}, 15_000 );

		return () => {
			off();
			window.clearInterval( timer );
		};
	}, [ refresh ] );

	return { sites, loading, error, refresh };
}
