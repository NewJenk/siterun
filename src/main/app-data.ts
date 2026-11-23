import { promises as fs } from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { log } from './log';

// Folders earlier builds used. The capitalised Siterun folder is only reachable
// on a case-sensitive filesystem; macOS and Windows resolve it to this one.
const PREVIOUS_APP_NAMES = [ 'Siterun', 'Studio Local' ];

// The app's own data. Electron's caches are left behind; they are rebuilt.
const MOVED_ENTRIES = [ 'preferences.json', 'engine', 'backups', 'logs' ];

async function exists( candidate: string ): Promise< boolean > {
	try {
		await fs.access( candidate );
		return true;
	} catch {
		return false;
	}
}

/**
 * Moves the app's data from its previous data folder to the one Electron gives
 * this build. The folders are siblings, so a rename is usually enough; a copy
 * covers the case where they are on different volumes. Entries that already
 * exist in the new folder win, so a partial move is safe to repeat.
 */
export async function migrateAppData(): Promise< void > {
	const target = app.getPath( 'userData' );
	await fs.mkdir( target, { recursive: true } );
	let moved = false;

	for ( const name of PREVIOUS_APP_NAMES ) {
		const previous = path.join( app.getPath( 'appData' ), name );
		if ( path.resolve( previous ) === path.resolve( target ) ) {
			continue;
		}
		if (
			process.platform !== 'linux' &&
			previous.toLowerCase() === target.toLowerCase()
		) {
			continue;
		}
		if ( ! ( await exists( previous ) ) ) {
			continue;
		}

		for ( const entry of MOVED_ENTRIES ) {
			const source = path.join( previous, entry );
			const destination = path.join( target, entry );
			if ( ! ( await exists( source ) ) || ( await exists( destination ) ) ) {
				continue;
			}

			try {
				await fs.rename( source, destination );
				moved = true;
			} catch {
				try {
					await fs.cp( source, destination, {
						recursive: true,
						force: false,
						errorOnExist: false
					} );
					moved = true;
				} catch ( error ) {
					log( 'warn', 'app', `Could not move ${ entry } from ${ previous }: ${ String( error ) }` );
				}
			}
		}
	}

	if ( moved ) {
		log( 'info', 'app', `App data is now in ${ target }.` );
	}
}
