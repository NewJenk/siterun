import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { __ } from '@wordpress/i18n';
import {
	Button,
	Collapsible,
	Dialog,
	Icon,
	InputControl,
	Notice,
	Stack,
	SwitchControl,
	Text
} from '@wordpress/ui';
import { chevronDown } from '@wordpress/icons';
import type {
	CreateSiteParams,
	OperationProgress,
	SiteSource,
	VersionOption
} from '@shared/types';
import { ProgressNotice } from './ProgressNotice';
import {
	hasErrors,
	proposedSitePath,
	validateCreateForm,
	type CreateFormValues,
	type SourceKind
} from '../lib/create-site';
import { nameFromBackup } from '../lib/site-view';
import { SimpleSelect } from './SimpleSelect';

interface Props {
	open: boolean;
	busy: OperationProgress | null;
	defaultParent: string | null;
	initialSource: SourceKind;
	existingPaths: string[];
	versions: VersionOption[];
	onCreate: ( params: CreateSiteParams ) => void;
	onClose: () => void;
	onPickParent: ( start: string | null ) => Promise< string | null >;
	onPickBlueprintFile: () => Promise< string | null >;
	onPickBackup: () => Promise< string | null >;
}

interface FormState extends CreateFormValues {
	wpVersion: string;
	phpVersion: string;
	adminEmail: string;
}

const PHP_VERSIONS = [ '8.5', '8.4', '8.3', '8.2' ];

function initialState( parent: string | null, sourceKind: SourceKind ): FormState {
	return {
		name: '',
		parentDirectory: parent ?? '',
		sourceKind,
		blueprintPath: null,
		backupPath: null,
		customDomain: '',
		enableHttps: false,
		wpVersion: 'latest',
		phpVersion: '8.4',
		adminEmail: ''
	};
}

function fileName( filePath: string | null ): string {
	return filePath?.split( /[\\/]/ ).pop() ?? '';
}

function buildSource( form: FormState ): SiteSource {
	if ( form.sourceKind === 'blueprint-file' ) {
		return { kind: 'blueprint-file', filePath: form.blueprintPath ?? '' };
	}
	if ( form.sourceKind === 'backup' ) {
		return { kind: 'backup', backupPath: form.backupPath ?? '' };
	}
	return { kind: 'blank' };
}

export function CreateSiteDialog( {
	open,
	busy,
	defaultParent,
	initialSource,
	existingPaths,
	versions,
	onCreate,
	onClose,
	onPickParent,
	onPickBlueprintFile,
	onPickBackup
}: Props ) {
	const formId = useId();
	const [ form, setForm ] = useState< FormState >( () => initialState( defaultParent, initialSource ) );
	const [ submitted, setSubmitted ] = useState( false );
	const wasOpen = useRef( false );

	useEffect( () => {
		if ( open && ! wasOpen.current ) {
			setForm( initialState( defaultParent, initialSource ) );
			setSubmitted( false );
		}
		wasOpen.current = open;
	}, [ open, defaultParent, initialSource ] );

	const update = < K extends keyof FormState >( key: K, value: FormState[ K ] ) => {
		setForm( ( current ) => ( { ...current, [ key ]: value } ) );
	};

	const errors = useMemo( () => validateCreateForm( form ), [ form ] );
	const sitePath = useMemo(
		() => ( form.parentDirectory ? proposedSitePath( form.parentDirectory, form.name, existingPaths ) : '' ),
		[ form.parentDirectory, form.name, existingPaths ]
	);
	const messages = Object.values( errors );

	const chooseParent = async () => {
		const chosen = await onPickParent( form.parentDirectory || defaultParent );
		if ( chosen ) {
			update( 'parentDirectory', chosen );
		}
	};

	const chooseBlueprint = async () => {
		const chosen = await onPickBlueprintFile();
		if ( chosen ) {
			update( 'blueprintPath', chosen );
		}
	};

	const chooseBackup = async () => {
		const chosen = await onPickBackup();
		if ( chosen ) {
			setForm( ( current ) => ( {
				...current,
				backupPath: chosen,
				name: current.name.trim() ? current.name : nameFromBackup( chosen )
			} ) );
		}
	};

	const submit = () => {
		setSubmitted( true );
		if ( hasErrors( errors ) || ! sitePath ) {
			return;
		}

		const source = buildSource( form );

		onCreate( {
			name: form.name.trim(),
			path: sitePath,
			wpVersion: form.wpVersion,
			phpVersion: form.phpVersion,
			source,
			customDomain: form.customDomain.trim() || null,
			enableHttps: form.enableHttps,
			adminEmail: form.adminEmail.trim() || null,
			adminUsername: null,
			adminPassword: null
		} );
	};

	const sourceLabel: Record< SourceKind, string > = {
		blank: __( 'A blank site', 'siterun' ),
		'blueprint-file': __( 'A Blueprint file', 'siterun' ),
		backup: __( 'A backup', 'siterun' )
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
			<Dialog.Popup size="medium" className="create-site-dialog">
				<Dialog.Header>
					<Dialog.Title>{ __( 'New site', 'siterun' ) }</Dialog.Title>
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

							{ submitted && messages.length > 0 ? (
								<Notice.Root intent="error" role="alert">
									<Notice.Description>{ messages.join( ' ' ) }</Notice.Description>
								</Notice.Root>
							) : null }

							<InputControl
								label={ __( 'Site name', 'siterun' ) }
								placeholder={ __( 'My WordPress site', 'siterun' ) }
								value={ form.name }
								disabled={ Boolean( busy ) }
								onChange={ ( event ) => update( 'name', event.currentTarget.value ) }
								description={ __( 'You can change this later.', 'siterun' ) }
							/>

							<Stack direction="column" gap="sm">
								<InputControl
									label={ __( 'Where should it live?', 'siterun' ) }
									value={ form.parentDirectory }
									readOnly
									disabled={ Boolean( busy ) }
									description={ __( 'A folder with the site name is created inside this one.', 'siterun' ) }
								/>
								<div>
									<Button
										variant="outline"
										tone="neutral"
										size="compact"
										disabled={ Boolean( busy ) }
										onClick={ chooseParent }
									>
										{ __( 'Choose folder…', 'siterun' ) }
									</Button>
								</div>
							</Stack>

							{ sitePath ? (
								<Text variant="body-sm" className="muted">
									{ __( 'The site will be created at', 'siterun' ) } <code>{ sitePath }</code>
								</Text>
							) : null }

							<SimpleSelect
								label={ __( 'Start from', 'siterun' ) }
								value={ form.sourceKind }
								disabled={ Boolean( busy ) }
								onValueChange={ ( value ) => update( 'sourceKind', value as SourceKind ) }
								items={ ( Object.keys( sourceLabel ) as SourceKind[] ).map( ( value ) => ( {
									value,
									label: sourceLabel[ value ]
								} ) ) }
							/>

							{ form.sourceKind === 'blueprint-file' ? (
								<Stack direction="row" gap="sm" align="center" wrap="wrap">
									<Button
										variant="outline"
										tone="neutral"
										size="compact"
										disabled={ Boolean( busy ) }
										onClick={ chooseBlueprint }
									>
										{ __( 'Choose Blueprint…', 'siterun' ) }
									</Button>
									<Text variant="body-sm" className="muted">
										{ form.blueprintPath ? fileName( form.blueprintPath ) : __( 'No file chosen', 'siterun' ) }
									</Text>
								</Stack>
							) : null }

							{ form.sourceKind === 'backup' ? (
								<Stack direction="column" gap="sm">
									<Stack direction="row" gap="sm" align="center" wrap="wrap">
										<Button
											variant="outline"
											tone="neutral"
											size="compact"
											disabled={ Boolean( busy ) }
											onClick={ chooseBackup }
										>
											{ __( 'Choose backup…', 'siterun' ) }
										</Button>
										<Text variant="body-sm" className="muted">
											{ form.backupPath ? fileName( form.backupPath ) : __( 'No file chosen', 'siterun' ) }
										</Text>
									</Stack>
									<Text variant="body-sm" className="muted">
										{ __( 'The backup is imported when the site has been created, then the site starts.', 'siterun' ) }
									</Text>
								</Stack>
							) : null }

							<Collapsible.Root className="form-section">
								<Collapsible.Trigger
									render={
										<Button
											variant="minimal"
											tone="neutral"
											size="compact"
											className="advanced-trigger"
										>
											{ __( 'Advanced options', 'siterun' ) }
											<Icon icon={ chevronDown } size={ 16 } />
										</Button>
									}
								/>
								<Collapsible.Panel>
									<Stack direction="column" gap="md">
										<Stack direction="row" gap="md" wrap="wrap">
											<div className="form-half">
												<SimpleSelect
													label={ __( 'WordPress', 'siterun' ) }
													value={ form.wpVersion }
													disabled={ Boolean( busy ) }
													onValueChange={ ( value ) => update( 'wpVersion', value ) }
													items={ versions.map( ( version ) => ( {
														value: version.value,
														label: version.label
													} ) ) }
												/>
											</div>
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
										</Stack>

										<InputControl
											label={ __( 'Custom domain', 'siterun' ) }
											placeholder="mysite.local"
											value={ form.customDomain }
											disabled={ Boolean( busy ) }
											onChange={ ( event ) =>
												update( 'customDomain', event.currentTarget.value )
											}
											description={ __(
												'Optional. Adds a .local address to your hosts file, which the system may ask you to allow.',
												'siterun'
											) }
										/>

										<SwitchControl
											label={ __( 'Use HTTPS', 'siterun' ) }
											description={ __(
												'Needs a custom domain. Adds a locally trusted certificate.',
												'siterun'
											) }
											checked={ form.enableHttps }
											disabled={ Boolean( busy ) || ! form.customDomain.trim() }
											onCheckedChange={ ( checked ) => update( 'enableHttps', checked ) }
										/>

										<InputControl
											label={ __( 'Admin email', 'siterun' ) }
											type="email"
											placeholder="you@example.com"
											value={ form.adminEmail }
											disabled={ Boolean( busy ) }
											onChange={ ( event ) =>
												update( 'adminEmail', event.currentTarget.value )
											}
											description={ __(
												'Optional. Where WordPress sends mail from this site.',
												'siterun'
											) }
										/>
									</Stack>
								</Collapsible.Panel>
							</Collapsible.Root>
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
						loadingAnnouncement={ __( 'Creating the site', 'siterun' ) }
					>
						{ __( 'Create site', 'siterun' ) }
					</Button>
				</Dialog.Footer>
			</Dialog.Popup>
		</Dialog.Root>
	);
}
