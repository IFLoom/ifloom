---
title: "Supporter content and cheats"
description: "Give the people who fund your game a code that unlocks cheats and extra scenes, and know exactly what each kind of gate protects."
---
Many games in this genre are funded by supporters on a membership site, who get something extra: cheats, an extra scene, a gallery. This recipe sets that up with the [unlocks plugin](/docs/plugins/unlocks) and the [cheats plugin](/docs/plugins/cheats). Supporters get a code, enter it once in the game, and keep what it opens across saves and new games.

Your game ships as files the player runs on their own machine, so anything in the build can be read. Before you start, decide what you're protecting.

## What each gate protects

| What you gate | How | Protected? |
|---|---|---|
| **Content**: scenes, prose, storylets, a whole route | A pack in `src/unlocks/`, encrypted by `ifloom build` | **Yes.** The build has only ciphertext, under a key made from the code. Without the code, nobody can read it or switch it on by editing the game. |
| **A cheat, a choice or a button** | `unlocks/has` in its `blocked` or `when` | **No, it deters.** The cheat is in the game's code. Someone who edits the code, the save or the browser's storage can use it. |
| **The code itself** | Only a slow hash is in the build | **Yes, if it's long.** The hash can't be turned back into the code, and each guess costs 600,000 rounds of hashing. A short code can still be guessed by trying them all, so use random codes of 12 or more characters. |

Two things no offline game can stop:

- **Sharing.** A supporter can post the code. Nothing checks who types it, and there's no server to ask. Give each release new codes, so a shared code only opens what it opened then.
- **Sharing what's unlocked.** A supporter can copy the decrypted content out of their browser, or record it. Encryption keeps it out of the download, not out of their hands.

So encrypt what you'd mind people getting for free, and treat cheats as a thank-you, not a lock.

## Set it up

### 1. Add the plugins

Add both packages to `package.json`, then put the plugins in the game:

```ts
// src/game.ts
import { loadGame } from '@ifloom/engine'
import { defineGame } from '@ifloom/cli/game'
import { cheats } from '@ifloom/plugin-cheats'
import { unlocks } from '@ifloom/plugin-unlocks'
import { town } from './town.ts'

// What the page and `ifloom check` build the game from. `ifloom check` passes the locked packs as `unlocked`.
export default defineGame({
  build: ({ unlocked }) => loadGame([town], { id: 'small-town', title: 'Small Town', plugins: [cheats(), unlocks()] }, { packs: unlocked }),
})
```

`unlocked` is where the supporter content comes in, at runtime and in `ifloom check`. It's a list of [packs](/docs/reference/loader#content-and-packs), laid over the town's content.

### 2. Make a code and declare the unlock

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

Ask the CLI for its hash, and declare the unlock with it:

```sh
ifloom unlock-hash supporter
```

```ts
// in town.ts
data: {
  unlocks: {
    unlocks: [
      {
        id: 'supporter',
        label: 'Supporter edition',
        description: 'A thank-you scene in the café, and the Full energy cheat.',
        hash: '…the 64 hex digits it printed…',
      },
    ],
  },
},
```

Players type codes in any case, with or without spaces and hyphens: `7f3a 91c2 0b5d e468` works too.

### 3. Gate the cheats

A supporter cheat is refused until the unlock is recorded:

```ts
import { unlocks } from '@ifloom/plugin-unlocks'

data: {
  cheats: {
    cheats: [
      { id: 'coins', label: '+20 coins', effects: [{ stat: 'coins', by: 20 }] },
      {
        id: 'energy',
        label: 'Full energy',
        group: 'Supporters',
        blocked: [{ when: { not: unlocks.has('supporter') }, reason: 'For supporters.' }],
        effects: [{ stat: 'energy', to: 100 }],
      },
    ],
  },
},
```

Add `hide: true` to the `blocked` entry to keep the cheat off the panel until then. Remember this gate only deters.

### 4. Lock the content

Put what supporters get in `src/unlocks/supporter.ts`, named after the unlock. It's a [pack](/docs/reference/loader#pack), as a [mod](/docs/reference/mods) is, with an `id` and a `schema`, and it's data: scenes, prose, plugin content.

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
      body: [{ prose: 'cafe.back-room' }],
      choices: [{ id: 'leave', label: 'Thank her and head back out', effects: [{ scene: null }] }],
    },
  ],
  prose: {
    'cafe.back-room': 'Ava lifts the counter flap and waves you through to the back room…',
  },
}

export default supporter
```

Don't import this file anywhere. `ifloom build` encrypts it into the page, and stops if your code imports it. The base game shouldn't point into it either, because a player without the code doesn't have it. Reach it from inside, as this storylet does by joining the café's deck, or only behind `unlocks/has`.

### 5. Take codes in the game

Open the remembered content before the game is built, and start taking codes once the runner exists. In the React UI that's the unlocks plugin's UI, in `plugins`:

```ts
// src/main.tsx (the React UI)
const stored = profile({ id: 'small-town' }, driver)
const opened = await unlockedPacks('small-town', stored)
const { game } = module.build({ unlocked: opened.packs })
// … make the runner with `profile: stored`, then, with unlocksUiWith from '@ifloom/plugin-unlocks/react':
// <GameShell runner={runner} pages={{}} plugins={[unlocksUiWith({ problems: opened.problems, onChange: () => location.reload() })]} />
```

The settings page then has an "Enter a code" box. A code that works records the unlock at once, so the cheat opens. When it has locked content, a "Restart to add it" button reloads the page, which builds the game with the content. [Entering codes](/docs/plugins/unlocks#entering-codes) has the same in plain JS, Vue and Svelte.

### 6. Build and check

```sh
ifloom check
ifloom build
```

`check` checks the game with its locked content, read from source, and checks the code in `.env.local` against the hash. `build` encrypts the content, then searches the built folder for the code and every line of the locked prose, and fails if it finds one. Neither prints the code.

## A release

Each release, with your membership site:

1. **Make new codes**, one per unlock, as in step 2, and put them in `.env.local` (or your build machine's secrets).
2. **Run `ifloom unlock-hash`** for each unlock, and put the new hashes in the game.
3. **Run `ifloom check` and `ifloom build`**, and ship the build to everyone.
4. **Post the codes** in a post only supporters can see.

Players who entered last release's code see the unlock as locked again until they enter the new one. If you'd rather a code carried over, keep it and its hash, and accept that a shared code keeps working.

For tiers, declare an unlock per tier, each with its own code, and give higher tiers every code they're due. A cheat for any supporter can ask for either:

```ts
blocked: [{ when: { not: { any: [unlocks.has('supporter'), unlocks.has('patron')] } }, reason: 'For supporters.' }]
```

## What's in the build

After `ifloom build`, the folder holds:

- the game, with each unlock's label, description and hash, and every cheat, gated or not
- each unlock's locked content, encrypted, in a script in the page's head
- no code, and no line of locked prose

The player's browser holds, once they've entered a code, a proof made from it in the game's [profile](/docs/reference/profile). It opens this release's content and can't be turned back into the code.

Pictures, sound and video that only locked content uses are still files in the folder, unencrypted. Keep anything you'd mind being seen out of `public/`, or accept that it can be.

## See it in an example

[Small Town](/docs/guide/showcase#cheats-and-the-supporter-code) does all of this with a code that's public on purpose, `SMALL-TOWN-SUPPORTER`, in `examples/showcase/.env`. A real game keeps its codes out of the repository.
