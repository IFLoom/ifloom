---
title: "Upgrade IFLoom"
description: "Move a game to a newer IFLoom release by raising every @ifloom range together and fixing what TypeScript and the checker report."
---
Use this when a new IFLoom release is out and you want your game on it. The engine carries players' saves and older packs forward by itself, so the work is in your own content and code. You need the game's `package.json` and a passing `ifloom check` on the release you have now.

## Read the changelog

Read the [changelog](/docs/changelog) from the release you have to the one you're moving to. Each release lists what it added, changed, removed and fixed, written for someone making a game. The changes under Changed and Removed are the ones your content may need.

## Raise every @ifloom range together

Change the range of every `@ifloom/*` package in `package.json` to the new release, in `dependencies` and `devDependencies` alike. The packages are released together, and each plugin and the React UI peer on the engine, so a game uses one version of all of them. A move from `0.1` to `0.2` changes every line:

```json
{
  "dependencies": {
    "@ifloom/engine": "^0.2.0",
    "@ifloom/plugin-places": "^0.2.0",
    "@ifloom/react": "^0.2.0"
  },
  "devDependencies": {
    "@ifloom/cli": "^0.2.0"
  }
}
```

A caret on a `0.x` version accepts later releases of the same minor version only, so a new minor release always needs this edit. Then install:

```sh tab="npm" tab-group="package-manager"
npm install
```

```sh tab="pnpm" tab-group="package-manager"
pnpm install
```

```sh tab="yarn" tab-group="package-manager"
yarn install
```

```sh tab="bun" tab-group="package-manager"
bun install
```

## Fix what TypeScript and the checker report

Run the typecheck, then the [content checker](/docs/0.1.0/reference/cli#ifloom-check):

```sh tab="npm" tab-group="package-manager"
npm run typecheck
npm run check
```

```sh tab="pnpm" tab-group="package-manager"
pnpm typecheck
pnpm check
```

```sh tab="yarn" tab-group="package-manager"
yarn run typecheck
yarn run check
```

```sh tab="bun" tab-group="package-manager"
bun run typecheck
bun run check
```

The engine never upgrades your own content, because you build it with the engine it runs on. TypeScript reports a field or a function the release renamed or removed. The checker reports content that still type-checks but is written in an older form, such as a label that names a prose key, with the way to write it now. [Content written in an older form](/docs/0.1.0/upgrading/schema-history#content-written-in-an-older-form) lists those problems, and [Schema history](/docs/0.1.0/upgrading/schema-history) says what each schema changed.

## Check that the story still reads the same

Run [`ifloom snapshot`](/docs/0.1.0/reference/cli#ifloom-snapshot) and [`ifloom playtest`](/docs/0.1.0/reference/cli#ifloom-playtest), as [Playtest and snapshot](/docs/0.1.0/how-to/playtest-and-snapshot) describes. A snapshot written on the old release prints `changed: <scene> @ <probe>` for each scene that now reads differently, so you can read each one and decide whether the release meant it. Run your own tests too, since a test that plays a route catches a choice that's no longer offered.

## Check your packs and mods

[`loadGame`](/docs/0.1.0/reference/content#loadgame) upgrades each pack it's given, mods and unlocked content included, from the schema the pack records. A pack you wrote in TypeScript with `schema: SCHEMA` always matches. A pack kept as JSON, such as a mod file a player added, comes in through [`upgradePack`](/docs/0.1.0/reference/content#upgradepack) and needs no change.

A pack written for a newer schema than the engine reads is skipped whole, with a problem like this one:

```text
mod:night-market · pack · written for schema 31, this engine reads 30
```

A player sees it when they load a mod made for a newer build of your game than the one they have. A pack from before schema 4 is too old to upgrade, and is skipped with `written for schema <n>, too old for this engine to read (it reads 30)`.

## Check players' saves

A player's saves need nothing from you for the engine's own changes. [`loadState`](/docs/0.1.0/reference/saves#loadstate) carries a save from any older engine forward when it loads, and [Older saves](/docs/0.1.0/upgrading/old-saves) lists each step. A plugin carries its own state the same way.

Your game's changes are yours to carry. When the update renames a kv key, reshapes the game's own state or adds a stat that starts above 0, give the game a new `version` and a migration step, as [Migrate your players' saves](/docs/0.1.0/upgrading/migrate-your-saves) shows. Load a save from the old release in a test before you ship.

These pages describe what the upgrade uses:

- [Schema history](/docs/0.1.0/upgrading/schema-history), what each schema changed in packs
- [Older saves](/docs/0.1.0/upgrading/old-saves), what each save version changed
- [Stability and planned renames](/docs/0.1.0/upgrading/status), what can still change
- [Content, packs and the base](/docs/0.1.0/explanation/content-and-packs), why content and packs upgrade differently
