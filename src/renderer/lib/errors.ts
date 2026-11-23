/**
 * Electron prefixes IPC failures; what the user needs is the sentence after it.
 * @param error
 */
export function messageFrom( error: unknown ): string {
	const raw = error instanceof Error ? error.message : String( error );
	return raw
		.replace( /^Error invoking remote method '[^']+':\s*/, '' )
		.replace( /^Error:\s*/, '' )
		.trim();
}
