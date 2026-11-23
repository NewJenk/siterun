import { promises as fs } from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

const LOG_MAX_BYTES = 2 * 1024 * 1024;

export type LogLevel = 'info' | 'warn' | 'error';

let writeChain: Promise< void > = Promise.resolve();

async function append( level: LogLevel, scope: string, message: string ): Promise< void > {
	const directory = path.join( app.getPath( 'userData' ), 'logs' );
	const file = path.join( directory, 'main.log' );
	const line = `${ new Date().toISOString() } ${ level.toUpperCase() } [${ scope }] ${ message }\n`;

	try {
		await fs.mkdir( directory, { recursive: true } );
		const stat = await fs.stat( file ).catch( () => null );
		if ( stat && stat.size > LOG_MAX_BYTES ) {
			await fs.rename( file, `${ file }.1` ).catch( () => undefined );
		}
		await fs.appendFile( file, line, { mode: 0o600 } );
	} catch {
		// A log that cannot be written must never take the app with it.
	}
}

export function log( level: LogLevel, scope: string, message: string ): void {
	if ( level === 'error' ) {
		console.error( `[${ scope }] ${ message }` );
	} else if ( level === 'warn' ) {
		console.warn( `[${ scope }] ${ message }` );
	} else {
		console.log( `[${ scope }] ${ message }` );
	}

	writeChain = writeChain.then( () => append( level, scope, message ) );
}
