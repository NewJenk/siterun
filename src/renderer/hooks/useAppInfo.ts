import { useCallback, useEffect, useState } from 'react';
import type { AppInfo } from '@shared/types';

export function useAppInfo() {
	const [ info, setInfo ] = useState< AppInfo | null >( null );
	const [ error, setError ] = useState< string | null >( null );

	const refresh = useCallback( async () => {
		try {
			setInfo( await window.studio.getAppInfo() );
			setError( null );
		} catch ( failure ) {
			setError( failure instanceof Error ? failure.message : String( failure ) );
		}
	}, [] );

	useEffect( () => {
		void refresh();
	}, [ refresh ] );

	return { info, error, refresh };
}
