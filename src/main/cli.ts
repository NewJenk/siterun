import { fork, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import type { CliCandidate } from '@shared/types';
import { engineDirectory } from './engine';
import { log } from './log';

/** A command the CLI reported as failed. Its message is safe to show. */
export class CliError extends Error {
	readonly code: string | null;
	readonly expected: boolean;
	readonly stdout: string;
	readonly stderr: string;

	constructor( options: {
		message: string;
		code?: string | null;
		expected?: boolean;
		stdout?: string;
		stderr?: string;
	} ) {
		super( options.message );
		this.name = 'CliError';
		this.code = options.code ?? null;
		this.expected = options.expected ?? false;
		this.stdout = options.stdout ?? '';
		this.stderr = options.stderr ?? '';
	}
}

/** The site engine has not been installed or built next to the app. */
export class CliUnavailableError extends Error {
	readonly searched: CliCandidate[];

	constructor( searched: CliCandidate[] ) {
		super(
			'The site engine is missing. Build it with `npm run engine:build`, or set SITERUN_CLI_PATH.'
		);
		this.name = 'CliUnavailableError';
		this.searched = searched;
	}
}

interface ProgressMessage {
	action?: string | null;
	status?: string;
	message?: string;
}

export interface CliProgress {
	action: string | null;
	status: 'inprogress' | 'success' | 'warning' | 'fail';
	message: string;
}

export interface RunCliOptions {
	onProgress?: ( progress: CliProgress ) => void;
	/** Structured events some commands (import, export) publish over IPC. */
	onEvent?: ( message: Record< string, unknown > ) => void;
	timeoutMs?: number;
	/** Resolve with stdout when the command reports no structured result. */
	textResult?: boolean;
}

const MAX_CAPTURED_OUTPUT = 4 * 1024 * 1024;

function candidatePaths(): string[] {
	const env = process.env.SITERUN_CLI_PATH;
	const appPath = app.getAppPath();

	return [
		...( env ? [ path.resolve( env ) ] : [] ),
		path.join( process.resourcesPath, 'cli', 'main.mjs' ),
		path.join( appPath, 'engine', 'dist', 'cli', 'main.mjs' ),
		path.join( appPath, 'vendor', 'cli', 'main.mjs' )
	];
}

let resolved: { path: string | null; searched: CliCandidate[] } | null = null;

/** Children still running, so quitting does not leave one holding a site lock. */
const liveChildren = new Set< ChildProcess >();

export function killCliChildren(): void {
	for ( const child of liveChildren ) {
		child.kill( 'SIGTERM' );
	}
	const remaining = [ ...liveChildren ];
	setTimeout( () => {
		for ( const child of remaining ) {
			if ( child.exitCode === null && child.signalCode === null ) {
				child.kill( 'SIGKILL' );
			}
		}
	}, 1500 ).unref?.();
}

export function resolveCli(): { path: string | null; searched: CliCandidate[] } {
	if ( resolved ) {
		return resolved;
	}
	const searched = candidatePaths().map( ( candidate ) => ( {
		path: candidate,
		exists: existsSync( candidate )
	} ) );
	resolved = {
		path: searched.find( ( candidate ) => candidate.exists )?.path ?? null,
		searched
	};
	return resolved;
}

/** Set after a build so the running app does not need a restart to find it. */
export function forgetResolvedCli(): void {
	resolved = null;
}

function isRecord( value: unknown ): value is Record< string, unknown > {
	return typeof value === 'object' && value !== null;
}

function progressFrom( message: Record< string, unknown > ): CliProgress | null {
	const candidate = message as ProgressMessage;
	if ( typeof candidate.message !== 'string' ) {
		return null;
	}
	const status = candidate.status;
	if (
		status !== 'inprogress' &&
		status !== 'success' &&
		status !== 'warning' &&
		status !== 'fail'
	) {
		return null;
	}
	return {
		action: typeof candidate.action === 'string' ? candidate.action : null,
		status,
		message: candidate.message
	};
}

/**
 * Runs one CLI command and resolves with the value it reports over IPC.
 *
 * The CLI is forked rather than spawned so the logger's structured messages
 * survive; stdout is only a fallback for commands that print a payload.
 * @param args
 * @param options
 */
export async function runCli< T >( args: string[], options: RunCliOptions = {} ): Promise< T > {
	const { path: cliPath, searched } = resolveCli();
	if ( ! cliPath ) {
		log( 'error', 'cli', `No site engine found. Searched: ${ searched.map( ( c ) => c.path ).join( ', ' ) }` );
		throw new CliUnavailableError( searched );
	}

	return new Promise< T >( ( resolve, reject ) => {
		let child: ChildProcess;
		try {
			child = fork( cliPath, args, {
				stdio: [ 'ignore', 'pipe', 'pipe', 'ipc' ],
				execArgv: [],
				windowsHide: true,
				env: {
					...process.env,
					// Electron's binary is the Node the CLI runs on. This flag
					// makes it behave as Node for the child only.
					ELECTRON_RUN_AS_NODE: '1',
					// Keep the engine's config, PHP, logs and email inside this
					// app's data folder rather than a shared ~/.studio.
					STUDIO_CONFIG_DIR: engineDirectory(),
					// The process manager has its own home; without this it would
					// still put sockets and logs in ~/.studio/daemon.
					STUDIO_PROCESS_MANAGER_HOME: path.join( engineDirectory(), 'daemon' )
				}
			} );
			log( 'info', 'cli', `Started ${ cliPath } ${ args.join( ' ' ) }` );
			liveChildren.add( child );
			child.once( 'close', () => liveChildren.delete( child ) );
		} catch ( error ) {
			log( 'error', 'cli', `Could not start the engine: ${ String( error ) }` );
			reject( error instanceof Error ? error : new Error( String( error ) ) );
			return;
		}

		let stdout = '';
		let stderr = '';
		let result: unknown;
		let hasResult = false;
		let reported: CliError | null = null;
		let settled = false;
		let timedOut = false;

		const finish = ( error: CliError | null ) => {
			if ( settled ) {
				return;
			}
			settled = true;
			clearTimeout( timer );
			if ( error ) {
				reject( error );
			} else if ( hasResult ) {
				resolve( result as T );
			} else if ( options.textResult ) {
				resolve( stdout as T );
			} else {
				resolve( undefined as T );
			}
		};

		const timer = options.timeoutMs
			? setTimeout( () => {
					timedOut = true;
					child.kill( 'SIGKILL' );
			  }, options.timeoutMs )
			: undefined;

		child.stdout?.on( 'data', ( chunk: Buffer ) => {
			if ( stdout.length < MAX_CAPTURED_OUTPUT ) {
				stdout += chunk.toString();
			}
		} );
		child.stderr?.on( 'data', ( chunk: Buffer ) => {
			if ( stderr.length < MAX_CAPTURED_OUTPUT ) {
				stderr += chunk.toString();
			}
		} );

		child.on( 'message', ( raw: unknown ) => {
			if ( ! isRecord( raw ) ) {
				return;
			}

			const progress = progressFrom( raw );
			if ( progress ) {
				if ( progress.status === 'fail' ) {
					reported = new CliError( {
						message: progress.message,
						code: typeof raw.code === 'string' ? raw.code : null,
						expected: raw.expected === true,
						stdout,
						stderr
					} );
				}
				options.onProgress?.( progress );
				return;
			}

			if ( raw.action === 'result' ) {
				result = raw.value;
				hasResult = true;
				return;
			}

			if ( raw.action === 'done' ) {
				// The CLI says its work is finished, and may stay alive a moment
				// longer for best-effort events. Waiting for the process to
				// exit would leave the window in a working state meanwhile.
				finish( null );
				child.kill();
				return;
			}

			if ( typeof raw.event !== 'undefined' || raw.action === 'keyValuePair' ) {
				options.onEvent?.( raw );
			}
		} );

		child.on( 'error', ( error ) => {
			log( 'error', 'cli', `Engine error: ${ error.message }` );
			finish(
				new CliError( {
					message: `The site engine could not start: ${ error.message }`,
					stdout,
					stderr
				} )
			);
		} );

		child.on( 'close', ( code, signal ) => {
			log(
				code === 0 ? 'info' : 'warn',
				'cli',
				`Engine finished (code ${ code ?? 'none' }, signal ${ signal ?? 'none' })${
					stderr.trim() ? `: ${ stderr.trim().slice( 0, 500 ) }` : ''
				}`
			);
			if ( timedOut ) {
				finish( new CliError( { message: 'The site engine took too long to answer.', stdout, stderr } ) );
				return;
			}

			if ( reported && ( code !== 0 || ! hasResult ) ) {
				finish( reported );
				return;
			}

			if ( code === 0 ) {
				finish( null );
				return;
			}

			const detail = reported?.message || stderr.trim() || stdout.trim();
			finish(
				new CliError( {
					message: detail || `The site engine exited with code ${ code ?? 'unknown' }.`,
					stdout,
					stderr
				} )
			);
		} );
	} );
}
