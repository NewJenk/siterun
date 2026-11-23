/**
 * Shared site types between the engine and the app. The app reads the site list
 * directly and listens for site events; there is no auth, sync or preview
 * surface in this engine.
 */
import { z } from 'zod';
import { siteFileAccessSchema } from '@studio/common/lib/site-file-access';
import { siteOperationSchema } from '@studio/common/lib/site-operation';
import { sitePhpWorkersSchema } from '@studio/common/lib/site-php-workers';
import { wpEnvironmentTypeSchema } from '@studio/common/lib/wp-environment-type';

export const siteDetailsSchema = z.object( {
	id: z.string(),
	name: z.string(),
	path: z.string(),
	port: z.number(),
	url: z.string(),
	phpVersion: z.string(),
	fileAccess: siteFileAccessSchema.optional(),
	customDomain: z.string().optional(),
	enableHttps: z.boolean().optional(),
	adminUsername: z.string().optional(),
	adminPassword: z.string().optional(),
	adminEmail: z.string().optional(),
	isWpAutoUpdating: z.boolean().optional(),
	enableXdebug: z.boolean().optional(),
	phpWorkers: sitePhpWorkersSchema.optional(),
	enableDebugLog: z.boolean().optional(),
	enableDebugDisplay: z.boolean().optional(),
	enableScriptDebug: z.boolean().optional(),
	environmentType: wpEnvironmentTypeSchema.optional(),
	technicalSiteDirectory: z.string().optional(),
	runtimeBlueprintPath: z.string().optional(),
	landingPage: z.string().optional(),
	operation: siteOperationSchema.optional(),
	emailPath: z.string().optional(),
	sortOrder: z.number().optional(),
	autoStart: z.boolean().optional(),
	hideFrontendAdminBar: z.boolean().optional()
} );

export type SiteDetails = z.infer< typeof siteDetailsSchema >;

export const siteListItemSchema = siteDetailsSchema.extend( {
	running: z.boolean()
} );

export type SiteListItem = z.infer< typeof siteListItemSchema >;

export const siteListSchema = z.array( siteListItemSchema );

export enum SITE_EVENTS {
	CREATED = 'site-created',
	UPDATED = 'site-updated',
	DELETED = 'site-deleted',
	OPERATIONS_CHANGED = 'site-operations-changed'
}

export const siteEventSchema = z.object( {
	event: z.enum( SITE_EVENTS ),
	siteId: z.string(),
	site: siteDetailsSchema.optional(),
	running: z.boolean()
} );

export type SiteEvent = z.infer< typeof siteEventSchema >;

const siteSocketEventSchema = z.object( {
	event: z.enum( SITE_EVENTS ),
	data: z.object( {
		siteId: z.string(),
	} ),
} );

export const socketEventSchema = siteSocketEventSchema;
export type SocketEvent = z.infer< typeof socketEventSchema >;

/** Set by the host when it starts a site, for the engine's timing. */
export const SITE_START_REQUESTED_AT_ENV = 'STUDIO_SITE_START_REQUESTED_AT';
