import { createInterpolateElement } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { backup, code, globe, shield } from '@wordpress/icons';
import { Button, Icon, Stack, Text } from '@wordpress/ui';
import { GoingBoldWordmark } from './GoingBoldWordmark';
import { SiterunWordmark } from './SiterunWordmark';

interface Props {
	onCreate: () => void;
	onRestore: () => void;
}

const buildFeatures = () => [
	{
		icon: globe,
		title: __( 'Real WordPress', 'siterun' ),
		description: __( 'A full install with its own PHP, database and WP-CLI. Nothing shared, nothing remote.', 'siterun' )
	},
	{
		icon: shield,
		title: __( 'HTTPS when you want it', 'siterun' ),
		description: __( 'Give a site a .local domain and a certificate your browser already trusts.', 'siterun' )
	},
	{
		icon: backup,
		title: __( 'Yours to keep', 'siterun' ),
		description: __( 'Export the whole site or just the database, and restore it whenever you need.', 'siterun' )
	}
];

export function EmptyWorkspace( { onCreate, onRestore }: Props ) {
	const features = buildFeatures();
	return (
		<main className="empty-workspace">
			<div className="empty-content">
				<SiterunWordmark className="empty-wordmark" />
				<Text variant="heading-2xl" render={ <h1 /> } className="empty-title">
					{ __( 'Run WordPress on your machine.', 'siterun' ) }
				</Text>
				<Text variant="body-lg" className="empty-lede">
					{ __(
						'Add a site and it is ready in a minute. Open it in your browser, sign in to wp-admin, and get on with building.', 'siterun'
					) }
				</Text>
				<Stack direction="row" gap="sm" justify="center" wrap="wrap">
					<Button variant="solid" tone="brand" onClick={ onCreate }>
						{ __( 'Create your first site', 'siterun' ) }
					</Button>
					<Button variant="outline" tone="neutral" onClick={ onRestore }>
						{ __( 'Restore from a backup', 'siterun' ) }
					</Button>
				</Stack>

				<div className="empty-features">
					{ features.map( ( feature ) => (
						<div className="empty-feature" key={ feature.title }>
							<Icon icon={ feature.icon } size={ 24 } />
							<Text variant="heading-sm" render={ <h2 /> }>
								{ feature.title }
							</Text>
							<Text variant="body-sm" className="muted">
								{ feature.description }
							</Text>
						</div>
					) ) }
				</div>

				<Text variant="body-sm" className="empty-footnote">
					<Icon icon={ code } size={ 14 } /> { __( 'No account. No sign-in. No telemetry. Ever.', 'siterun' ) }
				</Text>
			</div>
			<footer className="empty-credit">
				{ createInterpolateElement( __( 'A<brand/>contraption', 'siterun' ), {
					brand: <GoingBoldWordmark className="empty-credit-wordmark" />
				} ) }
			</footer>
		</main>
	);
}
