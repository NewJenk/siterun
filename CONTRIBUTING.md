# Contributing

siterun is small on purpose, so the most useful contributions are focused fixes, tests and corrections to the docs. You don't need to ask before fixing a bug or a typo. For a new feature, open an issue first so we can work out whether it belongs in the app.

## Set up

You need Node 24.

```sh
npm install
npm start
```

`npm start` builds the engine and the app, then launches the development app. `npm run dev` reloads the app when its own code changes. After changing the engine, run `npm run engine:build` or restart.

## Before you open a pull request

```sh
npm run typecheck
npm run lint
npm test
```

Those three are what CI runs. If you've changed the UI, check it in light and dark. The Playwright smoke test is `npm run e2e`; the full journey creates, starts, changes and deletes a real site, so it's opt-in:

```sh
SITERUN_E2E_SITE=1 npm run e2e -- site-journey
```

## What to change

- `src/main` is the Electron main process.
- `src/preload` is the bridge exposed to the renderer.
- `src/renderer` is the React UI.
- `engine/` is the local WordPress engine.
- `patches/` keeps the changes that belong upstream.

Keep the app's code separate from the engine's. If a site operation is missing something the app needs, extend the engine command rather than rebuilding the operation in the app.

## Style

- TypeScript, strict mode.
- Use the existing components and theme tokens. Don't hard-code colours; test light and dark.
- British English in prose and UI copy. No Oxford comma.
- Comments explain why the code is there, not what it does. If a comment only restates the line below it, delete it.
- Add a test for pure logic. Use the e2e journey for a flow that only makes sense with a real site.

## Commits and pull requests

- Branch from `main` with a dash-separated name, e.g. `fix-database-refresh`.
- Keep commits small and focused. Single-line messages.
- Don't add `Co-Authored-By` or other AI attribution.
- Say what changed and why. If it changes what someone sees, include before and after screenshots in light and dark.
- Link the issue if there is one.

## Security

Don't open a public issue for a security problem. Use the private reporting link in [SECURITY.md](SECURITY.md).

## Licence

siterun is GPL-3.0-or-later. By contributing, you agree that your changes are licensed under the same terms.
