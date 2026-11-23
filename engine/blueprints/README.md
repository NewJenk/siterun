# @studio/blueprints

WordPress Blueprints in siterun: checking a Blueprint, reading and changing what it asks for, and opening one from a file, folder, zip or URL. The engine goes through it, so a Blueprint is handled the same way wherever it comes from. It imports no other workspace package.

```
index.ts      the browser-safe entry
validate.ts   validateBlueprint, Blueprint
details.ts    inspectBlueprint, customizeBlueprint, BlueprintDetails
node.ts       openBlueprint, the Node entry
```

## Two entries

- **`@studio/blueprints`** is browser-safe and runs in Node too.
- **`@studio/blueprints/node`** reads and writes files. The engine imports it.

```ts
import { inspectBlueprint, validateBlueprint } from '@studio/blueprints';
import { openBlueprint } from '@studio/blueprints/node';
```

## Checking and reading a Blueprint

`validateBlueprint( data )` checks data against Playground's Blueprint v1 schema and returns it as a `Blueprint`, or throws a translated message naming the first problem (`"name" is not a valid Blueprint property at /steps/2`). It checks the shape only: whether a plugin exists or a bundled file is in the zip shows when the Blueprint runs.

`inspectBlueprint( blueprint )` reports what a Blueprint asks for, in its own terms: `title` and `description` from `meta`, the preferred `phpVersion` and `wpVersion` as written, `siteTitle` (`blogname`), `siteUrl` (the `defineSiteUrl` step), `login`, and `multisite`. The engine decides what to do with them, such as whether it supports that PHP version.

`customizeBlueprint( blueprint, changes )` returns a copy with those details changed. It only changes what the Blueprint already sets, so a Blueprint never gains steps or options it didn't ask for. `create` uses it so the site's name and domain win over the Blueprint's.

## Opening a Blueprint

`openBlueprint( source )` turns a source into a checked Blueprint and its `blueprint.json` on disk, with the files its steps use beside it, which is what the Blueprint runner needs. A string is tried in this order:

1. A URL: a JSON Blueprint or a zip bundle, downloaded into a temp folder.
2. An existing path: a `.json` file or a folder holding `blueprint.json` (read in place), or a zip bundle (unpacked into a temp folder, with `blueprint.json` at its root or inside one enclosing folder).

Open it with `await using`: whatever it unpacked is removed when the block ends, even on an error, so no temp folder outlives the caller and no caller deletes paths itself.

```ts
await using opened = await openBlueprint( '/path/to/blueprint.json' );
await runBlueprint( site, { blueprint: opened.blueprint, blueprintUri: opened.path } );
```

To show a Blueprint before creating a site from it, open it, read `opened.blueprint` and let it close; creating the site opens the source again.

## Rules

- **No workspace dependencies.** Anything app-specific comes in as a parameter.
- **Playground for types and the schema only.** `@wp-playground/blueprints` is an exact-pinned devDependency: import only its types, and its schema validator, `@wp-playground/blueprints/blueprint-schema-validator`, which the build maps to the file in `node_modules`.
- **Translated messages.** The `__()` strings here are translated with the rest of the engine.
