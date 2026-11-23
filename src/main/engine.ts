import { promises as fs } from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { log } from './log';

/**
 * Where the site engine keeps its runtime: the CLI's config, PHP binaries,
 * WordPress versions, daemon logs and email. Keeping it inside the app's own
 * data folder means the app does not write to a shared ~/.studio install.
 */
export function engineDirectory(): string {
	return process.env.STUDIO_CONFIG_DIR ?? path.join( app.getPath( 'userData' ), 'engine' );
}

async function exists( candidate: string ): Promise< boolean > {
	try {
		await fs.access( candidate );
		return true;
	} catch {
		return false;
	}
}

// Runtime data worth carrying over from a pre-existing Studio install. Logs,
// AI sessions, caches and previews are deliberately not copied. The config is
// last, so an interrupted copy does not look complete on the next launch.
const LEGACY_ENTRIES = [
	'php-bin',
	'server-files',
	'mu-plugins',
	'email',
	'certificates',
	'config.json'
];

/**
 * One-time move of an existing Studio installation's engine data into this
 * app's folder. A fresh machine has nothing to copy, and an explicit
 * STUDIO_CONFIG_DIR is left alone.
 */
export async function migrateEngineData(): Promise< void > {
	if ( process.env.STUDIO_CONFIG_DIR ) {
		return;
	}

	const target = engineDirectory();
	if ( await exists( path.join( target, 'config.json' ) ) ) {
		return;
	}

	const legacy = path.join( app.getPath( 'home' ), '.studio' );
	if ( ! ( await exists( path.join( legacy, 'config.json' ) ) ) ) {
		await fs.mkdir( target, { recursive: true } );
		return;
	}

	await fs.mkdir( target, { recursive: true } );
	for ( const entry of LEGACY_ENTRIES ) {
		const source = path.join( legacy, entry );
		if ( ! ( await exists( source ) ) ) {
			continue;
		}
		try {
			await fs.cp( source, path.join( target, entry ), {
				recursive: true,
				force: false,
				errorOnExist: false
			} );
		} catch ( error ) {
			log( 'warn', 'engine', `Could not copy ${ entry } from ${ legacy }: ${ String( error ) }` );
		}
	}

	log( 'info', 'engine', `Engine data is now in ${ target }.` );
}
