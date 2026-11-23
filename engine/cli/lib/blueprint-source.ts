import { openBlueprint } from '@studio/blueprints/node';
import { isNetworkError } from '@studio/common/lib/network-utils';
import { __ } from '@wordpress/i18n';
import { LoggerError } from 'cli/logger';

function toLoggerError( error: unknown ): never {
	if ( isNetworkError( error ) ) {
		throw new LoggerError( __( 'An internet connection is required to open this Blueprint.' ), error );
	}
	throw error instanceof Error && ! ( error instanceof LoggerError )
		? new LoggerError( error.message )
		: error;
}

/** Opens a Blueprint from a file, folder, zip or URL. */
export async function openBlueprintSource( source: string ) {
	return openBlueprint( source ).catch( ( error ) => toLoggerError( error ) );
}
