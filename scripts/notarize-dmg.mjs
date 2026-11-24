// Sign, notarize and staple the disk image after electron-builder has signed
// and notarized the app inside it. Gatekeeper assesses the downloaded image
// itself, so an unsigned DMG is rejected even when the app within it is fine.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname( path.dirname( fileURLToPath( import.meta.url ) ) );
const releaseDir = path.join( root, 'release' );

const dmgs = readdirSync( releaseDir )
	.filter( ( file ) => file.endsWith( '.dmg' ) )
	.map( ( file ) => path.join( releaseDir, file ) )
	.sort( ( a, b ) => statSync( b ).mtimeMs - statSync( a ).mtimeMs );

if ( ! dmgs.length ) {
	console.error( `No DMG in ${ releaseDir }. Run npm run make:mac first.` );
	process.exit( 1 );
}

const dmgPath = dmgs[ 0 ];
const dmgName = path.basename( dmgPath );

function run( command, args, options = {} ) {
	return execFileSync( command, args, { encoding: 'utf8', ...options } );
}

function identityName() {
	if ( process.env.CSC_NAME ) {
		return process.env.CSC_NAME;
	}
	const output = run( 'security', [ 'find-identity', '-v', '-p', 'codesigning' ] );
	const names = [ ...output.matchAll( /"([^"]+)"/g ) ]
		.map( ( match ) => match[ 1 ] )
		.filter( ( name ) => name.includes( 'Developer ID Application' ) );
	if ( ! names.length ) {
		console.error( 'No Developer ID Application identity in the keychain.' );
		process.exit( 1 );
	}
	return names[ 0 ];
}

function notaryAuth() {
	const { APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID } = process.env;
	if ( APPLE_ID && APPLE_APP_SPECIFIC_PASSWORD && APPLE_TEAM_ID ) {
		return [ '--apple-id', APPLE_ID, '--password', APPLE_APP_SPECIFIC_PASSWORD, '--team-id', APPLE_TEAM_ID ];
	}

	const { APPLE_API_KEY, APPLE_API_KEY_ID, APPLE_API_ISSUER } = process.env;
	if ( APPLE_API_KEY && APPLE_API_KEY_ID && APPLE_API_ISSUER ) {
		return [ '--key', APPLE_API_KEY, '--key-id', APPLE_API_KEY_ID, '--issuer', APPLE_API_ISSUER ];
	}

	console.error( 'Set the Apple notarization credentials in the environment.' );
	process.exit( 1 );
}

const identity = identityName();
const auth = notaryAuth();

console.log( `Signing ${ dmgName } with ${ identity }.` );
run( 'codesign', [ '--force', '--timestamp', '--sign', identity, dmgPath ], { stdio: 'inherit' } );

console.log( `Notarizing ${ dmgName }. This takes a few minutes.` );
const submission = JSON.parse(
	run( 'xcrun', [ 'notarytool', 'submit', dmgPath, ...auth, '--wait', '--output-format', 'json' ] )
);

if ( submission.status !== 'Accepted' ) {
	console.error( `Notarization failed: ${ submission.status }` );
	if ( submission.id ) {
		console.error( run( 'xcrun', [ 'notarytool', 'log', submission.id, ...auth ] ) );
	}
	process.exit( 1 );
}

console.log( 'Stapling the notarization ticket.' );
run( 'xcrun', [ 'stapler', 'staple', dmgPath ], { stdio: 'inherit' } );
run( 'xcrun', [ 'stapler', 'validate', dmgPath ], { stdio: 'inherit' } );
run( 'spctl', [ '-a', '-vvv', '-t', 'open', '--context', 'context:primary-signature', dmgPath ], {
	stdio: 'inherit',
} );

// Signing changes the image after electron-builder wrote its checksum.
const latest = path.join( releaseDir, 'latest-mac.yml' );
if ( existsSync( latest ) ) {
	const sha512 = createHash( 'sha512' ).update( readFileSync( dmgPath ) ).digest( 'base64' );
	const size = statSync( dmgPath ).size;
	const entry = new RegExp(
		`(- url: ${ dmgName.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' ) }\\n\\s+sha512: )[^\\n]+(\\n\\s+size: )\\d+`
	);
	const yaml = readFileSync( latest, 'utf8' );
	if ( entry.test( yaml ) ) {
		writeFileSync( latest, yaml.replace( entry, `$1${ sha512 }$2${ size }` ) );
	}
}

// The DMG blockmap described the image before it was signed.
const blockmap = `${ dmgPath }.blockmap`;
if ( existsSync( blockmap ) ) {
	rmSync( blockmap );
}

const sha256 = createHash( 'sha256' ).update( readFileSync( dmgPath ) ).digest( 'hex' );
writeFileSync( `${ dmgPath }.sha256`, `${ sha256 }  ${ dmgName }\n` );

console.log( `Ready: ${ dmgName }` );
console.log( `SHA-256: ${ sha256 }` );
