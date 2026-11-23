import path from 'node:path';
import { app, BrowserWindow, nativeImage, nativeTheme, session } from 'electron';
import { migrateAppData } from './app-data';
import { killCliChildren, runCli } from './cli';
import { migrateEngineData } from './engine';
import { registerIpc } from './ipc';
import { log } from './log';
import { buildMenu } from './menu';
import { PreferencesStore } from './preferences';
import { applySessionSecurity } from './security';
import { createWindow } from './window';

// Electron uses its own bundle name until this is set, which is what shows in
// the menu bar and the dock while running `electron .`.
app.setName( 'siterun' );

if ( ! app.requestSingleInstanceLock() ) {
	app.quit();
}

const preferences = new PreferencesStore();

let window: BrowserWindow | null = null;
let unregisterIpc: ( () => void ) | null = null;
let quitting = false;

function openWindow(): BrowserWindow {
	const created = createWindow();
	buildMenu( created );
	unregisterIpc = registerIpc( { window: created, preferences } );

	created.on( 'closed', () => {
		unregisterIpc?.();
		unregisterIpc = null;
		if ( window === created ) {
			window = null;
		}
	} );

	return created;
}

app.on( 'second-instance', () => {
	if ( ! window ) {
		window = openWindow();
		return;
	}
	if ( window.isMinimized() ) {
		window.restore();
	}
	window.show();
	window.focus();
} );

app.whenReady().then( async () => {
	applySessionSecurity( session.defaultSession );

	if ( process.platform === 'darwin' && ! app.isPackaged ) {
		const iconPath = path.join( app.getAppPath(), 'build', 'icon.png' );
		const icon = nativeImage.createFromPath( iconPath );
		if ( icon.isEmpty() ) {
			log( 'warn', 'app', `Dock icon missing at ${ iconPath }` );
		} else {
			app.dock?.setIcon( icon );
			log( 'info', 'app', 'Dock icon set from the development build.' );
		}
	}

	await migrateAppData().catch( ( error ) => {
		log( 'warn', 'app', `Could not move the app's data: ${ String( error ) }` );
	} );

	await migrateEngineData().catch( ( error ) => {
		log( 'warn', 'engine', `Could not prepare the engine folder: ${ String( error ) }` );
	} );

	const stored = await preferences.get();
	nativeTheme.themeSource = stored.theme;

	app.setAboutPanelOptions( {
		applicationName: 'siterun',
		applicationVersion: app.getVersion(),
		copyright: 'GPL-2.0-or-later'
	} );
	if ( process.platform === 'win32' ) {
		app.setAppUserModelId( 'app.siterun.desktop' );
	}

	window = openWindow();

	app.on( 'activate', () => {
		if ( ! window ) {
			window = openWindow();
		}
	} );
} );

app.on( 'window-all-closed', () => {
	// On macOS an app with no windows is still the app; the dock icon brings
	// one back. Everywhere else, closing the window closes the app.
	if ( process.platform !== 'darwin' ) {
		app.quit();
	}
} );

app.on( 'web-contents-created', ( _event, contents ) => {
	contents.on( 'will-attach-webview', ( event ) => event.preventDefault() );
} );

app.on( 'before-quit', ( event ) => {
	if ( quitting ) {
		return;
	}
	quitting = true;
	event.preventDefault();

	// Asking the CLI to stop everything releases the ports and leaves no
	// orphan PHP processes behind. It is bounded: quitting is not a place to
	// hang because a server is wedged.
	const shutdown = async () => {
		await Promise.race( [
			runCli( [ 'stop', '--all' ] ).catch( ( error ) => {
				log( 'warn', 'quit', `Could not stop sites: ${ String( error ) }` );
			} ),
			new Promise< void >( ( resolve ) => setTimeout( resolve, 4000 ) )
		] );

		// The process manager is spawned by the engine, not by this app, so it
		// needs asking too. Without this it can outlive the window.
		await runCli( [ '_daemon-stop' ] ).catch( ( error ) => {
			log( 'warn', 'quit', `Could not stop the process manager: ${ String( error ) }` );
		} );

		killCliChildren();
		unregisterIpc?.();
		app.quit();
	};

	void shutdown();
} );

process.on( 'uncaughtException', ( error ) => {
	log( 'error', 'main', error.stack ?? error.message );
} );

process.on( 'unhandledRejection', ( reason ) => {
	log( 'error', 'main', reason instanceof Error ? reason.stack ?? reason.message : String( reason ) );
} );
