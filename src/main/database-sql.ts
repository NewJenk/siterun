import type { DatabaseCell } from '@shared/types';

/** Quote a table or column name for SQLite. */
export function quoteIdentifier( name: string ): string {
	return `"${ name.replace( /"/g, '""' ) }"`;
}

const MAX_CELL_CHARS = 256 * 1024;

/** Make a SQLite value safe to send over IPC and render. */
export function normalizeCell( value: unknown ): DatabaseCell {
	if (
		value === null ||
		typeof value === 'string' ||
		typeof value === 'number' ||
		typeof value === 'boolean'
	) {
		if ( typeof value === 'string' && value.length > MAX_CELL_CHARS ) {
			return `${ value.slice( 0, MAX_CELL_CHARS ) }…`;
		}
		return value;
	}
	if ( typeof value === 'bigint' ) {
		return value.toString();
	}
	if ( value instanceof Uint8Array ) {
		return `[BLOB ${ value.byteLength } bytes]`;
	}
	return String( value );
}

/**
 * One statement only. The scanner skips semicolons inside quoted strings so
 * `SELECT ';'` is allowed, while `SELECT 1; DROP TABLE x` is refused before it
 * reaches SQLite.
 */
export function hasMultipleStatements( sql: string ): boolean {
	let quote: string | null = null;
	for ( let index = 0; index < sql.length; index += 1 ) {
		const character = sql[ index ];
		if ( quote ) {
			if ( character === quote ) {
				if ( quote === "'" && sql[ index + 1 ] === "'" ) {
					index += 1;
				} else {
					quote = null;
				}
			}
			continue;
		}
		if ( character === "'" || character === '"' || character === '`' ) {
			quote = character;
			continue;
		}
		if ( character === ';' && sql.slice( index + 1 ).trim() ) {
			return true;
		}
	}
	return false;
}

/** The read-only console accepts the statements that cannot change data. */
export function isReadStatement( sql: string ): boolean {
	const stripped = sql
		.replace( /^\s*(?:--[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*/g, '' )
		.trimStart();
	const keyword = stripped.split( /\s+/, 1 )[ 0 ]?.toUpperCase() ?? '';
	return [ 'SELECT', 'WITH', 'EXPLAIN', 'PRAGMA', 'VALUES' ].includes( keyword );
}
