import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { app, BrowserWindow, nativeTheme } from 'electron';
import { pinToOwnPage } from './security';

// The design system paints the page; this colour only fills the window for
// the moment before the first paint. It follows the system scheme because
// the window does until the preferences have been read.
function windowBackground(): string {
	return nativeTheme.shouldUseDarkColors ? '#1e1e1e' : '#fcfcfc';
}

export function createWindow(): BrowserWindow {
	const window = new BrowserWindow( {
		width: 1180,
		height: 780,
		minWidth: 920,
		minHeight: 600,
		show: false,
		backgroundColor: windowBackground(),
		title: 'siterun',
		icon: path.join( app.getAppPath(), 'build', 'icon.png' ),
		webPreferences: {
			preload: path.join( __dirname, '../preload/index.js' ),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
			spellcheck: false,
			webSecurity: true,
			allowRunningInsecureContent: false,
			devTools: process.env.NODE_ENV !== 'production'
		}
	} );

	const indexPath = path.join( __dirname, '../renderer/index.html' );
	const appUrl = pathToFileURL( indexPath ).href;
	pinToOwnPage( window.webContents, appUrl );

	// The Edit menu is gone, so keep the standard text shortcuts working.
	window.webContents.on( 'before-input-event', ( event, input ) => {
		if ( input.type !== 'keyDown' || input.alt ) {
			return;
		}
		const modifier = process.platform === 'darwin' ? input.meta : input.control;
		if ( ! modifier ) {
			return;
		}

		const key = input.key.toLowerCase();
		if ( input.shift && key === 'z' ) {
			event.preventDefault();
			window.webContents.redo();
			return;
		}
		if ( input.shift ) {
			return;
		}

		const actions: Record< string, () => void > = {
			a: () => window.webContents.selectAll(),
			c: () => window.webContents.copy(),
			v: () => window.webContents.paste(),
			x: () => window.webContents.cut(),
			z: () => window.webContents.undo()
		};
		const action = actions[ key ];
		if ( action ) {
			event.preventDefault();
			action();
		}
	} );

	window.once( 'ready-to-show', () => window.show() );
	void window.loadFile( indexPath );

	return window;
}
