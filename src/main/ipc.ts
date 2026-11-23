import path from 'node:path';
import { app, clipboard, ipcMain, nativeTheme, type BrowserWindow } from 'electron';
import { IPC } from '@shared/ipc';
import type {
	AppInfo,
	CreateSiteParams,
	DatabaseDropRequest,
	DatabaseExportRequest,
	DatabaseRowsOptions,
	ExportRequest,
	OperationProgress,
	Preferences,
	SiteSettingsPatch
} from '@shared/types';
import { forgetResolvedCli, resolveCli } from './cli';
import {
	chooseBackupFile,
	chooseBlueprintFile,
	chooseDatabaseDestination,
	chooseExportDestination,
	chooseFolder
} from './dialogs';
import { DatabaseService } from './database';
import type { PreferencesStore } from './preferences';
import { openExternalUrl } from './security';
import { openFolder, openTerminal } from './shell';
import {
	createSite,
	deleteSite,
	exportSite,
	findSite,
	importSite,
	listSites,
	runWpCli,
	startSite,
	stopSite,
	updateSite,
	type ProgressSink
} from './sites';
import { checkForUpdates } from './updates';
import { getWordPressVersions } from './wordpress';

interface Options {
	window: BrowserWindow;
	preferences: PreferencesStore;
}

function isRecord( value: unknown ): value is Record< string, unknown > {
	return typeof value === 'object' && value !== null && ! Array.isArray( value );
}

export function registerIpc( { window, preferences }: Options ): () => void {
	const trusted = ( senderId: number ) => senderId === window.webContents.id;

	const handle = < T >( channel: string, handler: ( ...args: never[] ) => Promise< T > | T ) => {
		ipcMain.handle( channel, async ( event, ...args ) => {
			if ( ! trusted( event.sender.id ) ) {
				throw new Error( 'That request did not come from this window.' );
			}
			return handler( ...( args as never[] ) );
		} );
	};

	const progress: ProgressSink = ( payload: OperationProgress ) => {
		if ( ! window.isDestroyed() ) {
			window.webContents.send( IPC.progress, payload );
		}
	};

	const sitesChanged = () => {
		if ( ! window.isDestroyed() ) {
			window.webContents.send( IPC.sitesChanged );
		}
	};

	const database = new DatabaseService();

	const applyTheme = ( theme: Preferences[ 'theme' ] ) => {
		nativeTheme.themeSource = theme;
	};

	handle( IPC.appInfo, (): AppInfo => {
		// The engine may have been built after the window opened, so "Check
		// again" must look at the disk rather than a cached answer.
		forgetResolvedCli();
		const cli = resolveCli();
		return {
			version: app.getVersion(),
			platform: process.platform,
			cliReady: Boolean( cli.path ),
			cliPath: cli.path,
			cliSearched: cli.searched,
			userDataPath: app.getPath( 'userData' ),
			homePath: app.getPath( 'home' )
		};
	} );

	handle( IPC.sites, () => listSites() );

	handle( IPC.siteCreate, async ( params: CreateSiteParams ) => {
		if ( ! isRecord( params ) ) {
			throw new Error( 'The site details were not understood.' );
		}
		const site = await createSite( params, progress );
		sitesChanged();
		return site;
	} );

	handle( IPC.siteStart, async ( siteId: string ) => {
		const site = await startSite( siteId, progress );
		sitesChanged();
		return site;
	} );

	handle( IPC.siteStop, async ( siteId: string ) => {
		const site = await stopSite( siteId, progress );
		sitesChanged();
		return site;
	} );

	handle( IPC.siteDelete, async ( siteId: string, deleteFiles: boolean ) => {
		const result = await deleteSite( siteId, deleteFiles === true );
		sitesChanged();
		return result;
	} );

	handle( IPC.siteUpdate, async ( siteId: string, patch: SiteSettingsPatch ) => {
		if ( ! isRecord( patch ) ) {
			throw new Error( 'The settings were not understood.' );
		}
		const site = await updateSite( siteId, patch, progress );
		sitesChanged();
		return site;
	} );

	handle( IPC.siteImport, async ( siteId: string, backupPath: string ) => {
		const site = await importSite( siteId, backupPath, progress );
		sitesChanged();
		return site;
	} );

	handle( IPC.siteExport, async ( request: ExportRequest ) => {
		if ( ! isRecord( request ) ) {
			throw new Error( 'The export request was not understood.' );
		}
		const destination = await exportSite( request, progress );
		return destination;
	} );

	handle( IPC.databaseOpen, ( siteId: string ) => database.open( String( siteId ) ) );
	handle( IPC.databaseRefresh, ( siteId: string ) => database.refresh( String( siteId ) ) );

	handle(
		IPC.databaseRows,
		( siteId: string, table: string, options: DatabaseRowsOptions ) => {
			if ( ! isRecord( options ) ) {
				throw new Error( 'The table request was not understood.' );
			}
			return database.rows( String( siteId ), String( table ), options );
		}
	);

	handle( IPC.databaseQuery, ( siteId: string, sql: string, mode: 'read' | 'write' ) =>
		database.query( String( siteId ), String( sql ), mode === 'write' ? 'write' : 'read' )
	);

	handle( IPC.databaseBackup, ( siteId: string ) => database.backup( String( siteId ) ) );

	handle( IPC.databaseWrite, async ( siteId: string, enabled: boolean ) => {
		if ( enabled ) {
			return database.enableWrite( String( siteId ) );
		}
		await database.disableWrite( String( siteId ) );
		return null;
	} );

	handle( IPC.databaseExport, ( request: DatabaseExportRequest ) => {
		if ( ! isRecord( request ) ) {
			throw new Error( 'The database export was not understood.' );
		}
		return database.export( String( request.siteId ), String( request.destination ) );
	} );

	handle( IPC.databaseDrop, ( request: DatabaseDropRequest ) => {
		if ( ! isRecord( request ) ) {
			throw new Error( 'The drop request was not understood.' );
		}
		return database.drop( {
			siteId: String( request.siteId ),
			table: String( request.table ),
			confirmation: String( request.confirmation )
		} );
	} );

	handle( IPC.databaseClose, ( siteId: string ) => database.close( String( siteId ) ) );

	handle( IPC.databaseDestination, ( suggestedName: string ) =>
		chooseDatabaseDestination( window, path.basename( String( suggestedName ) ) )
	);

	handle( IPC.siteOpen, async ( siteId: string, destination: 'site' | 'admin' ) => {
		const site = await findSite( siteId );
		const url = new URL( site.url );
		if ( destination === 'admin' ) {
			url.pathname = '/wp-admin/';
		}
		await openExternalUrl( url.toString() );
	} );

	handle( IPC.siteReveal, async ( siteId: string ) => {
		const site = await findSite( siteId );
		await openFolder( site.path );
	} );

	handle( IPC.siteTerminal, async ( siteId: string ) => {
		const site = await findSite( siteId );
		await openTerminal( site.path );
	} );

	handle( IPC.wpCli, async ( siteId: string, args: string[] ) => runWpCli( siteId, args ) );

	handle( IPC.folder, ( defaultPath?: string | null ) => chooseFolder( window, defaultPath ) );
	handle( IPC.backupFile, () => chooseBackupFile( window ) );
	handle( IPC.blueprintFile, () => chooseBlueprintFile( window ) );
	handle( IPC.exportDestination, ( suggestedName: string ) =>
		chooseExportDestination( window, path.basename( String( suggestedName ) ) )
	);

	handle( IPC.wordpressVersions, () => getWordPressVersions() );

	handle( IPC.external, async ( url: string ) => openExternalUrl( url ) );

	handle( IPC.copy, async ( value: string ) => {
		if ( typeof value === 'string' && value.length <= 10_000 ) {
			clipboard.writeText( value );
		}
	} );

	handle( IPC.preferences, () => preferences.get() );

	handle( IPC.preferencesSet, async ( patch: Partial< Preferences > ) => {
		if ( ! isRecord( patch ) ) {
			throw new Error( 'The preference was not understood.' );
		}
		const next = await preferences.set( patch );
		applyTheme( next.theme );
		if ( ! window.isDestroyed() ) {
			window.webContents.send( IPC.preferencesChanged, next );
		}
		return next;
	} );

	handle( IPC.updates, () => checkForUpdates() );

	const unsubscribe = preferences.onChange( ( next ) => applyTheme( next.theme ) );
	void preferences.get().then( ( current ) => applyTheme( current.theme ) );

	return () => {
		database.dispose();
		unsubscribe();
		for ( const channel of Object.values( IPC ) ) {
			if ( ! channel.startsWith( 'event:' ) ) {
				ipcMain.removeHandler( channel );
			}
		}
	};
}
