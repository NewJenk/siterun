import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useRef,
	useState,
	type ReactNode
} from 'react';
import { __ } from '@wordpress/i18n';
import { Notice } from '@wordpress/ui';

export type ToastIntent = 'info' | 'success' | 'warning' | 'error';

interface Toast {
	id: number;
	message: string;
	intent: ToastIntent;
}

const ToastContext = createContext< ( message: string, intent?: ToastIntent ) => void >(
	() => undefined
);

export function useToast() {
	return useContext( ToastContext );
}

const LIFETIME: Record< ToastIntent, number > = {
	info: 4500,
	success: 4500,
	warning: 7000,
	error: 10_000
};

export function ToastProvider( { children }: { children: ReactNode } ) {
	const [ toasts, setToasts ] = useState< Toast[] >( [] );
	const nextId = useRef( 0 );

	const remove = useCallback( ( id: number ) => {
		setToasts( ( current ) => current.filter( ( toast ) => toast.id !== id ) );
	}, [] );

	const notify = useCallback(
		( message: string, intent: ToastIntent = 'info' ) => {
			const id = ++nextId.current;
			setToasts( ( current ) => [ ...current, { id, message, intent } ] );
			window.setTimeout( () => remove( id ), LIFETIME[ intent ] );
		},
		[ remove ]
	);

	const value = useMemo( () => notify, [ notify ] );

	return (
		<ToastContext.Provider value={ value }>
			{ children }
			<section className="toast-stack" aria-label={ __( 'Notifications', 'siterun' ) }>
				{ toasts.map( ( toast ) => (
					<Notice.Root
						key={ toast.id }
						intent={ toast.intent }
						politeness={ toast.intent === 'error' ? 'assertive' : 'polite' }
					>
						<Notice.Title>{ toast.message }</Notice.Title>
						<Notice.CloseIcon
							onClick={ () => remove( toast.id ) }
							label={ __( 'Dismiss notification', 'siterun' ) }
						/>
					</Notice.Root>
				) ) }
			</section>
		</ToastContext.Provider>
	);
}
