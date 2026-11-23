import { z } from 'zod';
import { siteDetailsSchema } from '@studio/common/lib/cli-events';
import { siteOperationSchema } from '@studio/common/lib/site-operation';

/**
 * The shape of the engine config file. Each top-level key is a section, parsed on its own so a
 * broken section can't take the others down (see `./store.ts`). Sections are loose: a build that
 * rewrites one keeps the fields a newer build added, so adding a field needs no version bump.
 */

// Bump only when existing data changes shape, with a step in `./migrations.ts`.
export const CONFIG_VERSION = 2;

const optional = < T extends z.ZodType >( schema: T ) => schema.optional().catch( undefined );

const reported = new Set< string >();

// Every read parses the file again, so each problem is reported once per process.
export function reportOnce( message: string ): void {
	if ( ! reported.has( message ) ) {
		reported.add( message );
		console.warn( message );
	}
}

// Leaves out the entries that don't parse instead of failing the whole list. The store writes
// them back as they were, so a newer or damaged entry is never lost.
function tolerantArray< T extends z.ZodType >( item: T ) {
	return z.array( z.unknown() ).transform( ( entries ) =>
		entries.flatMap( ( entry ) => {
			const parsed = item.safeParse( entry );
			if ( ! parsed.success ) {
				reportOnce( `Ignored an invalid config entry: ${ parsed.error.message }` );
				return [];
			}
			return [ parsed.data as z.output< T > ];
		} )
	);
}

// Read field by field in `../user-settings/user-preferences.ts`, which falls back to each default.
const preferencesSchema = z.looseObject( {
	locale: optional( z.string() ),
} );

export const configSiteSchema = siteDetailsSchema
	.omit( { emailPath: true, phpMyAdminSupported: true } )
	.extend( {
		url: z.string().optional(),
		latestCliPid: z.number().optional(),
		// The in-flight site operation holding this site. Transient: once its owning process is
		// gone it's reclaimed on the next acquire. See `cli/lib/site-operations`.
		operation: siteOperationSchema.optional(),
		sortOrder: optional( z.number() ),
		autoStart: optional( z.boolean() ),
		hideFrontendAdminBar: optional( z.boolean() ),
	} )
	.loose();

export type ConfigSite = z.infer< typeof configSiteSchema >;

// State only the CLI reads.
const cliSchema = z.looseObject( {
	lastDependencyCheckTime: optional( z.number() ),
} );

// The sections that are lists, by the schema of an entry.
export const CONFIG_LISTS = {
	sites: configSiteSchema,
};

export const CONFIG_SECTIONS = {
	preferences: preferencesSchema,
	sites: tolerantArray( CONFIG_LISTS.sites ),
	cli: cliSchema,
};

export type ConfigSectionName = keyof typeof CONFIG_SECTIONS;

export type Config = {
	[ Section in ConfigSectionName ]: z.output< ( typeof CONFIG_SECTIONS )[ Section ] >;
};

export const EMPTY_SECTIONS: { [ Section in ConfigSectionName ]: unknown } = {
	preferences: {},
	sites: [],
	cli: {},
};
