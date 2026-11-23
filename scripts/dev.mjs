// Development runner: rebuilds, launches Electron, and restarts it after a
// change. Restarting on a renderer edit is deliberate: this app has no state
// worth preserving between reloads, and one code path is one thing to debug.

import { context } from 'esbuild';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname( path.dirname( fileURLToPath( import.meta.url ) ) );
const electron = path.join( root, 'node_modules/.bin/electron' );

const shared = {
	bundle: true,
	logLevel: 'warning',
	sourcemap: 'linked',
	define: { 'process.env.NODE_ENV': '"development"' }
};

let child;
let started = false;
let restartTimer;

function restart() {
	clearTimeout( restartTimer );
	restartTimer = setTimeout( () => {
		if ( child ) {
			child.removeAllListeners( 'exit' );
			child.kill();
			child = undefined;
		}
		start();
	}, 180 );
}

function start() {
	child = spawn( electron, [ '.' ], {
		cwd: root,
		stdio: 'inherit',
		env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' }
	} );
	child.on( 'exit', ( code ) => {
		if ( code !== null && started ) process.exit( code );
	} );
	started = true;
}

const rebuildPlugin = {
	name: 'rebuild',
	setup: ( build ) => build.onEnd( () => restart() )
};

const contexts = await Promise.all( [
	context( {
		...shared,
		entryPoints: [ path.join( root, 'src/main/index.ts' ) ],
		outfile: path.join( root, 'dist/main/index.js' ),
		platform: 'node',
		target: 'node22',
		format: 'cjs',
		external: [ 'electron' ],
		plugins: [ rebuildPlugin ]
	} ),
	context( {
		...shared,
		entryPoints: [ path.join( root, 'src/preload/index.ts' ) ],
		outfile: path.join( root, 'dist/preload/index.js' ),
		platform: 'node',
		target: 'node22',
		format: 'cjs',
		external: [ 'electron' ],
		plugins: [ rebuildPlugin ]
	} ),
	context( {
		...shared,
		entryPoints: [ path.join( root, 'src/main/database-worker.ts' ) ],
		outfile: path.join( root, 'dist/main/database-worker.js' ),
		platform: 'node',
		target: 'node22',
		format: 'cjs',
		plugins: [ rebuildPlugin ]
	} ),
	context( {
		...shared,
		entryPoints: [ path.join( root, 'src/renderer/index.tsx' ) ],
		outdir: path.join( root, 'dist/renderer' ),
		entryNames: 'index',
		assetNames: 'assets/[name]-[hash]',
		platform: 'browser',
		target: [ 'chrome130' ],
		format: 'iife',
		jsx: 'automatic',
		loader: { '.css': 'css' },
		alias: {
			'@wordpress/i18n': path.join(
				root,
				'node_modules/@wordpress/i18n/build-module/index.mjs'
			)
		},
		plugins: [ rebuildPlugin ]
	} )
] );

await Promise.all( contexts.map( ( build ) => build.watch() ) );

start();
