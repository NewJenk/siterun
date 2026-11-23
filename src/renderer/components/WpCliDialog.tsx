import { useEffect, useId, useRef, useState } from 'react';
import { __ } from '@wordpress/i18n';
import { Button, Dialog, InputControl, Spinner, Stack, Text } from '@wordpress/ui';
import type { Site, WpCliResult } from '@shared/types';
import { parseCommand } from '../lib/command';

interface Props {
	site: Site | null;
	open: boolean;
	onRun: ( args: string[] ) => Promise< WpCliResult >;
	onClose: () => void;
}

const EXAMPLES = [ 'plugin list', 'theme list', 'option get siteurl', 'post list --post_type=page' ];

export function WpCliDialog( { site, open, onRun, onClose }: Props ) {
	const formId = useId();
	const [ command, setCommand ] = useState( 'plugin list' );
	const [ output, setOutput ] = useState< string >( '' );
	const [ running, setRunning ] = useState( false );
	const wasOpen = useRef( false );

	useEffect( () => {
		if ( open && ! wasOpen.current ) {
			setCommand( 'plugin list' );
			setOutput( '' );
			setRunning( false );
		}
		wasOpen.current = open;
	}, [ open ] );

	if ( ! site ) {
		return null;
	}

	const run = async () => {
		const args = parseCommand( command );
		if ( args.length === 0 ) {
			return;
		}
		setRunning( true );
		setOutput( '' );
		try {
			const result = await onRun( args );
			setOutput(
				[ result.stdout.trim(), result.stderr.trim() ].filter( Boolean ).join( '\n' ) ||
					__( 'The command finished with no output.', 'siterun' )
			);
		} catch ( error ) {
			setOutput( error instanceof Error ? error.message : String( error ) );
		} finally {
			setRunning( false );
		}
	};

	return (
		<Dialog.Root
			open={ open }
			onOpenChange={ ( next ) => {
				if ( ! next && ! running ) {
					onClose();
				}
			} }
		>
			<Dialog.Popup size="large" className="wp-cli-dialog">
				<Dialog.Header>
					<Dialog.Title>{ __( 'Run WP-CLI', 'siterun' ) }</Dialog.Title>
					{ running ? null : <Dialog.CloseIcon /> }
				</Dialog.Header>
				<Dialog.Content>
					<form
						id={ formId }
						onSubmit={ ( event ) => {
							event.preventDefault();
							void run();
						} }
					>
						<Stack direction="column" gap="lg">
							<Text variant="body-sm" className="muted">
								{ __( 'Runs against', 'siterun' ) } <code>{ site.path }</code>
							</Text>
							<InputControl
								label={ __( 'Command', 'siterun' ) }
								placeholder="plugin list"
								value={ command }
								disabled={ running }
								autoComplete="off"
								onChange={ ( event ) => setCommand( event.currentTarget.value ) }
								description={ __( 'Type the part after "wp". Press Command or Control + Enter to run.', 'siterun' ) }
								onKeyDown={ ( event ) => {
									if ( ( event.metaKey || event.ctrlKey ) && event.key === 'Enter' ) {
										event.preventDefault();
										void run();
									}
								} }
							/>
							<Stack direction="row" gap="sm" wrap="wrap">
								{ EXAMPLES.map( ( example ) => (
									<Button
										key={ example }
										variant="minimal"
										tone="neutral"
										size="small"
										disabled={ running }
										onClick={ () => setCommand( example ) }
									>
										{ example }
									</Button>
								) ) }
							</Stack>
							{ running ? (
								<Text variant="body-sm" className="muted">
									<Spinner /> { __( 'Running…', 'siterun' ) }
								</Text>
							) : (
								<pre className="wp-cli-output" aria-live="polite">
									{ output || __( 'The command\'s output appears here.', 'siterun' ) }
								</pre>
							) }
						</Stack>
					</form>
				</Dialog.Content>
				<Dialog.Footer>
					<Button variant="minimal" tone="neutral" onClick={ onClose } disabled={ running }>
						{ __( 'Close', 'siterun' ) }
					</Button>
					<Button
						type="submit"
						form={ formId }
						loading={ running }
						loadingAnnouncement={ __( 'Running the command', 'siterun' ) }
					>
						{ __( 'Run', 'siterun' ) }
					</Button>
				</Dialog.Footer>
			</Dialog.Popup>
		</Dialog.Root>
	);
}
