<p align="center">
	<img alt="siterun" src="assets/wordmark.svg" width="360">
</p>

<p align="center"><strong>The simplest way to run WordPress locally.</strong></p>

The world has changed. WordPress has changed. The way most of us still run WordPress locally has not.

A local site should not arrive as an installer, a system PHP, a database server, a control panel and a folder full of logs before you can open a text editor. It should not need an account, a sign-in, or a service that outlives the app. It should not ask you to configure it before it exists.

siterun is the antidote. A site is a folder. Give it a name, and it is there: real WordPress, real PHP, a real SQLite database, its own local address. Stop it, start it, open it, change it, back it up, delete it. Then close the app and get on with your day.

It stands on the excellent work Automattic has done on local WordPress tooling. That work showed that local WordPress could be simpler. I wanted to take the next step: make it quiet, make it fast, and make it feel like it belongs on a modern desktop.

The first launch prepares one shared runtime. After that, a site is ready in seconds.

**No telemetry. No analytics. No account.** Nothing leaves your machine unless you ask for something.

This is early, and it is deliberately small. The parts that matter are here. Enjoy.

## What it does

- Create a site with a name, a folder, WordPress, PHP, and optionally a `.local` domain and HTTPS.
- Start, stop and delete sites; open the site or `wp-admin` in your browser.
- See the site's WordPress version, PHP version, port, admin user and password.
- No account, no telemetry, no analytics, no install id.
- Change PHP, WordPress, the domain, HTTPS, admin email and debugging flags.
- Create a site from a Blueprint, or restore one from a backup.
- Export the whole site, the content, or just the database.
- Browse the database, inspect rows and run SQL. Read-only by default; write mode stops the site, saves a backup first, and asks before destructive changes.
- Run WP-CLI commands against a site.
- Open the site folder or a terminal there.
- Light and dark themes built on the WordPress design system.

## Where everything lives

This is the part that makes it different from the old local development stack. There is no system-wide PHP, MySQL, Apache or control panel. There is no installer that scatters a runtime through your home folder. There is no login item or background service after you quit.

A site is a normal folder. The app is one normal folder. That is the whole map.

### Your sites

Each site is the folder you choose, by default `~/siterun/<site-name>`. WordPress, plugins, themes, uploads and the SQLite database are all inside it. Move the folder and you have moved the site. Delete the folder and there is nothing left of it anywhere else.

### The app folder

Everything the app itself needs lives in one folder:

| Platform | Folder |
| --- | --- |
| macOS | `~/Library/Application Support/siterun` |
| Windows | `%APPDATA%\siterun` |
| Linux | `~/.config/siterun` |

It contains:

- `engine/`: the engine's runtime data. The site list, the PHP binary, the WordPress versions, the small must-use plugins, captured site email and the local server logs.
- `backups/`: the database backups write mode takes before it lets you change anything.
- `logs/`: the app's own log.
- `preferences.json`: theme, default site folder and privacy choice.
- Electron's own cache and local storage.

One runtime serves every site. It is downloaded or copied once, not once per site.

An earlier build used a different data-folder name beside this one. The first launch of siterun moves the preferences, engine data and database backups across, and leaves the old folder's browser caches behind.

That `engine/` holds the engine's **data**. Its code is in this repository's [`engine/`](engine) folder; both are described in [What is the engine?](#what-is-the-engine).

### Temporary files

A database export is written to a temporary file first, so the copy is consistent while WordPress is running. It is removed as soon as the copy is saved. Temporary files live in the operating system's temp folder.

### System changes, only when you ask

A plain local site touches nothing outside its folder and the app folder. Two optional features do:

- **A custom `.local` domain** adds a line to `/etc/hosts`. The operating system asks for an administrator password because that file belongs to the system.
- **HTTPS** adds a locally trusted certificate to the system trust store, so the browser stops warning you.

Deleting a site with its files moves the folder to the operating system's trash, so it is still recoverable.

### If you already had a shared Studio folder

The first launch copies the site list and the shared runtime from the existing `~/.studio` folder into this app's folder. From then on, this app does not write to `~/.studio`. The old installation keeps its own copy.

## Requirements

This is a working preview, not a signed installer yet.

- Node 24.

The site engine is part of this repository: its source is in `engine/`, and `npm start` builds it into `engine/dist/cli` before it starts the app. Nothing needs to be checked out or built from a different project.

The PHP binary and the WordPress files it runs are vendored in `engine/php-bin` and `engine/wp-files`, so a fresh clone builds and runs without downloading them.

The app looks for the built engine in this order:

1. `SITERUN_CLI_PATH`, if set.
2. The packaged app's `resources/cli/main.mjs`.
3. `<app>/engine/dist/cli/main.mjs` during development.
4. `<app>/vendor/cli/main.mjs`, the build the packaging scripts produce.

The three changes this app makes to the engine are applied in `engine/` and kept as patches in `patches/` for upstream. See [`patches/README.md`](patches/README.md) for what each patch changes.

## Run it

```sh
npm install
npm start
```

`npm run dev` rebuilds and restarts the app when the app's own code changes; after changing the engine, run `npm run engine:build` (or restart `npm start`). Start the development app from Terminal. Launching the raw Electron binary through Finder can be refused by macOS privacy protection on `~/Downloads`; a packaged build in Applications does not have that problem.

## Check it

```sh
npm run typecheck
npm run lint
npm test
npm run e2e
```

`npm test` covers the pure logic: folder naming, form validation, command splitting, path display, version comparison and the SQL safety checks.

`npm run e2e` opens the real window, checks the first screen and the New site dialog, and captures light and dark screenshots in `test-results/`. The full journey is opt-in because it creates, starts, changes and deletes a real site:

```sh
SITERUN_E2E_SITE=1 npm run e2e -- site-journey
```

## Package it

```sh
npm run package   # an unpacked app in release/
npm run make      # an installer for the current platform
```

Both build the engine and copy it to `vendor/cli`, then electron-builder ships that folder as `resources/cli`. The packaged app needs no checkout and no separate engine install.

## How it is put together

```
src/main       Electron main: window, menu, IPC, CLI runner, site operations, database worker
src/preload    The typed bridge exposed as window.studio
src/renderer   React UI, built with the WordPress design system
src/shared     Types and channel names used by all three
engine         The site engine's source: the CLI, shared site code and Blueprints
tests          node:test for the pure logic
```

`engine/dist` and `vendor/cli` are build output. `engine/php-bin` and `engine/wp-files` are the bundled PHP binary and WordPress files, copied into the build.

## What is the engine?

The engine is a Node program adapted from Automattic's local WordPress tooling. It is the part that actually knows how to run WordPress:

- it reads and writes the site list;
- it creates a site and copies WordPress into it;
- it manages the native PHP binary and starts a small pool of PHP workers;
- it runs WP-CLI, imports and exports, and opens blueprints;
- it sets up custom domains, the hosts file and HTTPS certificates.

siterun does not reimplement any of that. The engine's source lives in `engine/`. The Electron main process forks the built CLI and speaks its IPC protocol, and the React window talks to the main process. The renderer never runs the engine directly.

The copy keeps the local-site commands and drops the surfaces this app does not have: the AI agent, account sign-in, sync, previews, MCP and `studio ui`. The commands left are create, list, start, stop, status, delete, config, import/export, WP-CLI, blueprints and the hidden daemon shutdown.

```
siterun (Electron)
  renderer (React) ── IPC ── main process
                                 │ forks
                                 ▼
                          Studio CLI (the engine)
                                 │
                                 ├─ site list, create, start, stop, delete
                                 ├─ native PHP runtime + WordPress files
                                 ├─ WP-CLI, blueprints, import/export
                                 └─ process-manager daemon ──> PHP workers (while a site runs)
```

The engine is not a system service and it is not installed globally. It is a local program, started by the app, running as you. The process-manager daemon exists only while the app is using it and is gone after the app quits. The PHP workers exist only while a site is running.

### Where the engine comes from

The engine's code is in this repository. Development builds load `engine/dist/cli/main.mjs`; a packaged build loads its copy from `resources/cli`. Building it is `npm run engine:build`, which `npm start` runs for you.

Its data lives in this app's folder. Before this change it lived in `~/.studio`, the shared folder an earlier Studio install uses. That meant this app shared a site list, PHP runtime and daemon with another product. Now it lives in this app's folder:

| What | Before | Now |
| --- | --- | --- |
| Engine code | An external checkout | `engine/` in this repository |
| Site list and engine config | `~/.studio/config.json` | `<app data>/engine/config.json` |
| PHP binary | `~/.studio/php-bin` | `<app data>/engine/php-bin` |
| WordPress versions | `~/.studio/server-files` | `<app data>/engine/server-files` |
| Must-use plugins | `~/.studio/mu-plugins` | `<app data>/engine/mu-plugins` |
| Captured site email | `~/.studio/email` | `<app data>/engine/email` |
| Process-manager sockets and logs | `~/.studio/daemon` | `<app data>/engine/daemon` |
| Database backups | `~/Studio/.backups` | `<app data>/backups` |
| Site files | The folder you choose | Unchanged |

The first launch copies the existing `~/.studio` site list and runtime into `<app data>/engine`, so sites you already had continue to appear. After that, this app does not write to `~/.studio`. The old installation keeps its own copy.

`<app data>` is `~/Library/Application Support/siterun` on macOS, `%APPDATA%\siterun` on Windows and `~/.config/siterun` on Linux.

- **Site operations are the engine's.** The app forks it and speaks its IPC protocol, so there is one implementation of creating WordPress, starting PHP and managing a site.
- **No state mirror.** The engine's config is the source of truth for the site list; the window reads it on demand and after every mutation.
- **The database is a worker.** SQLite is read through Node's own driver in a separate thread. The default connection is read-only. Write mode takes a backup, requires the site to be stopped, allows one statement at a time and closes the writable connection when it is turned off.
- **Security.** The renderer is sandboxed with context isolation, no Node integration, a pinned navigation target, a strict CSP and an allowlist of external URL schemes. Every IPC handler checks the sender. Site paths and database paths come from the engine, never from the window.
- **Theming.** All styling uses the `--wpds-*` tokens from `@wordpress/theme` and the components from `@wordpress/ui`, `@wordpress/admin-ui` and `@wordpress/dataviews`. ESLint refuses hard-coded colours and inline styles; stylelint refuses non-token colours and unknown tokens.
- **Updates.** `SITERUN_UPDATE_FEED` can point at a JSON document (`{ version, url, notes }`); the app shows a banner when a newer version exists. Signing and in-place updates are a release decision, not something this build pretends to do.

## Privacy

No account. No telemetry. No analytics. No AI. No sync. No remote previews.

There is no usage-count code, no installation id, no analytics endpoint and no preference to turn one on. Nothing leaves the machine unless you ask for something.

Update checks are opt-in to configure: without a feed URL, the app makes no update request.

The engine makes a network request only when it has to fetch something you asked for:

- `api.wordpress.org` for the list of WordPress versions, and `wordpress.org` when you choose a version other than the bundled one.
- The PHP binary CDN when you choose a PHP version that is not bundled. The bundled version runs offline.
- The URL of a Blueprint you open from the web.

Blueprints from a file, folder or zip never leave the machine.

## Status and limitations

- The engine is an adapted copy of Automattic's local WordPress tooling, not a dependency. It is trimmed to local sites; AI, account sign-in, sync, previews, MCP and `studio ui` are removed. Bringing in an upstream change means copying it into `engine/` and rebuilding.
- Updates are a check and a download link, not an in-place update.
- Sites open in your browser. There is no embedded preview yet.
- Windows and Linux have not been exercised on a real machine.
- The first launch copies or downloads the shared runtime, so it takes longer than every launch after it.

## Changelog

Every user-visible change is recorded in [`CHANGELOG.md`](CHANGELOG.md). Add an entry with each change, in the user's words rather than the diff's.

## Credits

Built on Automattic's local WordPress work, the WordPress design system and WordPress itself. siterun is GPL-3.0-or-later. Bundled WordPress, PHP and other third-party components keep their own licences; see [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

Security reports: see [SECURITY.md](SECURITY.md).
