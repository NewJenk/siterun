// Copies the built engine into the folder electron-builder ships as
// `resources/cli`. A Node script rather than `cp -R` so `npm run make` works on
// Windows as well as macOS and Linux.

import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname( path.dirname( fileURLToPath( import.meta.url ) ) );
const source = path.join( root, 'engine', 'dist', 'cli' );
const target = path.join( root, 'vendor', 'cli' );

if ( ! existsSync( path.join( source, 'main.mjs' ) ) ) {
	console.error( 'The engine has not been built. Run `npm run engine:build` first.' );
	process.exit( 1 );
}

rmSync( target, { recursive: true, force: true } );
mkdirSync( target, { recursive: true } );
cpSync( source, target, {
	recursive: true,
	filter: ( entry ) => path.basename( entry ) !== '.DS_Store'
} );

console.log( `Copied the engine to ${ path.relative( root, target ) }.` );
