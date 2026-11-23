import { CONFIG_VERSION } from './schema';
import type { RawConfig } from './store';

/**
 * siterun starts from its own config file and has never written an older
 * shape, so there are no data migrations to run. Keeping the entry point means a
 * future shape change has one place to land.
 */
export function migrateConfig( raw: RawConfig ): RawConfig {
	return { ...raw, version: CONFIG_VERSION };
}
