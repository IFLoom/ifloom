---
title: "The game"
description: "Reference for Game, the loaded game every engine function takes: its fields, the room shown with no scene open, saveable, and the sceneOf lookup."
---
A `Game` is one loaded game: its scenes, stats, entities and the rest of its content, merged with the base that holds its id and code. [`loadGame`](/docs/reference/content#loadgame) makes it, and every engine function takes it as an argument, so nothing is registered globally. [Content, packs and the base](/docs/explanation/content-and-packs) explains where each part comes from.

In the showcase: `examples/showcase/src/game.ts`.

```ts
import { sceneOf, type Game } from '@ifloom/engine'
```

## Game

A loaded game, the base's fields and the merged content's. Every field is in [`Game`](/docs/api/engine#game).

The base gives `id`, `title`, `version`, `plugins` and `rules`. The content and packs give the rest, so a mod can reach it, and `loadGame` sets `prose`, `traits`, `data` and `packs` as it merges. [Content](/docs/reference/content#content) lists how each content key merges. These fields need more than their API description:

| Field | Meaning |
|---|---|
| `id` | The game's id, which [saves](/docs/reference/saves#savedriver) are kept under. A save from another game's id is refused, so the id never changes once players have saves. |
| `version` | The game's own version, a whole number from 1, which saves record. Declaring it, even as 1, stops the engine filling new stats, settings and entities into old saves itself. See [`migrations`](/docs/reference/rules#migrations). |
| `plugins` | The [plugins](/docs/reference/plugins) the game is built with. Their hooks run in this order. |
| `introScene` | The scene open on the first frame, counted as seen once at turn 0. A game without one opens on its room with nothing seen. |
| `actions` | The [actions](/docs/reference/actions#actiondef) the room offers. One with a `label` is a button after every plugin's buttons, and one without is done only by `{ type: 'action', id }`. |
| `traits` | Every declared entity's traits, worked out from the content's [`traits`](/docs/reference/content#traits) table, the entities and their kinds. |
| `packs` | The ids of the packs the game was loaded with, in order. A save records them, and names a missing one in [`missingPacks`](/docs/reference/saves#loadedsave). |

A new game starts at turn 0 with `introScene` open and the content's `kv` in the [kv store](/docs/reference/glossary#kv). Each plugin's state starts at its own `start`, so the places plugin's `start` puts the player at a location. [`startingState`](/docs/reference/commands#startingstate) builds it.

While no scene is open, the screen shows the room. The room is the [`scene`](/docs/reference/plugin-views) of the first provider that answers, the game's own `rules.scene` first, which with the places plugin is the location the player is at. With no provider, it's a scene titled with `game.title` and no body. Under it come the plugins' buttons and then the game's `actions`, unless a [lock](/docs/reference/locks) that denies `'*'` is on. The engine adds no button of its own.

The core keeps no locations and no characters. The [places plugin](/docs/reference/plugins/places) adds locations and the [cast](/docs/reference/plugins/cast) adds characters, each an entity in the content's `entities`. A linear story without them gives an `introScene` and leaves the screen to whichever scene is open.

The showcase's base holds what the game is and its code. Its first scene, starting kv and buttons are content:

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'
import { rules } from './rules.ts'

const movingDay: Content = {
  introScene: 'intro',
  kv: { phase: 'arrival' },
  actions: [{ id: 'wait', label: 'Wait a while', effects: [calendar.pass(1)] }],
}

export const { game, problems } = loadGame([movingDay], {
  id: 'small-town',
  title: 'Small Town',
  plugins: [calendar(), places({ start: 'flat' }), cast()],
  rules,
})
```

[Organise your game's files](/docs/how-to/organise-your-files) shows how a game splits its content across files.

### saveable

The content's reasons to refuse saving, as [`Blocked`](/docs/reference/actions#blocked) entries. Saving is refused while an entry's `when` holds, and the first entry that holds gives the reason. A game without `saveable` always allows saving.

Each content file's entries come after the ones before, and a pack's come after the content's. A pack entry with the `id` of an earlier entry replaces it.

```ts
import type { Content } from '@ifloom/engine'

export const flat: Content = {
  // No saving on moving day until the boxes are unpacked.
  saveable: [{ when: { kv: 'phase', is: 'arrival' }, reason: 'Unpack first.' }],
}
```

The runner's `save` fails with the reason, and the runner skips an [autosave](/docs/reference/runner#autosaveoptions) that falls due. Loading is never refused. [`view.saving`](/docs/reference/view#savingview) gives `{ allowed, reason, visible }`, so a UI greys out its Save button with the reason, or hides it while an entry with `hide` holds. The [content checker](/docs/reference/checks) checks each `when` as it checks any condition.

## Functions

### sceneOf

Returns the scene with this id as the content declares it, or `undefined` when there is none. Its signature is in [`sceneOf`](/docs/api/engine#sceneof).

```ts given
import { sceneOf } from '@ifloom/engine'

sceneOf(game, 'ava.hi')?.title // 'Ava'
```

Every lookup follows one naming rule. One definition by id is `xOf(game, id)`, as in `sceneOf`, [`statOf`](/docs/reference/stats#statof) and [`actionOf`](/docs/reference/actions#actionof). A list is `xsOf(game)`, as in the quests plugin's `questsOf`. What an entity is in play takes the state too, `xOf(state, game, ref)`, as in the cast's `personOf`. Every function that reads the game in play takes the state first and the game second.

A scene as the player sees it in a state is in the [view](/docs/reference/view#view), so a tool that previews a scene opens it in a state and reads `view(state, game).scene`. [`entityOf`](/docs/reference/entities#entityof) looks up an entity.

## Caveats

- `game.scenes` holds each scene as the content declares it. The engine works out what a scene shows each time it renders it.
- Plugins go on the base and only there. Content and packs can carry a plugin's `data`, but can't add a plugin.
- [`checkGame`](/docs/reference/checks#checkgame) checks that every id the game names resolves. `loadGame` runs it, and a test that runs it fails on a broken id at commit time.
