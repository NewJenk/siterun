import { useCallback, useEffect, useState } from 'react';
import type { Preferences } from '@shared/types';

export function usePreferences() {
	const [ preferences, setPreferences ] = useState< Preferences | null >( null );

	useEffect( () => {
		let alive = true;
		void window.studio
			.getPreferences()
			.then( ( next ) => {
				if ( alive ) {
					setPreferences( next );
				}
			} )
			.catch( () => undefined );
		const off = window.studio.onPreferencesChanged( setPreferences );
		return () => {
			alive = false;
			off();
		};
	}, [] );

	const update = useCallback( async ( patch: Partial< Preferences > ) => {
		const next = await window.studio.setPreferences( patch );
		setPreferences( next );
		return next;
	}, [] );

	return { preferences, update };
}
