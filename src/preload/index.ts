import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/ipc';
import type {
	CreateSiteParams,
	DatabaseDropRequest,
	DatabaseExportRequest,
	DatabaseRowsOptions,
	ExportRequest,
	OperationProgress,
	Preferences,
	SiteSettingsPatch,
	SqlMode,
	StudioApi
} from '../shared/types';

function subscribe< T >( channel: string, listener: ( payload: T ) => void ): () => void {
	const handler = ( _event: unknown, payload: T ) => listener( payload );
	ipcRenderer.on( channel, handler );
	return () => ipcRenderer.removeListener( channel, handler );
}

/**
 * The only bridge between the window and the machine. Every method is a named
 * operation with validated arguments; the Electron event, the IPC channel and
 * the Node runtime are not reachable from the page.
 */
const api: StudioApi = {
	getAppInfo: () => ipcRenderer.invoke( IPC.appInfo ),
	getSites: () => ipcRenderer.invoke( IPC.sites ),
	createSite: ( params: CreateSiteParams ) => ipcRenderer.invoke( IPC.siteCreate, params ),
	startSite: ( siteId: string ) => ipcRenderer.invoke( IPC.siteStart, siteId ),
	stopSite: ( siteId: string ) => ipcRenderer.invoke( IPC.siteStop, siteId ),
	deleteSite: ( siteId: string, deleteFiles: boolean ) =>
		ipcRenderer.invoke( IPC.siteDelete, siteId, deleteFiles ),
	updateSite: ( siteId: string, patch: SiteSettingsPatch ) =>
		ipcRenderer.invoke( IPC.siteUpdate, siteId, patch ),
	importSite: ( siteId: string, backupPath: string ) =>
		ipcRenderer.invoke( IPC.siteImport, siteId, backupPath ),
	exportSite: ( request: ExportRequest ) => ipcRenderer.invoke( IPC.siteExport, request ),

	openDatabase: ( siteId: string ) => ipcRenderer.invoke( IPC.databaseOpen, siteId ),
	refreshDatabase: ( siteId: string ) => ipcRenderer.invoke( IPC.databaseRefresh, siteId ),
	databaseRows: ( siteId: string, table: string, options: DatabaseRowsOptions ) =>
		ipcRenderer.invoke( IPC.databaseRows, siteId, table, options ),
	runDatabaseQuery: ( siteId: string, sql: string, mode: SqlMode ) =>
		ipcRenderer.invoke( IPC.databaseQuery, siteId, sql, mode ),
	backupDatabase: ( siteId: string ) => ipcRenderer.invoke( IPC.databaseBackup, siteId ),
	enableDatabaseWrite: ( siteId: string ) => ipcRenderer.invoke( IPC.databaseWrite, siteId, true ),
	disableDatabaseWrite: ( siteId: string ) => ipcRenderer.invoke( IPC.databaseWrite, siteId, false ),
	exportDatabase: ( request: DatabaseExportRequest ) =>
		ipcRenderer.invoke( IPC.databaseExport, request ),
	dropDatabaseTable: ( request: DatabaseDropRequest ) =>
		ipcRenderer.invoke( IPC.databaseDrop, request ),
	closeDatabase: ( siteId: string ) => ipcRenderer.invoke( IPC.databaseClose, siteId ),

	chooseFolder: ( defaultPath?: string | null ) => ipcRenderer.invoke( IPC.folder, defaultPath ),
	chooseBackupFile: () => ipcRenderer.invoke( IPC.backupFile ),
	chooseBlueprintFile: () => ipcRenderer.invoke( IPC.blueprintFile ),
	chooseExportDestination: ( suggestedName: string ) =>
		ipcRenderer.invoke( IPC.exportDestination, suggestedName ),
	chooseDatabaseDestination: ( suggestedName: string ) =>
		ipcRenderer.invoke( IPC.databaseDestination, suggestedName ),

	getWordPressVersions: () => ipcRenderer.invoke( IPC.wordpressVersions ),

	openSite: ( siteId: string, destination: 'site' | 'admin' ) =>
		ipcRenderer.invoke( IPC.siteOpen, siteId, destination ),
	openExternal: ( url: string ) => ipcRenderer.invoke( IPC.external, url ),
	revealSite: ( siteId: string ) => ipcRenderer.invoke( IPC.siteReveal, siteId ),
	openTerminal: ( siteId: string ) => ipcRenderer.invoke( IPC.siteTerminal, siteId ),
	copyText: ( text: string ) => ipcRenderer.invoke( IPC.copy, text ),
	runWpCli: ( siteId: string, args: string[] ) => ipcRenderer.invoke( IPC.wpCli, siteId, args ),

	getPreferences: () => ipcRenderer.invoke( IPC.preferences ),
	setPreferences: ( patch: Partial< Preferences > ) =>
		ipcRenderer.invoke( IPC.preferencesSet, patch ),
	checkForUpdates: () => ipcRenderer.invoke( IPC.updates ),

	onSitesChanged: ( listener: () => void ) => subscribe( IPC.sitesChanged, listener ),
	onProgress: ( listener: ( progress: OperationProgress ) => void ) =>
		subscribe( IPC.progress, listener ),
	onPreferencesChanged: ( listener: ( preferences: Preferences ) => void ) =>
		subscribe( IPC.preferencesChanged, listener ),
	onMenuCommand: ( listener: ( command: 'new-site' | 'settings' | 'about' ) => void ) =>
		subscribe( IPC.menuCommand, listener )
};

contextBridge.exposeInMainWorld( 'studio', api );
