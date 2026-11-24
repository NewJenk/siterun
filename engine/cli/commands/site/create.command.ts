import {
	SITE_FILE_ACCESS_ALL_FILES,
	SITE_FILE_ACCESS_SITE_DIRECTORY,
} from '@studio/common/lib/site-file-access';
import { RecommendedPHPVersion, SupportedPHPVersions } from '@studio/common/types/php-versions';
import { __ } from '@wordpress/i18n';
import {
	CLI_AUTO_UPDATE_WP_VERSION,
	coerceWpVersionOption,
	getWpVersionOptionDescription,
} from 'cli/lib/wp-version-option';
import { ValidationError } from 'cli/lib/validation-error';
import { StudioArgv } from 'cli/types';

function coerceSiteId( value: string ) {
	// Validate UUID format (8-4-4-4-12 hex characters)
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if ( ! uuidRegex.test( value ) ) {
		throw new ValidationError( 'id', value, __( 'Must be a valid UUID' ) );
	}
	return value;
}

export const builder = ( yargs: StudioArgv ) => {
	return yargs
		.option( 'id', {
			type: 'string',
			describe: __( 'Site ID (UUID format, used internally by the siterun app)' ),
			hidden: true,
			coerce: coerceSiteId,
		} )
		.option( 'name', {
			type: 'string',
			describe: __( 'Site name' ),
		} )
		.option( 'wp', {
			type: 'string',
			describe: getWpVersionOptionDescription(),
			defaultDescription: CLI_AUTO_UPDATE_WP_VERSION,
			coerce: coerceWpVersionOption,
		} )
		.option( 'php', {
			type: 'string',
			describe: __( 'PHP version' ),
			choices: SupportedPHPVersions,
			defaultDescription: RecommendedPHPVersion,
		} )
		.option( 'file-access', {
			type: 'string',
			describe: __( 'Which files PHP can access: the site directory only, or all files' ),
			choices: [ SITE_FILE_ACCESS_SITE_DIRECTORY, SITE_FILE_ACCESS_ALL_FILES ] as const,
			default: SITE_FILE_ACCESS_ALL_FILES,
		} )
		.option( 'domain', {
			type: 'string',
			describe: __( 'Custom domain (e.g., "mysite.local")' ),
		} )
		.option( 'https', {
			type: 'boolean',
			describe: __( 'Enable HTTPS for custom domain' ),
			implies: 'domain',
		} )
		.option( 'blueprint', {
			type: 'string',
			describe: __(
				'Blueprint URL, JSON file, folder or zip bundle'
			),
		} )
		.option( 'admin-username', {
			type: 'string',
			describe: __( 'Admin username (defaults to "admin")' ),
		} )
		.option( 'admin-password', {
			type: 'string',
			describe: __(
				'Admin password (auto-generated if not provided). Note: passwords in CLI arguments may be visible in process lists; consider using a Blueprint file for sensitive passwords.'
			),
		} )
		.option( 'admin-email', {
			type: 'string',
			describe: __( 'Admin email (defaults to "admin@localhost.com")' ),
		} )
		.option( 'start', {
			type: 'boolean',
			describe: __( 'Start the site after creation' ),
			default: true,
		} )
		.option( 'skip-browser', {
			type: 'boolean',
			describe: __( 'Skip opening the site in browser after starting' ),
			default: false,
		} )
		.option( 'skip-log-details', {
			type: 'boolean',
			describe: __( 'Skip printing site URL and admin credentials after creating' ),
			default: false,
		} );
};

export const registerCommand = ( yargs: StudioArgv ) => {
	return yargs.command( {
		command: 'create',
		describe: __( 'Create a new site' ),
		builder,
		handler: async ( argv ) => {
			const { commandHandler } = await import( 'cli/commands/site/create' );
			return commandHandler( argv );
		},
	} );
};
