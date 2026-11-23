import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { _electron as electron, expect, test } from '@playwright/test';

/**
 * The whole journey, against a real site. It creates a site, starts and stops
 * it, saves settings, runs WP-CLI, exports and deletes it. That takes minutes
 * and touches the machine, so it is opt-in:
 *
 *   SITERUN_E2E_SITE=1 npm run e2e -- site-journey
 *
 * The default smoke test opens the window and nothing more.
 */
const enabled = process.env.SITERUN_E2E_SITE === '1';

test.skip( ! enabled, 'Set SITERUN_E2E_SITE=1 to run the real-site journey.' );

test( 'a site can be created, used, backed up and deleted', async () => {
	test.setTimeout( 10 * 60 * 1000 );

	const name = `siterun E2E ${ randomUUID().slice( 0, 8 ) }`;
	const backup = path.join( os.tmpdir(), `siterun-e2e-${ Date.now() }.zip` );
	const app = await electron.launch( {
		args: [ '.', '--no-sandbox' ],
		cwd: path.dirname( __dirname ),
		env: { ...process.env, NODE_ENV: 'production' }
	} );
	const page = await app.firstWindow();
	page.setDefaultTimeout( 5 * 60 * 1000 );
	let createdSiteId: string | null = null;

	try {
		const firstSite = page.getByRole( 'button', { name: 'Create your first site' } );
		const newSite = page.getByRole( 'button', { name: 'New site' } );
		await expect( firstSite.or( newSite ).first() ).toBeVisible();
		if ( await firstSite.isVisible() ) {
			await firstSite.click();
		} else {
			await newSite.click();
		}
		await page.getByLabel( 'Site name' ).fill( name );
		await page.getByRole( 'button', { name: 'Create site' } ).click();
		await expect( page.getByRole( 'heading', { name } ) ).toBeVisible( {
			timeout: 5 * 60 * 1000
		} );
		createdSiteId = await page.evaluate( async ( siteName ) => {
			const sites = await window.studio.getSites();
			return sites.find( ( site ) => site.name === siteName )?.id ?? null;
		}, name );

		// Start and stop.
		await page.getByRole( 'button', { name: 'Stop site' } ).click();
		await expect( page.getByRole( 'button', { name: 'Start site' } ).first() ).toBeVisible();
		await page.getByRole( 'button', { name: 'Start site' } ).first().click();
		await expect( page.getByRole( 'button', { name: 'Stop site' } ) ).toBeVisible();

		// Database: browse, then write behind the backup gate.
		await page.getByRole( 'button', { name: 'Stop site' } ).click();
		await expect( page.getByRole( 'button', { name: 'Start site' } ).first() ).toBeVisible();
		await page.getByRole( 'button', { name: 'Browse database' } ).click();
		await expect( page.getByRole( 'heading', { name: /Database/ } ) ).toBeVisible();
		await page.getByRole( 'button', { name: /wp_options/ } ).click();
		await page.getByRole( 'tab', { name: 'SQL' } ).click();
		const sqlPanel = page.locator( '.db-sql' );
		await sqlPanel.getByRole( 'button', { name: 'Enable write mode' } ).click();
		await page.getByRole( 'button', { name: 'Save backup and enable' } ).click();
		await expect( sqlPanel.getByText( /Write mode is on/ ) ).toBeVisible();

		const runSql = async ( statement: string ) => {
			await sqlPanel.locator( 'textarea' ).fill( statement );
			await sqlPanel.getByRole( 'button', { name: 'Run', exact: true } ).click();
			const confirm = page.getByRole( 'button', { name: 'Run statement' } );
			if ( await confirm.isVisible().catch( () => false ) ) {
				await confirm.click();
			}
			await page.waitForTimeout( 400 );
		};
		await runSql( 'CREATE TABLE wp_zz_e2e_db (id INTEGER PRIMARY KEY, note TEXT)' );
		await runSql( "INSERT INTO wp_zz_e2e_db (note) VALUES ('hello')" );
		await runSql( 'SELECT * FROM wp_zz_e2e_db' );
		await expect( page.locator( '.db-query-result' ) ).toContainText( 'hello' );
		await runSql( 'DROP TABLE wp_zz_e2e_db' );

		await sqlPanel.getByRole( 'button', { name: 'Turn off' } ).click();
		await expect( sqlPanel.getByRole( 'button', { name: 'Enable write mode' } ) ).toBeVisible();
		await page.getByRole( 'button', { name: 'Close', exact: true } ).last().click();
		await page.getByRole( 'button', { name: 'Start site' } ).first().click();
		await expect( page.getByRole( 'button', { name: 'Stop site' } ) ).toBeVisible();

		// Settings round-trip.
		await page.getByRole( 'button', { name: 'Site settings' } ).click();
		await page.getByLabel( 'Admin email' ).fill( 'e2e@example.com' );
		await page.getByRole( 'button', { name: 'Save changes' } ).click();
		await expect( page.getByText( 'Settings saved.' ) ).toBeVisible();
		await page.getByRole( 'button', { name: 'Site settings' } ).click();
		await expect( page.getByLabel( 'Admin email' ) ).toHaveValue( 'e2e@example.com' );
		await page.getByRole( 'button', { name: 'Cancel' } ).click();

		// WP-CLI against the real install.
		await page.getByRole( 'button', { name: 'Run WP-CLI' } ).click();
		await page.getByLabel( 'Command' ).fill( 'option get siteurl' );
		await page.getByRole( 'button', { name: 'Run', exact: true } ).click();
		await expect( page.locator( '.wp-cli-output' ) ).toContainText( 'http://localhost' );
		await page.getByRole( 'button', { name: 'Close', exact: true } ).last().click();

		// Export through the same IPC the dialog uses; the destination picker
		// is a native dialog that a test cannot drive.
		const exported = await page.evaluate( async ( destination ) => {
			const [ site ] = await window.studio.getSites();
			return window.studio.exportSite( { siteId: site.id, mode: 'full', destination } );
		}, backup );
		expect( exported ).toBe( backup );

		// Delete, and prove the window returns to the welcome screen.
		await page.getByRole( 'button', { name: 'Actions' } ).click();
		await page.getByRole( 'menuitem', { name: 'Delete site…' } ).click();
		await page.getByRole( 'switch', { name: "Delete the site's files too" } ).click();
		await page.getByRole( 'button', { name: 'Delete site', exact: true } ).click();
		await expect( page.getByRole( 'heading', { name } ) ).toBeHidden();
		await expect(
			page
				.getByRole( 'heading', { name: 'My sites' } )
				.or( page.getByRole( 'button', { name: 'Create your first site' } ) )
		).toBeVisible();
	} finally {
		if ( createdSiteId ) {
			await page
				.evaluate( async ( id ) => {
					const sites = await window.studio.getSites();
					if ( sites.some( ( site ) => site.id === id ) ) {
						await window.studio.deleteSite( id, true );
					}
				}, createdSiteId )
				.catch( () => undefined );
		}
		await app.close();
	}
} );
