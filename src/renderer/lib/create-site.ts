export type SourceKind = 'blank' | 'blueprint-file' | 'backup';

export interface CreateFormValues {
	name: string;
	parentDirectory: string;
	sourceKind: SourceKind;
	blueprintPath: string | null;
	backupPath: string | null;
	customDomain: string;
	enableHttps: boolean;
}

export type CreateFormErrors = Partial< Record< 'name' | 'parentDirectory' | 'source' | 'customDomain', string > >;

const DOMAIN = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.local$/i;

export function slugify( value: string ): string {
	const slug = value
		.normalize( 'NFKD' )
		.replace( /[\u0300-\u036f]/g, '' )
		.toLowerCase()
		.replace( /[^a-z0-9]+/g, '-' )
		.replace( /^-+|-+$/g, '' )
		.slice( 0, 48 )
		.replace( /-+$/g, '' );
	return slug || 'my-site';
}

/**
 * Keeps the separator the parent already uses, so Windows paths stay Windows.
 * @param parent
 * @param child
 */
export function joinPath( parent: string, child: string ): string {
	const separator = parent.includes( '\\' ) && ! parent.includes( '/' ) ? '\\' : '/';
	return `${ parent.replace( /[\\/]+$/, '' ) }${ separator }${ child }`;
}

/**
 * A folder that does not collide with the sites already in the library.
 * @param parent
 * @param name
 * @param existing
 */
export function proposedSitePath( parent: string, name: string, existing: string[] ): string {
	const taken = new Set( existing.map( ( sitePath ) => sitePath.toLowerCase() ) );
	const base = slugify( name );
	let candidate = base;
	for ( let index = 2; index < 1000; index += 1 ) {
		const full = joinPath( parent, candidate ).toLowerCase();
		if ( ! taken.has( full ) ) {
			break;
		}
		candidate = `${ base }-${ index }`;
	}
	return joinPath( parent, candidate );
}

export function validateDomain( value: string ): string | null {
	if ( ! value.trim() ) {
		return null;
	}
	return DOMAIN.test( value.trim() )
		? null
		: 'A custom domain must end with .local, such as mysite.local.';
}

export function validateCreateForm( values: CreateFormValues ): CreateFormErrors {
	const errors: CreateFormErrors = {};

	if ( ! values.name.trim() ) {
		errors.name = 'Give the site a name.';
	} else if ( values.name.trim().length > 100 ) {
		errors.name = 'Keep the name under 100 characters.';
	}

	if ( ! values.parentDirectory.trim() ) {
		errors.parentDirectory = 'Choose where the site should live.';
	} else if ( ! /^(?:[a-zA-Z]:[\\/]|\/)/.test( values.parentDirectory ) ) {
		errors.parentDirectory = 'Choose an absolute folder.';
	}

	if ( values.sourceKind === 'blueprint-file' && ! values.blueprintPath ) {
		errors.source = 'Choose a Blueprint file.';
	}
	if ( values.sourceKind === 'backup' && ! values.backupPath ) {
		errors.source = 'Choose a backup to restore.';
	}

	const domainError = validateDomain( values.customDomain );
	if ( domainError ) {
		errors.customDomain = domainError;
	}
	if ( values.enableHttps && ! values.customDomain.trim() ) {
		errors.customDomain = 'HTTPS needs a custom domain.';
	}

	return errors;
}

export function hasErrors( errors: CreateFormErrors ): boolean {
	return Object.keys( errors ).length > 0;
}
