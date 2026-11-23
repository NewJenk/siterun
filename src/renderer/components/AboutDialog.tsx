import { __ } from '@wordpress/i18n';
import { SiterunWordmark } from './SiterunWordmark';
import { Button, Dialog, Notice, Stack, Text } from '@wordpress/ui';
import type { AppInfo } from '@shared/types';

interface Props {
	info: AppInfo | null;
	open: boolean;
	onClose: () => void;
	onCopy: ( value: string, label: string ) => void;
	onRetry: () => void;
}

export function AboutDialog( { info, open, onClose, onCopy, onRetry }: Props ) {
	const diagnostics = info
		? [
				`siterun ${ info.version }`,
				`Platform: ${ info.platform }`,
				`Site engine: ${ info.cliPath ?? 'missing' }`,
				`Data: ${ info.userDataPath }`
		  ].join( '\n' )
		: '';

	return (
		<Dialog.Root
			open={ open }
			onOpenChange={ ( next ) => {
				if ( ! next ) {
					onClose();
				}
			} }
		>
			<Dialog.Popup size="small" className="about-dialog">
				<Dialog.Header>
					<Dialog.Title>{ __( 'About siterun', 'siterun' ) }</Dialog.Title>
					<Dialog.CloseIcon />
				</Dialog.Header>
				<Dialog.Content>
					<Stack direction="column" gap="lg">
						<Stack direction="column" gap="xs">
							<SiterunWordmark className="about-wordmark" />
							<Text variant="body-sm" className="muted">
								{ __( 'Version', 'siterun' ) } { info?.version ?? '…' } · { __( 'GPL-3.0-only', 'siterun' ) }
							</Text>
						</Stack>
						<Text variant="body-md">
							{ __( 'A quiet place to run WordPress on your own computer. No account, no telemetry, no AI.', 'siterun' ) }
						</Text>

						{ info && ! info.cliReady ? (
							<Notice.Root intent="warning">
								<Notice.Title>{ __( 'The site engine is missing', 'siterun' ) }</Notice.Title>
								<Notice.Description>
									{ __(
										'Sites cannot start until it is built. Run:', 'siterun'
									) }
									<code>npm run engine:build</code>
									{ __( 'Then press Check again.', 'siterun' ) }
								</Notice.Description>
								<Notice.Actions>
									<Button variant="outline" tone="neutral" size="compact" onClick={ onRetry }>
										{ __( 'Check again', 'siterun' ) }
									</Button>
								</Notice.Actions>
							</Notice.Root>
						) : null }

						{ info ? (
							<Stack direction="column" gap="sm">
								<Text variant="body-sm" className="detail-label">
									{ __( 'Site engine', 'siterun' ) }
								</Text>
								<code>{ info.cliPath ?? __( 'Not found', 'siterun' ) }</code>
								<Text variant="body-sm" className="detail-label">
									{ __( 'Data folder', 'siterun' ) }
								</Text>
								<code>{ info.userDataPath }</code>
							</Stack>
						) : null }

						<Stack direction="row" gap="sm" wrap="wrap">
							<Button
								variant="outline"
								tone="neutral"
								size="compact"
								onClick={ () => onCopy( diagnostics, __( 'Diagnostics copied', 'siterun' ) ) }
							>
								{ __( 'Copy diagnostics', 'siterun' ) }
							</Button>
						</Stack>
					</Stack>
				</Dialog.Content>
				<Dialog.Footer>
					<Button variant="solid" tone="brand" onClick={ onClose }>
						{ __( 'Close', 'siterun' ) }
					</Button>
				</Dialog.Footer>
			</Dialog.Popup>
		</Dialog.Root>
	);
}
