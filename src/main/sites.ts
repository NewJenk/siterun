import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type {
	CreateSiteParams,
	DeleteResult,
	ExportRequest,
	OperationProgress,
	Site,
	SiteSettingsPatch,
	WpCliResult
} from '@shared/types';
import { CliError, runCli, type CliProgress } from './cli';
import { readWpVersion } from './wordpress';

const PHP_VERSIONS = [ '8.5', '8.4', '8.3', '8.2' ];
const WORDPRESS_VERSION = /^(latest|nightly|\d+\.\d+(\.\d+)?([.-][\w.-]+)?)$/;
const DOMAIN = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.local$/i;

interface CliSite {
	id?: unknown;
	name?: unknown;
	path?: unknown;
	port?: unknown;
	url?: unknown;
	running?: unknown;
	phpVersion?: unknown;
	customDomain?: unknown;
	enableHttps?: unknown;
	adminUsername?: unknown;
	adminPassword?: unknown;
	adminEmail?: unknown;
	isWpAutoUpdating?: unknown;
	enableXdebug?: unknown;
	enableDebugLog?: unknown;
	enableDebugDisplay?: unknown;
	enableScriptDebug?: unknown;
	environmentType?: unknown;
	autoStart?: unknown;
	sortOrder?: unknown;
	operation?: unknown;
}

export type ProgressSink = ( progress: OperationProgress ) => void;

function text( value: unknown, fallback = '' ): string {
	return typeof value === 'string' ? value : fallback;
}

function bool( value: unknown, fallback = false ): boolean {
	return typeof value === 'boolean' ? value : fallback;
}

function decodeAdminPassword( value: unknown ): string | null {
	if ( typeof value !== 'string' || ! value ) {
		return null;
	}
	try {
		const decoded = Buffer.from( value, 'base64' ).toString( 'utf8' );
		return decoded || null;
	} catch {
		return value;
	}
}

function operationName( value: unknown ): string | null {
	if ( typeof value === 'string' ) {
		return value;
	}
	if ( value && typeof value === 'object' && 'type' in value ) {
		const type = ( value as { type?: unknown } ).type;
		return typeof type === 'string' ? type : null;
	}
	return null;
}

function normalize( raw: CliSite, wpVersion: string | null ): Site {
	const id = text( raw.id );
	const name = text( raw.name );
	const sitePath = text( raw.path );
	const url = text( raw.url );
	if ( ! id || ! name || ! sitePath || ! url ) {
		throw new CliError( { message: 'A site came back from the engine without an id, name, path or URL.' } );
	}

	return {
		id,
		name,
		path: sitePath,
		url,
		port: typeof raw.port === 'number' ? raw.port : 0,
		running: bool( raw.running ),
		phpVersion: text( raw.phpVersion, '8.4' ),
		wpVersion,
		customDomain: text( raw.customDomain ) || null,
		enableHttps: bool( raw.enableHttps ),
		adminUsername: text( raw.adminUsername, 'admin' ),
		adminPassword: decodeAdminPassword( raw.adminPassword ),
		adminEmail: text( raw.adminEmail ) || null,
		isWpAutoUpdating: bool( raw.isWpAutoUpdating, true ),
		enableXdebug: bool( raw.enableXdebug ),
		enableDebugLog: bool( raw.enableDebugLog ),
		enableDebugDisplay: bool( raw.enableDebugDisplay ),
		enableScriptDebug: bool( raw.enableScriptDebug ),
		environmentType: text( raw.environmentType ) || null,
		autoStart: bool( raw.autoStart ),
		sortOrder: typeof raw.sortOrder === 'number' ? raw.sortOrder : 0,
		operation: operationName( raw.operation )
	};
}

export function isSafeAbsolutePath( value: string ): boolean {
	return (
		value.length > 0 &&
		value.length < 4096 &&
		! value.includes( '\0' ) &&
		path.isAbsolute( value ) &&
		path.normalize( value ) === value
	);
}

export function validateSiteName( value: string ): string {
	const name = value.trim();
	if ( name.length < 1 || name.length > 100 ) {
		throw new CliError( { message: 'Give the site a name between 1 and 100 characters.', expected: true } );
	}
	if ( /[\u0000-\u001f\u007f]/.test( name ) ) {
		throw new CliError( { message: 'A site name cannot contain control characters.', expected: true } );
	}
	return name;
}

export function validateDomain( value: string ): string {
	const domain = value.trim().toLowerCase();
	if ( ! DOMAIN.test( domain ) ) {
		throw new CliError( {
			message: 'Use a custom domain that ends with .local, such as mysite.local.',
			expected: true
		} );
	}
	return domain;
}

interface Reporter {
	onProgress: ( progress: CliProgress ) => void;
	/** Always called, so the window never stays in a working state. */
	finish: ( message?: string ) => void;
}

function progressReporter( label: string, siteId: string | null, sink?: ProgressSink ): Reporter {
	const id = randomUUID();
	const emit = ( status: OperationProgress[ 'status' ], message: string, done = false ) => {
		sink?.( { id, siteId, label, message, status, done } );
	};

	return {
		onProgress: ( progress ) => {
			let status: OperationProgress[ 'status' ] = progress.status as OperationProgress[ 'status' ];
			if ( progress.status === 'inprogress' ) {
				status = 'progress';
			} else if ( progress.status === 'fail' ) {
				status = 'error';
			}
			emit( status, progress.message, status === 'error' );
		},
		finish: ( message = '' ) => emit( 'success', message, true )
	};
}

/** Every site, with the WordPress version read from disk. */
export async function listSites(): Promise< Site[] > {
	const raw = await runCli< CliSite[] >( [ 'list', '--format', 'json' ], { timeoutMs: 60_000 } );
	const entries = Array.isArray( raw ) ? raw : [];
	return Promise.all(
		entries.map( async ( entry ) => {
			const sitePath = text( entry.path );
			return normalize( entry, sitePath ? await readWpVersion( sitePath ) : null );
		} )
	);
}

export async function findSite( siteId: string ): Promise< Site > {
	if ( typeof siteId !== 'string' || ! siteId ) {
		throw new CliError( { message: 'No site was named.', expected: true } );
	}
	const site = ( await listSites() ).find( ( candidate ) => candidate.id === siteId );
	if ( ! site ) {
		throw new CliError( {
			message: 'That site is no longer in the library. It may have been deleted.',
			expected: true
		} );
	}
	return site;
}

function versionArgs( params: CreateSiteParams ): string[] {
	const args: string[] = [];
	if ( params.wpVersion && WORDPRESS_VERSION.test( params.wpVersion ) ) {
		args.push( '--wp', params.wpVersion );
	}
	if ( params.phpVersion && PHP_VERSIONS.includes( params.phpVersion ) ) {
		args.push( '--php', params.phpVersion );
	}
	if ( params.customDomain ) {
		args.push( '--domain', validateDomain( params.customDomain ) );
	}
	if ( params.enableHttps ) {
		args.push( '--https' );
	}
	if ( params.adminEmail ) {
		args.push( '--admin-email', params.adminEmail.trim() );
	}
	if ( params.adminUsername ) {
		args.push( '--admin-username', params.adminUsername.trim() );
	}
	if ( params.adminPassword ) {
		args.push( '--admin-password', params.adminPassword );
	}
	return args;
}

export async function createSite( params: CreateSiteParams, sink?: ProgressSink ): Promise< Site > {
	const name = validateSiteName( params.name );
	if ( ! isSafeAbsolutePath( params.path ) ) {
		throw new CliError( {
			message: 'Choose an absolute folder for the new site, with no relative segments.',
			expected: true
		} );
	}

	const siteId = randomUUID();
	const reporter = progressReporter( 'Creating the site', siteId, sink );
	const isBackup = params.source.kind === 'backup';

	const args = [
		'create',
		'--path',
		params.path,
		'--id',
		siteId,
		'--name',
		name,
		'--skip-browser',
		'--skip-log-details',
		...versionArgs( params ),
		...( isBackup ? [ '--no-start' ] : [] )
	];

	if ( params.source.kind === 'blueprint-file' && params.source.filePath ) {
		if ( ! isSafeAbsolutePath( params.source.filePath ) ) {
			throw new CliError( { message: 'Choose a Blueprint file from disk.', expected: true } );
		}
		args.push( '--blueprint', params.source.filePath );
	}

	await runCli< CliSite >( args, { onProgress: reporter.onProgress } );

	if ( params.source.kind === 'backup' ) {
		const importReporter = progressReporter( 'Importing the backup', siteId, sink );
		try {
			await runCli( [ 'import', params.source.backupPath, '--path', params.path, '--start-server' ], {
				onProgress: importReporter.onProgress
			} );
		} catch ( error ) {
			const message = error instanceof Error ? error.message : String( error );
			throw new CliError( {
				message: `The site was created, but the backup could not be imported: ${ message}`
			} );
		} finally {
			importReporter.finish();
		}
	}

	const site = await findSite( siteId );
	reporter.finish( `${ site.name } is ready.` );
	return site;
}

export async function startSite( siteId: string, sink?: ProgressSink ): Promise< Site > {
	const site = await findSite( siteId );
	const reporter = progressReporter( 'Starting the site', site.id, sink );
	try {
		await runCli( [ 'start', '--path', site.path, '--skip-browser', '--skip-log-details' ], {
			onProgress: reporter.onProgress
		} );
	} finally {
		reporter.finish();
	}
	return findSite( site.id );
}

export async function stopSite( siteId: string, sink?: ProgressSink ): Promise< Site > {
	const site = await findSite( siteId );
	const reporter = progressReporter( 'Stopping the site', site.id, sink );
	try {
		await runCli( [ 'stop', '--path', site.path ], { onProgress: reporter.onProgress } );
	} finally {
		reporter.finish();
	}
	return findSite( site.id );
}

export async function deleteSite( siteId: string, deleteFiles: boolean ): Promise< DeleteResult > {
	const site = await findSite( siteId );
	const raw = await runCli< { warnings?: unknown } >( [
		'delete',
		site.id,
		'--format',
		'json',
		deleteFiles ? '--files' : '--no-files'
	] );
	const warnings = Array.isArray( raw?.warnings )
		? raw.warnings.filter( ( warning ): warning is string => typeof warning === 'string' )
		: [];
	return { warnings };
}

function settingsArgs( site: Site, patch: SiteSettingsPatch ): string[] {
	const args: string[] = [];
	if ( patch.name !== undefined && patch.name.trim() !== site.name ) {
		args.push( '--name', validateSiteName( patch.name ) );
	}
	if ( patch.phpVersion !== undefined && patch.phpVersion !== site.phpVersion ) {
		if ( ! PHP_VERSIONS.includes( patch.phpVersion ) ) {
			throw new CliError( { message: 'That PHP version is not bundled with this app.', expected: true } );
		}
		args.push( '--php', patch.phpVersion );
	}
	if (
		patch.wpVersion !== undefined &&
		patch.wpVersion !== site.wpVersion &&
		WORDPRESS_VERSION.test( patch.wpVersion )
	) {
		args.push( '--wp', patch.wpVersion );
	}
	if ( patch.customDomain !== undefined ) {
		const domain = patch.customDomain.trim();
		if ( domain !== ( site.customDomain ?? '' ) ) {
			args.push( '--domain', domain ? validateDomain( domain ) : '' );
		}
	}
	if ( patch.enableHttps !== undefined && patch.enableHttps !== site.enableHttps ) {
		args.push( patch.enableHttps ? '--https' : '--no-https' );
	}
	if ( patch.enableXdebug !== undefined && patch.enableXdebug !== site.enableXdebug ) {
		args.push( patch.enableXdebug ? '--xdebug' : '--no-xdebug' );
	}
	if ( patch.enableDebugLog !== undefined && patch.enableDebugLog !== site.enableDebugLog ) {
		args.push( patch.enableDebugLog ? '--debug-log' : '--no-debug-log' );
	}
	if (
		patch.enableDebugDisplay !== undefined &&
		patch.enableDebugDisplay !== site.enableDebugDisplay
	) {
		args.push( patch.enableDebugDisplay ? '--debug-display' : '--no-debug-display' );
	}
	if (
		patch.enableScriptDebug !== undefined &&
		patch.enableScriptDebug !== site.enableScriptDebug
	) {
		args.push( patch.enableScriptDebug ? '--script-debug' : '--no-script-debug' );
	}
	if ( patch.environmentType !== undefined && patch.environmentType !== site.environmentType ) {
		args.push( '--environment-type', patch.environmentType );
	}
	if ( patch.adminEmail !== undefined && patch.adminEmail !== site.adminEmail ) {
		args.push( '--admin-email', patch.adminEmail );
	}
	return args;
}

export async function updateSite(
	siteId: string,
	patch: SiteSettingsPatch,
	sink?: ProgressSink
): Promise< Site > {
	const site = await findSite( siteId );
	const args = settingsArgs( site, patch );
	if ( args.length === 0 ) {
		return site;
	}

	const reporter = progressReporter( 'Saving the settings', site.id, sink );
	try {
		await runCli( [ 'config', 'set', '--path', site.path, ...args ], {
			onProgress: reporter.onProgress
		} );
	} finally {
		reporter.finish();
	}
	return findSite( site.id );
}

export async function importSite(
	siteId: string,
	backupPath: string,
	sink?: ProgressSink
): Promise< Site > {
	const site = await findSite( siteId );
	if ( ! isSafeAbsolutePath( backupPath ) ) {
		throw new CliError( { message: 'Choose a backup file from disk.', expected: true } );
	}
	const reporter = progressReporter( 'Importing the backup', site.id, sink );
	try {
		await runCli( [ 'import', backupPath, '--path', site.path, '--start-server' ], {
			onProgress: reporter.onProgress
		} );
	} finally {
		reporter.finish();
	}
	return findSite( site.id );
}

export async function exportSite( request: ExportRequest, sink?: ProgressSink ): Promise< string > {
	const site = await findSite( request.siteId );
	if ( ! [ 'full', 'content', 'db' ].includes( request.mode ) ) {
		throw new CliError( { message: 'That export type is not supported.', expected: true } );
	}
	if ( ! isSafeAbsolutePath( request.destination ) ) {
		throw new CliError( { message: 'Choose where the export should go.', expected: true } );
	}
	const reporter = progressReporter( 'Exporting the site', site.id, sink );
	try {
		await runCli( [ 'export', request.destination, '--path', site.path, '--mode', request.mode ], {
			onProgress: reporter.onProgress
		} );
	} finally {
		reporter.finish();
	}
	return request.destination;
}

export async function runWpCli( siteId: string, args: string[] ): Promise< WpCliResult > {
	const site = await findSite( siteId );
	if ( ! Array.isArray( args ) || args.some( ( arg ) => typeof arg !== 'string' ) ) {
		throw new CliError( { message: 'WP-CLI arguments must be a list of strings.', expected: true } );
	}
	try {
		const stdout = await runCli< string >( [ 'wp', '--path', site.path, ...args ], {
			timeoutMs: 120_000,
			textResult: true
		} );
		return { exitCode: 0, stdout, stderr: '' };
	} catch ( error ) {
		if ( error instanceof CliError ) {
			return {
				exitCode: 1,
				stdout: error.stdout,
				stderr: error.stderr || error.message
			};
		}
		throw error;
	}
}
