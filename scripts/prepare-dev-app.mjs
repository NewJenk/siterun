// In development Electron runs from its own bundle, so macOS reads that
// bundle's name for the application menu and the dock. Rename that copy to the
// product name before launch. Packaged builds already carry the right name.

import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

if ( process.platform !== 'darwin' ) {
	process.exit( 0 );
}

const require = createRequire( import.meta.url );
const executable = require( 'electron' );
const appBundle = path.resolve( executable, '../../..' );
const plist = path.join( appBundle, 'Contents', 'Info.plist' );
const name = 'siterun';
const bundleId = 'app.siterun.dev';
const projectRoot = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );

if ( ! existsSync( plist ) ) {
	process.exit( 0 );
}

function read( key ) {
	try {
		return execFileSync( '/usr/libexec/PlistBuddy', [ '-c', `Print :${ key }`, plist ], {
			encoding: 'utf8'
		} ).trim();
	} catch {
		return '';
	}
}

for ( const [ key, value ] of [
	[ 'CFBundleName', name ],
	[ 'CFBundleDisplayName', name ],
	[ 'CFBundleIdentifier', bundleId ]
] ) {
	if ( read( key ) === value ) {
		continue;
	}
	try {
		execFileSync( '/usr/libexec/PlistBuddy', [ '-c', `Set :${ key } ${ value }`, plist ], {
			stdio: 'ignore'
		} );
	} catch {
		// A read-only Electron install still runs; it just keeps Electron's name.
	}
}

// The Dock and app switcher read the bundle icon before the app can set one,
// so replace the development bundle's icon as well.
const sourceIcon = path.join( projectRoot, 'build', 'icon.icns' );
const bundleIcon = path.join( appBundle, 'Contents', 'Resources', 'electron.icns' );
if ( existsSync( sourceIcon ) && existsSync( bundleIcon ) ) {
	try {
		copyFileSync( sourceIcon, bundleIcon );
	} catch {
		// A read-only Electron install keeps its own icon.
	}
}

// Cmd+Tab reads LaunchServices' cached app identity, not the runtime Dock
// icon. Re-register the bundle after changing its name, id and icon.
try {
	execFileSync(
		'/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister',
		[ '-f', appBundle ],
		{ stdio: 'ignore' }
	);
} catch {
	// If LaunchServices cannot be refreshed, the app still runs.
}
