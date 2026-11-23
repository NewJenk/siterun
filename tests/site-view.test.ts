import assert from 'node:assert/strict';
import test from 'node:test';
import {
	formatPath,
	nameFromBackup,
	siteStatus,
	siteSummary
} from '../src/renderer/lib/site-view.ts';
import { isNewer } from '../src/shared/version.ts';

test( 'formatPath shows the home folder as a tilde', () => {
	assert.equal( formatPath( '/Users/sam', '/Users/sam/Studio/acme' ), '~/Studio/acme' );
	assert.equal( formatPath( '/Users/sam', '/Users/sam' ), '~' );
	assert.equal( formatPath( '/Users/sam', '/opt/acme' ), '/opt/acme' );
	assert.equal(
		formatPath( 'C:\\Users\\sam', 'C:\\Users\\sam\\Studio\\acme' ),
		'~\\Studio\\acme'
	);
	assert.equal( formatPath( null, '/opt/acme' ), '/opt/acme' );
} );

test( 'nameFromBackup makes a readable site name', () => {
	assert.equal( nameFromBackup( '/tmp/my-portfolio.zip' ), 'my portfolio' );
	assert.equal( nameFromBackup( '/tmp/acme.tar.gz' ), 'acme' );
	assert.equal( nameFromBackup( '/tmp/backup.sql' ), 'backup' );
	assert.equal( nameFromBackup( '/tmp/----.zip' ), 'Imported site' );
} );

test( 'siteStatus prefers an operation over the last known state', () => {
	assert.equal( siteStatus( { running: true, operation: null } ), 'running' );
	assert.equal( siteStatus( { running: false, operation: null } ), 'stopped' );
	assert.equal( siteStatus( { running: true, operation: 'start' } ), 'busy' );
} );

test( 'siteSummary is a sentence made of the facts worth scanning', () => {
	assert.equal(
		siteSummary( {
			wpVersion: '6.8.2',
			phpVersion: '8.4',
			environmentType: null
		} as never ),
		'WordPress 6.8.2 · PHP 8.4'
	);
} );

test( 'isNewer compares three numeric parts', () => {
	assert.equal( isNewer( '0.2.0', '0.1.9' ), true );
	assert.equal( isNewer( '0.1.0', '0.1.0' ), false );
	assert.equal( isNewer( '0.1.0', '0.2.0' ), false );
	assert.equal( isNewer( 'v1.0.1', '1.0.0' ), true );
	assert.equal( isNewer( '1.0.0-beta', '1.0.0' ), false );
} );
