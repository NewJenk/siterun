import { shell, type Session, type WebContents } from 'electron';

const ALLOWED_PROTOCOLS = new Set( [ 'http:', 'https:' ] );

export class RefusedUrlError extends Error {
	constructor() {
		super( 'That link is not one this app will open.' );
		this.name = 'RefusedUrlError';
	}
}

/**
 * Only ordinary web addresses reach the system browser.
 * @param value
 */
export async function openExternalUrl( value: string ): Promise< void > {
	let url: URL;
	try {
		url = new URL( value );
	} catch {
		throw new RefusedUrlError();
	}
	if ( ! ALLOWED_PROTOCOLS.has( url.protocol ) ) {
		throw new RefusedUrlError();
	}
	await shell.openExternal( url.toString() );
}

/**
 * The window shows the app's own page and nothing else. A link that wants a
 * new window is handed to the browser instead, and a navigation away from the
 * app is stopped. Without this the renderer could be steered to a remote page
 * that then inherits the preload bridge.
 * @param contents
 * @param appUrl
 */
export function pinToOwnPage( contents: WebContents, appUrl: string ): void {
	contents.setWindowOpenHandler( ( { url } ) => {
		void openExternalUrl( url ).catch( () => undefined );
		return { action: 'deny' };
	} );

	contents.on( 'will-navigate', ( event, url ) => {
		if ( url !== appUrl ) {
			event.preventDefault();
			void openExternalUrl( url ).catch( () => undefined );
		}
	} );

	contents.on( 'will-attach-webview', ( event ) => {
		// The app has no webview today. If one is ever added, it starts from a
		// known-safe configuration rather than the page's.
		event.preventDefault();
	} );
}

const CSP = [
	"default-src 'self'",
	"script-src 'self'",
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data:",
	"font-src 'self' data:",
	"connect-src 'self'",
	"base-uri 'none'",
	"form-action 'none'",
	"frame-ancestors 'none'"
].join( '; ' );

/**
 * A second copy of the policy, for responses that would otherwise lack it.
 * @param session
 */
export function applySessionSecurity( session: Session ): void {
	session.webRequest.onHeadersReceived( ( details, callback ) => {
		callback( {
			responseHeaders: {
				...( details.responseHeaders ?? {} ),
				'Content-Security-Policy': [ CSP ]
			}
		} );
	} );

	session.setPermissionRequestHandler( ( _contents, _permission, callback ) => {
		// The app asks for no camera, microphone, geolocation or notifications.
		callback( false );
	} );
}
