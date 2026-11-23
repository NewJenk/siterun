import { useState } from 'react';
import { Page } from '@wordpress/admin-ui';
import { __, sprintf } from '@wordpress/i18n';
import {
	archive,
	code,
	cog,
	copySmall,
	download,
	external,
	offline,
	seen,
	table,
	trash,
	unseen,
	upload
} from '@wordpress/icons';
import {
	Badge,
	Button,
	Card,
	Icon,
	IconButton,
	Menu,
	Stack,
	Text
} from '@wordpress/ui';
import type { OperationProgress, Site } from '@shared/types';
import { ProgressNotice } from './ProgressNotice';
import { formatPath, siteStatus, siteSummary } from '../lib/site-view';

interface Props {
	site: Site;
	homePath: string | null;
	busy: OperationProgress | null;
	onStart: () => void;
	onStop: () => void;
	onSettings: () => void;
	onExport: () => void;
	onRestore: () => void;
	onWpCli: () => void;
	onDelete: () => void;
	onDatabase: ( tab: 'browse' | 'sql' ) => void;
	onOpen: ( destination: 'site' | 'admin' ) => void;
	onReveal: () => void;
	onTerminal: () => void;
	onCopy: ( value: string, label: string ) => void;
}

function statusWord( site: Site ): string {
	switch ( siteStatus( site ) ) {
		case 'running':
			return __( 'Running', 'siterun' );
		case 'busy':
			return __( 'Working', 'siterun' );
		default:
			return __( 'Stopped', 'siterun' );
	}
}

function passwordText( site: Site, shown: boolean ): string {
	if ( ! site.adminPassword ) {
		return __( 'Not set', 'siterun' );
	}
	return shown ? site.adminPassword : '••••••••';
}

function Detail( { label, value }: { label: string; value: string } ) {
	return (
		<div className="detail-row">
			<Text variant="body-sm" className="detail-label">
				{ label }
			</Text>
			<Text variant="body-md" className="detail-value">
				{ value }
			</Text>
		</div>
	);
}

function SiteMenu( {
	onSettings,
	onExport,
	onRestore,
	onWpCli,
	onReveal,
	onTerminal,
	onDelete
}: Omit<
	Props,
	'site' | 'homePath' | 'busy' | 'onStart' | 'onStop' | 'onOpen' | 'onCopy' | 'onDatabase'
> ) {
	return (
		<Menu.Root>
			<Menu.Trigger
				render={
					<Button variant="outline" tone="neutral" aria-label={ __( 'Site actions', 'siterun' ) }>
						{ __( 'Actions', 'siterun' ) }
					</Button>
				}
			/>
			<Menu.Popup>
				<Menu.Item onClick={ onSettings }>
					<Menu.ItemLabel>{ __( 'Site settings…', 'siterun' ) }</Menu.ItemLabel>
				</Menu.Item>
				<Menu.Item onClick={ onExport }>
					<Menu.ItemLabel>{ __( 'Export a backup…', 'siterun' ) }</Menu.ItemLabel>
				</Menu.Item>
				<Menu.Item onClick={ onRestore }>
					<Menu.ItemLabel>{ __( 'Restore from a backup…', 'siterun' ) }</Menu.ItemLabel>
				</Menu.Item>
				<Menu.Item onClick={ onWpCli }>
					<Menu.ItemLabel>{ __( 'Run WP-CLI…', 'siterun' ) }</Menu.ItemLabel>
				</Menu.Item>
				<Menu.Separator />
				<Menu.Item onClick={ onReveal }>
					<Menu.ItemLabel>{ __( 'Open site folder', 'siterun' ) }</Menu.ItemLabel>
				</Menu.Item>
				<Menu.Item onClick={ onTerminal }>
					<Menu.ItemLabel>{ __( 'Open terminal here', 'siterun' ) }</Menu.ItemLabel>
				</Menu.Item>
				<Menu.Separator />
				<Menu.Item onClick={ onDelete }>
					<Menu.ItemLabel>{ __( 'Delete site…', 'siterun' ) }</Menu.ItemLabel>
				</Menu.Item>
			</Menu.Popup>
		</Menu.Root>
	);
}

export function SitePage( props: Props ) {
	const { site, homePath, busy } = props;
	const [ showPassword, setShowPassword ] = useState( false );
	const status = siteStatus( site );

	return (
		<Page
			className="site-page"
			hasPadding
			title={ site.name }
			subTitle={ siteSummary( site ) }
			badges={
				<span className={ `site-status is-${ status }` }>
					<span className={ `site-dot is-${ status }` } aria-hidden="true" />
					{ statusWord( site ) }
				</span>
			}
			actions={
				<Stack direction="row" gap="sm" align="center">
					{ site.running ? (
						<Button variant="outline" tone="neutral" onClick={ props.onStop } disabled={ status === 'busy' }>
							{ __( 'Stop site', 'siterun' ) }
						</Button>
					) : (
						<Button variant="solid" tone="brand" onClick={ props.onStart } loading={ status === 'busy' }>
							{ __( 'Start site', 'siterun' ) }
						</Button>
					) }
					<SiteMenu
						onSettings={ props.onSettings }
						onExport={ props.onExport }
						onRestore={ props.onRestore }
						onWpCli={ props.onWpCli }
						onReveal={ props.onReveal }
						onTerminal={ props.onTerminal }
						onDelete={ props.onDelete }
					/>
				</Stack>
			}
			ariaLabel={ site.name }
		>
			{ busy ? (
				<ProgressNotice message={ busy.message } />
			) : null }

			<div className="site-hero">
				<div className="site-hero-main">
					<Text variant="body-sm" className="eyebrow">
						{ __( 'Your local site', 'siterun' ) }
					</Text>
					<Text variant="heading-lg" className="site-url">
						{ site.customDomain ?? site.url }
					</Text>
					{ site.customDomain ? (
						<Text variant="body-sm" className="muted">
							{ sprintf( /* translators: %s: the site's local URL. */ __( 'Served at %s', 'siterun' ), site.url ) }
						</Text>
					) : null }
				</div>
				<Stack direction="row" gap="sm" wrap="wrap">
					<Button variant="solid" tone="brand" onClick={ () => props.onOpen( 'site' ) }>
						{ __( 'Open site', 'siterun' ) }
						<Icon icon={ external } size={ 16 } />
					</Button>
					<Button variant="outline" tone="neutral" onClick={ () => props.onOpen( 'admin' ) }>
						{ __( 'WP Admin', 'siterun' ) }
					</Button>
					<IconButton
						icon={ copySmall }
						label={ __( 'Copy site address', 'siterun' ) }
						variant="minimal"
						tone="neutral"
						onClick={ () => props.onCopy( site.url, __( 'Site address copied', 'siterun' ) ) }
					/>
				</Stack>
			</div>

			<div className="site-grid">
				<Card.Root className="site-card">
					<Card.Header>
						<Card.Title>{ __( 'At a glance', 'siterun' ) }</Card.Title>
					</Card.Header>
					<Card.Content>
						<div className="detail-list detail-grid">
							<Detail label={ __( 'WordPress', 'siterun' ) } value={ site.wpVersion ?? __( 'Unknown', 'siterun' ) } />
							<Detail label={ __( 'PHP', 'siterun' ) } value={ site.phpVersion } />
							<Detail
								label={ __( 'Environment', 'siterun' ) }
								value={ site.environmentType ?? __( 'Local', 'siterun' ) }
							/>
							<Detail label={ __( 'Port', 'siterun' ) } value={ String( site.port ) } />
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root className="site-card">
					<Card.Header>
						<Card.Title>{ __( 'Sign in', 'siterun' ) }</Card.Title>
					</Card.Header>
					<Card.Content>
						<div className="detail-list">
							<div className="detail-row">
								<Text variant="body-sm" className="detail-label">
									{ __( 'Username', 'siterun' ) }
								</Text>
								<div className="detail-inline">
									<Text variant="body-md" className="detail-value">
										{ site.adminUsername }
									</Text>
									<IconButton
										icon={ copySmall }
										label={ __( 'Copy username', 'siterun' ) }
										variant="minimal"
										tone="neutral"
										size="small"
										onClick={ () => props.onCopy( site.adminUsername, __( 'Username copied', 'siterun' ) ) }
									/>
								</div>
							</div>
							<div className="detail-row">
								<Text variant="body-sm" className="detail-label">
									{ __( 'Password', 'siterun' ) }
								</Text>
								<div className="detail-inline">
									<Text variant="body-md" className="detail-value detail-password">
										{ passwordText( site, showPassword ) }
									</Text>
									{ site.adminPassword ? (
										<>
											<IconButton
												icon={ showPassword ? unseen : seen }
												label={
													showPassword
														? __( 'Hide password', 'siterun' )
														: __( 'Show password', 'siterun' )
												}
												variant="minimal"
												tone="neutral"
												size="small"
												onClick={ () => setShowPassword( ( shown ) => ! shown ) }
											/>
											<IconButton
												icon={ copySmall }
												label={ __( 'Copy password', 'siterun' ) }
												variant="minimal"
												tone="neutral"
												size="small"
												onClick={ () =>
													props.onCopy(
														site.adminPassword ?? '',
														__( 'Password copied', 'siterun' )
													)
												}
											/>
										</>
									) : null }
								</div>
							</div>
							{ site.adminEmail ? (
								<Detail label={ __( 'Email', 'siterun' ) } value={ site.adminEmail } />
							) : null }
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root className="site-card">
					<Card.Header>
						<Card.Title>{ __( 'Location', 'siterun' ) }</Card.Title>
					</Card.Header>
					<Card.Content>
						<Text variant="body-md" className="site-path">
							{ formatPath( homePath, site.path ) }
						</Text>
						<Stack direction="row" gap="sm" wrap="wrap">
							<Button variant="outline" tone="neutral" size="compact" onClick={ props.onReveal }>
								<Icon icon={ archive } size={ 16 } />
								{ __( 'Open folder', 'siterun' ) }
							</Button>
							<Button variant="outline" tone="neutral" size="compact" onClick={ props.onTerminal }>
								<Icon icon={ code } size={ 16 } />
								{ __( 'Terminal', 'siterun' ) }
							</Button>
						</Stack>
					</Card.Content>
				</Card.Root>

				<Card.Root className="site-card">
					<Card.Header>
						<Card.Title>{ __( 'Development', 'siterun' ) }</Card.Title>
					</Card.Header>
					<Card.Content>
						<Stack direction="column" gap="md">
							<Stack direction="row" gap="sm" align="center">
								<Badge intent={ site.enableXdebug ? 'stable' : 'none' }>
									{ site.enableXdebug ? __( 'Xdebug on', 'siterun' ) : __( 'Xdebug off', 'siterun' ) }
								</Badge>
								{ site.enableDebugLog ? <Badge intent="low">{ __( 'Debug log', 'siterun' ) }</Badge> : null }
								{ site.enableScriptDebug ? (
									<Badge intent="low">{ __( 'Script debug', 'siterun' ) }</Badge>
								) : null }
							</Stack>
							<Text variant="body-sm" className="muted">
								{ __( 'Change PHP, debugging and the domain in Site settings.', 'siterun' ) }
							</Text>
							<Stack direction="row" gap="sm" wrap="wrap">
								<Button variant="outline" tone="neutral" size="compact" onClick={ props.onSettings }>
									<Icon icon={ cog } size={ 16 } />
									{ __( 'Site settings', 'siterun' ) }
								</Button>
								<Button variant="minimal" tone="neutral" size="compact" onClick={ props.onWpCli }>
									{ __( 'Run WP-CLI', 'siterun' ) }
								</Button>
							</Stack>
						</Stack>
					</Card.Content>
				</Card.Root>
			</div>

			<Card.Root className="site-card site-card-wide">
				<Card.Header>
					<Card.Title>{ __( 'Database', 'siterun' ) }</Card.Title>
				</Card.Header>
				<Card.Content>
					<Stack direction="row" gap="md" align="center" justify="space-between" wrap="wrap">
						<Text variant="body-md" className="muted">
							{ __(
								'Browse tables and rows, inspect values, and run SQL. Write mode stops the site and saves a backup first.',
								'siterun'
							) }
						</Text>
						<Stack direction="row" gap="sm" wrap="wrap">
							<Button
								variant="outline"
								tone="neutral"
								size="compact"
								onClick={ () => props.onDatabase( 'browse' ) }
							>
								<Icon icon={ table } size={ 16 } />
								{ __( 'Browse database', 'siterun' ) }
							</Button>
							<Button
								variant="outline"
								tone="neutral"
								size="compact"
								onClick={ () => props.onDatabase( 'sql' ) }
							>
								{ __( 'Run SQL', 'siterun' ) }
							</Button>
						</Stack>
					</Stack>
				</Card.Content>
			</Card.Root>

			<Card.Root className="site-card site-card-wide">
				<Card.Header>
					<Card.Title>{ __( 'Backups', 'siterun' ) }</Card.Title>
				</Card.Header>
				<Card.Content>
					<Stack direction="row" gap="md" align="center" justify="space-between" wrap="wrap">
						<Text variant="body-md" className="muted">
							{ __( 'Take a copy of the files and database, or replace this site with a backup.', 'siterun' ) }
						</Text>
						<Stack direction="row" gap="sm" wrap="wrap">
							<Button variant="outline" tone="neutral" size="compact" onClick={ props.onExport }>
								<Icon icon={ download } size={ 16 } />
								{ __( 'Export', 'siterun' ) }
							</Button>
							<Button variant="outline" tone="neutral" size="compact" onClick={ props.onRestore }>
								<Icon icon={ upload } size={ 16 } />
								{ __( 'Restore', 'siterun' ) }
							</Button>
							<Button
								variant="minimal"
								tone="neutral"
								size="compact"
								onClick={ props.onDelete }
							>
								<Icon icon={ trash } size={ 16 } />
								{ __( 'Delete site', 'siterun' ) }
							</Button>
						</Stack>
					</Stack>
				</Card.Content>
			</Card.Root>

			{ ! site.running ? (
				<div className="site-offline">
					<Icon icon={ offline } size={ 24 } />
					<Text variant="heading-sm">{ __( 'This site is stopped', 'siterun' ) }</Text>
					<Text variant="body-md" className="muted">
						{ __( 'Start it to open WordPress, WP Admin and WP-CLI.', 'siterun' ) }
					</Text>
					<Button variant="solid" tone="brand" onClick={ props.onStart } loading={ status === 'busy' }>
						{ __( 'Start site', 'siterun' ) }
					</Button>
				</div>
			) : null }
		</Page>
	);
}
