import { useEffect, useId, useRef, useState } from 'react';
import { __ } from '@wordpress/i18n';
import {
	Button,
	Dialog,
	InputControl,
	Notice,
	Stack,
	SwitchControl,
	Text
} from '@wordpress/ui';
import type { OperationProgress, Site, SiteSettingsPatch, VersionOption } from '@shared/types';
import { ProgressNotice } from './ProgressNotice';
import { validateDomain } from '../lib/create-site';
import { SimpleSelect } from './SimpleSelect';

interface Props {
	site: Site | null;
	open: boolean;
	busy: OperationProgress | null;
	versions: VersionOption[];
	onSave: ( patch: SiteSettingsPatch ) => void;
	onClose: () => void;
}

const PHP_VERSIONS = [ '8.5', '8.4', '8.3', '8.2' ];
const ENVIRONMENTS = [ 'local', 'development', 'staging', 'production' ];

interface FormState {
	name: string;
	phpVersion: string;
	wpVersion: string;
	customDomain: string;
	enableHttps: boolean;
	environmentType: string;
	adminEmail: string;
	enableXdebug: boolean;
	enableDebugLog: boolean;
	enableDebugDisplay: boolean;
	enableScriptDebug: boolean;
}

function fromSite( site: Site ): FormState {
	return {
		name: site.name,
		phpVersion: site.phpVersion,
		wpVersion: site.wpVersion ?? 'latest',
		customDomain: site.customDomain ?? '',
		enableHttps: site.enableHttps,
		environmentType: site.environmentType ?? 'local',
		adminEmail: site.adminEmail ?? '',
		enableXdebug: site.enableXdebug,
		enableDebugLog: site.enableDebugLog,
		enableDebugDisplay: site.enableDebugDisplay,
		enableScriptDebug: site.enableScriptDebug
	};
}

export function SiteSettingsDialog( { site, open, busy, versions, onSave, onClose }: Props ) {
	const formId = useId();
	const [ form, setForm ] = useState< FormState | null >( site ? fromSite( site ) : null );
	const [ submitted, setSubmitted ] = useState( false );
	const wasOpen = useRef( false );

	useEffect( () => {
		if ( open && site && ! wasOpen.current ) {
			setForm( fromSite( site ) );
			setSubmitted( false );
		}
		wasOpen.current = open;
	}, [ open, site ] );

	if ( ! site || ! form ) {
		return null;
	}

	const update = < K extends keyof FormState >( key: K, value: FormState[ K ] ) => {
		setForm( ( current ) => ( current ? { ...current, [ key ]: value } : current ) );
	};

	const domainError = validateDomain( form.customDomain );
	const httpsWithoutDomain = form.enableHttps && ! form.customDomain.trim();
	const error = domainError ?? ( httpsWithoutDomain ? __( 'HTTPS needs a custom domain.', 'siterun' ) : null );
	const wpOptions = versions.some( ( version ) => version.value === form.wpVersion )
		? versions
		: [ { value: form.wpVersion, label: form.wpVersion }, ...versions ];

	const submit = () => {
		setSubmitted( true );
		if ( error ) {
			return;
		}
		onSave( {
			name: form.name.trim(),
			phpVersion: form.phpVersion,
			wpVersion: form.wpVersion,
			customDomain: form.customDomain.trim(),
			enableHttps: form.enableHttps,
			environmentType: form.environmentType,
			adminEmail: form.adminEmail.trim(),
			enableXdebug: form.enableXdebug,
			enableDebugLog: form.enableDebugLog,
			enableDebugDisplay: form.enableDebugDisplay,
			enableScriptDebug: form.enableScriptDebug
		} );
	};

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
			<Dialog.Popup size="medium" className="settings-dialog">
				<Dialog.Header>
					<Dialog.Title>{ __( 'Site settings', 'siterun' ) }</Dialog.Title>
					{ busy ? null : <Dialog.CloseIcon /> }
				</Dialog.Header>
				<Dialog.Content>
					<form
						id={ formId }
						onSubmit={ ( event ) => {
							event.preventDefault();
							submit();
						} }
						noValidate
					>
						<Stack direction="column" gap="lg">
							{ busy ? (
								<ProgressNotice message={ busy.message } />
							) : null }

							{ submitted && error ? (
								<Notice.Root intent="error" role="alert">
									<Notice.Description>{ error }</Notice.Description>
								</Notice.Root>
							) : null }

							<div className="form-section">
								<Text variant="heading-sm" render={ <h3 /> }>
									{ __( 'General', 'siterun' ) }
								</Text>
								<Stack direction="column" gap="md">
									<InputControl
										label={ __( 'Site name', 'siterun' ) }
										value={ form.name }
										disabled={ Boolean( busy ) }
										onChange={ ( event ) => update( 'name', event.currentTarget.value ) }
									/>
									<SimpleSelect
										label={ __( 'Environment', 'siterun' ) }
										value={ form.environmentType }
										disabled={ Boolean( busy ) }
										onValueChange={ ( value ) => update( 'environmentType', value ) }
										items={ ENVIRONMENTS.map( ( environment ) => ( {
											value: environment,
											label: environment
										} ) ) }
									/>
									<InputControl
										label={ __( 'Admin email', 'siterun' ) }
										type="email"
										value={ form.adminEmail }
										disabled={ Boolean( busy ) }
										onChange={ ( event ) => update( 'adminEmail', event.currentTarget.value ) }
									/>
								</Stack>
							</div>

							<div className="form-section">
								<Text variant="heading-sm" render={ <h3 /> }>
									{ __( 'Versions', 'siterun' ) }
								</Text>
								<Stack direction="row" gap="md" wrap="wrap">
									<div className="form-half">
										<SimpleSelect
											label={ __( 'PHP', 'siterun' ) }
											value={ form.phpVersion }
											disabled={ Boolean( busy ) }
											onValueChange={ ( value ) => update( 'phpVersion', value ) }
											items={ PHP_VERSIONS.map( ( version ) => ( {
												value: version,
												label: version
											} ) ) }
										/>
									</div>
									<div className="form-half">
										<SimpleSelect
											label={ __( 'WordPress', 'siterun' ) }
											description={ __( 'Latest updates core files now.', 'siterun' ) }
											value={ form.wpVersion }
											disabled={ Boolean( busy ) }
											onValueChange={ ( value ) => update( 'wpVersion', value ) }
											items={ wpOptions.map( ( version ) => ( {
												value: version.value,
												label: version.label
											} ) ) }
										/>
									</div>
								</Stack>
							</div>

							<div className="form-section">
								<Text variant="heading-sm" render={ <h3 /> }>
									{ __( 'Domain and HTTPS', 'siterun' ) }
								</Text>
								<Stack direction="column" gap="md">
									<InputControl
										label={ __( 'Custom domain', 'siterun' ) }
										placeholder="mysite.local"
										value={ form.customDomain }
										disabled={ Boolean( busy ) }
										onChange={ ( event ) => update( 'customDomain', event.currentTarget.value ) }
										description={ __(
											"Leave blank to use localhost and the site's port. A new domain updates your hosts file, which the system may ask you to allow.",
											'siterun'
										) }
									/>
									<SwitchControl
										label={ __( 'Use HTTPS', 'siterun' ) }
										description={ __( 'Needs a custom domain.', 'siterun' ) }
										checked={ form.enableHttps }
										disabled={ Boolean( busy ) || ! form.customDomain.trim() }
										onCheckedChange={ ( checked ) => update( 'enableHttps', checked ) }
									/>
								</Stack>
							</div>

							<div className="form-section">
								<Text variant="heading-sm" render={ <h3 /> }>
									{ __( 'Debugging', 'siterun' ) }
								</Text>
								<Stack direction="column" gap="md">
									<SwitchControl
										label={ __( 'Enable Xdebug', 'siterun' ) }
										description={ __( 'Only one site can have Xdebug on at a time.', 'siterun' ) }
										checked={ form.enableXdebug }
										disabled={ Boolean( busy ) }
										onCheckedChange={ ( checked ) => update( 'enableXdebug', checked ) }
									/>
									<SwitchControl
										label={ __( 'Write a debug log', 'siterun' ) }
										description={ __( 'Turns on WP_DEBUG_LOG so notices and errors go to wp-content/debug.log.', 'siterun' ) }
										checked={ form.enableDebugLog }
										disabled={ Boolean( busy ) }
										onCheckedChange={ ( checked ) => update( 'enableDebugLog', checked ) }
									/>
									<SwitchControl
										label={ __( 'Show errors in the page', 'siterun' ) }
										description={ __( 'Turns on WP_DEBUG_DISPLAY. Useful locally, noisy in a browser.', 'siterun' ) }
										checked={ form.enableDebugDisplay }
										disabled={ Boolean( busy ) }
										onCheckedChange={ ( checked ) => update( 'enableDebugDisplay', checked ) }
									/>
									<SwitchControl
										label={ __( 'Serve unminified scripts', 'siterun' ) }
										description={ __( 'Turns on SCRIPT_DEBUG for readable core JavaScript and CSS.', 'siterun' ) }
										checked={ form.enableScriptDebug }
										disabled={ Boolean( busy ) }
										onCheckedChange={ ( checked ) => update( 'enableScriptDebug', checked ) }
									/>
								</Stack>
							</div>
						</Stack>
					</form>
				</Dialog.Content>
				<Dialog.Footer>
					<Button variant="minimal" tone="neutral" disabled={ Boolean( busy ) } onClick={ onClose }>
						{ __( 'Cancel', 'siterun' ) }
					</Button>
					<Button
						type="submit"
						form={ formId }
						loading={ Boolean( busy ) }
						loadingAnnouncement={ __( 'Saving the settings', 'siterun' ) }
					>
						{ __( 'Save changes', 'siterun' ) }
					</Button>
				</Dialog.Footer>
			</Dialog.Popup>
		</Dialog.Root>
	);
}
