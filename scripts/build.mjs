// Bundles the three Electron entry points. esbuild is used rather than a dev
// server so the app always runs exactly what ships: no HMR-only code paths,
// no second build config to drift from the packaged one.

import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname( path.dirname( fileURLToPath( import.meta.url ) ) );
const out = path.join( root, 'dist' );
const production = process.argv.includes( '--production' );

const shared = {
	bundle: true,
	logLevel: 'info',
	sourcemap: production ? false : 'linked',
	minify: production
};

await rm( out, { recursive: true, force: true } );
await mkdir( path.join( out, 'renderer' ), { recursive: true } );

await Promise.all( [
	build( {
		...shared,
		entryPoints: [ path.join( root, 'src/main/index.ts' ) ],
		outfile: path.join( out, 'main/index.js' ),
		platform: 'node',
		target: 'node22',
		format: 'cjs',
		external: [ 'electron' ],
		define: { 'process.env.NODE_ENV': JSON.stringify( production ? 'production' : 'development' ) }
	} ),
	build( {
		...shared,
		entryPoints: [ path.join( root, 'src/preload/index.ts' ) ],
		outfile: path.join( out, 'preload/index.js' ),
		platform: 'node',
		target: 'node22',
		format: 'cjs',
		external: [ 'electron' ]
	} ),
	build( {
		...shared,
		entryPoints: [ path.join( root, 'src/main/database-worker.ts' ) ],
		outfile: path.join( out, 'main/database-worker.js' ),
		platform: 'node',
		target: 'node22',
		format: 'cjs'
	} ),
	build( {
		...shared,
		entryPoints: [ path.join( root, 'src/renderer/index.tsx' ) ],
		outdir: path.join( out, 'renderer' ),
		entryNames: 'index',
		assetNames: 'assets/[name]-[hash]',
		platform: 'browser',
		target: [ 'chrome130' ],
		format: 'iife',
		jsx: 'automatic',
		loader: { '.css': 'css' },
		define: { 'process.env.NODE_ENV': JSON.stringify( production ? 'production' : 'development' ) },
		// The WordPress packages ship both a CommonJS build and an ESM one. The
		// browser field points at the ESM build; aliasing i18n keeps its
		// translation functions out of the CommonJS wrapper so they can be
		// tree-shaken and stubbed in tests.
		alias: {
			'@wordpress/i18n': path.join(
				root,
				'node_modules/@wordpress/i18n/build-module/index.mjs'
			)
		}
	} )
] );

await cp(
	path.join( root, 'src/renderer/index.html' ),
	path.join( out, 'renderer/index.html' )
);

console.log( `Built ${ production ? 'production' : 'development' } bundle in ${ out }` );
