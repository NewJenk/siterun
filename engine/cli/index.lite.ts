import path from 'node:path';
import { ConfigTooNewError, readConfig } from '@studio/common/lib/config/store';
import { suppressPunycodeWarning } from '@studio/common/lib/suppress-punycode-warning';
import { __, sprintf } from '@wordpress/i18n';
import semver from 'semver';
import yargs from 'yargs';
import { registerCommand as registerExportCommand } from 'cli/commands/export.command';
import { registerCommand as registerImportCommand } from 'cli/commands/import.command';
import { registerCommand as registerSiteCreateCommand } from 'cli/commands/site/create.command';
import { registerCommand as registerSiteDeleteCommand } from 'cli/commands/site/delete.command';
import { registerCommand as registerSiteListCommand } from 'cli/commands/site/list.command';
import { registerCommand as registerSiteStartCommand } from 'cli/commands/site/start.command';
import { registerCommand as registerSiteStatusCommand } from 'cli/commands/site/status.command';
import { registerCommand as registerSiteStopCommand } from 'cli/commands/site/stop.command';
import { loadTranslations } from 'cli/lib/i18n';
import { untildify } from 'cli/lib/utils';
import { StudioArgv } from 'cli/types';

const version = __STUDIO_CLI_VERSION__;

suppressPunycodeWarning();

async function main() {
	const yargsLocale = await loadTranslations();

	if ( semver.lt( process.version, __MINIMUM_NODE_VERSION__ ) ) {
		console.error(
			sprintf(
				__(
					'siterun requires Node.js %s or newer. You are running %s.\nUpgrade Node.js and run this command again.'
				),
				__MINIMUM_NODE_VERSION__,
				process.version
			)
		);
		process.exit( 1 );
	}

	try {
		await readConfig();
	} catch ( error ) {
		if ( ! ( error instanceof ConfigTooNewError ) ) {
			throw error;
		}
		console.error( `${ error.message } Update siterun to read it.` );
		process.exit( 1 );
	}

	const studioArgv: StudioArgv = yargs( process.argv.slice( 2 ) )
		.scriptName( 'studio' )
		.usage( __( 'siterun site engine' ) )
		.locale( yargsLocale )
		.version( version )
		.alias( 'v', 'version' )
		.alias( 'h', 'help' )
		.wrap( Math.min( 90, yargs().terminalWidth() ?? 90 ) )
		.option( 'path', {
			type: 'string',
			alias: 'p',
			normalize: true,
			default: process.cwd(),
			defaultDescription: __( 'Current directory' ),
			description: __( 'Path to the WordPress files' ),
			coerce: ( value ) => path.resolve( untildify( value ) )
		} )
		.middleware( async () => {
			const { runStartupTasks } = await import( '@studio/common/lib/startup-tasks' );
			const { installBundledDefaultPhp } = await import( 'cli/lib/install-bundled-default-php' );
			await runStartupTasks( [ installBundledDefaultPhp ] );

			const { prunePmLogs } = await import( 'cli/lib/prune-pm-logs' );
			await prunePmLogs();
		} )
		.middleware( async () => {
			const { setupServerFiles } = await import( 'cli/lib/dependency-management/setup' );
			await setupServerFiles();
		} );

	// Site management, at the top level: create, list, start, stop, status, delete.
	registerSiteCreateCommand( studioArgv );
	registerSiteListCommand( studioArgv );
	registerSiteStartCommand( studioArgv );
	registerSiteStopCommand( studioArgv );
	registerSiteDeleteCommand( studioArgv );
	registerSiteStatusCommand( studioArgv );

	registerImportCommand( studioArgv );
	registerExportCommand( studioArgv );

	studioArgv.command( 'config', __( 'Manage site configuration' ), async ( configYargs ) => {
		const [
			{ registerCommand: registerConfigGetCommand },
			{ registerCommand: registerConfigSetCommand }
		] = await Promise.all( [
			import( 'cli/commands/config/get' ),
			import( 'cli/commands/config/set' )
		] );

		registerConfigGetCommand( configYargs );
		registerConfigSetCommand( configYargs );
		configYargs.version( false ).demandCommand( 1, __( 'You must provide a valid config command' ) );
	} );

	studioArgv.command( {
		command: 'wp',
		describe: __( 'WP-CLI' ),
		builder: ( wpYargs ) => wpYargs.help( false ).showHelpOnFail( false ).strict( false ).version( false ),
		handler: async ( argv ) => {
			const { commandHandler } = await import( 'cli/commands/wp' );
			return commandHandler( argv );
		}
	} );

	// Used by the host app on quit. A host must be able to stop the process manager.
	studioArgv.command( {
		command: '_daemon-stop',
		describe: false,
		handler: async () => {
			const { killDaemonAndChildren } = await import( 'cli/lib/daemon-client' );
			await killDaemonAndChildren().catch( () => undefined );
		}
	} );

	studioArgv.demandCommand( 1, __( 'You must provide a valid command' ) ).strict();

	await studioArgv.argv;

	if ( process.connected && ! process.exitCode ) {
		process.send?.( { action: 'done' } );
	}
}

void main();
