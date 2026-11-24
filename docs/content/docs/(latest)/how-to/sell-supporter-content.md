---
title: "Sell supporter content"
description: "Give the people who fund your game a code that opens cheats and extra scenes, and ship new codes with each release."
---
Use this to give supporters, such as members on a funding site, a code that opens something extra: cheats, an extra scene, a whole route. The [unlocks plugin](/docs/reference/plugins/unlocks) checks the code and the [cheats plugin](/docs/reference/plugins/cheats) runs the cheats. A supporter enters the code once, and keeps what it opens across saves and new games.

## Decide what to protect

Your game ships as files on the player's machine, so anything in the build can be read. Each gate protects a different amount:

- **Locked content is protected.** A pack in `src/unlocks/` is encrypted by `ifloom build` under a key made from the code. Without the code, nobody can read it or switch it on by editing the game.
- **A gated cheat, choice or button only deters.** `unlocks/has` in its `blocked` keeps honest players out, but the cheat is in the game's code, and someone who edits the code or the save can use it.
- **The code is protected if it's long.** Only a slow hash is in the build, and each guess costs 600,000 rounds of hashing. Use random codes of 12 characters or more.

No offline game stops a supporter posting the code, or copying out what it unlocked. Give each release new codes, so a shared code opens only what it opened then. [What an offline game can protect](/docs/explanation/design#what-an-offline-game-can-protect) says why.

## Add the plugins

Add `@ifloom/plugin-unlocks` and `@ifloom/plugin-cheats` as [Add a plugin](/docs/how-to/add-a-plugin) shows, and list both in the game. Pass `unlocked` to `loadGame` as its packs, since that's where the locked content comes in:

```ts
// src/game.ts
import { loadGame } from '@ifloom/engine'
import { defineGame } from '@ifloom/cli/game'
import { cheats } from '@ifloom/plugin-cheats'
import { unlocks } from '@ifloom/plugin-unlocks'
import { town } from './world/town.ts'

export default defineGame({
  build: ({ unlocked }) => loadGame([town], { id: 'small-town', title: 'Small Town', plugins: [cheats(), unlocks()] }, { packs: unlocked }),
})
```

`ifloom check` passes the packs in `src/unlocks/` as `unlocked`, and the page passes the ones the player's codes opened.

## Make a code and its hash

Make a random code. This one has 64 random bits, in four groups:

```sh
node -e "console.log(require('crypto').randomBytes(8).toString('hex').toUpperCase().match(/.{4}/g).join('-'))"
# 7F3A-91C2-0B5D-E468
```

Put it in `.env.local` in the game's folder, under the unlock's name. Git leaves `.env.local` out, so the code never reaches the repository:

```sh
# .env.local
IFLOOM_UNLOCK_SUPPORTER=7F3A-91C2-0B5D-E468
```

Print its hash with [`ifloom unlock-hash`](/docs/reference/cli#ifloom-unlock-hash), and declare the unlock in `data.unlocks.unlocks` with it:

```sh
npx ifloom unlock-hash supporter
```

```ts
import type { Content } from '@ifloom/engine'

export const supporters: Content = {
  data: {
    unlocks: {
      unlocks: [{ id: 'supporter', name: 'Supporter edition', description: 'A thank-you scene in the café, and the supporter cheats.', hash: '…the 64 hex digits it printed…' }],
    },
  },
}
```

Players type a code in any case, with or without spaces and hyphens, so `7f3a 91c2 0b5d e468` works too.

## Gate the cheats

Put a supporter cheat in `data.cheats.cheats` with a `blocked` entry that holds while the player lacks the unlock. [`unlocks.has`](/docs/reference/plugins/unlocks#unlockshas) writes the condition:

```ts
import type { Content } from '@ifloom/engine'
import { unlocks } from '@ifloom/plugin-unlocks'

export const cheats: Content = {
  data: {
    cheats: {
      cheats: [
        { id: 'coins', name: '+20 coins', effects: [{ stat: 'coins', by: 20 }] },
        {
          id: 'gold',
          name: '+500 coins',
          group: 'Supporters',
          blocked: [{ when: { not: unlocks.has('supporter') }, reason: 'For supporters.' }],
          effects: [{ stat: 'coins', by: 500 }],
        },
      ],
    },
  },
}
```

The cheat shows greyed out with `For supporters.` until the code is entered. Add `hide: true` to the entry to leave it off the panel until then. A cheat can be gated on anything a condition says, such as an achievement or a finished storyline, in the same way.

## Lock the content

Put what supporters get in `src/unlocks/supporter.ts`, named after the unlock. It's a [pack](/docs/reference/content#pack), as a mod is, so it holds data only:

```ts
// src/unlocks/supporter.ts
import { SCHEMA, type Pack } from '@ifloom/engine'
import { unlocks } from '@ifloom/plugin-unlocks'

const supporter: Pack = {
  id: 'supporter',
  schema: SCHEMA,
  scenes: [
    {
      id: 'cafe.back-room',
      title: 'The back room',
      drawnFrom: ['cafe'],
      weight: 5,
      when: { all: [unlocks.has('supporter'), { not: { seen: 'cafe.back-room' } }] },
      body: [{ text: 'Ava lifts the counter flap and waves you through to the back room.' }],
      choices: [{ id: 'leave', label: 'Thank her and head back out', effects: [{ scene: null }] }],
    },
  ],
}

export default supporter
```

Don't import this file anywhere, since `ifloom build` encrypts it into the page and stops if your code imports it. The base game shouldn't name anything in it either, because a player without the code doesn't have it. Reach it from inside, as this storylet does by joining the café's set, or only behind `unlocks/has`.

## Take codes in the game

Entering a code isn't a command, because the plugin checks each code against a slow hash. Set it up at start-up:

```ts
// src/runner.ts
import { browserRunner, localStorageDriver } from '@ifloom/browser'
import { profile } from '@ifloom/engine'
import { enterCode, startUnlocks, unlockedPacks } from '@ifloom/plugin-unlocks'
import module from './game.ts'

// Open what the player's codes unlocked, from the profile browserRunner will use, before the game is built.
const opened = await unlockedPacks('small-town', profile({ id: 'small-town' }, localStorageDriver()))
export const runner = await browserRunner(module.build({ unlocked: opened.packs }).game)
startUnlocks(runner)

export async function unlock(code: string): Promise<string> {
  const result = await enterCode(runner, code)
  if (result.ok && result.value.restart) location.reload()
  return result.ok ? `Unlocked: ${result.value.name}.` : result.reason
}
```

A code that works records the unlock at once, so the cheat opens. When it has locked content the game in play lacks, `restart` is true, and reloading builds the game with it. [Render a box for codes](/docs/how-to/render/player-tools#render-a-box-for-codes) has the code box in plain JS, React and Vue. In the React UI, list `unlocksUiWith({ problems: opened.problems, onChange: () => location.reload() })` in `plugins`, and the settings page gets an "Enter a code" box.

## Build and check

Run the check and the build:

```sh
npx ifloom check
npx ifloom build
```

`check` reads the locked content from source and checks the game with it, and checks the code in `.env.local` against the hash. It also lists what the base game names that only the locked content has, so you can make sure each sits behind `unlocks/has`. `build` encrypts the content, then searches the built folder for the code and every line of the locked prose, and fails if it finds one. Neither prints the code.

The build holds each unlock's name, description and hash, every cheat, gated or not, and each unlock's content encrypted in a script in the page's head. Pictures, sound and video that only locked content uses are still plain files in the folder, so keep anything you'd mind being seen out of `public/`.

## Ship a release

Each release, with your funding site:

1. Make new codes, one per unlock, and put them in `.env.local` or your build machine's secrets.
2. Run `ifloom unlock-hash` for each unlock, and put the new hashes in the game.
3. Run `ifloom check` and `ifloom build`, and ship the build to everyone.
4. Post the codes where only supporters can see them.

Players who entered last release's code see the unlock as locked again until they enter the new one. To let a code carry over, keep it and its hash, and accept that a shared code keeps working.

## Variations

**Tiers.** Declare an unlock per tier, each with its own code, and give higher tiers every code they're due. A cheat for any supporter asks for either, `{ when: { not: { any: [unlocks.has('supporter'), unlocks.has('patron')] } }, reason: 'For supporters.' }`.

The showcase does all of this with a code that's public on purpose, `SMALL-TOWN-SUPPORTER`, in [`examples/showcase/.env`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/.env), with its cheats in `src/world/cheats.ts` and its locked scene in `src/unlocks/supporter.ts`. For more, see:

- [Unlocks](/docs/reference/plugins/unlocks), with [`UnlockDef`](/docs/reference/plugins/unlocks#unlockdef), [`unlockedPacks`](/docs/reference/plugins/unlocks#unlockedpacks), [`startUnlocks`](/docs/reference/plugins/unlocks#startunlocks) and [`enterCode`](/docs/reference/plugins/unlocks#entercode).
- [Cheats](/docs/reference/plugins/cheats), with [`CheatDef`](/docs/reference/plugins/cheats#cheatdef).
- [Locked content](/docs/reference/cli#locked-content) and [`ifloom unlock-hash`](/docs/reference/cli#ifloom-unlock-hash).
