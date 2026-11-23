import assert from 'node:assert/strict';
import test from 'node:test';
import {
	hasMultipleStatements,
	isReadStatement,
	normalizeCell,
	quoteIdentifier
} from '../src/main/database-sql.ts';

test( 'quoteIdentifier escapes a double quote', () => {
	assert.equal( quoteIdentifier( 'wp_posts' ), '"wp_posts"' );
	assert.equal( quoteIdentifier( 'a"b' ), '"a""b"' );
} );

test( 'normalizeCell keeps simple values and describes the awkward ones', () => {
	assert.equal( normalizeCell( null ), null );
	assert.equal( normalizeCell( 'hello' ), 'hello' );
	assert.equal( normalizeCell( 42 ), 42 );
	assert.equal( normalizeCell( false ), false );
	assert.equal( normalizeCell( 12n ), '12' );
	assert.equal( normalizeCell( new Uint8Array( [ 1, 2, 3 ] ) ), '[BLOB 3 bytes]' );
} );

test( 'normalizeCell truncates an enormous string rather than freezing the window', () => {
	const huge = 'a'.repeat( 256 * 1024 + 10 );
	const normalized = normalizeCell( huge );
	assert.equal( typeof normalized, 'string' );
	assert.equal( ( normalized as string ).endsWith( '…' ), true );
	assert.equal( ( normalized as string ).length, 256 * 1024 + 1 );
} );

test( 'hasMultipleStatements refuses a second statement', () => {
	assert.equal( hasMultipleStatements( 'SELECT 1' ), false );
	assert.equal( hasMultipleStatements( 'SELECT 1;' ), false );
	assert.equal( hasMultipleStatements( 'SELECT 1; DROP TABLE wp_posts' ), true );
	assert.equal( hasMultipleStatements( "SELECT ';'" ), false );
	assert.equal( hasMultipleStatements( "SELECT 'it''s; fine'" ), false );
} );

test( 'isReadStatement accepts queries and rejects writes', () => {
	assert.equal( isReadStatement( 'SELECT * FROM wp_posts' ), true );
	assert.equal( isReadStatement( '  -- a note\nSELECT 1' ), true );
	assert.equal( isReadStatement( 'WITH x AS ( SELECT 1 ) SELECT * FROM x' ), true );
	assert.equal( isReadStatement( 'PRAGMA table_info(wp_posts)' ), true );
	assert.equal( isReadStatement( 'VALUES (1)' ), true );

	assert.equal( isReadStatement( 'INSERT INTO wp_options VALUES (1)' ), false );
	assert.equal( isReadStatement( 'UPDATE wp_options SET option_value = 1' ), false );
	assert.equal( isReadStatement( 'DROP TABLE wp_posts' ), false );
	assert.equal( isReadStatement( 'CREATE TABLE x (id INTEGER)' ), false );
} );
