function parts( version: string ): number[] {
	return version
		.replace( /^v/, '' )
		.split( /[.-]/ )
		.slice( 0, 3 )
		.map( ( part ) => Number.parseInt( part, 10 ) || 0 );
}

/**
 * Whether `candidate` is newer than `current`, comparing major.minor.patch.
 * @param candidate
 * @param current
 */
export function isNewer( candidate: string, current: string ): boolean {
	const a = parts( candidate );
	const b = parts( current );
	for ( let index = 0; index < 3; index += 1 ) {
		const left = a[ index ] ?? 0;
		const right = b[ index ] ?? 0;
		if ( left !== right ) {
			return left > right;
		}
	}
	return false;
}
