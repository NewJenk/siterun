import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { __, _n, sprintf } from '@wordpress/i18n';
import {
	chevronDown,
	chevronLeft,
	chevronRight,
	chevronUp,
	copySmall,
	table,
	update
} from '@wordpress/icons';
import {
	Badge,
	Button,
	Dialog,
	Icon,
	IconButton,
	InputControl,
	Menu,
	Notice,
	Spinner,
	Stack,
	Tabs,
	TextareaControl,
	Text
} from '@wordpress/ui';
import type {
	DatabaseBackup,
	DatabaseCell,
	DatabaseQueryResult,
	DatabaseRow,
	DatabaseRows,
	DatabaseSummary,
	Site
} from '@shared/types';
import { slugify } from '../lib/create-site';
import { messageFrom } from '../lib/errors';
import { useToast } from './ToastStack';

interface Props {
	site: Site;
	open: boolean;
	initialTab: 'browse' | 'sql';
	onClose: () => void;
	onRefreshSite: () => Promise< void >;
}

const PAGE_SIZE = 50;
const DESTRUCTIVE = /^\s*(?:DROP|ALTER|CREATE|DELETE|UPDATE|REPLACE|TRUNCATE|VACUUM|REINDEX|ANALYZE)\b/i;

function formatBytes( bytes: number ): string {
	if ( bytes < 1024 ) {
		return `${ bytes } B`;
	}
	if ( bytes < 1024 * 1024 ) {
		return `${ ( bytes / 1024 ).toFixed( 1 ) } KB`;
	}
	return `${ ( bytes / 1024 / 1024 ).toFixed( 1 ) } MB`;
}

function cellText( value: DatabaseCell ): string {
	if ( value === null ) {
		return 'NULL';
	}
	return String( value );
}

function ResultTable( {
	columns,
	rows,
	empty = __( 'No rows.', 'siterun' )
}: {
	columns: string[];
	rows: DatabaseRow[];
	empty?: string;
} ) {
	if ( rows.length === 0 ) {
		return (
			<Text variant="body-sm" className="muted">
				{ empty }
			</Text>
		);
	}
	return (
		<div className="db-result-scroll">
			<table className="db-table">
				<thead>
					<tr>
						{ columns.map( ( column ) => (
							<th key={ column }>{ column }</th>
						) ) }
					</tr>
				</thead>
				<tbody>
					{ rows.map( ( row, index ) => (
						<tr key={ index }>
							{ columns.map( ( column ) => (
								<td
									key={ column }
									className={ row[ column ] === null ? 'db-null' : undefined }
									title={ cellText( row[ column ] ?? null ) }
								>
									{ cellText( row[ column ] ?? null ) }
								</td>
							) ) }
						</tr>
					) ) }
				</tbody>
			</table>
		</div>
	);
}

export function DatabaseDialog( { site, open, initialTab, onClose, onRefreshSite }: Props ) {
	const toast = useToast();
	const [ tab, setTab ] = useState< 'browse' | 'sql' >( initialTab );
	const [ summary, setSummary ] = useState< DatabaseSummary | null >( null );
	const [ summaryError, setSummaryError ] = useState< string | null >( null );
	const [ tableFilter, setTableFilter ] = useState( '' );
	const [ selectedTable, setSelectedTable ] = useState< string | null >( null );
	const [ rows, setRows ] = useState< DatabaseRows | null >( null );
	const [ rowsLoading, setRowsLoading ] = useState( false );
	const [ rowsError, setRowsError ] = useState< string | null >( null );
	const [ offset, setOffset ] = useState( 0 );
	const [ searchInput, setSearchInput ] = useState( '' );
	const [ search, setSearch ] = useState( '' );
	const [ orderBy, setOrderBy ] = useState< string | null >( null );
	const [ direction, setDirection ] = useState< 'asc' | 'desc' >( 'asc' );
	const [ selectedCell, setSelectedCell ] = useState< {
		column: string;
		value: DatabaseCell;
	} | null >( null );
	const [ reloadKey, setReloadKey ] = useState( 0 );

	const [ sql, setSql ] = useState(
		"SELECT option_name, option_value FROM wp_options WHERE option_name LIKE 'siteurl%' LIMIT 20"
	);
	const [ queryResult, setQueryResult ] = useState< DatabaseQueryResult | null >( null );
	const [ queryError, setQueryError ] = useState< string | null >( null );
	const [ queryRunning, setQueryRunning ] = useState( false );

	const [ writeMode, setWriteMode ] = useState( false );
	const [ backup, setBackup ] = useState< DatabaseBackup | null >( null );
	const [ writeBusy, setWriteBusy ] = useState( false );
	const [ siteBusy, setSiteBusy ] = useState( false );
	const [ stoppedForWrite, setStoppedForWrite ] = useState( false );
	const [ footerBusy, setFooterBusy ] = useState( false );

	const [ confirm, setConfirm ] = useState< {
		title: string;
		body: ReactNode;
		confirmLabel: string;
		action: () => Promise< void >;
	} | null >( null );
	const [ confirmBusy, setConfirmBusy ] = useState( false );
	const [ drop, setDrop ] = useState< { table: string; value: string } | null >( null );

	const wasOpen = useRef( false );
	const initialTabRef = useRef( initialTab );
	const openSiteId = useRef( site.id );

	useEffect( () => {
		initialTabRef.current = initialTab;
	}, [ initialTab ] );

	const reloadSummary = useCallback( async () => {
		const next = await window.studio.refreshDatabase( site.id );
		setSummary( next );
		setSelectedTable( ( current ) =>
			current && next.tables.some( ( entry ) => entry.name === current )
				? current
				: next.tables[ 0 ]?.name ?? null
		);
		return next;
	}, [ site.id ] );

	useEffect( () => {
		if ( ! open ) {
			wasOpen.current = false;
			return;
		}
		if ( wasOpen.current ) {
			return;
		}
		wasOpen.current = true;
		openSiteId.current = site.id;
		setTab( initialTabRef.current );
		setSummary( null );
		setSummaryError( null );
		setSelectedTable( null );
		setRows( null );
		setRowsError( null );
		setSelectedCell( null );
		setQueryResult( null );
		setQueryError( null );
		setWriteMode( false );
		setBackup( null );
		setStoppedForWrite( false );
		setOffset( 0 );
		setSearchInput( '' );
		setSearch( '' );
		setOrderBy( null );
		setDirection( 'asc' );

		let alive = true;
		void window.studio
			.openDatabase( site.id )
			.then( ( next ) => {
				if ( ! alive ) {
					return;
				}
				setSummary( next );
				setSelectedTable( next.tables[ 0 ]?.name ?? null );
			} )
			.catch( ( error ) => {
				if ( alive ) {
					setSummaryError( messageFrom( error ) );
				}
			} );

		return () => {
			alive = false;
			if ( openSiteId.current ) {
				void window.studio.closeDatabase( openSiteId.current );
			}
		};
	}, [ open, site.id ] );

	useEffect( () => {
		if ( ! open || ! selectedTable ) {
			return;
		}
		let alive = true;
		setRowsLoading( true );
		setRowsError( null );
		void window.studio
			.databaseRows( site.id, selectedTable, {
				offset,
				limit: PAGE_SIZE,
				search,
				orderBy,
				direction
			} )
			.then( ( next ) => {
				if ( alive ) {
					setRows( next );
				}
			} )
			.catch( ( error ) => {
				if ( alive ) {
					setRowsError( messageFrom( error ) );
				}
			} )
			.finally( () => {
				if ( alive ) {
					setRowsLoading( false );
				}
			} );
		return () => {
			alive = false;
		};
	}, [ open, site.id, selectedTable, offset, search, orderBy, direction, reloadKey ] );

	useEffect( () => {
		const timer = window.setTimeout( () => {
			setSearch( searchInput.trim() );
			setOffset( 0 );
		}, 250 );
		return () => window.clearTimeout( timer );
	}, [ searchInput ] );

	const chooseTable = ( name: string ) => {
		if ( name === selectedTable ) {
			// A second click on the open table should not empty it. Use the
			// refresh control when a fresh read is wanted.
			return;
		}
		setSelectedTable( name );
		setOffset( 0 );
		setSearchInput( '' );
		setSearch( '' );
		setOrderBy( null );
		setDirection( 'asc' );
		setSelectedCell( null );
		setRows( null );
	};

	const sortBy = ( column: string ) => {
		setOffset( 0 );
		if ( orderBy === column ) {
			setDirection( ( current ) => ( current === 'asc' ? 'desc' : 'asc' ) );
		} else {
			setOrderBy( column );
			setDirection( 'asc' );
		}
	};

	const copy = ( value: string, label: string ) => {
		void window.studio
			.copyText( value )
			.then( () => toast( label, 'success' ) )
			.catch( ( error ) => toast( messageFrom( error ), 'error' ) );
	};

	const refreshAfterWrite = async () => {
		const next = await reloadSummary();
		if ( next.tables.some( ( entry ) => entry.name === selectedTable ) ) {
			setReloadKey( ( key ) => key + 1 );
		}
	};

	const execute = async ( statement: string, write: boolean ) => {
		setQueryRunning( true );
		setQueryError( null );
		try {
			const next = await window.studio.runDatabaseQuery(
				site.id,
				statement,
				write ? 'write' : 'read'
			);
			setQueryResult( next );
			if ( write ) {
				await refreshAfterWrite();
			}
		} catch ( error ) {
			setQueryError( messageFrom( error ) );
		} finally {
			setQueryRunning( false );
		}
	};

	const run = () => {
		const statement = sql.trim();
		if ( ! statement ) {
			return;
		}
		if ( writeMode && DESTRUCTIVE.test( statement ) ) {
			setConfirm( {
				title: __( 'Run this change?', 'siterun' ),
				body: (
					<Stack direction="column" gap="md">
						<Text variant="body-md">
							{ __(
								'This changes the database directly. WordPress will not be told, so check the site afterwards.',
								'siterun'
							) }
						</Text>
						<pre className="db-statement">{ statement }</pre>
						{ backup ? (
							<Text variant="body-sm" className="muted">
								{ sprintf(
									/* translators: %s: path to the backup file. */
									__( 'A backup is at %s', 'siterun' ),
									backup.path
								) }
							</Text>
						) : null }
					</Stack>
				),
				confirmLabel: __( 'Run statement', 'siterun' ),
				action: () => execute( statement, true )
			} );
			return;
		}
		void execute( statement, writeMode );
	};

	const stopForWrite = async () => {
		setSiteBusy( true );
		try {
			await window.studio.stopSite( site.id );
			await onRefreshSite();
			setStoppedForWrite( true );
			toast( __( 'Site stopped.', 'siterun' ), 'success' );
		} catch ( error ) {
			toast( messageFrom( error ), 'error' );
		} finally {
			setSiteBusy( false );
		}
	};

	const startAfterWrite = async () => {
		setSiteBusy( true );
		try {
			await window.studio.startSite( site.id );
			await onRefreshSite();
			setStoppedForWrite( false );
			toast( __( 'Site started.', 'siterun' ), 'success' );
		} catch ( error ) {
			toast( messageFrom( error ), 'error' );
		} finally {
			setSiteBusy( false );
		}
	};

	const requestWrite = () => {
		if ( site.running ) {
			toast( __( 'Stop the site before changing the database.', 'siterun' ), 'warning' );
			return;
		}
		setConfirm( {
			title: __( 'Enable write mode?', 'siterun' ),
			body: (
				<Stack direction="column" gap="md">
					<Text variant="body-md">
						{ __(
							'Changes run against SQLite directly, so WordPress does not know about them. Change the wrong row and the site can break.',
							'siterun'
						) }
					</Text>
					<Text variant="body-md">
						{ __(
							'A backup of the whole database is taken before write mode is enabled. You will get its path here.',
							'siterun'
						) }
					</Text>
					<Notice.Root intent="warning">
						<Notice.Description>
							{ __(
								'Write mode stays on until you turn it off or close this window.',
								'siterun'
							) }
						</Notice.Description>
					</Notice.Root>
				</Stack>
			),
			confirmLabel: __( 'Save backup and enable', 'siterun' ),
			action: async () => {
				const next = await window.studio.enableDatabaseWrite( site.id );
				setBackup( next );
				setWriteMode( true );
				toast( __( 'Write mode is on. A backup was saved.', 'siterun' ), 'success' );
			}
		} );
	};

	const disableWrite = async () => {
		setWriteBusy( true );
		try {
			await window.studio.disableDatabaseWrite( site.id );
			setWriteMode( false );
			setBackup( null );
			toast( __( 'Write mode is off.', 'siterun' ), 'success' );
			await refreshAfterWrite();
		} catch ( error ) {
			toast( messageFrom( error ), 'error' );
		} finally {
			setWriteBusy( false );
		}
	};

	const backupNow = async () => {
		setFooterBusy( true );
		try {
			const next = await window.studio.backupDatabase( site.id );
			setBackup( next );
			toast(
				sprintf(
					/* translators: %s: path to the backup file. */
					__( 'Backup saved to %s', 'siterun' ),
					next.path
				),
				'success'
			);
		} catch ( error ) {
			toast( messageFrom( error ), 'error' );
		} finally {
			setFooterBusy( false );
		}
	};

	const saveCopy = async () => {
		setFooterBusy( true );
		try {
			const destination = await window.studio.chooseDatabaseDestination(
				`${ slugify( site.name ) }.sqlite`
			);
			if ( ! destination ) {
				return;
			}
			await window.studio.exportDatabase( { siteId: site.id, destination } );
			toast(
				sprintf(
					/* translators: %s: where the database copy was saved. */
					__( 'Database saved to %s', 'siterun' ),
					destination
				),
				'success'
			);
		} catch ( error ) {
			toast( messageFrom( error ), 'error' );
		} finally {
			setFooterBusy( false );
		}
	};

	const confirmDrop = async () => {
		if ( ! drop ) {
			return;
		}
		setConfirmBusy( true );
		try {
			await window.studio.dropDatabaseTable( {
				siteId: site.id,
				table: drop.table,
				confirmation: drop.value
			} );
			toast(
				sprintf(
					/* translators: %s: the table that was dropped. */
					__( '%s was dropped.', 'siterun' ),
					drop.table
				),
				'success'
			);
			setDrop( null );
			await reloadSummary();
		} catch ( error ) {
			toast( messageFrom( error ), 'error' );
		} finally {
			setConfirmBusy( false );
		}
	};

	const runConfirm = async () => {
		if ( ! confirm ) {
			return;
		}
		setConfirmBusy( true );
		try {
			await confirm.action();
			setConfirm( null );
		} catch ( error ) {
			toast( messageFrom( error ), 'error' );
		} finally {
			setConfirmBusy( false );
		}
	};

	const visibleTables = ( summary?.tables ?? [] ).filter( ( entry ) =>
		entry.name.toLowerCase().includes( tableFilter.toLowerCase() )
	);
	const activeTable = summary?.tables.find( ( entry ) => entry.name === selectedTable ) ?? null;
	const total = rows?.total ?? 0;
	const canPrevious = offset > 0;
	const canNext = offset + PAGE_SIZE < total;

	return (
		<>
			<Dialog.Root
				open={ open }
			onOpenChange={ ( next ) => {
				if ( ! next ) {
					onClose();
				}
			} }
		>
			<Dialog.Popup size="stretch" className="database-dialog">
				<Dialog.Header>
					<Dialog.Title>{ sprintf( /* translators: %s: site name. */ __( 'Database · %s', 'siterun' ), site.name ) }</Dialog.Title>
					<Dialog.CloseIcon />
				</Dialog.Header>
				<Dialog.Content className="database-content">
					{ summaryError ? (
						<Notice.Root intent="error" role="alert">
							<Notice.Title>{ __( 'The database could not be opened', 'siterun' ) }</Notice.Title>
							<Notice.Description>{ summaryError }</Notice.Description>
						</Notice.Root>
					) : null }
					{ ! summaryError && ! summary ? (
						<div className="db-loading">
							<Spinner width={ 18 } height={ 18 } aria-hidden="true" /> <Text variant="body-sm">{ __( 'Reading the database…', 'siterun' ) }</Text>
						</div>
					) : null }
					{ ! summaryError && summary ? (
						<Tabs.Root
							value={ tab }
							onValueChange={ ( value ) => setTab( value as 'browse' | 'sql' ) }
							className="db-tabs"
						>
							<Tabs.List variant="minimal">
								<Tabs.Tab value="browse">{ __( 'Browse', 'siterun' ) }</Tabs.Tab>
								<Tabs.Tab value="sql">{ __( 'SQL', 'siterun' ) }</Tabs.Tab>
							</Tabs.List>

							<Tabs.Panel value="browse" className="db-panel">
								<div className="db-browser">
									<aside className="db-tables">
										<Stack
											direction="row"
											align="center"
											justify="space-between"
											className="db-tables-head"
										>
											<Text variant="body-sm" className="db-tables-title">
												{ __( 'Tables', 'siterun' ) }
											</Text>
											<Text variant="body-sm" className="muted">
												{ summary.tables.length }
											</Text>
										</Stack>
										<div className="db-table-filter">
											<InputControl
												label={ __( 'Filter tables', 'siterun' ) }
												hideLabelFromVision
												placeholder={ __( 'Filter tables', 'siterun' ) }
												value={ tableFilter }
												onChange={ ( event ) => setTableFilter( event.currentTarget.value ) }
											/>
										</div>
										<div className="db-table-list">
											{ visibleTables.map( ( entry ) => {
												const selected = selectedTable === entry.name;
												return (
													<Button
														key={ entry.name }
														className="db-table-item"
														variant="minimal"
														tone="neutral"
														size="compact"
														aria-pressed={ selected }
														aria-current={ selected ? 'true' : undefined }
														onClick={ () => chooseTable( entry.name ) }
													>
														<Icon icon={ table } size={ 16 } />
														<span className="db-table-name">{ entry.name }</span>
														<span className="db-table-count">
															{ entry.rows.toLocaleString() }
														</span>
													</Button>
												);
											} ) }
											{ visibleTables.length === 0 ? (
												<Text variant="body-sm" className="muted">
													{ __( 'No tables match.', 'siterun' ) }
												</Text>
											) : null }
										</div>
									</aside>

									{ activeTable ? (
										<section className="db-data">
											<header className="db-data-head">
												<div>
													<Text variant="heading-md" render={ <h2 /> }>
														{ activeTable.name }
													</Text>
													<Text variant="body-sm" className="muted">
														{ sprintf(
															/* translators: 1: row count, 2: column count. */
															__( '%1$s rows · %2$s columns', 'siterun' ),
															total.toLocaleString(),
															String( activeTable.columns.length )
														) }
													</Text>
												</div>
												<Stack direction="row" gap="sm" align="center">
													<InputControl
														label={ __( 'Search rows', 'siterun' ) }
														hideLabelFromVision
														type="search"
														placeholder={ __( 'Search rows', 'siterun' ) }
														value={ searchInput }
														onChange={ ( event ) => setSearchInput( event.currentTarget.value ) }
													/>
													<IconButton
														icon={ update }
														label={ __( 'Refresh table', 'siterun' ) }
														variant="minimal"
														tone="neutral"
														size="compact"
														disabled={ rowsLoading }
														onClick={ () => setReloadKey( ( key ) => key + 1 ) }
													/>
													<Menu.Root>
														<Menu.Trigger
															render={
																<Button
																	variant="outline"
																	tone="neutral"
																	size="compact"
																	aria-label={ __( 'Table actions', 'siterun' ) }
																>
																	{ __( 'Actions', 'siterun' ) }
																</Button>
															}
														/>
														<Menu.Popup>
															<Menu.Item
																disabled={ ! writeMode }
																onClick={ () => setDrop( { table: activeTable.name, value: '' } ) }
															>
																<Menu.ItemLabel>
																	{ __( 'Drop table…', 'siterun' ) }
																</Menu.ItemLabel>
																{ ! writeMode ? (
																	<Menu.ItemDescription>
																		{ __( 'Turn on write mode first.', 'siterun' ) }
																	</Menu.ItemDescription>
																) : null }
															</Menu.Item>
															<Menu.Item
																onClick={ () =>
																	copy(
																		activeTable.columns
																			.map( ( column ) => column.name )
																			.join( '\t' ),
																		__( 'Column names copied', 'siterun' )
																	)
																}
															>
																<Menu.ItemLabel>
																	{ __( 'Copy column names', 'siterun' ) }
																</Menu.ItemLabel>
															</Menu.Item>
														</Menu.Popup>
													</Menu.Root>
												</Stack>
											</header>

											{ rowsError ? (
												<Notice.Root intent="error" role="alert">
													<Notice.Description>{ rowsError }</Notice.Description>
												</Notice.Root>
											) : null }

											<div className="db-table-scroll">
												{ rowsLoading && ! rows ? (
													<div className="db-loading">
														<Spinner width={ 18 } height={ 18 } aria-hidden="true" /> { __( 'Loading rows…', 'siterun' ) }
													</div>
												) : (
													<table className="db-table">
														<thead>
															<tr>
																<th className="db-row-number">#</th>
																{ activeTable.columns.map( ( column ) => (
																	<th key={ column.name }>
																		<Button
																			variant="unstyled"
																			size="small"
																			className="db-sort"
																			onClick={ () => sortBy( column.name ) }
																		>
																			<span>{ column.name }</span>
																			{ orderBy === column.name ? (
																				<Icon
																					icon={
																						direction === 'asc'
																							? chevronUp
																							: chevronDown
																					}
																					size={ 14 }
																				/>
																			) : null }
																		</Button>
																		<span className="db-column-type">
																			{ column.type || '—' }
																		</span>
																	</th>
																) ) }
															</tr>
														</thead>
														<tbody>
															{ ( rows?.rows ?? [] ).map( ( row, index ) => (
																<tr key={ index }>
																	<td className="db-row-number">
																		{ offset + index + 1 }
																	</td>
																	{ activeTable.columns.map( ( column ) => {
																		const value = row[ column.name ] ?? null;
																		const selected =
																			selectedCell?.column === column.name &&
																			selectedCell?.value === value;
																		return (
																			<td
																				key={ column.name }
																				className={
																					value === null ? 'db-null' : undefined
																				}
																				data-selected={ selected || undefined }
																				onClick={ () =>
																					setSelectedCell( {
																						column: column.name,
																						value
																					} )
																				}
																			>
																				{ cellText( value ) }
																			</td>
																		);
																	} ) }
																</tr>
															) ) }
														</tbody>
													</table>
												) }
											</div>

											<footer className="db-pager">
												<Text variant="body-sm" className="muted">
													{ total === 0
														? __( 'No rows.', 'siterun' )
														: sprintf(
																/* translators: 1: first row number, 2: last row number, 3: total rows. */
																__( 'Rows %1$s–%2$s of %3$s', 'siterun' ),
																( offset + 1 ).toLocaleString(),
																( offset + ( rows?.rows.length ?? 0 ) ).toLocaleString(),
																total.toLocaleString()
														  ) }
												</Text>
												<Stack direction="row" gap="xs">
													<IconButton
														icon={ chevronLeft }
														label={ __( 'Previous page', 'siterun' ) }
														variant="minimal"
														tone="neutral"
														size="compact"
														disabled={ ! canPrevious }
														onClick={ () => setOffset( Math.max( 0, offset - PAGE_SIZE ) ) }
													/>
													<IconButton
														icon={ chevronRight }
														label={ __( 'Next page', 'siterun' ) }
														variant="minimal"
														tone="neutral"
														size="compact"
														disabled={ ! canNext }
														onClick={ () => setOffset( offset + PAGE_SIZE ) }
													/>
												</Stack>
											</footer>
										</section>
									) : (
										<div className="db-loading">
											<Text variant="body-md" className="muted">
												{ __( 'This database has no tables yet.', 'siterun' ) }
											</Text>
										</div>
									) }

									{ selectedCell ? (
										<div className="db-cell-detail">
											<div className="db-cell-head">
												<Text variant="heading-sm">
													{ activeTable?.name }.{ selectedCell.column }
												</Text>
												<Stack direction="row" gap="xs" align="center">
													<IconButton
														icon={ copySmall }
														label={ __( 'Copy value', 'siterun' ) }
														variant="minimal"
														tone="neutral"
														size="small"
														onClick={ () =>
															copy(
																cellText( selectedCell.value ),
																__( 'Value copied', 'siterun' )
															)
														}
													/>
													<Button
														variant="minimal"
														tone="neutral"
														size="compact"
														onClick={ () => setSelectedCell( null ) }
													>
														{ __( 'Close', 'siterun' ) }
													</Button>
												</Stack>
											</div>
											<pre className="db-cell-value">{ cellText( selectedCell.value ) }</pre>
										</div>
									) : null }
								</div>
							</Tabs.Panel>

							<Tabs.Panel value="sql" className="db-panel">
								<div className="db-sql">
									<div className="db-sql-head">
										<div>
											<Text variant="heading-md" render={ <h2 /> }>
												{ __( 'SQL console', 'siterun' ) }
											</Text>
											<Text variant="body-sm" className="muted">
												{ writeMode
													? __( 'One statement at a time. Changes are not undone.', 'siterun' )
													: __( 'Read-only. Turn on write mode to change data.', 'siterun' ) }
											</Text>
										</div>
										<Stack direction="row" gap="sm" align="center">
											<Badge intent={ writeMode ? 'high' : 'none' }>
												{ writeMode
													? __( 'Write mode', 'siterun' )
													: __( 'Read only', 'siterun' ) }
											</Badge>
											{ writeMode ? (
												<Button
													variant="outline"
													tone="neutral"
													size="compact"
													loading={ writeBusy }
													onClick={ disableWrite }
												>
													{ __( 'Turn off', 'siterun' ) }
												</Button>
											) : (
												<Button
													variant="outline"
													tone="neutral"
													size="compact"
													disabled={ site.running || siteBusy }
													onClick={ requestWrite }
												>
													{ __( 'Enable write mode', 'siterun' ) }
												</Button>
											) }
										</Stack>
									</div>

									{ site.running ? (
										<Notice.Root intent="info">
											<Notice.Description>
												{ __(
													'Stop the site to change the database. WordPress should not be reading it while you edit.',
													'siterun'
												) }
											</Notice.Description>
											<Notice.Actions>
												<Button
													variant="outline"
													tone="neutral"
													size="compact"
													loading={ siteBusy }
													onClick={ stopForWrite }
												>
													{ __( 'Stop site', 'siterun' ) }
												</Button>
											</Notice.Actions>
										</Notice.Root>
									) : null }

									{ ! site.running && stoppedForWrite ? (
										<Notice.Root intent="success">
											<Notice.Description>
												{ __( 'The site is stopped while you work.', 'siterun' ) }
											</Notice.Description>
											<Notice.Actions>
												<Button
													variant="outline"
													tone="neutral"
													size="compact"
													loading={ siteBusy }
													onClick={ startAfterWrite }
												>
													{ __( 'Start site', 'siterun' ) }
												</Button>
											</Notice.Actions>
										</Notice.Root>
									) : null }

									{ writeMode && backup ? (
										<Notice.Root intent="warning">
											<Notice.Description>
												{ sprintf(
													/* translators: %s: path to the backup file. */
													__( 'Write mode is on. A backup is at %s', 'siterun' ),
													backup.path
												) }
											</Notice.Description>
										</Notice.Root>
									) : null }

									<Stack direction="row" gap="xs" wrap="wrap">
										{ [
											"SELECT * FROM wp_posts LIMIT 10",
											"SELECT option_name, option_value FROM wp_options WHERE option_name LIKE 'siteurl%'",
											'PRAGMA table_info(wp_posts)'
										].map( ( example ) => (
											<Button
												key={ example }
												className="db-example"
												variant="minimal"
												tone="neutral"
												size="small"
												onClick={ () => setSql( example ) }
											>
												{ example }
											</Button>
										) ) }
									</Stack>

									<TextareaControl
										label={ __( 'SQL query', 'siterun' ) }
										hideLabelFromVision
										value={ sql }
										rows={ 6 }
										spellCheck={ false }
										onChange={ ( event ) => setSql( event.currentTarget.value ) }
										onKeyDown={ ( event ) => {
											if ( ( event.metaKey || event.ctrlKey ) && event.key === 'Enter' ) {
												event.preventDefault();
												run();
											}
										} }
									/>

									<Stack direction="row" gap="sm" align="center">
										<Button
											variant="solid"
											tone="brand"
											loading={ queryRunning }
											disabled={ writeMode && site.running }
											onClick={ run }
										>
											{ __( 'Run', 'siterun' ) }
										</Button>
										<Text variant="body-sm" className="muted">
											{ __( 'Command or Control + Enter', 'siterun' ) }
										</Text>
									</Stack>

									{ queryError ? (
										<Notice.Root intent="error" role="alert">
											<Notice.Description>{ queryError }</Notice.Description>
										</Notice.Root>
									) : null }

									{ queryResult ? (
										<div className="db-query-result">
											<Text variant="body-sm" className="muted">
												{ queryResult.columns.length === 0
													? [
															sprintf(
																/* translators: %s: milliseconds. */
																__( 'Statement completed in %s ms', 'siterun' ),
																String( queryResult.durationMs )
															),
															/^\s*(?:INSERT|UPDATE|DELETE|REPLACE)\b/i.test( sql ) &&
															queryResult.rowsAffected > 0
																? sprintf(
																		/* translators: %s: rows changed. */
																		_n(
																			'%s row changed',
																			'%s rows changed',
																			queryResult.rowsAffected,
																			'siterun'
																		),
																		queryResult.rowsAffected.toLocaleString()
																  )
																: ''
													  ]
															.filter( Boolean )
															.join( ' · ' )
													: sprintf(
															/* translators: 1: rows returned, 2: milliseconds. */
															__( '%1$s rows in %2$s ms', 'siterun' ),
															queryResult.rows.length.toLocaleString(),
															String( queryResult.durationMs )
													  ) }
												{ queryResult.truncated
													? ` · ${ __( 'showing the first 500', 'siterun' ) }`
													: '' }
											</Text>
											{ queryResult.columns.length > 0 ? (
												<ResultTable
													columns={ queryResult.columns }
													rows={ queryResult.rows }
													empty={ __( 'The statement returned no rows.', 'siterun' ) }
												/>
											) : null }
										</div>
									) : null }

								</div>
							</Tabs.Panel>
						</Tabs.Root>
					) : null }
				</Dialog.Content>
				<Dialog.Footer>
					<Stack direction="row" gap="sm" align="center" justify="space-between" className="db-footer">
						<Text variant="body-sm" className="muted">
							{ summary
								? `${ formatBytes( summary.size ) } · ${ new Date(
										summary.modified
								  ).toLocaleString() }`
								: '' }
						</Text>
						<Stack direction="row" gap="sm" align="center">
							<Button
								variant="outline"
								tone="neutral"
								size="compact"
								loading={ footerBusy }
								onClick={ backupNow }
							>
								{ __( 'Back up now', 'siterun' ) }
							</Button>
							<Button
								variant="outline"
								tone="neutral"
								size="compact"
								loading={ footerBusy }
								onClick={ saveCopy }
							>
								{ __( 'Save a copy…', 'siterun' ) }
							</Button>
							<Button variant="solid" tone="brand" size="compact" onClick={ onClose }>
								{ __( 'Close', 'siterun' ) }
							</Button>
						</Stack>
					</Stack>
				</Dialog.Footer>
			</Dialog.Popup>
		</Dialog.Root>

			<Dialog.Root
				open={ Boolean( confirm ) }
				onOpenChange={ ( next ) => {
					if ( ! next && ! confirmBusy ) {
						setConfirm( null );
					}
				} }
			>
				<Dialog.Popup size="small" className="db-confirm-dialog">
					<Dialog.Header>
						<Dialog.Title>{ confirm?.title }</Dialog.Title>
						{ confirmBusy ? null : <Dialog.CloseIcon /> }
					</Dialog.Header>
					<Dialog.Content>{ confirm?.body }</Dialog.Content>
					<Dialog.Footer>
						<Button
							variant="minimal"
							tone="neutral"
							disabled={ confirmBusy }
							onClick={ () => setConfirm( null ) }
						>
							{ __( 'Cancel', 'siterun' ) }
						</Button>
						<Button
							variant="solid"
							tone="brand"
							loading={ confirmBusy }
							loadingAnnouncement={ __( 'Working', 'siterun' ) }
							onClick={ runConfirm }
						>
							{ confirm?.confirmLabel }
						</Button>
					</Dialog.Footer>
				</Dialog.Popup>
			</Dialog.Root>

			<Dialog.Root
				open={ Boolean( drop ) }
				onOpenChange={ ( next ) => {
					if ( ! next && ! confirmBusy ) {
						setDrop( null );
					}
				} }
			>
				<Dialog.Popup size="small" className="db-confirm-dialog">
					<Dialog.Header>
						<Dialog.Title>
							{ drop
								? sprintf(
										/* translators: %s: table name. */
										__( 'Drop %s?', 'siterun' ),
										drop.table
								  )
								: '' }
						</Dialog.Title>
						{ confirmBusy ? null : <Dialog.CloseIcon /> }
					</Dialog.Header>
					<Dialog.Content>
						<Stack direction="column" gap="lg">
							<Notice.Root intent="error">
								<Notice.Description>
									{ __(
										'This deletes the table and everything in it. WordPress may stop working until it is restored from a backup.',
										'siterun'
									) }
								</Notice.Description>
							</Notice.Root>
							<InputControl
								label={ sprintf(
									/* translators: %s: table name. */
									__( 'Type %s to confirm', 'siterun' ),
									drop?.table ?? ''
								) }
								value={ drop?.value ?? '' }
								disabled={ confirmBusy }
								onChange={ ( event ) =>
									setDrop( ( current ) =>
										current ? { ...current, value: event.currentTarget.value } : current
									)
								}
							/>
						</Stack>
					</Dialog.Content>
					<Dialog.Footer>
						<Button
							variant="minimal"
							tone="neutral"
							disabled={ confirmBusy }
							onClick={ () => setDrop( null ) }
						>
							{ __( 'Cancel', 'siterun' ) }
						</Button>
						<Button
							variant="solid"
							tone="brand"
							disabled={ drop?.value !== drop?.table }
							loading={ confirmBusy }
							loadingAnnouncement={ __( 'Dropping the table', 'siterun' ) }
							onClick={ confirmDrop }
						>
							{ __( 'Drop table', 'siterun' ) }
						</Button>
					</Dialog.Footer>
				</Dialog.Popup>
			</Dialog.Root>
		</>
	);
}
