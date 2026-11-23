import { Notice, Spinner } from '@wordpress/ui';

/**
 * One spinner, one line. A Notice already draws its intent icon, so putting a
 * Spinner beside that icon gives two leading glyphs and reads as a mistake.
 * Hiding the intent icon leaves the spinner as the only thing moving.
 */
export function ProgressNotice( { message }: { message: string } ) {
	return (
		<Notice.Root intent="info" icon={ null } politeness="polite">
			<Notice.Description>
				<span className="progress-line">
					<Spinner width={ 16 } height={ 16 } aria-hidden="true" />
					<span>{ message }</span>
				</span>
			</Notice.Description>
		</Notice.Root>
	);
}
