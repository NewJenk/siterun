import { __ } from '@wordpress/i18n';
import {
	Button,
	Dialog,
	InputControl,
	Stack,
	SwitchControl,
	Text
} from '@wordpress/ui';
import type { Preferences, ThemePreference } from '@shared/types';
import { SimpleSelect } from './SimpleSelect';

interface Props {
	preferences: Preferences | null;
	open: boolean;
	onClose: () => void;
	onChange: ( patch: Partial< Preferences > ) => void;
	onPickFolder: ( start: string | null ) => Promise< string | null >;
}

const buildThemes = (): Array< { value: ThemePreference; label: string } > => [
	{ value: 'system', label: __( 'Match the system', 'siterun' ) },
	{ value: 'light', label: __( 'Light', 'siterun' ) },
	{ value: 'dark', label: __( 'Dark', 'siterun' ) }
];

export function PreferencesDialog( { preferences, open, onClose, onChange, onPickFolder }: Props ) {
	if ( ! preferences ) {
		return null;
	}

	const themes = buildThemes();

	const chooseFolder = async () => {
		const chosen = await onPickFolder( preferences.defaultSiteDirectory );
		if ( chosen ) {
			onChange( { defaultSiteDirectory: chosen } );
		}
	};

	return (
		<Dialog.Root
			open={ open }
			onOpenChange={ ( next ) => {
				if ( ! next ) {
					onClose();
				}
			} }
		>
			<Dialog.Popup size="small" className="preferences-dialog">
				<Dialog.Header>
					<Dialog.Title>{ __( 'Settings', 'siterun' ) }</Dialog.Title>
					<Dialog.CloseIcon />
				</Dialog.Header>
				<Dialog.Content>
					<Stack direction="column" gap="xl">
						<div className="form-section">
							<Text variant="heading-sm" render={ <h3 /> }>
								{ __( 'Appearance', 'siterun' ) }
							</Text>
							<SimpleSelect
								label={ __( 'Theme', 'siterun' ) }
								value={ preferences.theme }
								onValueChange={ ( value ) =>
									onChange( { theme: value as ThemePreference } )
								}
								items={ themes }
							/>
						</div>

						<div className="form-section">
							<Text variant="heading-sm" render={ <h3 /> }>
								{ __( 'New sites', 'siterun' ) }
							</Text>
							<Stack direction="column" gap="sm">
								<InputControl
									label={ __( 'Default folder', 'siterun' ) }
									value={ preferences.defaultSiteDirectory ?? '' }
									readOnly
									description={ __( 'Where the New site dialog starts looking.', 'siterun' ) }
								/>
								<div>
									<Button variant="outline" tone="neutral" size="compact" onClick={ chooseFolder }>
										{ __( 'Choose folder…', 'siterun' ) }
									</Button>
								</div>
							</Stack>
						</div>

						<div className="form-section">
							<Text variant="heading-sm" render={ <h3 /> }>
								{ __( 'Updates', 'siterun' ) }
							</Text>
							<Stack direction="column" gap="md">
								<SwitchControl
									label={ __( 'Check for updates', 'siterun' ) }
									description={ __( 'Looks for a newer build when the app starts.', 'siterun' ) }
									checked={ preferences.checkForUpdates }
									onCheckedChange={ ( checked ) => onChange( { checkForUpdates: checked } ) }
								/>
							</Stack>
						</div>
					</Stack>
				</Dialog.Content>
				<Dialog.Footer>
					<Button variant="solid" tone="brand" onClick={ onClose }>
						{ __( 'Done', 'siterun' ) }
					</Button>
				</Dialog.Footer>
			</Dialog.Popup>
		</Dialog.Root>
	);
}
