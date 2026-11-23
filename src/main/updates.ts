import { app } from 'electron';
import { isNewer } from '@shared/version';
import type { UpdateInfo } from '@shared/types';

interface Feed {
	version?: unknown;
	url?: unknown;
	notes?: unknown;
}

/**
 * Checks the feed this build is pointed at, if any. The app is not auto-updated
 * yet: signing and a publish target are a release decision, so this tells the
 * user a newer build exists and opens its download page.
 *
 * Set `SITERUN_UPDATE_FEED` to a JSON document like
 * `{ "version": "0.2.0", "url": "https://…", "notes": "What changed" }`.
 */
export async function checkForUpdates(): Promise< UpdateInfo | null > {
	const feedUrl = process.env.SITERUN_UPDATE_FEED;
	if ( ! feedUrl || ! /^https:\/\//.test( feedUrl ) ) {
		return null;
	}

	try {
		const response = await fetch( feedUrl, {
			headers: { accept: 'application/json' },
			signal: AbortSignal.timeout( 6000 )
		} );
		if ( ! response.ok ) {
			return null;
		}
		const feed = ( await response.json() ) as Feed;
		if ( typeof feed.version !== 'string' || typeof feed.url !== 'string' ) {
			return null;
		}
		if ( ! /^https:\/\//.test( feed.url ) || ! isNewer( feed.version, app.getVersion() ) ) {
			return null;
		}
		return {
			version: feed.version,
			url: feed.url,
			notes: typeof feed.notes === 'string' ? feed.notes : null
		};
	} catch {
		return null;
	}
}
