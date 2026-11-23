import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { __, sprintf } from '@wordpress/i18n';
import { Button, Notice, Spinner, Stack, Text } from '@wordpress/ui';
import { SiterunWordmark } from './components/SiterunWordmark';
import type {
	CreateSiteParams,
	ExportMode,
	Site,
	SiteSettingsPatch,
	UpdateInfo,
	VersionOption
} from '@shared/types';
import { AboutDialog } from './components/AboutDialog';
import { AppTheme } from './components/AppTheme';
import { CliMissing } from './components/CliMissing';
import { CreateSiteDialog } from './components/CreateSiteDialog';
import { DatabaseDialog } from './components/DatabaseDialog';
import { DeleteSiteDialog } from './components/DeleteSiteDialog';
import { EmptyWorkspace } from './components/EmptyWorkspace';
import { ExportDialog } from './components/ExportDialog';
import { PreferencesDialog } from './components/PreferencesDialog';
import { RestoreDialog } from './components/RestoreDialog';
import { SitePage } from './components/SitePage';
import { SiteSettingsDialog } from './components/SiteSettingsDialog';
import { SitesSidebar } from './components/SitesSidebar';
import { useToast } from './components/ToastStack';
import { WpCliDialog } from './components/WpCliDialog';
import { useAppInfo } from './hooks/useAppInfo';
import { usePreferences } from './hooks/usePreferences';
import { useProgress } from './hooks/useProgress';
import { useSites } from './hooks/useSites';
import { slugify, type SourceKind } from './lib/create-site';
import { messageFrom } from './lib/errors';

type Dialog =
	| { kind: 'create'; source: SourceKind }
	| { kind: 'preferences' }
	| { kind: 'site-settings'; siteId: string }
	| { kind: 'delete'; siteId: string }
	| { kind: 'export'; siteId: string }
	| { kind: 'restore'; siteId: string }
	| { kind: 'wp-cli'; siteId: string }
	| { kind: 'database'; tab: 'browse' | 'sql' }
	| { kind: 'about' };

function Loading() {
	return (
		<main className="app-loading">
			<SiterunWordmark className="loading-wordmark" />
			<Spinner />
			<Text variant="body-md" className="muted">
				{ __( 'Looking for your sites…', 'siterun' ) }
			</Text>
		</main>
	);
}

function UpdateBanner( { update }: { update: UpdateInfo } ) {
	return (
		<Notice.Root intent="info">
			<Notice.Description>
				{ sprintf(
					/* translators: %s: the newer version number. */
					__( 'Version %s is available.', 'siterun' ),
					update.version
				) }{ ' ' }
				{ update.notes }
			</Notice.Description>
			<Notice.Actions>
				<Button
					variant="outline"
					tone="neutral"
					size="compact"
					onClick={ () => void window.studio.openExternal( update.url ) }
				>
					{ __( 'Download', 'siterun' ) }
				</Button>
			</Notice.Actions>
		</Notice.Root>
	);
}

export function App() {
	const toast = useToast();
	const { info, error: infoError, refresh: refreshInfo } = useAppInfo();
	const { sites, loading, error: sitesError, refresh } = useSites();
	const { preferences, update } = usePreferences();
	const [ selectedId, setSelectedId ] = useState< string | null >( null );
	const [ pendingSiteId, setPendingSiteId ] = useState< string | null >( null );
	const [ dialog, setDialog ] = useState< Dialog | null >( null );
	const [ versions, setVersions ] = useState< VersionOption[] >( [] );
	const [ updateAvailable, setUpdateAvailable ] = useState< UpdateInfo | null >( null );
	const checkedForUpdates = useRef( false );

	const busy = useProgress( () => {
		void refresh();
	} );

	const selected = sites.find( ( site ) => site.id === selectedId ) ?? null;

	const attempt = useCallback(
		async ( work: () => Promise< void >, success?: string ) => {
			try {
				await work();
				if ( success ) {
					toast( success, 'success' );
				}
			} catch ( error ) {
				toast( messageFrom( error ), 'error' );
			}
		},
		[ toast ]
	);

	// Keep a sensible selection: a newly created site as soon as it appears,
	// then the last site opened, then the first one.
	useEffect( () => {
		if ( pendingSiteId ) {
			if ( sites.some( ( site ) => site.id === pendingSiteId ) ) {
				setSelectedId( pendingSiteId );
				setPendingSiteId( null );
			}
			return;
		}
		if ( sites.length === 0 ) {
			if ( selectedId ) {
				setSelectedId( null );
			}
			return;
		}
		if ( selectedId && sites.some( ( site ) => site.id === selectedId ) ) {
			return;
		}
		const last = preferences?.lastSiteId;
		setSelectedId( sites.find( ( site ) => site.id === last )?.id ?? sites[ 0 ]?.id ?? null );
	}, [ sites, selectedId, preferences?.lastSiteId, pendingSiteId ] );

	useEffect( () => {
		document.title = selected ? `${ selected.name } — siterun` : 'siterun';
	}, [ selected ] );

	useEffect( () => {
		return window.studio.onMenuCommand( ( command ) => {
			if ( command === 'new-site' ) {
				setDialog( { kind: 'create', source: 'blank' } );
			} else if ( command === 'settings' ) {
				setDialog( { kind: 'preferences' } );
			} else {
				setDialog( { kind: 'about' } );
			}
		} );
	}, [] );

	// The version list is needed by both dialogs.
	useEffect( () => {
		if ( dialog?.kind !== 'create' && dialog?.kind !== 'site-settings' ) {
			return;
		}
		let alive = true;
		void window.studio.getWordPressVersions().then( ( next ) => {
			if ( alive ) {
				setVersions( next );
			}
		} );
		return () => {
			alive = false;
		};
	}, [ dialog?.kind ] );

	useEffect( () => {
		if ( ! preferences?.checkForUpdates || checkedForUpdates.current ) {
			return;
		}
		checkedForUpdates.current = true;
		void window.studio
			.checkForUpdates()
			.then( setUpdateAvailable )
			.catch( () => undefined );
	}, [ preferences?.checkForUpdates ] );

	const select = ( siteId: string ) => {
		setPendingSiteId( null );
		setSelectedId( siteId );
		void update( { lastSiteId: siteId } ).catch( () => undefined );
	};

	const create = ( params: CreateSiteParams ) => {
		void attempt( async () => {
			const site = await window.studio.createSite( params );
			await refresh();
			setPendingSiteId( site.id );
			void update( { lastSiteId: site.id } ).catch( () => undefined );
			setDialog( null );
			toast( sprintf( /* translators: %s: site name. */ __( '%s is ready.', 'siterun' ), site.name ), 'success' );
		} );
	};

	const start = ( site: Site ) => {
		void attempt( async () => {
			await window.studio.startSite( site.id );
			await refresh();
		}, sprintf( /* translators: %s: site name. */ __( '%s is running.', 'siterun' ), site.name ) );
	};

	const stop = ( site: Site ) => {
		void attempt( async () => {
			await window.studio.stopSite( site.id );
			await refresh();
		}, sprintf( /* translators: %s: site name. */ __( '%s is stopped.', 'siterun' ), site.name ) );
	};

	const remove = ( site: Site, deleteFiles: boolean ) => {
		void attempt( async () => {
			const result = await window.studio.deleteSite( site.id, deleteFiles );
			setDialog( null );
			setPendingSiteId( null );
			setSelectedId( null );
			await refresh();
			if ( result.warnings.length > 0 ) {
				toast( `${ site.name } was deleted. ${ result.warnings.join( ' ' ) }`, 'warning' );
			} else {
				toast(
					sprintf( /* translators: %s: site name. */ __( '%s was deleted.', 'siterun' ), site.name ),
					'success'
				);
			}
		} );
	};

	const saveSettings = ( site: Site, patch: SiteSettingsPatch ) => {
		void attempt( async () => {
			await window.studio.updateSite( site.id, patch );
			setDialog( null );
			await refresh();
		}, __( 'Settings saved.', 'siterun' ) );
	};

	const exportSite = ( site: Site, mode: ExportMode ) => {
		void attempt( async () => {
			const destination = await window.studio.chooseExportDestination(
				`${ slugify( site.name ) }.zip`
			);
			if ( ! destination ) {
				return;
			}
			await window.studio.exportSite( { siteId: site.id, mode, destination } );
			setDialog( null );
			toast(
				sprintf(
					/* translators: %s: where the archive was saved. */
					__( 'Backup saved to %s', 'siterun' ),
					destination
				),
				'success'
			);
		} );
	};

	const restore = ( site: Site, backupPath: string ) => {
		void attempt( async () => {
			await window.studio.importSite( site.id, backupPath );
			setDialog( null );
			await refresh();
		}, __( 'The backup was restored.', 'siterun' ) );
	};

	const copy = ( value: string, label: string ) => {
		void attempt( () => window.studio.copyText( value ), label );
	};

	const open = ( site: Site, destination: 'site' | 'admin' ) => {
		void attempt( () => window.studio.openSite( site.id, destination ) );
	};

	const dialogSite = ( id: string ) => sites.find( ( site ) => site.id === id ) ?? null;
	const busyFor = ( site: Site ) => ( busy?.siteId === site.id ? busy : null );
	const preference = preferences?.theme ?? 'system';

	let workspace: ReactNode = null;
	if ( sites.length === 0 ) {
		workspace = (
			<EmptyWorkspace
				onCreate={ () => setDialog( { kind: 'create', source: 'blank' } ) }
				onRestore={ () => setDialog( { kind: 'create', source: 'backup' } ) }
			/>
		);
	} else if ( selected ) {
		workspace = (
			<SitePage
				site={ selected }
				homePath={ info?.homePath ?? null }
				busy={ busyFor( selected ) }
				onStart={ () => start( selected ) }
				onStop={ () => stop( selected ) }
				onSettings={ () => setDialog( { kind: 'site-settings', siteId: selected.id } ) }
				onExport={ () => setDialog( { kind: 'export', siteId: selected.id } ) }
				onRestore={ () => setDialog( { kind: 'restore', siteId: selected.id } ) }
				onWpCli={ () => setDialog( { kind: 'wp-cli', siteId: selected.id } ) }
				onDelete={ () => setDialog( { kind: 'delete', siteId: selected.id } ) }
				onDatabase={ ( tab ) => setDialog( { kind: 'database', tab } ) }
				onOpen={ ( destination ) => open( selected, destination ) }
				onReveal={ () => void attempt( () => window.studio.revealSite( selected.id ) ) }
				onTerminal={ () => void attempt( () => window.studio.openTerminal( selected.id ) ) }
				onCopy={ copy }
			/>
		);
	}

	let content: ReactNode;
	if ( infoError ) {
		content = (
			<main className="app-loading">
				<Notice.Root intent="error" role="alert">
					<Notice.Description>{ messageFrom( infoError ) }</Notice.Description>
				</Notice.Root>
			</main>
		);
	} else if ( loading && sites.length === 0 ) {
		content = <Loading />;
	} else {
		content = (
			<div className={ sites.length === 0 ? 'app-shell is-empty' : 'app-shell' }>
				{ sites.length > 0 ? (
					<SitesSidebar
						sites={ sites }
						selectedId={ selectedId }
						homePath={ info?.homePath ?? null }
						version={ info?.version ?? '' }
						onSelect={ select }
						onCreate={ () => setDialog( { kind: 'create', source: 'blank' } ) }
						onOpenSettings={ () => setDialog( { kind: 'preferences' } ) }
					/>
				) : null }

				<div className="app-main">
					{ updateAvailable || sitesError ? (
						<div className="app-banners">
							{ updateAvailable ? <UpdateBanner update={ updateAvailable } /> : null }
							{ sitesError ? (
								<Notice.Root intent="error" role="alert">
									<Notice.Description>{ sitesError }</Notice.Description>
									<Notice.Actions>
										<Stack direction="row" gap="sm">
											<Button
												variant="outline"
												tone="neutral"
												size="compact"
												onClick={ () => void refresh() }
											>
												{ __( 'Try again', 'siterun' ) }
											</Button>
											<Button
												variant="minimal"
												tone="neutral"
												size="compact"
												onClick={ () => setDialog( { kind: 'about' } ) }
											>
												{ __( 'Diagnostics', 'siterun' ) }
											</Button>
										</Stack>
									</Notice.Actions>
								</Notice.Root>
							) : null }
						</div>
					) : null }
					{ workspace }
				</div>
			</div>
		);
	}

	if ( info && ! info.cliReady ) {
		return (
			<AppTheme preference={ preference }>
				<div className="app-root">
					<CliMissing info={ info } onRetry={ refreshInfo } onCopy={ copy } />
				</div>
			</AppTheme>
		);
	}

	return (
		<AppTheme preference={ preference }>
			<div className="app-root">
				{ content }

				<CreateSiteDialog
					open={ dialog?.kind === 'create' }
					initialSource={ dialog?.kind === 'create' ? dialog.source : 'blank' }
					busy={ dialog?.kind === 'create' ? busy : null }
					defaultParent={ preferences?.defaultSiteDirectory ?? null }
					existingPaths={ sites.map( ( site ) => site.path ) }
					versions={ versions }
					onCreate={ create }
					onClose={ () => setDialog( null ) }
					onPickParent={ ( initial ) => window.studio.chooseFolder( initial ) }
					onPickBlueprintFile={ () => window.studio.chooseBlueprintFile() }
					onPickBackup={ () => window.studio.chooseBackupFile() }
				/>

				<PreferencesDialog
					preferences={ preferences }
					open={ dialog?.kind === 'preferences' }
					onClose={ () => setDialog( null ) }
					onChange={ ( patch ) =>
						void update( patch ).catch( ( error ) => toast( messageFrom( error ), 'error' ) )
					}
					onPickFolder={ ( initial ) => window.studio.chooseFolder( initial ) }
				/>

				{ dialog?.kind === 'site-settings' && dialogSite( dialog.siteId ) ? (
					<SiteSettingsDialog
						site={ dialogSite( dialog.siteId ) }
						open
						busy={ busy }
						versions={ versions }
						onSave={ ( patch ) => {
							const site = dialogSite( dialog.siteId );
							if ( site ) {
								saveSettings( site, patch );
							}
						} }
						onClose={ () => setDialog( null ) }
					/>
				) : null }

				{ dialog?.kind === 'delete' && dialogSite( dialog.siteId ) ? (
					<DeleteSiteDialog
						site={ dialogSite( dialog.siteId ) }
						open
						busy={ busy }
						onConfirm={ ( deleteFiles ) => {
							const site = dialogSite( dialog.siteId );
							if ( site ) {
								remove( site, deleteFiles );
							}
						} }
						onClose={ () => setDialog( null ) }
					/>
				) : null }

				{ dialog?.kind === 'export' && dialogSite( dialog.siteId ) ? (
					<ExportDialog
						site={ dialogSite( dialog.siteId ) }
						open
						busy={ busy }
						onExport={ ( mode ) => {
							const site = dialogSite( dialog.siteId );
							if ( site ) {
								exportSite( site, mode );
							}
						} }
						onClose={ () => setDialog( null ) }
					/>
				) : null }

				{ dialog?.kind === 'restore' && dialogSite( dialog.siteId ) ? (
					<RestoreDialog
						site={ dialogSite( dialog.siteId ) }
						open
						busy={ busy }
						onRestore={ ( backupPath ) => {
							const site = dialogSite( dialog.siteId );
							if ( site ) {
								restore( site, backupPath );
							}
						} }
						onClose={ () => setDialog( null ) }
						onPickBackup={ () => window.studio.chooseBackupFile() }
					/>
				) : null }

				{ dialog?.kind === 'wp-cli' && dialogSite( dialog.siteId ) ? (
					<WpCliDialog
						site={ dialogSite( dialog.siteId ) }
						open
						onRun={ ( args ) => window.studio.runWpCli( dialog.siteId, args ) }
						onClose={ () => setDialog( null ) }
					/>
				) : null }

				{ selected && dialog?.kind === 'database' ? (
					<DatabaseDialog
						site={ selected }
						open
						initialTab={ dialog.tab }
						onClose={ () => setDialog( null ) }
						onRefreshSite={ refresh }
					/>
				) : null }

				<AboutDialog
					info={ info }
					open={ dialog?.kind === 'about' }
					onClose={ () => setDialog( null ) }
					onCopy={ copy }
					onRetry={ refreshInfo }
				/>
			</div>
		</AppTheme>
	);
}
