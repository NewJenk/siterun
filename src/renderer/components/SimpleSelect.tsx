import type { ComponentProps } from 'react';
import { SelectControl } from '@wordpress/ui';

type BaseProps = Omit<
	ComponentProps< typeof SelectControl >,
	'items' | 'value' | 'onValueChange' | 'children'
>;

interface Props extends BaseProps {
	value: string;
	items: Array< { value: string; label: string; description?: string } >;
	onValueChange: ( value: string ) => void;
}

/**
 * The design system's select speaks in item objects; most of this app speaks
 * in plain strings. This keeps that mismatch in one place, and lets the
 * built-in item layout render the label and description without repeating
 * the same three elements at every call site.
 * @param root0
 * @param root0.value
 * @param root0.items
 * @param root0.onValueChange
 */
export function SimpleSelect( { value, items, onValueChange, ...rest }: Props ) {
	const selected = items.find( ( item ) => item.value === value ) ?? null;
	return (
		<SelectControl
			{ ...rest }
			items={ items }
			value={ selected }
			onValueChange={ ( item ) => {
				if ( item ) {
					onValueChange( String( item.value ?? '' ) );
				}
			} }
		/>
	);
}
