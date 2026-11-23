import type { Site } from '@shared/types';

export type SiteStatus = 'running' | 'stopped' | 'busy';

export function siteStatus( site: Pick< Site, 'running' | 'operation' > ): SiteStatus {
	if ( site.operation ) {
		return 'busy';
	}
	return site.running ? 'running' : 'stopped';
}

const SEPARATORS = /[\\/]/;

/**
 * A path as a person reads it: `~/siterun/acme` rather than the whole home
 * directory. Separators are kept as they came, so a Windows path stays one.
 * @param home
 * @param sitePath
 */
export function formatPath( home: string | null, sitePath: string ): string {
	if ( ! home ) {
		return sitePath;
	}
	const separator = sitePath.includes( '\\' ) ? '\\' : '/';
	const root = home.endsWith( separator ) ? home : `${ home }${ separator }`;
	if ( sitePath === home ) {
		return '~';
	}
	return sitePath.startsWith( root ) ? `~${ separator }${ sitePath.slice( root.length ) }` : sitePath;
}

/**
 * The name a backup's file suggests, without the archive's double extension.
 * @param filePath
 */
export function nameFromBackup( filePath: string ): string {
	const file = filePath.split( SEPARATORS ).pop() ?? '';
	const base = file.replace( /\.(tar\.gz|zip|sql|gz)$/i, '' ).replace( /[-_]+/g, ' ' ).trim();
	return base || 'Imported site';
}

export function siteSummary( site: Site ): string {
	const parts = [ `WordPress ${ site.wpVersion ?? 'unknown' }`, `PHP ${ site.phpVersion }` ];
	if ( site.environmentType ) {
		parts.push( site.environmentType );
	}
	return parts.join( ' · ' );
}
