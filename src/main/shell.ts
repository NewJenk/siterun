import { spawn } from 'node:child_process';
import { shell } from 'electron';

/**
 * Opens a folder in the platform's file manager.
 * @param folder
 */
export async function openFolder( folder: string ): Promise< void > {
	const error = await shell.openPath( folder );
	if ( error ) {
		throw new Error( error );
	}
}

/**
 * Opens a terminal in the site's folder. There is no portable API for this, so
 * each platform gets the command its own terminal understands; if that fails
 * the folder is opened instead, which is still useful and never an error the
 * user has to understand.
 */
function terminalCommand( folder: string ): { file: string; args: string[] } {
	if ( process.platform === 'darwin' ) {
		return { file: 'open', args: [ '-a', 'Terminal', folder ] };
	}
	if ( process.platform === 'win32' ) {
		return {
			file: 'cmd.exe',
			args: [ '/c', 'start', '', 'cmd.exe', '/K', `cd /d "${ folder }"` ]
		};
	}
	return { file: 'x-terminal-emulator', args: [ '-e', `cd "${ folder }" && exec $SHELL` ] };
}

export async function openTerminal( folder: string ): Promise< void > {
	const command = terminalCommand( folder );

	await new Promise< void >( ( resolve, reject ) => {
		const child = spawn( command.file, command.args, {
			detached: true,
			stdio: 'ignore',
			windowsHide: true
		} );
		child.once( 'error', reject );
		child.once( 'spawn', () => {
			child.unref();
			resolve();
		} );
	} ).catch( () => openFolder( folder ) );
}
