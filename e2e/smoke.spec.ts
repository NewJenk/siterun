import path from 'node:path';
import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test';

const root = path.dirname( __dirname );

async function launch(): Promise< { app: ElectronApplication; page: Page } > {
	const app = await electron.launch( {
		args: [ '.', '--no-sandbox' ],
		cwd: root,
		env: { ...process.env, NODE_ENV: 'production' }
	} );
	const page = await app.firstWindow();
	await page.waitForLoadState( 'domcontentloaded' );
	return { app, page };
}

test( 'the window opens into a usable first screen', async () => {
	const { app, page } = await launch();

	try {
		await expect( page ).toHaveTitle( 'siterun' );

		const missingEngine = page.getByRole( 'button', { name: 'Check again' } );
		const emptyState = page.getByRole( 'heading', { name: 'Run WordPress on your machine.' } );
		const siteList = page.getByRole( 'heading', { name: 'My sites' } );

		await expect( missingEngine.or( emptyState ).or( siteList ).first() ).toBeVisible();

		await page.screenshot( { path: 'test-results/startup-light.png', fullPage: true } );

		// The same screen in the dark theme, through the real preference path.
		if ( await page.getByRole( 'heading', { name: 'My sites' } ).isVisible() ) {
			await page.getByRole( 'button', { name: 'Settings', exact: true } ).click();
			await page.getByRole( 'heading', { name: 'Settings' } ).waitFor();
			await page.getByRole( 'button', { name: 'Done' } ).click();
		} else {
			await page.evaluate( () => window.studio.setPreferences( { theme: 'dark' } ) );
			await page.waitForTimeout( 300 );
			await page.screenshot( { path: 'test-results/startup-dark.png', fullPage: true } );
			await page.evaluate( () => window.studio.setPreferences( { theme: 'system' } ) );
		}

		if ( await emptyState.isVisible() ) {
			await page.getByRole( 'button', { name: 'Create your first site' } ).click();
			await expect( page.getByRole( 'heading', { name: 'New site' } ) ).toBeVisible();
			await page.getByRole( 'button', { name: 'Cancel' } ).click();
			await expect( page.getByRole( 'heading', { name: 'New site' } ) ).toBeHidden();
		}

		if ( await missingEngine.isVisible() ) {
			await expect( page.getByRole( 'button', { name: 'Copy command' } ) ).toBeVisible();
		}
	} finally {
		await app.close();
	}
} );
