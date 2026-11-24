import assert from 'node:assert/strict';
import test from 'node:test';
import {
	hasErrors,
	joinPath,
	proposedSitePath,
	slugify,
	validateCreateForm,
	validateDomain
} from '../src/renderer/lib/create-site.ts';

test( 'slugify keeps a name readable and safe for a folder', () => {
	assert.equal( slugify( 'My Portfolio' ), 'my-portfolio' );
	assert.equal( slugify( '  Café & Co.  ' ), 'cafe-co' );
	assert.equal( slugify( '---' ), 'my-site' );
	assert.equal( slugify( 'a'.repeat( 80 ) ).length <= 48, true );
} );

test( 'joinPath keeps the separator the parent uses', () => {
	assert.equal( joinPath( '/Users/sam/siterun/', 'acme' ), '/Users/sam/siterun/acme' );
	assert.equal( joinPath( 'C:\\Users\\sam\\Studio', 'acme' ), 'C:\\Users\\sam\\Studio\\acme' );
} );

test( 'proposedSitePath does not reuse a folder', () => {
	const parent = '/Users/sam/siterun';
	assert.equal( proposedSitePath( parent, 'Acme', [] ), '/Users/sam/siterun/acme' );
	assert.equal(
		proposedSitePath( parent, 'Acme', [ '/Users/sam/siterun/acme' ] ),
		'/Users/sam/siterun/acme-2'
	);
	assert.equal(
		proposedSitePath( parent, 'Acme', [
			'/Users/sam/siterun/acme',
			'/Users/sam/siterun/acme-2'
		] ),
		'/Users/sam/siterun/acme-3'
	);
} );

test( 'validateDomain accepts local names only', () => {
	assert.equal( validateDomain( 'acme.local' ), null );
	assert.equal( validateDomain( '' ), null );
	assert.match( validateDomain( 'acme.test' ) ?? '', /\.local/ );
	assert.match( validateDomain( 'not a domain' ) ?? '', /\.local/ );
} );

test( 'validateCreateForm names every missing answer', () => {
	const errors = validateCreateForm( {
		name: '',
		parentDirectory: '',
		sourceKind: 'backup',
		blueprintPath: null,
		backupPath: null,
		customDomain: '',
		enableHttps: false
	} );
	assert.equal( hasErrors( errors ), true );
	assert.ok( errors.name );
	assert.ok( errors.parentDirectory );
	assert.ok( errors.source );
} );

test( 'validateCreateForm accepts a complete blank site', () => {
	const errors = validateCreateForm( {
		name: 'Portfolio',
		parentDirectory: '/Users/sam/siterun',
		sourceKind: 'blank',
		blueprintPath: null,
		backupPath: null,
		customDomain: '',
		enableHttps: false
	} );
	assert.deepEqual( errors, {} );
} );

test( 'HTTPS requires a custom domain', () => {
	const errors = validateCreateForm( {
		name: 'Portfolio',
		parentDirectory: '/Users/sam/siterun',
		sourceKind: 'blank',
		blueprintPath: null,
		backupPath: null,
		customDomain: '',
		enableHttps: true
	} );
	assert.match( errors.customDomain ?? '', /HTTPS/ );
} );
