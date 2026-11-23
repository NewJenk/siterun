import { createRoot } from 'react-dom/client';
import { SlotFillProvider } from '@wordpress/components';
import '@wordpress/theme/design-tokens.css';
import '@wordpress/components/build-style/style.css';
import '@wordpress/dataviews/build-style/style.css';
import './styles/shell.css';
import { App } from './App';
import { ToastProvider } from './components/ToastStack';

const container = document.getElementById( 'root' );
if ( ! container ) {
	throw new Error( 'The window has no root element.' );
}

createRoot( container ).render(
	<SlotFillProvider>
		<ToastProvider>
			<App />
		</ToastProvider>
	</SlotFillProvider>
);
