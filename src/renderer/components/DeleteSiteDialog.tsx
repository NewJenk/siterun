import { useEffect, useRef, useState } from 'react';
import { __, sprintf } from '@wordpress/i18n';
import { Button, Dialog, Stack, SwitchControl, Text } from '@wordpress/ui';
import type { OperationProgress, Site } from '@shared/types';
import { ProgressNotice } from './ProgressNotice';

interface Props {
	site: Site | null;
	open: boolean;
	busy: OperationProgress | null;
	onConfirm: ( deleteFiles: boolean ) => void;
	onClose: () => void;
}

export function DeleteSiteDialog( { site, open, busy, onConfirm, onClose }: Props ) {
	const [ deleteFiles, setDeleteFiles ] = useState( false );
	const wasOpen = useRef( false );

	useEffect( () => {
		if ( open && ! wasOpen.current ) {
			setDeleteFiles( false );
		}
		wasOpen.current = open;
	}, [ open ] );

	if ( ! site ) {
		return null;
	}

	return (
		<Dialog.Root
			open={ open }
			onOpenChange={ ( next, details ) => {
				if ( next ) {
					return;
				}
				if ( busy ) {
					details.cancel();
					return;
				}
				onClose();
			} }
		>
			<Dialog.Popup size="small" className="delete-site-dialog">
				<Dialog.Header>
					<Dialog.Title>
						{ sprintf( /* translators: %s: the site's name. */ __( 'Delete %s?', 'siterun' ), site.name ) }
					</Dialog.Title>
					{ busy ? null : <Dialog.CloseIcon /> }
				</Dialog.Header>
				<Dialog.Content>
					<Stack direction="column" gap="lg">
						{ busy ? (
							<ProgressNotice message={ busy.message } />
						) : null }
						<Text variant="body-md">
							{ __( 'The site is removed from siterun. You can keep its files, or send them to the trash.', 'siterun' ) }
						</Text>
						<SwitchControl
							label={ __( 'Delete the site\'s files too', 'siterun' ) }
							description={ __( 'The folder is moved to the trash, where you can still recover it.', 'siterun' ) }
							checked={ deleteFiles }
							disabled={ Boolean( busy ) }
							onCheckedChange={ setDeleteFiles }
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
						loadingAnnouncement={ __( 'Deleting the site', 'siterun' ) }
						onClick={ () => onConfirm( deleteFiles ) }
					>
						{ __( 'Delete site', 'siterun' ) }
					</Button>
				</Dialog.Footer>
			</Dialog.Popup>
		</Dialog.Root>
	);
}
