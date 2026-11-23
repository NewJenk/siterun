import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { builtinModules, createRequire } from 'node:module';
import path from 'node:path';
import { defineConfig } from 'vite';

const engineRoot = import.meta.dirname;
const cliRoot = path.join( engineRoot, 'cli' );
const packageJson = createRequire( import.meta.url )( path.join( engineRoot, '..', 'package.json' ) );
const MINIMUM_NODE_VERSION = '22.0.0';

function copyExtrasPlugin() {
	return {
		name: 'engine-extras',
		apply: 'build',
		writeBundle( options ) {
			const outDir = options.dir ?? path.join( engineRoot, 'dist', 'cli' );
			mkdirSync( outDir, { recursive: true } );
			writeFileSync(
				path.join( outDir, 'package.json' ),
				JSON.stringify( { type: 'module' }, null, 2 ) + '\n'
			);

			const phpSource = path.join( cliRoot, 'php' );
			if ( existsSync( phpSource ) ) {
				cpSync( phpSource, path.join( outDir, 'php' ), { recursive: true } );
			}

			const wpFiles = path.join( engineRoot, 'wp-files' );
			if ( existsSync( wpFiles ) ) {
				const extractedWordPress = path.join( wpFiles, 'latest', 'wordpress' );
				cpSync( wpFiles, path.join( outDir, 'wp-files' ), {
					recursive: true,
					filter: ( source ) => source !== extractedWordPress
				} );
			}

			const phpBin = path.join( engineRoot, 'php-bin' );
			if ( existsSync( phpBin ) ) {
				cpSync( phpBin, path.join( outDir, 'php-bin' ), { recursive: true } );
			}
		}
	};
}

export default defineConfig( {
	plugins: [ copyExtrasPlugin() ],
	build: {
		emptyOutDir: true,
		lib: {
			entry: {
				main: path.join( cliRoot, 'index.lite.ts' ),
				'process-manager-daemon': path.join( cliRoot, 'process-manager-daemon.ts' ),
				'proxy-daemon': path.join( cliRoot, 'proxy-daemon.ts' ),
				'php-server-child': path.join( cliRoot, 'php-server-child.ts' )
			},
			formats: [ 'es' ]
		},
		outDir: path.join( engineRoot, 'dist', 'cli' ),
		target: 'node22',
		rolldownOptions: {
			output: {
				format: 'es',
				entryFileNames: '[name].mjs',
				chunkFileNames: '[name]-[hash].mjs',
				banner: () =>
					'import { createRequire as __studioCreateRequire } from "node:module"; var require = __studioCreateRequire(import.meta.url);'
			},
			external: ( id ) => {
				if ( id.startsWith( 'node:' ) || builtinModules.includes( id ) ) {
					return true;
				}

				return id === 'fsevents' || id.endsWith( '.node' );
			}
		},
		commonjsOptions: { ignoreDynamicRequires: true },
		sourcemap: false,
		minify: false
	},
	resolve: {
		alias: {
			cli: cliRoot,
			'@studio/common': path.join( engineRoot, 'common' ),
			'@studio/blueprints': path.join( engineRoot, 'blueprints' ),
			'@wp-playground/blueprints/blueprint-schema-validator': path.resolve(
				engineRoot,
				'..',
				'node_modules',
				'@wp-playground',
				'blueprints',
				'blueprint-schema-validator.js'
			)
		},
		conditions: [ 'node' ],
		mainFields: [ 'main' ]
	},
	define: {
		__IS_PACKAGED_FOR_NPM__: false,
		__IS_PACKAGED_FOR_STANDALONE__: false,
		__MINIMUM_NODE_VERSION__: JSON.stringify( MINIMUM_NODE_VERSION ),
		__STUDIO_CLI_VERSION__: JSON.stringify( packageJson.version )
	}
} );
