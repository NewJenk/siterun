import { useMemo } from 'react';
import { Page } from '@wordpress/admin-ui';
import { DataViews, type View } from '@wordpress/dataviews';
import { __ } from '@wordpress/i18n';
import { cog } from '@wordpress/icons';
import { Button, IconButton, Text, VisuallyHidden } from '@wordpress/ui';
import type { Site } from '@shared/types';
import { formatPath, siteStatus } from '../lib/site-view';
import { SiterunMark, SiterunWordmark } from './SiterunWordmark';

interface Props {
	sites: Site[];
	selectedId: string | null;
	homePath: string | null;
	version: string;
	onSelect: ( siteId: string ) => void;
	onCreate: () => void;
	onOpenSettings: () => void;
}

const VIEW: View = {
	type: 'list',
	titleField: 'name',
	descriptionField: 'meta',
	showMedia: false,
	fields: [],
	layout: { density: 'balanced' }
};

const LAYOUTS = { list: { layout: { density: 'balanced' as const } } };
const keepView = () => undefined;
const getItemId = ( site: Site ) => site.id;

function statusWords( site: Site ): string {
	switch ( siteStatus( site ) ) {
		case 'running':
			return __( 'Running', 'siterun' );
		case 'busy':
			return __( 'Working', 'siterun' );
		default:
			return __( 'Stopped', 'siterun' );
	}
}

export function SitesSidebar( {
	sites,
	selectedId,
	homePath,
	version,
	onSelect,
	onCreate,
	onOpenSettings
}: Props ) {
	const fields = useMemo(
		() => [
			{
				id: 'name',
				type: 'text' as const,
				label: __( 'Site', 'siterun' ),
				enableHiding: false,
				render: ( { item }: { item: Site } ) => {
					const status = siteStatus( item );
					return (
						<span className="site-row-name">
							<span className={ `site-dot is-${ status }` } aria-hidden="true" />
							<span className="site-row-title">{ item.name }</span>
							<VisuallyHidden>{ statusWords( item ) }</VisuallyHidden>
						</span>
					);
				}
			},
			{
				id: 'meta',
				type: 'text' as const,
				label: __( 'Location', 'siterun' ),
				render: ( { item }: { item: Site } ) => (
					<span className="site-row-meta">
						{ statusWords( item ) } · { formatPath( homePath, item.path ) }
					</span>
				)
			}
		],
		[ homePath ]
	);

	const paginationInfo = useMemo(
		() => ( { totalItems: sites.length, totalPages: 1 } ),
		[ sites.length ]
	);
	const selection = useMemo( () => ( selectedId ? [ selectedId ] : [] ), [ selectedId ] );

	return (
		<Page
			className="sites-sidebar"
			visual={ <SiterunMark className="sites-sidebar-mark" /> }
			title={ __( 'My sites', 'siterun' ) }
			actions={
				<Button variant="outline" tone="brand" size="compact" onClick={ onCreate }>
					{ __( 'New site', 'siterun' ) }
				</Button>
			}
			showSidebarToggle={ false }
			hasPadding={ false }
			ariaLabel={ __( 'My sites', 'siterun' ) }
		>
			<div className="sites-sidebar-list">
				<DataViews
					data={ sites }
					fields={ fields }
					view={ VIEW }
					onChangeView={ keepView }
					paginationInfo={ paginationInfo }
					defaultLayouts={ LAYOUTS }
					getItemId={ getItemId }
					selection={ selection }
					onChangeSelection={ ( ids ) => {
						const next = ids[ 0 ];
						if ( next ) {
							onSelect( next );
						}
					} }
				>
					<DataViews.Layout />
				</DataViews>
			</div>
			<div className="sites-sidebar-footer">
				<IconButton
					icon={ cog }
					label={ __( 'Settings', 'siterun' ) }
					variant="minimal"
					tone="neutral"
					size="compact"
					onClick={ onOpenSettings }
				/>
				<SiterunWordmark className="sites-sidebar-wordmark" />
				<Text variant="body-sm" className="sites-sidebar-version">
					{ version }
				</Text>
			</div>
		</Page>
	);
}
