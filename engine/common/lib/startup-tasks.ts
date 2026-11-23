import fs from 'node:fs';
import path from 'node:path';
import { hideDirectoryOnWindows, isDirectoryHiddenOnWindows } from './hide-dir-windows';
import { getConfigDirectory, getServerFilesPath } from './well-known-paths';

/**
 * Housekeeping on files earlier builds left behind, run by the engine when it starts. Each task
 * checks whether it has anything to do, so running them again is cheap. Config data is brought up
 * to date by the config store instead (`./config/store.ts`).
 */

export interface StartupTask {
	needsToRun: () => Promise< boolean >;
	run: () => Promise< void >;
}

// Windows hides a folder by its attribute, not a leading dot.
const hideConfigDirectoryOnWindows: StartupTask = {
	needsToRun: async () =>
		process.platform === 'win32' &&
		fs.existsSync( getConfigDirectory() ) &&
		! ( await isDirectoryHiddenOnWindows( getConfigDirectory() ) ),
	run: () => hideDirectoryOnWindows( getConfigDirectory() ),
};

const renameProcessManagerHome: StartupTask = {
	needsToRun: async () =>
		fs.existsSync( path.join( getConfigDirectory(), 'pm2' ) ) &&
		! fs.existsSync( path.join( getConfigDirectory(), 'daemon' ) ),
	run: async () => {
		try {
			await fs.promises.rename(
				path.join( getConfigDirectory(), 'pm2' ),
				path.join( getConfigDirectory(), 'daemon' )
			);
		} catch ( error ) {
			// Another Studio process renamed it first.
			if ( ! fs.existsSync( path.join( getConfigDirectory(), 'daemon' ) ) ) {
				throw error;
			}
		}
	},
};

// Server files the CLI now reads from its bundled `wp-files/` instead of a writable copy.
function getObsoleteServerFiles(): string[] {
	const serverFiles = getServerFilesPath();
	return [
		'sqlite-database-integration',
		'sqlite-command',
		'phpmyadmin',
		'wp-cli.phar',
		path.join( 'wordpress-versions', 'latest', 'available-site-translations.json' ),
		'language-packs',
		'language-packs.lock',
	].map( ( name ) => path.join( serverFiles, name ) );
}

const removeObsoleteServerFiles: StartupTask = {
	needsToRun: async () => getObsoleteServerFiles().some( ( file ) => fs.existsSync( file ) ),
	run: async () => {
		for ( const file of getObsoleteServerFiles() ) {
			await fs.promises.rm( file, { recursive: true, force: true } );
		}
	},
};

const STARTUP_TASKS = [
	hideConfigDirectoryOnWindows,
	renameProcessManagerHome,
	removeObsoleteServerFiles,
];

// Runs the shared tasks, then the app's own. Stops at the first one that fails.
export async function runStartupTasks( appTasks: StartupTask[] = [] ): Promise< void > {
	for ( const task of [ ...STARTUP_TASKS, ...appTasks ] ) {
		if ( await task.needsToRun() ) {
			await task.run();
		}
	}
}
