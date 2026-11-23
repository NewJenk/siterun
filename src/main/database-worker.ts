import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parentPort } from 'node:worker_threads';
import { DatabaseSync, backup } from 'node:sqlite';
import type {
	DatabaseBackup,
	DatabaseColumn,
	DatabaseQueryResult,
	DatabaseRow,
	DatabaseRows,
	DatabaseSummary,
	DatabaseTable
} from '@shared/types';
import {
	hasMultipleStatements,
	isReadStatement,
	normalizeCell,
	quoteIdentifier
} from './database-sql';

/**
 * The database lives in its own thread. A query cannot freeze the window, and
 * the writable connection exists only while write mode is armed.
 */

const MAX_ROWS = 500;

type Params = Record< string, unknown >;

let sourcePath: string | null = null;
let activeSiteId = '';
let readDb: DatabaseSync | null = null;
let writeDb: DatabaseSync | null = null;

function normalizeRow( row: Record< string, unknown > ): DatabaseRow {
	const next: DatabaseRow = {};
	for ( const key of Object.keys( row ) ) {
		next[ key ] = normalizeCell( row[ key ] );
	}
	return next;
}

function active(): DatabaseSync {
	const connection = writeDb ?? readDb;
	if ( ! connection ) {
		throw new Error( 'No database is open.' );
	}
	return connection;
}

function columnsOf( connection: DatabaseSync, table: string ): DatabaseColumn[] {
	const info = connection.prepare( `PRAGMA table_info(${ quoteIdentifier( table ) })` ).all() as Array<
		Record< string, unknown >
	>;
	return info.map( ( column ) => ( {
		name: String( column.name ),
		type: String( column.type ?? '' ),
		primaryKey: Number( column.pk ) > 0,
		notNull: Number( column.notnull ) === 1
	} ) );
}

function tableNames( connection: DatabaseSync ): string[] {
	return connection
		.prepare(
			"SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
		)
		.all()
		.map( ( row ) => String( ( row as Record< string, unknown > ).name ) )
		.filter( ( name ) => ! name.startsWith( '_wp_sqlite_' ) );
}

function tableInfo( connection: DatabaseSync, name: string ): DatabaseTable {
	const count = connection.prepare( `SELECT COUNT(*) AS n FROM ${ quoteIdentifier( name ) }` ).get() as Record<
		string,
		unknown
	>;
	return {
		name,
		rows: Number( count.n ),
		columns: columnsOf( connection, name )
	};
}

function tableNamed( name: unknown ): string {
	if ( typeof name !== 'string' || ! name ) {
		throw new Error( 'Choose a table.' );
	}
	if ( ! tableNames( active() ).includes( name ) ) {
		throw new Error( `There is no table called ${ name }.` );
	}
	return name;
}

async function open( params: Params ): Promise< DatabaseSummary > {
	const dbPath = String( params.dbPath ?? '' );
	await fs.access( dbPath );
	close();
	sourcePath = dbPath;
	activeSiteId = String( params.siteId ?? '' );
	readDb = new DatabaseSync( dbPath, { readOnly: true } );
	readDb.exec( 'PRAGMA busy_timeout = 5000' );
	return summary();
}

async function summary(): Promise< DatabaseSummary > {
	if ( ! sourcePath ) {
		throw new Error( 'No database is open.' );
	}
	const connection = active();
	const stat = await fs.stat( sourcePath );
	return {
		siteId: activeSiteId,
		path: sourcePath,
		size: stat.size,
		modified: stat.mtimeMs,
		tables: tableNames( connection ).map( ( name ) => tableInfo( connection, name ) )
	};
}

function rows( params: Params ): DatabaseRows {
	const connection = active();
	const table = tableNamed( params.table );
	const columns = columnsOf( connection, table );
	const search = typeof params.search === 'string' ? params.search.trim() : '';
	const where = search
		? ` WHERE ${ columns
				.map( ( column ) => `CAST(${ quoteIdentifier( column.name ) } AS TEXT) LIKE ?` )
				.join( ' OR ' ) }`
		: '';
	const searchParams = search ? columns.map( () => `%${ search }%` ) : [];
	const total = Number(
		(
			connection.prepare( `SELECT COUNT(*) AS n FROM ${ quoteIdentifier( table ) }${ where }` ).get(
				...searchParams
			) as Record< string, unknown >
		).n
	);
	const orderColumn = columns.find( ( column ) => column.name === params.orderBy )?.name;
	const direction = params.direction === 'desc' ? 'DESC' : 'ASC';
	const order = orderColumn ? ` ORDER BY ${ quoteIdentifier( orderColumn ) } ${ direction }` : '';
	const limit = Math.min( 200, Math.max( 1, Number( params.limit ) || 50 ) );
	const offset = Math.max( 0, Number( params.offset ) || 0 );
	const result = connection
		.prepare(
			`SELECT * FROM ${ quoteIdentifier( table ) }${ where }${ order } LIMIT ? OFFSET ?`
		)
		.all( ...searchParams, limit, offset )
		.map( ( row ) => normalizeRow( row as Record< string, unknown > ) );

	return { table, columns, rows: result, total, offset, limit };
}

function query( params: Params ): DatabaseQueryResult {
	const write = params.write === true;
	const connection = write ? writeDb : readDb;
	if ( ! connection ) {
		throw new Error( write ? 'Write mode is not enabled.' : 'No database is open.' );
	}

	const sql = String( params.sql ?? '' ).trim();
	if ( ! sql ) {
		throw new Error( 'Write a query first.' );
	}
	if ( hasMultipleStatements( sql ) ) {
		throw new Error( 'Run one statement at a time.' );
	}
	if ( ! write && ! isReadStatement( sql ) ) {
		throw new Error( 'This console is read-only. Turn on write mode to change data.' );
	}

	const started = Date.now();
	const statement = connection.prepare( sql );
	const columns = statement.columns().map( ( column ) => column.name );
	const resultRows: DatabaseRow[] = [];
	let rowsAffected = 0;
	let truncated = false;

	if ( columns.length > 0 ) {
		const iterator = statement.iterate();
		try {
			for ( const row of iterator ) {
				if ( resultRows.length >= MAX_ROWS ) {
					truncated = true;
					break;
				}
				resultRows.push( normalizeRow( row as Record< string, unknown > ) );
			}
		} finally {
			iterator.return?.();
		}
	} else {
		const info = statement.run();
		rowsAffected = Number( info.changes );
	}

	return {
		columns,
		rows: resultRows,
		rowsAffected,
		truncated,
		durationMs: Date.now() - started
	};
}

async function makeBackup( params: Params ): Promise< DatabaseBackup > {
	const destination = String( params.destination ?? '' );
	if ( ! path.isAbsolute( destination ) ) {
		throw new Error( 'Choose where the backup should go.' );
	}
	await fs.mkdir( path.dirname( destination ), { recursive: true } );
	await fs.rm( destination, { force: true } );
	await backup( active(), destination );
	const stat = await fs.stat( destination );
	return { path: destination, size: stat.size };
}

function armWrite(): void {
	if ( ! sourcePath ) {
		throw new Error( 'Open the database first.' );
	}
	if ( ! writeDb ) {
		writeDb = new DatabaseSync( sourcePath );
		writeDb.exec( 'PRAGMA busy_timeout = 5000' );
	}
}

function disarmWrite(): void {
	writeDb?.close();
	writeDb = null;
	if ( sourcePath ) {
		// The read-only connection is a snapshot; reopen it so reads after a
		// write session see what was written.
		readDb?.close();
		readDb = new DatabaseSync( sourcePath, { readOnly: true } );
		readDb.exec( 'PRAGMA busy_timeout = 5000' );
	}
}

function dropTable( params: Params ): void {
	const table = tableNamed( params.table );
	if ( ! writeDb ) {
		throw new Error( 'Write mode is not enabled.' );
	}
	writeDb.prepare( `DROP TABLE ${ quoteIdentifier( table ) }` ).run();
}

function close(): void {
	sourcePath = null;
	activeSiteId = '';
	writeDb?.close();
	writeDb = null;
	readDb?.close();
	readDb = null;
}

async function handle( method: string, params: Params ): Promise< unknown > {
	switch ( method ) {
		case 'open':
			return open( params );
		case 'summary':
			return summary();
		case 'rows':
			return rows( params );
		case 'query':
			return query( params );
		case 'backup':
			return makeBackup( params );
		case 'arm':
			armWrite();
			return null;
		case 'disarm':
			disarmWrite();
			return null;
		case 'drop':
			dropTable( params );
			return null;
		case 'close':
			close();
			return null;
		default:
			throw new Error( `Unknown database request: ${ method }` );
	}
}

parentPort?.on( 'message', async ( message: { id: number; method: string; params: Params } ) => {
	try {
		const result = await handle( message.method, message.params );
		parentPort?.postMessage( { id: message.id, result } );
	} catch ( error ) {
		parentPort?.postMessage( {
			id: message.id,
			error: error instanceof Error ? error.message : String( error )
		} );
	}
} );
