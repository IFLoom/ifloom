---
title: "Effects"
---
An effect is one change to the [state](/docs/reference/state), written as data. Choices, activities, item uses, triggers and the end of a turn all carry lists of them.

```ts
import type { Effect } from '@ifloom/engine'

const effects: Effect[] = [
  { kind: 'stat', key: 'coins', by: -4 },
  { kind: 'item', id: 'sandwich', by: 1 },
  { kind: 'storylineFlag', id: 'ava', key: 'boughtLunch', value: true },
]
```

## How a list runs

Effects apply in order, each to the state the one before it left. An effect that can't apply does nothing and the rest still run, so an effect never refuses a command. The command around it can refuse first, though. For example, a plugin guard can refuse a choice before any of its effects run, as the [calendar](/docs/plugins/calendar#the-guard) does for one that would pass time past dawn. See [`choose`](/docs/reference/commands#choose).

An effect with an unknown `kind` does nothing, and the [content checker](/docs/reference/checks#in-an-effect) reports it.

## applyEffects

```ts
function applyEffects(state: GameState, game: Game, effects: Effect[]): GameState
```

Runs a list of effects against a state and returns the new state, without a command around it. Nothing is refused, no turn ends unless an effect ends one, and no scene is counted as seen. It's useful in tests and tools, for example to put the player in a scene or give them coins, and in a custom effect that wants to see where its own list leads.

```ts
import { applyEffects } from '@ifloom/engine'

const next = applyEffects(state, game, [
  { kind: 'stat', key: 'coins', by: 5 },
  { kind: 'scene', id: 'ava.hi' },
])
```

**Gotcha.** It only takes plain `Effect`s. Flatten a `{ custom }` reference, or its [shorthand](/docs/reference/custom#plugincall), with [`buildEffects`](/docs/reference/custom#buildeffects) first. A plugin's effect in its long form, `{ kind: 'custom', name }`, is a plain effect and runs.

## Effect

```ts
type Effect =
  | { kind: 'stat'; key: StatKey; by: number; of?: string }
  | { kind: 'custom'; name: string; with?: Record<string, unknown> }
  | { kind: 'setStat'; key: StatKey; to: number; of?: string }
  | { kind: 'storylineFlag'; id: string; key: string; value: FlagValue }
  | { kind: 'flag'; key: string; value: FlagValue; of?: string }
  | { kind: 'flag'; key: string; add: number; of?: string }
  | { kind: 'create'; of: string; entity: { id?: string; name: string; stats?: Record<string, number>; flags?: Record<string, FlagValue> } }
  | { kind: 'remove'; of: string }
  | { kind: 'each'; of: string; where?: Condition; effects: EffectRef[] }
  | { kind: 'scene'; id: string | null }
  | { kind: 'scene'; from: string; otherwise?: string }
  | { kind: 'item'; id: string; by: number }
  | { kind: 'phase'; value: Phase }
  | { kind: 'closeStoryline'; id: string; turns: number }
  | { kind: 'turn'; by?: number }
  | { kind: 'collect'; to: string; entry: CollectionItem }
  | { kind: 'discard'; from: string; id: string }
  | { kind: 'notify'; title: string; text?: string; image?: string; tag?: string; id?: string }
  | { kind: 'audio'; channel: string; track?: string | null }
  | { kind: 'sound'; track: string }
  | { kind: 'minigame'; id: string }
  | { kind: 'minigameVar'; key: string; value: number }
  | { kind: 'minigameVar'; key: string; add: number }
  | { kind: 'minigameVar'; key: string; random: [number, number] }
```

### stat

```ts
{ kind: 'stat', key: 'fitness', by: 1 }
```

Adds `by` to a stat, held to the stat's declared `min` and [`max`](/docs/reference/stats#statmax) (0 to 100 unless it says otherwise). Spending and earning both use this effect, because coins, energy and every other number are [declared stats](/docs/reference/stats). Afterwards [`rules.onStat`](/docs/reference/rules#onstat) sees the before and after, and can veto or add to the change. `key` must be a [declared stat](/docs/reference/stats).

A [derived stat](/docs/reference/stats#derived-stats) is never written, so a `stat` effect on one does nothing, and the loader reports it. The effect adds to the value the save keeps, which is 0 for a stat the save doesn't have yet, such as one added in an update. See [Filling new content](/docs/reference/saves#filling-new-content).

**Gotcha.** A `stat` effect never refuses. Spending 4 coins the player doesn't have leaves them at the stat's `min` rather than stopping the choice. Check `{ stat: 'coins', gte: 4 }` first, or use an activity [cost](/docs/reference/actions#activitycost), which refuses.

#### An entity's stat

```ts
{ kind: 'stat', key: 'quality', by: 1, of: 'dish:soup' }
{ kind: 'each', of: 'staff', effects: [{ kind: 'stat', key: 'morale', by: -8, of: '$' }] }
```

With `of`, the stat belongs to an [entity](/docs/reference/entities). `of` is an [entity reference](/docs/reference/entities#entityref) such as `'staff:ana'`, or `'$'` inside an [`each`](#each). The value is held to the stat's range as the player's would be. If the entity isn't there, the effect does nothing. `rules.onStat` isn't called, because it only runs for the player's stats. A negative amount here is never part of a button's [price](/docs/reference/view#price), even on a spendable stat.

**Gotcha.** At run time, nothing stops a `stat` effect from naming the player's `coins` with `of: 'staff:ana'`. It gives Ana a `coins` of her own, which nothing shows. The [content checker](/docs/reference/checks) reports a stat named on the wrong owner, so run it.

### setStat

```ts
{ kind: 'setStat', key: 'energy', to: 100 }
```

Sets a stat to `to`, held to its declared range. Use it for energy back to full overnight, or a mood reset at the start of a day. [`rules.onStat`](/docs/reference/rules#onstat) is called as for `stat`, with `by` being the change it made (`to` held to range, minus the value before).

```ts
// In rules.turn: wake up with a full tank, whatever the ceiling is today.
effects: [{ kind: 'setStat', key: 'energy', to: 9999 }]
```

Like `stat`, it does nothing on a [derived stat](/docs/reference/stats#derived-stats), and the loader reports it.

With `of`, it sets an [entity](/docs/reference/entities)'s stat, as for [`stat`](#an-entitys-stat): `{ kind: 'setStat', key: 'morale', to: 80, of: 'staff:ana' }`. If the entity isn't there it does nothing, and `rules.onStat` isn't called.

### custom

```ts
{ kind: 'custom', name: 'loyalty/stamp' }
{ kind: 'custom', name: 'quests/start', with: { quest: 'letter' } }
```

Runs a [plugin](/docs/reference/plugins)'s effect, by its full name, on the state the effects before it left. `with` is passed as its arguments, or `{}` when left out. A name that none of the game's plugins has does nothing.

In a data scene choice, an activity or a trigger, write the short form, `{ custom: 'loyalty/stamp' }`, or shorter still, [`{ 'loyalty/stamp': true }`](/docs/reference/custom#plugincall). [`buildEffects`](/docs/reference/custom#buildeffects) turns either into this one. Item uses and [`rules.turn`](/docs/reference/rules#turn) only take plain effects, so write the long form there.

**Gotcha.** The [content checker](/docs/reference/checks) checks the name in every form, as `no plugin effect named "…"` for the long form, wherever the effect is data. `rules.turn` is a function, so nothing checks a name it returns, and a typo there silently does nothing.

### storylineFlag

```ts
{ kind: 'storylineFlag', id: 'ava', key: 'lentBook', value: true }
```

Sets a variable on a [storyline](/docs/reference/storylines). Use a number for anything [`{ counter }`](/docs/reference/conditions#counter) should read.

A storyline doesn't keep score of how well someone likes the player. Keep that as a stat on the [cast](/docs/plugins/cast#each-one-is-an-entity)'s characters: `{ kind: 'stat', key: 'friendship', by: 5, of: person('ava') }`.

### flag

```ts
{ kind: 'flag', key: 'hadCoffee', value: true }
{ kind: 'flag', key: 'coffeesBought', add: 1 }
```

Sets a game [variable](/docs/reference/state#flags) to `value`, or with `add`, adds to its number. A variable that isn't a number yet (unset, text or `true`) counts as 0, so the first `add: 1` makes it 1. Test a count with a [range](/docs/reference/conditions#flag), such as `{ flag: 'coffeesBought', gte: 3 }`.

With `of`, both forms set a variable on an [entity](/docs/reference/entities) instead, as in `{ kind: 'flag', key: 'role', value: 'cook', of: 'staff:ana' }`, or `of: '$'` inside an [`each`](#each). Read it back with [`{ flag, of }`](/docs/reference/conditions#flag). If the entity isn't there, the effect does nothing.

**Gotcha.** `add` has no bounds. Unlike a [stat](#stat), the number isn't held to any range, and a negative `add` can take it below 0.

### scene

```ts
{ kind: 'scene', id: 'ava.hi' }
{ kind: 'scene', id: null }
```

Puts a scene on screen, or closes it with `null`. The id isn't checked when the effect runs, but the [content checker](/docs/reference/checks) checks it. Only the scene left on screen at the end of the command counts as [seen](/docs/reference/state#seen).

#### Drawing a storylet

```ts
{ kind: 'scene', from: 'cafe' }
{ kind: 'scene', from: 'cafe', otherwise: 'cafe.quiet' }
```

With `from` instead of `id`, it draws a [storylet](/docs/reference/storylets): one of the scenes whose `drawnFrom` names `from` and whose `when` holds, picked by their `weight`, and puts it on screen. If none can be drawn, it puts `otherwise` on screen, and with no `otherwise` it leaves the screen as it was.

The draw is seeded by the save, the turn and a count of draws from that set, kept in the variable `storylet:<from>`, so the same save always draws the same scene and [`replay`](/docs/reference/runner#replay) draws it again. See [Storylets](/docs/reference/storylets) for the details and the checks.

The engine has no effect that moves the player. The [places plugin](/docs/plugins/places) keeps track of places, and its [`places/move`](/docs/plugins/places#effects) effect, written `moveTo('park')`, puts the player somewhere at once. In a plain-effect list, write it in the long form: `{ kind: 'custom', name: 'places/move', with: { value: 'park' } }`.

### item

```ts
{ kind: 'item', id: 'sandwich', by: 1 }
```

Adds to how many of an item the player holds. The count never goes below 0.

### phase

```ts
{ kind: 'phase', value: 'open' }
```

Moves the game to another [stage](/docs/reference/state#phase). It's typically on the last choice of an intro.

### closeStoryline

```ts
{ kind: 'closeStoryline', id: 'ava', turns: 2 }
```

Closes a storyline until `turns` [turns](/docs/reference/state#turn) from now, by setting its [`closedUntil`](/docs/reference/state#storylines) to the current turn plus `turns`. While it's closed, [`{ storyline: 'ava' }`](/docs/reference/conditions#storyline) stops holding. A [cast](/docs/plugins/cast) character who belongs to it is still in the room, but the player can't talk to them or call them. Nothing on the storyline is lost. In a game whose turn is a day (the [calendar](/docs/plugins/calendar#what-a-turn-is)'s default), `turns: 2` is the day after tomorrow.

### turn

```ts
{ kind: 'turn' }
{ kind: 'turn', by: 3 }
```

Ends the turn `by` times, or once when `by` is left out. Each time, the [turn](/docs/reference/state#turn) counter goes up by one and [`rules.resets`](/docs/reference/rules#resets) are written. Then [`rules.turn`](/docs/reference/rules#turn)'s effects apply, then [`rules.onTurn`](/docs/reference/rules#onturn) runs, then each plugin's [`turn` hook](/docs/reference/plugins#hooks). See [The end of a turn](/docs/reference/rules#the-end-of-a-turn).

The engine keeps no time of day, so this effect is how a turn ends, whether a turn is a chapter of a novel or a week of running the café. Put it on the choice that closes a chapter. A plugin can end turns the same way. The [calendar](/docs/plugins/calendar#what-a-turn-is)'s `pass` and `sleep` end one at each day they cross, and its `turn` hook moves its clock on when this effect ends one.

```ts
{ id: 'lock-up', effects: [{ kind: 'turn' }, { kind: 'scene', id: 'cafe.monday' }] }
```

**Gotchas.**
- Here `rules.turn` is asked with the state as the effect found it, not the state before the command.
- A `turn` effect run while a turn is ending does nothing, so a turn's rules can never end another turn. That covers what [`rules.turn`](/docs/reference/rules#turn) returns, and anything `onTurn` or a plugin's `turn` hook applies.
- A `by` of 0 or less does nothing.

### collect

```ts
{ kind: 'collect', to: 'notes', entry: { id: 'welcome', title: 'Welcome note', text: 'notice.welcome' } }
```

Adds an entry to a [collection](/docs/reference/collections), stamped with the current [turn](/docs/reference/state#turn). `entry` is a [`CollectionItem`](/docs/reference/collections#collectionitem), and its `text` is a prose key. If the id is already in the collection, the effect does nothing and the entry there is left as it is. When the collection goes over its `max`, the oldest entries go.

The [content checker](/docs/reference/checks) checks the collection and the `text`.

### discard

```ts
{ kind: 'discard', from: 'notes', id: 'welcome' }
```

Takes one entry out of a collection by id. It does nothing if the entry isn't there.

### create

```ts
{ kind: 'create', of: 'staff', entity: { name: 'Dev', stats: { skill: 2, wage: 8, morale: 80 } } }
{ kind: 'create', of: 'staff', entity: { id: 'cleo', name: 'Cleo' } }
```

Adds an [entity](/docs/reference/entities) of kind `of`, after the ones already there. It gets every stat of its kind at that stat's `start`, overridden by `entity.stats`. Its variables are `entity.flags`, or none.

Without `id`, it gets the next free number of its kind (`#1`, `#2` and so on), recorded in [`state.created`](/docs/reference/state#created). A number is never given again, even once the entity that had it is [removed](#remove). With `id`, it gets that id, unless an entity of that kind already has it. In that case the effect does nothing, and the entity there keeps its name and numbers.

Here's a choice that hires someone, from the café's interviews:

```ts
choices: [
  { id: 'dev', effects: [{ kind: 'create', of: 'staff', entity: { name: 'Dev', stats: { skill: 2, wage: 8, morale: 80 } } }, { kind: 'scene', id: null }] },
  { id: 'fen', effects: [{ kind: 'create', of: 'staff', entity: { name: 'Fen', stats: { skill: 7, wage: 18 } } }, { kind: 'scene', id: null }] },
]
```

**Gotchas.**
- The id it was given isn't handed back. To refer to someone created without an id, go through them all with [`each`](#each) or [`entitiesOf`](/docs/reference/entities#entitiesof), or give an `id` of your own.
- An `id` that's a whole number, such as `'7'`, does nothing, just like one that's already taken. It would otherwise jump to the front of the kind's order. See [Ids](/docs/reference/entities#ids).
- `entity.stats` is taken as written, not held to range, until an effect next moves it.
- The [content checker](/docs/reference/checks) reports a kind the game doesn't declare.

### remove

```ts
{ kind: 'remove', of: 'staff:ana' }
{ kind: 'each', of: 'staff', where: { stat: 'morale', of: '$', lt: 20 }, effects: [{ kind: 'remove', of: '$' }] }
```

Takes an [entity](/docs/reference/entities) out of the game, with its stats and variables. It does nothing if the entity isn't there. Its id isn't given to anyone created later.

An entity the game declares is also recorded in [`state.removed`](/docs/reference/state#removed). That keeps it gone, rather than being put back when the save [loads](/docs/reference/entities#entities-in-old-saves), which adds declared entities a save lacks. An entity created in play isn't recorded.

### each

```ts
{ kind: 'each', of: 'staff', effects: [{ kind: 'stat', key: 'morale', by: -8, of: '$' }] }
{ kind: 'each', of: 'staff', where: { stat: 'morale', of: '$', lt: 20 }, effects: [{ kind: 'remove', of: '$' }] }
```

Runs `effects` once for every [entity](/docs/reference/entities) of kind `of`, in the order they arrived, with `'$'` standing for the current one each time. With `where`, it only runs for those the condition holds for, with `'$'` again standing for the current one. Use it for upkeep, wages, a bad week, or everyone who quits.

- **Who it runs for is fixed before it starts.** One created along the way isn't visited, and one removed along the way by an earlier entity's effects is skipped.
- **`where` is tested on the state as it is when each entity comes up**, after the effects for the ones before it.
- **`effects` are built for each entity in turn**, with `'$'` bound, against the state as it is then. They can be anything content can write, a `{ custom }` effect included. A custom effect sees the state after the entities before it, not the state the list started from. To tell it which entity it's working on, pass `with: { of: '$' }`. Every `of: '$'` inside is replaced, a `with` included, so the function gets `args.of` as `'staff:ana'`.
- **A nested `each`**, or a [`{ count }`](/docs/reference/conditions#count) in `where`, binds its own `'$'`. See [EntityRef](/docs/reference/entities#entityref).

An effect inside that doesn't name `'$'` still runs once per entity. `{ kind: 'stat', key: 'coins', by: -10 }` in an `each` over three members of staff takes 30 coins.

The [content checker](/docs/reference/checks) looks inside an `each`, with `'$'` standing for one of its kind, so a stat named on `'$'` has to belong to that kind.

### notify

```ts
{ kind: 'notify', id: 'rent', title: 'Rent is due on Friday', text: 'notice.rent', tag: 'money' }
```

Raises a [notice](/docs/reference/notices), which is something the game tells the player outside a scene. `title` is written out, `text` is a prose key for more words, and `tag` groups notices for badges. A notice with the `id` of an earlier one replaces it as the newest, unseen. With no `id`, one is made up. Only the newest [`NOTICES_KEPT`](/docs/reference/notices#notices_kept) are kept.

### audio

```ts
{ kind: 'audio', channel: 'music', track: 'radio' }
```

Puts a track or playlist on a background [channel](/docs/reference/audio#channels) and keeps it in the save, in `state.audio.channels`. It plays over the place's audio and the game's default, but an open scene that names the same channel still wins while it's open. See [what plays on a background channel](/docs/reference/audio#what-plays-on-a-background-channel).

- **`track: null`** silences the channel, place and default included.
- **Leave `track` out** to hand the channel back, so the place's audio or the game's default plays again.

```ts
{ kind: 'audio', channel: 'music', track: null }  // the music stops
{ kind: 'audio', channel: 'music' }               // back to whatever the flat or the default plays
```

The loader reports an unknown track or channel, a cue channel such as `sfx`, and a sound effect's track put on a background channel.

### sound

```ts
{ kind: 'sound', track: 'knock' }
```

Plays a [track](/docs/reference/audio#trackdef) once, on its own channel (`sfx` unless the track says otherwise). The state keeps the last 20 in `state.audio.cues`, each with a running count, and [`view.audio.cues`](/docs/reference/audio#sounds-and-voices) gives each a key so a player plays it once. The loader reports an unknown track, a playlist, and a track on a background channel.

### minigame

```ts
{ kind: 'minigame', id: 'arrows' }
```

Starts a [minigame](/docs/reference/minigames) in its `start` state, with its variables at their starting values. A minigame already running is dropped. Until it ends, the view draws it over the scene or the room, and every command but its own (and `dismiss` and `setting`) is refused with `Finish this first.`

It also adds 1 to the variable `minigame:<id>`, which counts how many times the minigame has started. The [content checker](/docs/reference/checks) reports an unknown minigame.

### minigameVar

```ts
{ kind: 'minigameVar', key: 'score', add: 1 }
{ kind: 'minigameVar', key: 'round', value: 0 }
{ kind: 'minigameVar', key: 'arrow', random: [1, 4] }
```

Changes a variable of the [minigame](/docs/reference/minigames#its-variables) being played: sets it to `value`, adds `add` to it, or sets it to a whole number drawn from `random`, both ends included. The draw comes from the save's seed, so it's the same every time the same commands are played. With no minigame running, it does nothing.

The checker reports a variable that no minigame declares in its `vars`, and one a minigame uses but doesn't declare itself.

## Computed effects

Most effects are fixed data. When one has to be worked out from the state, such as "one more than the counter is now" or "the next stage of this ladder", declare a custom effect on the game and name it in the content:

```ts
type CustomEffect = (state: GameState, args: Record<string, unknown>) => EffectRef[]
type EffectRef = Effect | { custom: string; with?: Record<string, unknown> } | PluginCall
```

```ts
import type { Custom } from '@ifloom/engine'

// goes on the game as `custom`
const custom: Custom = {
  effects: {
    bumpVisits: (state, args) => {
      const now = Number(state.storylines.ava?.flags.visits ?? 0)
      return [{ kind: 'storylineFlag', id: 'ava', key: 'visits', value: now + Number(args.by ?? 1) }]
    },
  },
}
```

```ts
effects: [{ custom: 'bumpVisits', with: { by: 1 } }, { kind: 'scene', id: null }]
```

The custom effect's effects take its place in the list, in order. It can return anything content can write: plain effects, a plugin's effect such as `{ custom: 'quests/start', with: { quest: 'letter' } }`, or another of the game's own custom effects, which is worked out in turn. `with` is passed as `args`, or `{}` when left out. A [pack](/docs/reference/loader#pack) can ship custom effects in its `custom.effects`. See [Custom functions](/docs/reference/custom) for the other kinds.

You write a [plugin](/docs/reference/plugins)'s effect the same way, with the plugin's id in front: `{ custom: 'quests/start', with: { quest: 'letter' } }`, or in [short](/docs/reference/custom#plugincall), `{ 'quests/start': { quest: 'letter' } }`. It isn't worked out up front. It becomes a [`custom`](#custom) effect that runs in its turn, on the state the effects before it left. See [Effects run in order](/docs/reference/plugins#effects-run-in-order).

**Gotchas.**
- `{ custom }` works in the choices of a [data scene](/docs/reference/scenes#datascene), in an [activity](/docs/reference/actions#activitydef)'s `effects`, in a [trigger](/docs/reference/triggers)'s `effects`, inside an `each`, and in what a custom effect returns. The [shorthand](/docs/reference/custom#plugincall) works in all the same places. Neither is an `Effect`, so item uses and `rules.turn` take plain effects.
- A game's custom effect is worked out from the state before any of the list applies, so it doesn't see what the effects before it in the same list did. A plugin's effect does, even one a game's custom effect returns. The custom effect is worked out up front, but the plugin effect in its result runs in its turn.
- Custom effects that return custom effects are worked out up to 10 deep, all against the same state. One that names itself, or a loop of them, adds nothing past that.
- A name that neither the game nor its plugins declare adds nothing. The [content checker](/docs/reference/checks) reports it.
- To flatten a list yourself, in a custom runtime for example, use [`buildEffects`](/docs/reference/custom#buildeffects).

## See it in an example

- The Corner Café: the `endWeek` activity in [`examples/cafe/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/cafe/src/game.ts) runs two custom effects, then `each` over the staff to lower their morale, `remove` on anyone below 20, and `{ kind: 'turn' }`. The `hiring` scene's choices `create` new staff.
- The Letter: in [`examples/novel/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/novel/src/game.ts), `{ kind: 'flag', key: 'fibs', add: 1 }` counts a lie, and the choices in the first two chapters end with `{ kind: 'turn' }` and a `scene` effect.
- Small Town: in [`examples/showcase/src/content/town.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/content/town.ts), the `sit` activity draws a storylet with `{ kind: 'scene', from: 'cafe', otherwise: 'cafe.quiet' }`, the `arrows` activity starts a minigame, and Ava's choices raise her friendship with `{ kind: 'stat', key: 'friendship', by: 5, of: person('ava') }`.
