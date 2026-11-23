import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCommand } from '../src/renderer/lib/command.ts';

test( 'parseCommand splits a plain command', () => {
	assert.deepEqual( parseCommand( 'plugin list' ), [ 'plugin', 'list' ] );
} );

test( 'parseCommand keeps quoted words together', () => {
	assert.deepEqual( parseCommand( 'post create --post_title="Hello world"' ), [
		'post',
		'create',
		'--post_title=Hello world'
	] );
	assert.deepEqual( parseCommand( "option update blogname 'My site'" ), [
		'option',
		'update',
		'blogname',
		'My site'
	] );
} );

test( 'parseCommand handles an empty quoted word and backslashes', () => {
	assert.deepEqual( parseCommand( 'option get ""' ), [ 'option', 'get', '' ] );
	assert.deepEqual( parseCommand( 'eval "a \\"quoted\\" word"' ), [
		'eval',
		'a "quoted" word'
	] );
} );

test( 'parseCommand never invents shell syntax', () => {
	assert.deepEqual( parseCommand( 'option get siteurl; rm -rf /' ), [
		'option',
		'get',
		'siteurl;',
		'rm',
		'-rf',
		'/'
	] );
} );

test( 'parseCommand ignores surrounding whitespace', () => {
	assert.deepEqual( parseCommand( '   ' ), [] );
	assert.deepEqual( parseCommand( '\tplugin\tlist\n' ), [ 'plugin', 'list' ] );
} );
