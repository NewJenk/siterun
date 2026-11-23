import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { VersionOption } from '@shared/types';

const VERSION_ENDPOINT = 'https://api.wordpress.org/core/version-check/1.7/';
const CACHE_MS = 6 * 60 * 60 * 1000;

let versions: { at: number; value: VersionOption[] } | null = null;

function versionLabel( version: string ): string {
	if ( version === 'latest' ) {
		return 'Latest';
	}
	if ( version === 'nightly' ) {
		return 'Nightly';
	}
	return version;
}

/**
 * The versions a new site can be made with. WordPress.org publishes the
 * current one; the fallback keeps the dialog usable offline.
 */
export async function getWordPressVersions(): Promise< VersionOption[] > {
	if ( versions && Date.now() - versions.at < CACHE_MS ) {
		return versions.value;
	}

	let published: string[] = [];
	try {
		const response = await fetch( VERSION_ENDPOINT, { signal: AbortSignal.timeout( 8000 ) } );
		if ( response.ok ) {
			const payload = ( await response.json() ) as {
				offers?: Array< { response?: string; version?: string } >;
			};
			published = ( payload.offers ?? [] )
				.map( ( offer ) => offer.version )
				.filter( ( version ): version is string => typeof version === 'string' )
				.filter( ( version ) => /^\d+\.\d+(\.\d+)?$/.test( version ) );
		}
	} catch {
		// Offline is not an error: the dialog still offers the defaults below.
	}

	const unique = [ ...new Set( published ) ]
		.sort( ( a, b ) => b.localeCompare( a, undefined, { numeric: true } ) )
		.slice( 0, 12 );

	const value: VersionOption[] = [
		{ value: 'latest', label: versionLabel( 'latest' ) },
		{ value: 'nightly', label: versionLabel( 'nightly' ) },
		...unique.map( ( version ) => ( { value: version, label: version } ) )
	];

	versions = { at: Date.now(), value };
	return value;
}

/**
 * WordPress's own version file, which is right even before the server runs.
 * @param sitePath
 */
export async function readWpVersion( sitePath: string ): Promise< string | null > {
	try {
		const contents = await fs.readFile( path.join( sitePath, 'wp-includes/version.php' ), 'utf8' );
		const match = contents.match( /\$wp_version\s*=\s*['"]([^'"]+)['"]/ );
		return match?.[ 1 ] ?? null;
	} catch {
		return null;
	}
}
