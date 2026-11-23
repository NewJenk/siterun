import { useEffect, useRef, useState } from 'react';
import { __ } from '@wordpress/i18n';
import { Button, Dialog, RadioGroupControl, Stack, Text } from '@wordpress/ui';
import type { ExportMode, OperationProgress, Site } from '@shared/types';
import { ProgressNotice } from './ProgressNotice';

interface Props {
	site: Site | null;
	open: boolean;
	busy: OperationProgress | null;
	onExport: ( mode: ExportMode ) => void;
	onClose: () => void;
}

const buildModes = (): Array< { value: ExportMode; label: string; description: string } > => [
	{
		value: 'full',
		label: __( 'Everything', 'siterun' ),
		description: __( 'WordPress, plugins, themes and the database in one archive.', 'siterun' )
	},
	{
		value: 'content',
		label: __( 'Content only', 'siterun' ),
		description: __( 'Uploads, plugins and themes, without the database.', 'siterun' )
	},
	{
		value: 'db',
		label: __( 'Database only', 'siterun' ),
		description: __( 'A SQL dump you can import into another WordPress.', 'siterun' )
	}
];

export function ExportDialog( { site, open, busy, onExport, onClose }: Props ) {
	const [ mode, setMode ] = useState< ExportMode >( 'full' );
	const wasOpen = useRef( false );

	useEffect( () => {
		if ( open && ! wasOpen.current ) {
			setMode( 'full' );
		}
		wasOpen.current = open;
	}, [ open ] );

	if ( ! site ) {
		return null;
	}

	const options = buildModes();

	return (
		<Dialog.Root
			open={ open }
			onOpenChange={ ( next ) => {
				if ( ! next && ! busy ) {
					onClose();
				}
			} }
		>
			<Dialog.Popup size="small" className="export-dialog">
				<Dialog.Header>
					<Dialog.Title>{ __( 'Export a backup', 'siterun' ) }</Dialog.Title>
					{ busy ? null : <Dialog.CloseIcon /> }
				</Dialog.Header>
				<Dialog.Content>
					<Stack direction="column" gap="lg">
						{ busy ? (
							<ProgressNotice message={ busy.message } />
						) : null }
						<Text variant="body-md">
							{ __( 'Choose what to include. You will be asked where to save it next.', 'siterun' ) }
						</Text>
						<RadioGroupControl
							label={ __( 'What to export', 'siterun' ) }
							items={ options }
							value={ mode }
							disabled={ Boolean( busy ) }
							onValueChange={ ( value ) => setMode( value as ExportMode ) }
						/>
					</Stack>
				</Dialog.Content>
				<Dialog.Footer>
					<Button variant="minimal" tone="neutral" disabled={ Boolean( busy ) } onClick={ onClose }>
						{ __( 'Cancel', 'siterun' ) }
					</Button>
					<Button
						variant="solid"
						tone="brand"
						loading={ Boolean( busy ) }
						loadingAnnouncement={ __( 'Exporting the site', 'siterun' ) }
						onClick={ () => onExport( mode ) }
					>
						{ __( 'Choose where to save…', 'siterun' ) }
					</Button>
				</Dialog.Footer>
			</Dialog.Popup>
		</Dialog.Root>
	);
}
