import os from 'os';
import path from 'path';

export function getConfigDirectory(): string {
	// A host app can own the engine's data instead of a shared home folder. The
	// host sets this for every engine child.
	if ( process.env.STUDIO_CONFIG_DIR ) {
		return process.env.STUDIO_CONFIG_DIR;
	}
	if ( process.env.DEV_CONFIG_DIR ) {
		return process.env.DEV_CONFIG_DIR;
	}
	return path.join( os.homedir(), '.studio' );
}

export function getCertificatesPath(): string {
	return path.join( getConfigDirectory(), 'certificates' );
}

export function getServerFilesPath(): string {
	return path.join( getConfigDirectory(), 'server-files' );
}

export function getMuPluginsPath(): string {
	return path.join( getConfigDirectory(), 'mu-plugins' );
}

export function getMuPluginSettingsPath(): string {
	return path.join( getMuPluginsPath(), 'settings.json' );
}
