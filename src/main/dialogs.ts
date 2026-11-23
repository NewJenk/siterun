import path from 'node:path';
import { dialog, type BrowserWindow } from 'electron';

export async function chooseFolder(
	window: BrowserWindow,
	defaultPath?: string | null
): Promise< string | null > {
	const result = await dialog.showOpenDialog( window, {
		title: 'Choose a folder for the site',
		defaultPath: defaultPath ?? undefined,
		properties: [ 'openDirectory', 'createDirectory' ],
		buttonLabel: 'Choose folder'
	} );
	return result.canceled ? null : result.filePaths[ 0 ] ?? null;
}

async function chooseFile(
	window: BrowserWindow,
	options: { title: string; name: string; extensions: string[] }
): Promise< string | null > {
	const result = await dialog.showOpenDialog( window, {
		title: options.title,
		properties: [ 'openFile' ],
		filters: [ { name: options.name, extensions: options.extensions } ]
	} );
	return result.canceled ? null : result.filePaths[ 0 ] ?? null;
}

export function chooseBackupFile( window: BrowserWindow ): Promise< string | null > {
	return chooseFile( window, {
		title: 'Choose a site backup',
		name: 'Site backups',
		extensions: [ 'zip', 'tar', 'gz', 'sql' ]
	} );
}

export function chooseBlueprintFile( window: BrowserWindow ): Promise< string | null > {
	return chooseFile( window, {
		title: 'Choose a Blueprint',
		name: 'Blueprints',
		extensions: [ 'json', 'zip' ]
	} );
}

export async function chooseExportDestination(
	window: BrowserWindow,
	suggestedName: string
): Promise< string | null > {
	const result = await dialog.showSaveDialog( window, {
		title: 'Export site',
		defaultPath: suggestedName,
		filters: [ { name: 'Site archive', extensions: [ 'zip' ] } ],
		properties: [ 'createDirectory', 'showOverwriteConfirmation' ]
	} );
	if ( result.canceled || ! result.filePath ) {
		return null;
	}
	return path.extname( result.filePath ) ? result.filePath : `${ result.filePath }.zip`;
}

export async function chooseDatabaseDestination(
	window: BrowserWindow,
	suggestedName: string
): Promise< string | null > {
	const result = await dialog.showSaveDialog( window, {
		title: 'Save a copy of the database',
		defaultPath: suggestedName,
		filters: [ { name: 'SQLite database', extensions: [ 'sqlite', 'db' ] } ],
		properties: [ 'createDirectory', 'showOverwriteConfirmation' ]
	} );
	if ( result.canceled || ! result.filePath ) {
		return null;
	}
	return path.extname( result.filePath ) ? result.filePath : `${ result.filePath }.sqlite`;
}
