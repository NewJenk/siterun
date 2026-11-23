import { promises as fs } from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import type { Preferences, ThemePreference } from '@shared/types';

const THEMES: ThemePreference[] = [ 'system', 'light', 'dark' ];
const SITE_DIRECTORY_NAME = 'siterun';

function defaults(): Preferences {
	return {
		theme: 'system',
		checkForUpdates: true,
		defaultSiteDirectory: path.join( app.getPath( 'home' ), SITE_DIRECTORY_NAME ),
		lastSiteId: null
	};
}

function isRecord( value: unknown ): value is Record< string, unknown > {
	return typeof value === 'object' && value !== null && ! Array.isArray( value );
}

/**
 * Whatever is on disk, kept only where it still makes sense.
 * @param value
 */
export function normalizePreferences( value: unknown ): Preferences {
	const base = defaults();
	if ( ! isRecord( value ) ) {
		return base;
	}

	const theme = value.theme;
	const defaultSiteDirectory = value.defaultSiteDirectory;
	const lastSiteId = value.lastSiteId;
	// Earlier builds defaulted to a folder named after the old product. Treat
	// that value as unset so the current default takes over.
	const previousDefault = path.join( app.getPath( 'home' ), 'Studio' );
	const chosenSiteDirectory =
		defaultSiteDirectory === previousDefault ? undefined : defaultSiteDirectory;

	return {
		theme: THEMES.includes( theme as ThemePreference ) ? ( theme as ThemePreference ) : base.theme,
		checkForUpdates:
			typeof value.checkForUpdates === 'boolean' ? value.checkForUpdates : base.checkForUpdates,
		defaultSiteDirectory:
			typeof chosenSiteDirectory === 'string' &&
			path.isAbsolute( chosenSiteDirectory ) &&
			! chosenSiteDirectory.includes( '\0' )
				? chosenSiteDirectory
				: base.defaultSiteDirectory,
		lastSiteId: typeof lastSiteId === 'string' && lastSiteId ? lastSiteId : null
	};
}

export class PreferencesStore {
	private current: Preferences | null = null;
	private writes: Promise< void > = Promise.resolve();
	private readonly listeners = new Set< ( preferences: Preferences ) => void >();
	private readonly file = path.join( app.getPath( 'userData' ), 'preferences.json' );

	async get(): Promise< Preferences > {
		if ( ! this.current ) {
			await this.load();
		}
		return this.current as Preferences;
	}

	private async load(): Promise< void > {
		try {
			const raw = await fs.readFile( this.file, 'utf8' );
			this.current = normalizePreferences( JSON.parse( raw ) );
		} catch {
			this.current = defaults();
		}
	}

	async set( patch: Partial< Preferences > ): Promise< Preferences > {
		const before = await this.get();
		const next = normalizePreferences( { ...before, ...patch } );
		this.current = next;

		// Writes are chained so two quick changes cannot interleave their
		// temporary files and leave the store half written.
		this.writes = this.writes.then( () => this.write( next ) );
		await this.writes;

		for ( const listener of this.listeners ) {
			listener( next );
		}
		return next;
	}

	private async write( preferences: Preferences ): Promise< void > {
		await fs.mkdir( path.dirname( this.file ), { recursive: true } );
		const temporary = `${ this.file }.${ process.pid }.tmp`;
		await fs.writeFile( temporary, `${ JSON.stringify( preferences, null, '\t' ) }\n`, {
			mode: 0o600
		} );
		await fs.rename( temporary, this.file );
	}

	onChange( listener: ( preferences: Preferences ) => void ): () => void {
		this.listeners.add( listener );
		return () => this.listeners.delete( listener );
	}
}
