import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { app } from 'electron';
import type {
	DatabaseBackup,
	DatabaseDropRequest,
	DatabaseQueryResult,
	DatabaseRows,
	DatabaseRowsOptions,
	DatabaseSummary,
	SqlMode
} from '@shared/types';
import { findSite } from './sites';

interface Pending {
	resolve: ( value: unknown ) => void;
	reject: ( error: Error ) => void;
	timer: NodeJS.Timeout;
}

interface WorkerReply {
	id: number;
	result?: unknown;
	error?: string;
}

function slug( value: string ): string {
	return value
		.toLowerCase()
		.replace( /[^a-z0-9]+/g, '-' )
		.replace( /^-+|-+$/g, '' )
		.slice( 0, 48 ) || 'site';
}

async function defineValue( sitePath: string, name: string ): Promise< string | null > {
	try {
		const config = await fs.readFile( path.join( sitePath, 'wp-config.php' ), 'utf8' );
		const match = config.match(
			new RegExp( `define\\(\\s*['"]${ name }['"]\\s*,\\s*['"]([^'"]+)['"]\\s*\\)` )
		);
		return match?.[ 1 ] ?? null;
	} catch {
		return null;
	}
}

/**
 * Where this site's SQLite file lives. Studio's default is
 * `wp-content/database/.ht.sqlite`; the config can move it, and older sites
 * may have picked a different file name in the same folder.
 */
export async function resolveDatabasePath( sitePath: string ): Promise< string > {
	const dbDir = await defineValue( sitePath, 'DB_DIR' );
	const dbFile = await defineValue( sitePath, 'DB_FILE' );
	const directory = dbDir
		? path.resolve( sitePath, dbDir )
		: path.join( sitePath, 'wp-content', 'database' );
	const preferred = path.join( directory, dbFile ?? '.ht.sqlite' );

	try {
		await fs.access( preferred );
		return preferred;
	} catch {
		// Fall through to a single SQLite file in the same directory.
	}

	try {
		const entries = await fs.readdir( directory, { withFileTypes: true } );
		const candidate = entries
			.filter(
				( entry ) =>
					entry.isFile() &&
					entry.name.endsWith( '.sqlite' ) &&
					! entry.name.endsWith( '-wal' ) &&
					! entry.name.endsWith( '-shm' )
			)
			.map( ( entry ) => path.join( directory, entry.name ) )[ 0 ];
		if ( candidate ) {
			return candidate;
		}
	} catch {
		// Report the useful message below.
	}

	throw new Error(
		'This site does not have a SQLite database yet. Start it once so WordPress can create one.'
	);
}

export class DatabaseService {
	private worker: Worker | null = null;
	private pending = new Map< number, Pending >();
	private nextId = 0;
	private activeSiteId: string | null = null;
	private armedSiteId: string | null = null;
	private readonly backups = path.join( app.getPath( 'userData' ), 'backups' );

	private ensureWorker(): Worker {
		if ( this.worker ) {
			return this.worker;
		}

		const worker = new Worker( path.join( __dirname, 'database-worker.js' ) );
		worker.on( 'message', ( message: WorkerReply ) => {
			const request = this.pending.get( message.id );
			if ( ! request ) {
				return;
			}
			clearTimeout( request.timer );
			this.pending.delete( message.id );
			if ( message.error ) {
				request.reject( new Error( message.error ) );
			} else {
				request.resolve( message.result );
			}
		} );
		const fail = ( error: Error ) => {
			for ( const request of this.pending.values() ) {
				clearTimeout( request.timer );
				request.reject( error );
			}
			this.pending.clear();
			this.worker = null;
			this.activeSiteId = null;
			this.armedSiteId = null;
		};
		worker.on( 'error', ( error ) => fail( error ) );
		worker.on( 'exit', ( code ) => {
			if ( code !== 0 ) {
				fail( new Error( `The database process stopped (code ${ code }).` ) );
			}
		} );

		this.worker = worker;
		return worker;
	}

	private request< T >( method: string, params: Record< string, unknown >, timeoutMs = 60_000 ): Promise< T > {
		const worker = this.ensureWorker();
		const id = ++this.nextId;
		return new Promise< T >( ( resolve, reject ) => {
			const timer = setTimeout( () => {
				this.pending.delete( id );
				reject( new Error( 'The database took too long to answer.' ) );
			}, timeoutMs );
			this.pending.set( id, {
				resolve: ( value ) => resolve( value as T ),
				reject,
				timer
			} );
			worker.postMessage( { id, method, params } );
		} );
	}

	async open( siteId: string ): Promise< DatabaseSummary > {
		const site = await findSite( siteId );
		const dbPath = await resolveDatabasePath( site.path );

		if ( this.activeSiteId && this.activeSiteId !== site.id ) {
			await this.close( this.activeSiteId );
		}

		const summary = await this.request< DatabaseSummary >( 'open', {
			siteId: site.id,
			dbPath
		} );
		this.activeSiteId = site.id;
		this.armedSiteId = null;
		return summary;
	}

	private requireActive( siteId: string ): void {
		if ( this.activeSiteId !== siteId ) {
			throw new Error( 'Open the database first.' );
		}
	}

	async rows( siteId: string, table: string, options: DatabaseRowsOptions ): Promise< DatabaseRows > {
		this.requireActive( siteId );
		return this.request< DatabaseRows >( 'rows', {
			table,
			offset: options.offset,
			limit: options.limit,
			search: options.search ?? '',
			orderBy: options.orderBy ?? null,
			direction: options.direction ?? 'asc'
		} );
	}

	async refresh( siteId: string ): Promise< DatabaseSummary > {
		this.requireActive( siteId );
		return this.request< DatabaseSummary >( 'summary', {} );
	}

	private async backupPath( siteName: string ): Promise< string > {
		await fs.mkdir( this.backups, { recursive: true } );
		const stamp = new Date().toISOString().replace( /[:.]/g, '-' );
		return path.join(
			this.backups,
			`${ slug( siteName ) }-${ stamp }-${ randomUUID().slice( 0, 8 ) }.sqlite`
		);
	}

	async backup( siteId: string ): Promise< DatabaseBackup > {
		const site = await findSite( siteId );
		this.requireActive( site.id );
		return this.request< DatabaseBackup >( 'backup', {
			destination: await this.backupPath( site.name )
		} );
	}

	async enableWrite( siteId: string ): Promise< DatabaseBackup > {
		const site = await findSite( siteId );
		this.requireActive( site.id );
		if ( site.running ) {
			throw new Error( 'Stop the site before changing its database.' );
		}
		const backup = await this.backup( site.id );
		await this.request( 'arm', {} );
		this.armedSiteId = site.id;
		return backup;
	}

	async disableWrite( siteId: string ): Promise< void > {
		this.requireActive( siteId );
		await this.request( 'disarm', {} );
		if ( this.armedSiteId === siteId ) {
			this.armedSiteId = null;
		}
	}

	async query( siteId: string, sql: string, mode: SqlMode ): Promise< DatabaseQueryResult > {
		this.requireActive( siteId );
		if ( mode === 'write' ) {
			if ( this.armedSiteId !== siteId ) {
				throw new Error( 'Turn on write mode first.' );
			}
			const site = await findSite( siteId );
			if ( site.running ) {
				throw new Error( 'Stop the site before changing its database.' );
			}
		}
		return this.request< DatabaseQueryResult >( 'query', {
			sql,
			write: mode === 'write'
		} );
	}

	async export( siteId: string, destination: string ): Promise< string > {
		if ( ! path.isAbsolute( destination ) || destination.includes( '\0' ) ) {
			throw new Error( 'Choose where the copy should go.' );
		}
		const site = await findSite( siteId );
		this.requireActive( site.id );
		const temporary = path.join(
			app.getPath( 'temp' ),
			`siterun-db-${ randomUUID() }.sqlite`
		);
		try {
			await this.request( 'backup', { destination: temporary } );
			await fs.copyFile( temporary, destination );
		} finally {
			await fs.rm( temporary, { force: true } );
		}
		return destination;
	}

	async drop( request: DatabaseDropRequest ): Promise< void > {
		const site = await findSite( request.siteId );
		this.requireActive( site.id );
		if ( this.armedSiteId !== site.id ) {
			throw new Error( 'Turn on write mode first.' );
		}
		if ( site.running ) {
			throw new Error( 'Stop the site before changing its database.' );
		}
		if ( request.confirmation !== request.table ) {
			throw new Error( 'Type the table name exactly to confirm.' );
		}
		await this.request( 'drop', { table: request.table } );
	}

	async close( siteId: string ): Promise< void > {
		if ( this.activeSiteId !== siteId ) {
			return;
		}
		await this.request( 'close', {} ).catch( () => undefined );
		this.activeSiteId = null;
		this.armedSiteId = null;
	}

	dispose(): void {
		this.worker?.terminate();
		this.worker = null;
		this.activeSiteId = null;
		this.armedSiteId = null;
		for ( const request of this.pending.values() ) {
			clearTimeout( request.timer );
			request.reject( new Error( 'The app is closing.' ) );
		}
		this.pending.clear();
	}
}
