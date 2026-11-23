# Engine config

`config.json` in the app's engine folder (`engine/config.json` under the app's application-support folder) is the one config file the engine reads and writes. `STUDIO_CONFIG_DIR` puts it somewhere else, which is how the app keeps its data out of a shared home folder.

## Reading and writing

- `readConfig()` reads it without a lock.
- `updateConfig( ( config ) => { … } )` takes the lock, reads the file, runs the callback on it and writes back the sections the callback changed. Every engine process waits on that lock, so keep the callback short and make no network requests in it. It can't call `updateConfig` again.
- `readConfigSync()` is only for reads that must be synchronous.

Nothing else writes the file.

## Sections

Each top-level key is a section with its own schema (`schema.ts`), parsed on its own. A section that doesn't parse is reported and reads as empty, and it stays on disk as it was unless a write changes it. In `sites`, an entry that doesn't parse is left out of what callers read and written back as it was.

| Section | Holds |
|---|---|
| `preferences` | The engine's shared preferences, currently the locale |
| `sites` | Each local site, with the engine's settings for it |
| `cli` | State only the CLI reads |

## Changing the shape

Sections are loose: a build that rewrites a section keeps the fields a newer build added. Adding an optional field therefore needs nothing more.

Anything that changes existing data (renaming, moving or retyping a field) bumps `CONFIG_VERSION` in `schema.ts` and adds a step to `migrations.ts`. A step is a pure function from the previous version's file to the next one. The engine runs the steps on its first read, under the lock. A build that finds a newer version refuses it with `ConfigTooNewError`.

## Older files

A missing `config.json` is written empty at the current version. Housekeeping on other files earlier builds left behind (old server files, the `pm2` folder) is in `../startup-tasks.ts`.
