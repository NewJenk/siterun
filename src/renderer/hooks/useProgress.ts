import { useEffect, useRef, useState } from 'react';
import type { OperationProgress } from '@shared/types';

/**
 * The operation in flight, if any. Operations are serialised by the CLI, so
 * one at a time is the truth rather than a simplification.
 * @param onFinished
 */
export function useProgress( onFinished?: ( progress: OperationProgress ) => void ) {
	const [ current, setCurrent ] = useState< OperationProgress | null >( null );
	const finished = useRef( onFinished );

	useEffect( () => {
		finished.current = onFinished;
	}, [ onFinished ] );

	useEffect( () => {
		const off = window.studio.onProgress( ( progress ) => {
			setCurrent( progress.done ? null : progress );
			if ( progress.done ) {
				finished.current?.( progress );
			}
		} );
		return off;
	}, [] );

	return current;
}
