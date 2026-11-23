import { Menu, type BrowserWindow, type MenuItemConstructorOptions } from 'electron';
import { IPC } from '@shared/ipc';

const isMac = process.platform === 'darwin';

/**
 * The menu is deliberately small: everything a site needs is in the window.
 * @param window
 */
export function buildMenu( window: BrowserWindow ): void {
	const send = ( command: 'new-site' | 'settings' | 'about' ) => {
		if ( ! window.isDestroyed() ) {
			window.webContents.send( IPC.menuCommand, command );
		}
	};

	const template: MenuItemConstructorOptions[] = [
		...( isMac
			? [
					{
						label: 'siterun',
						submenu: [
							{ label: 'About siterun', click: () => send( 'about' ) },
							{ label: 'Settings…', accelerator: 'Cmd+,', click: () => send( 'settings' ) },
							{ type: 'separator' as const },
							{ role: 'quit' as const }
						]
					}
			  ]
			: [] ),
		{
			label: 'File',
			submenu: [
				{ label: 'New Site', accelerator: 'CmdOrCtrl+N', click: () => send( 'new-site' ) },
				...( isMac
					? [ { type: 'separator' as const }, { role: 'close' as const } ]
					: [
							{ label: 'Settings…', accelerator: 'Ctrl+,', click: () => send( 'settings' ) },
							{ type: 'separator' as const },
							{ label: 'About siterun', click: () => send( 'about' ) },
							{ type: 'separator' as const },
							{ role: 'quit' as const }
					  ] )
			]
		}
	];

	Menu.setApplicationMenu( Menu.buildFromTemplate( template ) );
}
