/** Everything the three processes agree on. No Electron and no DOM here. */

export type ThemePreference = 'system' | 'light' | 'dark';

export interface Preferences {
	/** How the window is painted. `system` follows the operating system. */
	theme: ThemePreference;
	/** Check the update feed when the app starts. */
	checkForUpdates: boolean;
	/** Where the folder picker starts when adding a site. */
	defaultSiteDirectory: string | null;
	/** The site that was open when the app was last closed. */
	lastSiteId: string | null;
}

export interface Site {
	id: string;
	name: string;
	path: string;
	url: string;
	port: number;
	running: boolean;
	phpVersion: string;
	/** Read from the site's own `version.php`, so it is right even if the CLI is not running. */
	wpVersion: string | null;
	customDomain: string | null;
	enableHttps: boolean;
	adminUsername: string;
	adminPassword: string | null;
	adminEmail: string | null;
	isWpAutoUpdating: boolean;
	enableXdebug: boolean;
	enableDebugLog: boolean;
	enableDebugDisplay: boolean;
	enableScriptDebug: boolean;
	environmentType: string | null;
	autoStart: boolean;
	sortOrder: number;
	/** The operation holding the site, if another surface started one. */
	operation: string | null;
}

export type SiteSource =
	| { kind: 'blank' }
	| { kind: 'blueprint-file'; filePath: string }
	| { kind: 'backup'; backupPath: string };

export interface CreateSiteParams {
	name: string;
	/** The directory the site itself goes in, not its parent. */
	path: string;
	wpVersion: string;
	phpVersion: string;
	source: SiteSource;
	customDomain: string | null;
	enableHttps: boolean;
	adminEmail: string | null;
	adminUsername: string | null;
	adminPassword: string | null;
}

export interface SiteSettingsPatch {
	name?: string;
	phpVersion?: string;
	wpVersion?: string;
	/** An empty string removes the custom domain. */
	customDomain?: string;
	enableHttps?: boolean;
	enableXdebug?: boolean;
	enableDebugLog?: boolean;
	enableDebugDisplay?: boolean;
	enableScriptDebug?: boolean;
	environmentType?: string;
	adminEmail?: string;
}

export type ExportMode = 'full' | 'content' | 'db';

export interface ExportRequest {
	siteId: string;
	mode: ExportMode;
	destination: string;
}

export interface WpCliResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

export interface VersionOption {
	value: string;
	label: string;
}

export interface CliCandidate {
	path: string;
	exists: boolean;
}

export interface AppInfo {
	version: string;
	platform: 'darwin' | 'win32' | 'linux' | string;
	cliReady: boolean;
	cliPath: string | null;
	cliSearched: CliCandidate[];
	/** Where the app keeps its settings, logs and preferences. */
	userDataPath: string;
	/** The user's home folder, so paths can be shown as `~/siterun/…`. */
	homePath: string;
}

export interface UpdateInfo {
	version: string;
	url: string;
	notes: string | null;
}

export type ProgressStatus = 'start' | 'progress' | 'success' | 'warning' | 'error';

export interface OperationProgress {
	id: string;
	siteId: string | null;
	label: string;
	message: string;
	status: ProgressStatus;
	done: boolean;
}

export interface DeleteResult {
	warnings: string[];
}

export interface DatabaseColumn {
	name: string;
	type: string;
	primaryKey: boolean;
	notNull: boolean;
}

export interface DatabaseTable {
	name: string;
	rows: number;
	columns: DatabaseColumn[];
}

export interface DatabaseSummary {
	siteId: string;
	path: string;
	size: number;
	modified: number;
	tables: DatabaseTable[];
}

export type DatabaseCell = string | number | boolean | null;

export type DatabaseRow = Record< string, DatabaseCell >;

export interface DatabaseRowsOptions {
	offset: number;
	limit: number;
	search?: string;
	orderBy?: string | null;
	direction?: 'asc' | 'desc';
}

export interface DatabaseRows {
	table: string;
	columns: DatabaseColumn[];
	rows: DatabaseRow[];
	total: number;
	offset: number;
	limit: number;
}

export interface DatabaseQueryResult {
	columns: string[];
	rows: DatabaseRow[];
	rowsAffected: number;
	truncated: boolean;
	durationMs: number;
}

export interface DatabaseBackup {
	path: string;
	size: number;
}

export interface DatabaseExportRequest {
	siteId: string;
	destination: string;
}

export interface DatabaseDropRequest {
	siteId: string;
	table: string;
	confirmation: string;
}

export type SqlMode = 'read' | 'write';


/** The surface the preload script exposes on `window.studio`. */
export interface StudioApi {
	getAppInfo: () => Promise< AppInfo >;
	getSites: () => Promise< Site[] >;
	createSite: ( params: CreateSiteParams ) => Promise< Site >;
	startSite: ( siteId: string ) => Promise< Site | null >;
	stopSite: ( siteId: string ) => Promise< Site | null >;
	deleteSite: ( siteId: string, deleteFiles: boolean ) => Promise< DeleteResult >;
	updateSite: ( siteId: string, patch: SiteSettingsPatch ) => Promise< Site | null >;
	importSite: ( siteId: string, backupPath: string ) => Promise< Site | null >;
	exportSite: ( request: ExportRequest ) => Promise< string >;

	openDatabase: ( siteId: string ) => Promise< DatabaseSummary >;
	refreshDatabase: ( siteId: string ) => Promise< DatabaseSummary >;
	databaseRows: (
		siteId: string,
		table: string,
		options: DatabaseRowsOptions
	) => Promise< DatabaseRows >;
	runDatabaseQuery: (
		siteId: string,
		sql: string,
		mode: SqlMode
	) => Promise< DatabaseQueryResult >;
	backupDatabase: ( siteId: string ) => Promise< DatabaseBackup >;
	enableDatabaseWrite: ( siteId: string ) => Promise< DatabaseBackup >;
	disableDatabaseWrite: ( siteId: string ) => Promise< void >;
	exportDatabase: ( request: DatabaseExportRequest ) => Promise< string >;
	dropDatabaseTable: ( request: DatabaseDropRequest ) => Promise< void >;
	closeDatabase: ( siteId: string ) => Promise< void >;

	chooseFolder: ( defaultPath?: string | null ) => Promise< string | null >;
	chooseBackupFile: () => Promise< string | null >;
	chooseBlueprintFile: () => Promise< string | null >;
	chooseExportDestination: ( suggestedName: string ) => Promise< string | null >;
	chooseDatabaseDestination: ( suggestedName: string ) => Promise< string | null >;

	getWordPressVersions: () => Promise< VersionOption[] >;

	openSite: ( siteId: string, destination: 'site' | 'admin' ) => Promise< void >;
	openExternal: ( url: string ) => Promise< void >;
	revealSite: ( siteId: string ) => Promise< void >;
	openTerminal: ( siteId: string ) => Promise< void >;
	copyText: ( text: string ) => Promise< void >;
	runWpCli: ( siteId: string, args: string[] ) => Promise< WpCliResult >;

	getPreferences: () => Promise< Preferences >;
	setPreferences: ( patch: Partial< Preferences > ) => Promise< Preferences >;
	checkForUpdates: () => Promise< UpdateInfo | null >;

	onSitesChanged: ( listener: () => void ) => () => void;
	onProgress: ( listener: ( progress: OperationProgress ) => void ) => () => void;
	onPreferencesChanged: ( listener: ( preferences: Preferences ) => void ) => () => void;
	onMenuCommand: ( listener: ( command: 'new-site' | 'settings' | 'about' ) => void ) => () => void;
}
