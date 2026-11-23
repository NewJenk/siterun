import fs from 'fs';
import path from 'path';
import { getConfiguredPhpBinaryPackageId } from '@studio/common/lib/php-binary-metadata';
import { getConfigDirectory, getServerFilesPath } from '@studio/common/lib/well-known-paths';
import { isSupportedPHPVersion, type SupportedPHPVersion } from '@studio/common/types/php-versions';

const PHP_BINARY_FILENAME = process.platform === 'win32' ? 'php.exe' : 'php';

function getPhpBinaryRoot(): string {
	return path.join( getConfigDirectory(), 'php-bin' );
}

function getExactPhpBinaryPath( version: string ): string {
	return path.join( getPhpBinaryRoot(), version, PHP_BINARY_FILENAME );
}

// PHP binaries live in ~/.studio/php-bin/<package-id>/. The default version also ships with
// Studio and is copied into this writable location by a CLI migration.
export function getPhpBinaryPath( version: SupportedPHPVersion | string ): string {
	if ( ! isSupportedPHPVersion( version ) ) {
		return getExactPhpBinaryPath( version );
	}

	const packageId = getConfiguredPhpBinaryPackageId( version );
	return getExactPhpBinaryPath( packageId ?? version );
}

const WP_CLI_PHAR_FILENAME = 'wp-cli.phar';
const SQLITE_COMMAND_DIRNAME = 'sqlite-command';

// The `wp-files` directory ships alongside the bundled CLI code (`dist/cli/wp-files`). Vite
// emits all chunks to the same output dir so `import.meta.dirname` works from any module.
export function getWpFilesPath(): string {
	return path.join( import.meta.dirname, 'wp-files' );
}

export function getWordPressVersionPath( version: string ): string {
	return path.join( getServerFilesPath(), 'wordpress-versions', version );
}

type BundledManifest = {
	wordpressVersion: string;
};

let bundledManifest: BundledManifest | undefined;

// Written by `scripts/download-wp-server-files.ts`. Undefined in a build made without it.
export function readBundledManifest(): BundledManifest | undefined {
	if ( ! bundledManifest ) {
		try {
			bundledManifest = JSON.parse(
				fs.readFileSync( path.join( getWpFilesPath(), 'manifest.json' ), 'utf8' )
			) as BundledManifest;
		} catch {
			return undefined;
		}
	}
	return bundledManifest;
}

// The latest WordPress ships zipped, with everything under `wordpress/`, and is unpacked into
// `getWordPressVersionPath( 'latest' )`.
export function getBundledWordPressZipPath(): string {
	return path.join( getWpFilesPath(), 'latest', 'wordpress.zip' );
}

// WP-CLI ships read-only with the CLI bundle. No writable cache needed.
export function getWpCliPharPath(): string {
	return path.join( getWpFilesPath(), 'wp-cli', WP_CLI_PHAR_FILENAME );
}

// SQLite command ships read-only with the CLI bundle. No writable cache needed.
export function getSqliteCommandPath(): string {
	return path.join( getWpFilesPath(), SQLITE_COMMAND_DIRNAME );
}

// Language packs ship as one `{locale}.zip` per bundled locale, unpacked into a new site's
// `wp-content/languages/` directory.
export function getLanguagePacksPath(): string {
	return path.join( getWpFilesPath(), 'latest', 'languages' );
}

export function getBlueprintsPharPath(): string {
	return path.join( getWpFilesPath(), 'blueprints', 'blueprints.phar' );
}

// Studio's own PHP helper scripts ship read-only with the CLI bundle under
// `dist/cli/php` (copied from `apps/cli/php` at build time by the `write-dist-extras`
// vite plugin). `import.meta.dirname` resolves to the bundle output dir.
function getBundledPhpPath(): string {
	return path.join( import.meta.dirname, 'php' );
}

// PHP driver that imports a WordPress export (WXR) file via the wordpress-importer plugin.
export function getBundledWxrImportScriptPath(): string {
	return path.join( getBundledPhpPath(), 'import-wxr.php' );
}

// The `sendmail_path` script that saves the email a site sends (see `@studio/common/sites/site-email`).
export function getBundledSendmailScriptPath(): string {
	return path.join( getBundledPhpPath(), 'sendmail.php' );
}

// The official wordpress-importer plugin's zip, holding a `wordpress-importer/` folder, saved into
// `wp-files/` at install time via the `FILES_TO_DOWNLOAD` registry in
// `scripts/download-wp-server-files.ts` and shipped in the CLI bundle. Unpacked into the site's
// `wp-content/plugins` before running a WXR import so the import works offline.
export function getBundledWordPressImporterZipPath(): string {
	return path.join( getWpFilesPath(), 'wordpress-importer.zip' );
}
