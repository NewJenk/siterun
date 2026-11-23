import { useEffect, useState } from 'react';
import { __, sprintf } from '@wordpress/i18n';
import { Button, Dialog, Notice, Stack, Text } from '@wordpress/ui';
import type { OperationProgress, Site } from '@shared/types';
import { ProgressNotice } from './ProgressNotice';

interface Props {
	site: Site | null;
	open: boolean;
	busy: OperationProgress | null;
	onRestore: ( backupPath: string ) => void;
	onClose: () => void;
	onPickBackup: () => Promise< string | null >;
}

export function RestoreDialog( { site, open, busy, onRestore, onClose, onPickBackup }: Props ) {
	const [ backupPath, setBackupPath ] = useState< string | null >( null );
	const [ lastOpen, setLastOpen ] = useState( false );

	useEffect( () => {
		if ( open !== lastOpen ) {
			setLastOpen( open );
			if ( open ) {
				setBackupPath( null );
			}
		}
	}, [ open, lastOpen ] );

	if ( ! site ) {
		return null;
	}

	const choose = async () => {
		const chosen = await onPickBackup();
		if ( chosen ) {
			setBackupPath( chosen );
		}
	};

	const name = backupPath?.split( /[\\/]/ ).pop() ?? '';

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
			<Dialog.Popup size="small" className="restore-dialog">
				<Dialog.Header>
					<Dialog.Title>{ __( 'Restore from a backup', 'siterun' ) }</Dialog.Title>
					{ busy ? null : <Dialog.CloseIcon /> }
				</Dialog.Header>
				<Dialog.Content>
					<Stack direction="column" gap="lg">
						{ busy ? (
							<ProgressNotice message={ busy.message } />
						) : null }
						<Notice.Root intent="warning">
							<Notice.Description>
								{ sprintf(
									/* translators: %s: the site's name. */
									__(
										'Restoring replaces the files and database of %s with the backup. Take an export first if you might need the current site.', 'siterun'
									),
									site.name
								) }
							</Notice.Description>
						</Notice.Root>
						<Stack direction="row" gap="sm" align="center" wrap="wrap">
							<Button
								variant="outline"
								tone="neutral"
								size="compact"
								disabled={ Boolean( busy ) }
								onClick={ choose }
							>
								{ __( 'Choose backup…', 'siterun' ) }
							</Button>
							<Text variant="body-sm" className="muted">
								{ name || __( 'No file chosen', 'siterun' ) }
							</Text>
						</Stack>
						<Text variant="body-sm" className="muted">
							{ __( 'The site restarts when the import finishes.', 'siterun' ) }
						</Text>
					</Stack>
				</Dialog.Content>
				<Dialog.Footer>
					<Button variant="minimal" tone="neutral" disabled={ Boolean( busy ) } onClick={ onClose }>
						{ __( 'Cancel', 'siterun' ) }
					</Button>
					<Button
						variant="solid"
						tone="brand"
						disabled={ ! backupPath }
						loading={ Boolean( busy ) }
						loadingAnnouncement={ __( 'Restoring the site', 'siterun' ) }
						onClick={ () => backupPath && onRestore( backupPath ) }
					>
						{ __( 'Restore site', 'siterun' ) }
					</Button>
				</Dialog.Footer>
			</Dialog.Popup>
		</Dialog.Root>
	);
}
