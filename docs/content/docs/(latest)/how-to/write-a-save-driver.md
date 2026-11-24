---
title: "Write a save driver"
description: "Keep saves your own way with a save driver, such as compressed saves in localStorage or files in a desktop app."
---
Use this when the browser's storage needs handling the built-in drivers don't do. A save driver is a name and four async functions that store strings by key. The save store, the [profile](/docs/reference/profile) and the [mod store](/docs/reference/mods) all write through the driver you give them, so one driver covers everything your game keeps.

Most games need none of their own. Choose one of these first:

- **`memoryDriver()`**, from `@ifloom/engine`, keeps saves in a `Map` that goes with the page. Use it for tests and previews.
- **`localStorageDriver()`**, from [`@ifloom/browser`](/docs/reference/browser#save-drivers), keeps them in `localStorage`, about 5MB shared by every game on one origin. Use it for short games. [`browserRunner`](/docs/reference/browser#browserrunner) uses it unless told otherwise.
- **`indexedDbDriver()`**, from `@ifloom/browser`, keeps them in IndexedDB, up to the browser's own quota. Use it for long games, big backlogs and mods.

Write your own for saves that don't fit in `localStorage`, for a browser that refuses storage, or to move players' saves to another driver. The drivers on this page wrap the browser's, so they work from disk and online with nothing to install. Each keeps the rules [`SaveDriver`](/docs/reference/saves#savedriver) lists.

## Compress saves to take less room

In Chromium, every game opened from disk shares one `localStorage`. This driver wraps another and compresses each value with the browser's own `CompressionStream`, storing the bytes as base64:

```ts
// compressed.ts
import type { SaveDriver } from '@ifloom/engine'

// Marks a value this driver compressed, so saves written before you added it still read.
const MARK = 'gz:'

async function pipe(bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer())
}

const toBase64 = (bytes: Uint8Array) => btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0))

export function compressed(driver: SaveDriver): SaveDriver {
  return {
    name: `${driver.name} (compressed)`,
    async get(key) {
      const value = await driver.get(key)
      if (value === null || !value.startsWith(MARK)) return value
      return new TextDecoder().decode(await pipe(fromBase64(value.slice(MARK.length)), new DecompressionStream('gzip')))
    },
    async set(key, value) {
      await driver.set(key, MARK + toBase64(await pipe(new TextEncoder().encode(value), new CompressionStream('gzip'))))
    },
    remove: (key) => driver.remove(key),
    keys: (prefix) => driver.keys(prefix),
  }
}
```

Use it as `compressed(localStorageDriver())`. A save made mostly of prose, such as one with a long backlog, comes out at half its size or less, and a small save gains almost nothing. The `gz:` mark tells the driver's own values from plain ones, so saves made before you added it still load and are compressed the next time they're written.

## Fall back when the browser refuses storage

Some embedded frames, privacy settings and private windows refuse `localStorage` or IndexedDB, and then every save fails. This driver tries the drivers you give it in order, and keeps saves in the first that accepts a test write:

```ts
// first-that-works.ts
import type { SaveDriver } from '@ifloom/engine'

export function firstThatWorks(...drivers: SaveDriver[]): SaveDriver & { chosen: () => Promise<SaveDriver> } {
  let found: Promise<SaveDriver> | undefined
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

`firstThatWorks(indexedDbDriver(), localStorageDriver(), memoryDriver())` keeps saves in IndexedDB where it can, then `localStorage`, then memory. Saves in memory go when the page closes, so tell the player when `(await driver.chosen()).name` is `'memory'`. The save store's [`exportSlot`](/docs/reference/saves#saves) gives them their save as a file to keep, and `importText` reads it back.

## Move saves to a new driver

Changing driver moves nothing, so a switch from `localStorage` to IndexedDB leaves players' saves behind. Copy them across once, before the game starts:

```ts
// move-saves.ts
import type { SaveDriver } from '@ifloom/engine'

// Copies everything one game keeps (saves, profile, mods) from an old driver to a new one.
export async function moveSaves(gameId: string, from: SaveDriver, to: SaveDriver): Promise<void> {
  for (const key of await from.keys(`${gameId}.`)) {
    if ((await to.get(key)) !== null) continue
    const value = await from.get(key)
    if (value !== null) await to.set(key, value)
  }
}
```

It copies only your game's keys and never overwrites one the new driver has, so running it on every start is safe. It leaves the old copies in place, for a player who goes back to an older build.

## Pass the driver to the runner

Give the driver to the save store and the profile, and pass both to the runner. [`browserRunner`](/docs/reference/browser#browserrunner) uses them in place of its `localStorage` default:

```ts
import { browserRunner, indexedDbDriver, localStorageDriver } from '@ifloom/browser'
import { memoryDriver, profile, saves } from '@ifloom/engine'
import { compressed } from './compressed.ts'
import { firstThatWorks } from './first-that-works.ts'
import { moveSaves } from './move-saves.ts'
import module from './game.ts'

const { game } = module.build()
const driver = firstThatWorks(indexedDbDriver(), compressed(localStorageDriver()), memoryDriver())
await moveSaves(game.id, localStorageDriver(), driver).catch(() => {})
const runner = await browserRunner(game, { saves: saves(game, driver), profile: profile(game, driver) })
```

The React UI's [`mountGame`](/docs/reference/react#mountgame) takes the same two in its `runner` option, as [Ship your game](/docs/how-to/ship-your-game#choose-where-saves-go) shows. A game with [mods](/docs/how-to/let-players-add-mods) passes the driver to `mods(game.id, driver)` too.

## Test it

Run a new driver through these checks before you trust it with a player's saves. They cover each rule, including a slot name with characters a careless driver would mangle:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { memoryDriver, type SaveDriver } from '@ifloom/engine'
import { compressed } from '../src/compressed.ts'

async function checkDriver(driver: SaveDriver) {
  assert.equal(await driver.get('test.missing'), null)
  await driver.set('test.save.1', '{"a":1}')
  await driver.set('test.save.1', '{"a":2}')
  assert.equal(await driver.get('test.save.1'), '{"a":2}')
  await driver.set('test.save.Before the fair: 3/4 *', 'x')
  await driver.set('other.save.1', 'y')
  assert.deepEqual((await driver.keys('test.save.')).sort(), ['test.save.1', 'test.save.Before the fair: 3/4 *'])
  await driver.remove('test.save.1')
  await driver.remove('test.save.1')
  assert.deepEqual(await driver.keys('test.save.'), ['test.save.Before the fair: 3/4 *'])
}

test('the compressed driver keeps the rules', () => checkDriver(compressed(memoryDriver())))
```

Node has no `localStorage` or IndexedDB, so test a wrapping driver over `memoryDriver()`, or over [`localStorageDriver(storage)`](/docs/reference/browser#localstoragedriver) with a storage object of your own. Then write and read a real save through [`saves`](/docs/reference/saves#saves) with your game, to catch a driver that changes what it stores.

## Variations

**Files in a desktop app.** A game wrapped with Electron or Tauri can keep saves as files the player can back up. Write the driver over Node's `fs/promises` in Electron's main process, or Tauri's `@tauri-apps/plugin-fs`. Encode each key with `encodeURIComponent` (and `*` as `%2A`, which Windows refuses) to make a file name, and decode the names back in `keys`. Answer `null` from `get` when the file is missing, and let other errors reject. In Electron, expose the four functions to the page through a preload script, and build the `SaveDriver` in the page from them. Windows and macOS treat `Quick.json` and `quick.json` as one file, so lower-case the slot names your game makes.

For more, see:

- [Saves](/docs/reference/saves), with [`SaveDriver`](/docs/reference/saves#savedriver) and [`memoryDriver`](/docs/reference/saves#memorydriver).
- [Save drivers](/docs/reference/browser#save-drivers) in `@ifloom/browser`.
- [Ship your game](/docs/how-to/ship-your-game#choose-where-saves-go), to choose a driver for a game in the browser.
