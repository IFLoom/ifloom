---
title: "A save driver of your own"
description: "Change how a game in the browser keeps its saves: compress them to fit in localStorage, fall back when the browser refuses storage, and move saves when you switch. What a driver must do, and a test that checks yours."
---
Most games never need a driver of their own. A game opened from disk or played on a site like itch.io keeps its saves in the browser, and [`@ifloom/browser`](/docs/browser#save-drivers) has a driver for each place it can: `localStorageDriver()`, which [`browserRunner`](/docs/browser#browserrunner) uses by default, and `indexedDbDriver()` for more room. [Shipping](/docs/guide/shipping#saves) helps you pick one.

You write a driver when the browser's storage needs handling the built-in drivers don't do:

- **Saves that don't fit.** In Chromium, every game opened from disk shares one `localStorage`, about 5MB in all. A long game with a big backlog can run out, and fail to save, because of other games.
- **Storage the browser refuses.** Some embedded frames, privacy settings and private windows refuse `localStorage` or IndexedDB. Every save and autosave then fails.
- **Moving to another driver** without losing the saves players already have.

A driver is a name and four async functions that store strings by key. The drivers on this page wrap the browser's drivers, so they work anywhere those do, from disk or online, and need nothing installed.

```ts
import type { SaveDriver } from '@ifloom/engine'

const driver: SaveDriver = {
  name: 'my-storage',
  get: async (key) => null, // the value, or null if there's none
  set: async (key, value) => {}, // replace the value
  remove: async (key) => {}, // nothing happens if there's none
  keys: async (prefix) => [], // every key that starts with prefix
}
```

The [save store](/docs/reference/saves#saves), the [profile](/docs/reference/profile) and the [mod store](/docs/reference/mods) all use the driver you give them, so one driver covers everything your game keeps.

## What a driver must do

The engine trusts the driver to keep these rules. [`SaveDriver`](/docs/reference/saves#savedriver) in the reference has the same list.

- **`get` answers `null` for a key that isn't there.** Don't throw, and don't answer `''` or `undefined`. An empty slot is `null` to the store.
- **`set` replaces.** Writing a key that exists overwrites it.
- **`remove` on a missing key does nothing.** The store removes slots without checking first.
- **`keys(prefix)` returns whole keys**, every one that starts with `prefix`, in any order. The store sorts what it lists.
- **Values come back exactly as stored.** Each is JSON holding the whole game state, so don't put a small size limit on it.
- **Keys can hold any character.** A key is `<game id>.save.<slot>`, `<game id>.profile` or `<game id>.mod.<id>`, and a slot is whatever name your game gives it.
- **A failure rejects.** If storage fails, let the promise reject, and don't swallow the error. `saves().write` rejects with it. The [runner](/docs/reference/runner#the-runners-members) passes it to `onSaveError`, and a save the player asked for fails with `The game could not be saved.`

## Saves that take less room

This driver wraps another and compresses each value before storing it, with the browser's own `CompressionStream`. Every current browser has it, so there's nothing to install.

```ts
import type { SaveDriver } from '@ifloom/engine'

// Marks a value this driver compressed, so saves written before you added it still read.
const MARK = 'gz:'

async function pipe(bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer())
}

function toBase64(bytes: Uint8Array): string {
  let text = ''
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(text)
}

function fromBase64(text: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(text), (char) => char.charCodeAt(0))
}

export function compressed(driver: SaveDriver): SaveDriver {
  return {
    name: `${driver.name} (compressed)`,
    async get(key) {
      const value = await driver.get(key)
      if (value === null || !value.startsWith(MARK)) return value
      const bytes = await pipe(fromBase64(value.slice(MARK.length)), new DecompressionStream('gzip'))
      return new TextDecoder().decode(bytes)
    },
    async set(key, value) {
      const bytes = await pipe(new TextEncoder().encode(value), new CompressionStream('gzip'))
      await driver.set(key, MARK + toBase64(bytes))
    },
    remove: (key) => driver.remove(key),
    keys: (prefix) => driver.keys(prefix),
  }
}
```

```ts
import { localStorageDriver } from '@ifloom/browser'
import { compressed } from './compressed.ts'

const driver = compressed(localStorageDriver())
```

`localStorage` only holds text, so the compressed bytes are stored as base64. A save made mostly of prose, such as one with a long backlog, comes out at roughly half its size or less. A small save gains almost nothing, so this only helps a game whose saves have grown large.

The `gz:` mark lets the driver tell its own values from plain ones. Saves a player made before you added compression still load, and each one is compressed the next time it's written.

If the browser's IndexedDB is available to your game, `indexedDbDriver()` gives you far more room than compression can, and the next section uses it when it can.

## When the browser refuses storage

This driver tries the drivers you give it in order, and keeps saves in the first one that accepts a test write:

```ts
import type { SaveDriver } from '@ifloom/engine'

export function firstThatWorks(...drivers: SaveDriver[]): SaveDriver & { chosen: () => Promise<SaveDriver> } {
  let found: Promise<SaveDriver> | undefined
  // Try each driver once, on first use, with a write it then removes.
  const chosen = () =>
    (found ??= (async () => {
      for (const driver of drivers) {
        try {
          await driver.set('ifloom.probe', '1')
          await driver.remove('ifloom.probe')
          return driver
        } catch {
          // Refused here: try the next.
        }
      }
      throw new Error('No storage is available for saves.')
    })())
  return {
    name: drivers.map((driver) => driver.name).join(' or '),
    chosen,
    get: async (key) => (await chosen()).get(key),
    set: async (key, value) => (await chosen()).set(key, value),
    remove: async (key) => (await chosen()).remove(key),
    keys: async (prefix) => (await chosen()).keys(prefix),
  }
}
```

```ts
import { indexedDbDriver, localStorageDriver } from '@ifloom/browser'
import { memoryDriver } from '@ifloom/engine'
import { firstThatWorks } from './first-that-works.ts'

const driver = firstThatWorks(indexedDbDriver(), localStorageDriver(), memoryDriver())
```

This keeps saves in IndexedDB where it can, in `localStorage` where it can't, and in memory as a last resort. The browser drivers reject when their storage is missing or refused, so a refusal moves on to the next driver instead of failing every save.

Saves in memory are gone when the page closes, so tell the player. `chosen()` says which driver won:

```ts continues
if ((await driver.chosen()).name === 'memory') {
  alert('This browser is not keeping saves. Export your save before you close the game.')
}
```

The save store's [`exportSlot`](/docs/reference/saves#saves) gives the player their save as a file they can keep, and `importText` reads it back next time.

## Moving saves to a new driver

Changing driver doesn't move anything. If your game already kept saves in `localStorage` and you switch to IndexedDB, players' saves are still in `localStorage`, and the new driver never looks there. Copy them across once, before the game starts:

```ts
import type { SaveDriver } from '@ifloom/engine'

// Copies everything one game keeps (saves, profile, mods) from an old driver to a new one, once.
export async function moveSaves(gameId: string, from: SaveDriver, to: SaveDriver): Promise<void> {
  for (const key of await from.keys(`${gameId}.`)) {
    if ((await to.get(key)) !== null) continue
    const value = await from.get(key)
    if (value !== null) await to.set(key, value)
  }
}
```

```ts given continues
import { indexedDbDriver, localStorageDriver } from '@ifloom/browser'

await moveSaves(game.id, localStorageDriver(), indexedDbDriver()).catch(() => {})
```

It copies only your game's keys, and never overwrites a key the new driver already has, so running it on every start is safe. It leaves the old copies where they were, in case a player goes back to an older build. The `catch` lets the game start even where the old storage is refused.

## Use it

Hand the driver to the save store and the profile, and pass both to the runner. [`browserRunner`](/docs/browser#browserrunner) uses them in place of its `localStorage` default:

```ts given
import { browserRunner, indexedDbDriver, localStorageDriver } from '@ifloom/browser'
import { memoryDriver, profile, saves } from '@ifloom/engine'
// The three functions above, each in a file of its own.
import { compressed } from './compressed.ts'
import { firstThatWorks } from './first-that-works.ts'
import { moveSaves } from './move-saves.ts'

const driver = firstThatWorks(indexedDbDriver(), compressed(localStorageDriver()), memoryDriver())
await moveSaves(game.id, localStorageDriver(), driver).catch(() => {})
const runner = await browserRunner(game, { saves: saves(game, driver), profile: profile(game, driver) })
```

The React UI's [`mountGame`](/docs/react#mountgame) takes the same two inside its `runner` option, as [Shipping](/docs/guide/shipping) shows for IndexedDB. A game with [mods](/docs/reference/mods) passes the driver to `mods(game.id, driver)` too.

## Test it

Run a new driver through these checks before you trust it with a player's saves. They cover every rule above, including a slot name with characters a careless driver would mangle. The example uses Node's own test runner, and with Vitest only the imports change.

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { memoryDriver, type SaveDriver } from '@ifloom/engine'
import { compressed } from '../src/drivers.ts'

async function checkDriver(driver: SaveDriver) {
  assert.equal(await driver.get('test.missing'), null)

  await driver.set('test.save.1', '{"a":1}')
  await driver.set('test.save.1', '{"a":2}')
  assert.equal(await driver.get('test.save.1'), '{"a":2}')

  // Keys hold dots, and a slot can be any name the game picks.
  await driver.set('test.save.Before the fair: 3/4 *', 'x')
  await driver.set('other.save.1', 'y')
  assert.deepEqual((await driver.keys('test.save.')).sort(), ['test.save.1', 'test.save.Before the fair: 3/4 *'])

  await driver.remove('test.save.1')
  await driver.remove('test.save.1')
  assert.equal(await driver.get('test.save.1'), null)
  assert.deepEqual(await driver.keys('test.save.'), ['test.save.Before the fair: 3/4 *'])
}

test('the compressed driver keeps the rules', async () => {
  await checkDriver(compressed(memoryDriver()))
})
```

Node has no `localStorage` or IndexedDB, so test a wrapping driver over `memoryDriver()`, or over [`localStorageDriver(storage)`](/docs/browser#localstoragedriver) with a storage object of your own. Then write and read a real save through [`saves`](/docs/reference/saves#saves) with your game, as in [Testing](/docs/guide/testing), to catch a driver that changes what it stores.

## In a desktop app

A few games are wrapped as desktop apps, with Electron or Tauri, to sell on a store. An app can keep saves as files the player can find and back up. Here's a driver over Node's `fs/promises`, which Electron's main process has. Tauri's `@tauri-apps/plugin-fs` fits the same shape.

```ts
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { SaveDriver } from '@ifloom/engine'

export function folderDriver(folder: string): SaveDriver {
  // Encode each key so any slot name is safe as a file name on any system (Windows also refuses `*`), and can be
  // decoded back.
  const file = (key: string) => join(folder, `${encodeURIComponent(key).replaceAll('*', '%2A')}.json`)
  return {
    name: 'folder',
    async get(key) {
      try {
        return await readFile(file(key), 'utf8')
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
        throw error
      }
    },
    async set(key, value) {
      await mkdir(folder, { recursive: true })
      await writeFile(file(key), value, 'utf8')
    },
    async remove(key) {
      await rm(file(key), { force: true })
    },
    async keys(prefix) {
      const names = await readdir(folder).catch(() => [])
      return names
        .filter((name) => name.endsWith('.json'))
        .map((name) => decodeURIComponent(name.slice(0, -'.json'.length)))
        .filter((key) => key.startsWith(prefix))
    },
  }
}
```

In Electron, the page can't use `fs` itself. Run the driver in the main process, expose its four functions to the page through a preload script, and build a `SaveDriver` in the page that calls them. Windows and macOS treat `Quick.json` and `quick.json` as one file, so if players name their own slots, lower-case the names your game makes.

## See also

- [Saves](/docs/reference/saves): the save store, the `SaveDriver` type and the memory driver.
- [Save drivers](/docs/browser#save-drivers) in `@ifloom/browser`: the `localStorage` and IndexedDB drivers, whose source is a short read.
- [Shipping](/docs/guide/shipping): a game as one folder, opened from disk or uploaded, and choosing its driver.
