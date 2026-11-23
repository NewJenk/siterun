import { __ } from '@wordpress/i18n';
import { Button, Card, Notice, Stack, Text } from '@wordpress/ui';
import type { AppInfo } from '@shared/types';
import { SiterunWordmark } from './SiterunWordmark';

interface Props {
	info: AppInfo | null;
	onRetry: () => void;
	onCopy: ( value: string, label: string ) => void;
}

const BUILD = 'npm run engine:build';

export function CliMissing( { info, onRetry, onCopy }: Props ) {
	return (
		<main className="cli-missing">
			<Card.Root className="cli-missing-card">
				<Card.Content>
					<Stack direction="column" gap="lg">
						<SiterunWordmark className="cli-missing-wordmark" />
						<Notice.Root intent="error" role="alert">
							<Notice.Title>{ __( 'siterun cannot find its site engine', 'siterun' ) }</Notice.Title>
							<Notice.Description>
								{ __(
									'The window is ready, but the part that runs WordPress is not. Build it once and the app will find it.', 'siterun'
								) }
							</Notice.Description>
						</Notice.Root>

						<Text variant="body-md">{ __( 'In the project folder, run:', 'siterun' ) }</Text>
						<pre className="cli-missing-command">
							<code>{ BUILD }</code>
						</pre>
						<Text variant="body-sm" className="muted">
							{ __( 'Then press Check again.', 'siterun' ) }
						</Text>

						{ info ? (
							<Stack direction="column" gap="sm">
								<Text variant="body-sm" className="detail-label">
									{ __( 'Looked for the engine at', 'siterun' ) }
								</Text>
								{ info.cliSearched.map( ( candidate ) => (
									<code key={ candidate.path } className="cli-missing-path">
										{ candidate.path }
									</code>
								) ) }
							</Stack>
						) : null }

						<Stack direction="row" gap="sm" wrap="wrap">
							<Button variant="solid" tone="brand" onClick={ onRetry }>
								{ __( 'Check again', 'siterun' ) }
							</Button>
							<Button
								variant="outline"
								tone="neutral"
								onClick={ () => onCopy( BUILD, __( 'Build command copied', 'siterun' ) ) }
							>
								{ __( 'Copy command', 'siterun' ) }
							</Button>
						</Stack>
					</Stack>
				</Card.Content>
			</Card.Root>
		</main>
	);
}
