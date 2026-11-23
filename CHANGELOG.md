# Changelog

Every user-visible change goes here. Keep the newest entry first and say what changed for the person using the app, not which files moved.

## Unreleased

### Added

- **README wordmark.** The README uses separate light and dark SVGs, chosen by GitHub’s theme rather than the operating system, so the transparent lockup reads correctly in both.
- **A siterun wordmark.** A `</>` mark, then `siterun` with an italic `run`. It appears on the landing page, in the sidebar footer and in About.
- **The Going Bold credit.** The landing page ends with the Going Bold wordmark in "A GOING BOLD CONTRAPTION".
- **Database browser.** A Database card on each site opens a full window with a table list and row counts, a sortable and searchable grid, 50-row pages, a cell inspector with copy, and a SQL console. It is read-only by default.
- **Write mode.** Enabling it requires the site to be stopped and takes a full SQLite backup first. One statement runs at a time, destructive SQL asks first, and dropping a table requires typing its name. The write connection closes when write mode is turned off or the window closes.
- **Database backups.** "Back up now" writes a consistent copy to the app's `backups` folder and shows the path; "Save a copy…" asks where to put one.
- **Database refresh.** A refresh control re-reads the open table. Double-clicking the already-selected table no longer empties it.
- The SQL runner caps results at 500 rows and cells at 256KB, so a huge table cannot freeze the window.

### Changed

- **Cleared out the last of the unused engine code.** phpMyAdmin was still in the engine with an 11 MB bundle, even though the app has its own database browser. It's gone, along with the Reprint and Simply Static leftovers from pull and static export. The database browser is the only database UI now.
- **GPL-3.0-or-later.** The app, its engine copy and its license file now use GPL version 3 or later.
- **A smaller menu bar.** The app menu now holds only About, Settings and Quit; File holds New Site and Close. Edit, View, Window and Help are gone, including developer tools, reload, zoom and the hide/show-all items. Copy, cut, paste, select all, undo and redo still work through their keyboard shortcuts.
- **No telemetry. Ever.** All usage-count code, the telemetry preference and the installation id are gone. The app has no analytics endpoint and nothing to opt in to.
- **New sites default to `~/siterun`.** The old default folder name is treated as unset, so the first site created after this change lands in the new folder.
- **Renamed to siterun.** The window title, About dialog, installer, bundle id, app-data folder and engine messages all use the new name. The first launch moves the previous app-data folder's preferences, engine data and backups into the new one.
- **The remote Blueprint Library is gone.** Blueprints still open from a file, folder or zip, or from a URL you give, but the app no longer fetches a library list from an external service. The "Start from" list in the New site dialog has no library entry.
- **There's no upstream branding left in the engine.** Certificates are named siterun, the hosts-file block, administrator prompts and log lines say siterun, and the engine README is gone.
- **Removed the unused sign-in and reporting code.** The engine no longer carries update checks, usage counts, error-reporting hooks or the legacy account import.
- **The app is self-contained.** The site engine now lives in this repository under `engine/` and is built by `npm start` and the packaging scripts. The app no longer loads a build from an external checkout, so there is nothing else to install or keep in step.
- **A smaller engine.** The copied engine keeps local site management only. The AI agent, account sign-in, sync, previews, MCP and `studio ui` commands are removed rather than left in place.
- **Engine data now lives in the app's own folder.** The shared runtime, site list, PHP binaries, WordPress versions, must-use plugins, captured email, daemon logs and database backups all live under the app's application-support folder. The app no longer writes to `~/.studio`; the first launch copies an existing Studio installation's site list and runtime across, then leaves the old copy alone.
- The local process manager's sockets and logs move into that folder too. The app now asks it to stop on quit, so no engine process is left running after the window closes.

### Fixed

- Double-clicking the selected table no longer clears its rows; the table stays put and the refresh control handles a deliberate re-read.
- A newly created site is selected as soon as the refreshed list contains it, even when the library already has sites. Previously the selection could fall back to the old site.
- Saving site settings no longer sends an empty custom domain. That bug made the CLI rewrite the hosts file and ask for an administrator password even when no domain had changed.
- The CLI runner now finishes when the engine says `done` instead of waiting for the process to exit, so a settings save no longer appears to hang. Quitting also kills any engine process still running, which prevents an orphaned child holding a site lock.
- The main content area now uses the design system's page padding, cards in a row have equal heights, and "At a glance" is a compact 2×2 grid.
- Progress notices now show one spinner instead of a spinner beside the notice's own icon. The same pattern is used in every dialog and on the site page.
- The Actions/footer button hierarchy is consistent: secondary actions are outlined, the primary action is solid, and text-only buttons are reserved for links.
- **Check again** on the missing-engine screen now rechecks the disk, so building the engine while the window is open works without a restart.
- Backup files carry a short unique suffix, so two backups taken in the same moment cannot overwrite each other.
- The one-time engine copy writes the site list last, so an interrupted copy does not look finished on the next launch.

### Security

- The database is opened read-only unless write mode is explicitly armed. The guarantee is enforced by SQLite's read-only connection, not only by parsing SQL.
- Write mode is refused while the site is running, and again in the main process before every write.
- One statement per run; `ATTACH`, multi-statement input and SQL outside the read allowlist are refused.
- Database paths are resolved from the site's `wp-config.php` and the standard Studio location, and every IPC call is sender-checked.
- The app's only persistent writes are the site folders you choose and its own application-support folder. `/etc/hosts` and the certificate store are touched only for a custom domain or HTTPS, and deleted site files go to the operating system's trash.

## 0.1.0 — 2026-11-23

The first build of siterun: a separate Electron app, with no AI, no account, no sync and no hosted previews.

### Added

- Sites list, create, start, stop and delete.
- Create from a blank site, a Blueprint file, or a backup.
- Site page with local URL, WP Admin, admin credentials, WordPress and PHP versions, port, folder and environment.
- Site settings for PHP, WordPress, custom domain, HTTPS, environment, admin email, Xdebug, debug log, debug display and script debug.
- Full-site, content-only and database-only export; restore from a backup.
- WP-CLI console.
- Open site, WP Admin, folder and terminal.
- Light, dark and system themes using the WordPress design system tokens.
- Sandboxed renderer, context isolation, strict CSP, pinned navigation, external URL allowlist and sender-checked IPC.

### Known limitations

- Updates are a check and a download link, not an in-place update. Signing and a publish target are a release decision.
- The development app must be started from Terminal with `npm start`. Launching the raw Electron binary through Finder or `open` can be refused by macOS privacy protection on `~/Downloads`, which surfaces as an `EPERM` reading `package.json`. A packaged build in Applications does not have this problem.
- Windows and Linux have not been exercised on a real machine yet.
