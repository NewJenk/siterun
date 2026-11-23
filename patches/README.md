# Engine patches

The engine in [`engine/`](../engine) is adapted from the Studio CLI. Three changes belong in the engine rather than in the app, either because they change how a site is served or because the app needs a supported way to own the engine's data. They are already applied to the copied source, and the patches here are the copies to send upstream.

The copies also make the changes reviewable: each file shows exactly what differs from the Studio CLI it came from.

## `studio-cli-daemon-stop.patch`

Adds the hidden `_daemon-stop` command. The process manager is started by the engine rather than by the desktop app, so stopping every site is not enough on quit: the daemon can outlive the window. The app calls `_daemon-stop` after `stop --all`, which makes "no process after quit" true.

Test it by starting a site, quitting the app, and checking that no `process-manager-daemon` process is left. The command is idempotent: with no daemon running, it exits successfully.

## `studio-cli-config-dir.patch`

Lets a host app own the engine's data. `STUDIO_CONFIG_DIR` is read before the development override, so the desktop app can keep the config, PHP binaries, WordPress versions, must-use plugins, email, certificates and logs in its own application-support folder instead of writing to a shared `~/.studio`.

The app also sets `STUDIO_PROCESS_MANAGER_HOME` to `engine/daemon`, so the local process manager's sockets and logs move too.

The override is covered by the upstream test `packages/common/lib/tests/well-known-paths.test.ts`, which runs against the patch in the Studio checkout. Here, the e2e journey checks that the app's engine folder gains the config and runtime files and that `~/.studio` is untouched.

## `studio-cli-router-index-html.patch`

Studio's PHP router served a directory's `index.php` but not its `index.html`. A directory holding a static site therefore fell through to WordPress and answered 404.

The patch serves the `index.html` the way a normal web server does, redirects a directory URL without its trailing slash, and keeps `index.php` ahead of it.

The upstream regression test is `apps/cli/lib/tests/native-php-router.e2e.test.ts`, tagged `e2e`; it needs the engine's PHP binary. It checks that:

- a directory `index.html` is served with `200`;
- the same URL without a slash answers `301` to the slash form;
- a directory with both files still runs `index.php`;
- the existing dotfile, database-directory and traversal protections still hold.

Since the engine now lives here, these changes and their tests belong with it when the copy is next updated from upstream.
