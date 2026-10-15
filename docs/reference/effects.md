# Effects

An effect is one change to the [state](/reference/state), written as data. Choices, activities, item uses and the end of a turn all carry lists of them.

```ts
import type { Effect } from '@ifloom/engine'

const effects: Effect[] = [
  { kind: 'stat', key: 'coins', by: -3 },
  { kind: 'item', id: 'bun', by: 1 },
  { kind: 'storylineFlag', id: 'rosa', key: 'boughtBread', value: true },
]
```

## How a list runs

Effects apply **in order**, each to the state the one before it left. An effect that cannot apply does nothing and the rest still run; an effect never refuses a command. (The command around it may refuse first — a plugin guard can refuse a choice before any of its effects run, as the [calendar](/plugins/calendar#the-guard) refuses one that would pass time past dawn. See [`choose`](/reference/commands#choose).)

An effect with an unknown `kind` does nothing.

## applyEffects

```ts
function applyEffects(state: GameState, game: Game, effects: Effect[]): GameState
```

Runs a list of effects against a state and returns the new state, without a command around it: no refusal, no end of a turn beyond what the effects themselves run, no scene witnessing. Useful in tests and tools — put the player in a scene, give them coins — and in a custom effect that wants to see where its own list leads.

```ts
const next = applyEffects(state, town, [
  { kind: 'stat', key: 'coins', by: 5 },
  { kind: 'scene', id: 'cafe.counter' },
])
```

**Gotcha.** It takes plain `Effect`s only. A `{ custom }` reference, or its [shorthand](/reference/custom#plugincall), must be flattened with [`buildEffects`](/reference/custom#buildeffects) first. A plugin's effect in its long form, `{ kind: 'custom', name }`, is a plain effect and runs.

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
  | { kind: 'item'; id: string; by: number }
  | { kind: 'phase'; value: Phase }
  | { kind: 'closeStoryline'; id: string; turns: number }
  | { kind: 'turn'; by?: number }
  | { kind: 'collect'; to: string; entry: CollectionItem }
  | { kind: 'discard'; from: string; id: string }
  | { kind: 'notify'; title: string; text?: string; image?: string; tag?: string; id?: string }
```

### stat

```ts
{ kind: 'stat', key: 'fitness', by: 1 }
```

Adds `by` to a stat, held to the stat's declared `min` and [`max`](/reference/stats#statmax) (0–100 unless it says). Spending and earning are both this effect: coins, energy and every other number are [declared stats](/reference/stats). Then [`rules.onStat`](/reference/rules#onstat) sees the before and after and may veto or add to the change. `key` must be a [declared stat](/reference/stats); [`validatePack`](/reference/game#validatepack) reports one that is not.

**Gotcha:** a `stat` effect never refuses. Spending 4 coins the player does not have leaves them at the stat's `min` rather than stopping the choice. Check `{ stat: 'coins', gte: 4 }` first, or use an activity [cost](/reference/actions#activitycost), which refuses.

#### An entity's stat

```ts
{ kind: 'stat', key: 'quality', by: 1, of: 'dish:soup' }
{ kind: 'each', of: 'staff', effects: [{ kind: 'stat', key: 'morale', by: -8, of: '$' }] }
```

With `of`, the stat is an [entity](/reference/entities)'s: `of` is an [entity reference](/reference/entities#entityref), `'staff:ana'`, or `'$'` inside an [`each`](#each). It is held to the stat's range as the player's would be. **An entity that is not there means the effect does nothing.** `rules.onStat` is not called: it runs only for the player's stats. A negative one on a spendable stat is not part of a button's [price](/reference/view#price).

**Gotcha.** Nothing checks that the stat is one of the entity's kind. A `stat` effect naming the player's `coins` with `of: 'staff:ana'` gives Ana a `coins` of her own, which nothing shows.

### setStat

```ts
{ kind: 'setStat', key: 'energy', to: 100 }
```

Puts a stat at `to`, held to its declared range — energy back to full overnight, a mood reset at the start of a day. [`rules.onStat`](/reference/rules#onstat) is called as for `stat`, with `by` the change it made (`to` held to range, less the value before).

```ts
// In rules.turn: wake up with a full tank, whatever the ceiling is today.
effects: [{ kind: 'setStat', key: 'energy', to: 9999 }]
```

With `of`, an [entity](/reference/entities)'s stat, as for [`stat`](#an-entity-s-stat): `{ kind: 'setStat', key: 'morale', to: 80, of: 'staff:ana' }`. An entity that is not there means it does nothing, and `rules.onStat` is not called.

### custom

```ts
{ kind: 'custom', name: 'loyalty/stamp' }
{ kind: 'custom', name: 'quests/start', with: { quest: 'letter' } }
```

Runs a [plugin](/reference/plugins)'s effect, by its full name, on the state the effects before it left. `with` is passed as its arguments, `{}` when left out. A name no plugin of the game has does nothing.

In a data scene choice, an activity or a trigger, write the short form, `{ custom: 'loyalty/stamp' }`, or shorter still, [`{ 'loyalty/stamp': true }`](/reference/custom#plugincall). [`buildEffects`](/reference/custom#buildeffects) turns either into this one, and the loader checks the name. Item uses and [`rules.turn`](/reference/rules#turn) take plain effects only, so write this long form there.

**Gotcha.** Neither the loader nor [`validatePack`](/reference/game#validatepack) checks the `name` of a long-form `custom` effect. A typo does nothing.

### storylineFlag

```ts
{ kind: 'storylineFlag', id: 'ada', key: 'lentBook', value: true }
```

Sets a variable on a [storyline](/reference/world). Use a number for anything [`{ counter }`](/reference/conditions#counter) should read.

A storyline keeps no score of how well someone likes the player. Keep that as a stat on the [cast](/plugins/cast#each-one-is-an-entity)'s characters: `{ kind: 'stat', key: 'friendship', by: 5, of: person('ada') }`.

### flag

```ts
{ kind: 'flag', key: 'marketOpen', value: true }
{ kind: 'flag', key: 'loavesBought', add: 1 }
```

Sets a game [variable](/reference/state#flags) to `value`, or, with `add`, adds to its number. A variable that is not a number yet — unset, text, `true` — counts as 0, so the first `add: 1` makes it 1. Test a count with a [range](/reference/conditions#flag): `{ flag: 'loavesBought', gte: 3 }`.

With `of`, both forms set a variable on an [entity](/reference/entities) instead: `{ kind: 'flag', key: 'role', value: 'cook', of: 'staff:ana' }`, or `of: '$'` inside an [`each`](#each). Read it back with [`{ flag, of }`](/reference/conditions#flag). An entity that is not there means the effect does nothing.

**Gotcha.** `add` has no bounds. Unlike a [stat](#stat), the number is not held to any range, and a negative `add` can take it below 0.

### scene

```ts
{ kind: 'scene', id: 'cafe.counter' }
{ kind: 'scene', id: null }
```

Puts a scene on screen, or closes it with `null`. The id is not checked here (`validatePack` and the loader check it). Only the scene left on screen at the end of the command counts as [seen](/reference/state#seen).

The engine has no effect that moves the player: places belong to the [places plugin](/plugins/places), whose [`places/move`](/plugins/places#effects) effect, written `moveTo('market')`, puts the player somewhere at once. In a plain-effect list, write it long: `{ kind: 'custom', name: 'places/move', with: { value: 'market' } }`.

### item

```ts
{ kind: 'item', id: 'bun', by: 1 }
```

Adds to how many of an item the player holds. Never below 0.

### phase

```ts
{ kind: 'phase', value: 'open' }
```

Moves the game to another [stage](/reference/state#phase). Typically the last choice of an intro.

### closeStoryline

```ts
{ kind: 'closeStoryline', id: 'ada', turns: 2 }
```

Closes a storyline until `turns` [turns](/reference/state#turn) from now: [`{ storyline: 'ada' }`](/reference/conditions#storyline) stops holding, and a [cast](/plugins/cast) character who belongs to it is still in the room, but talking to them and calling them are refused until then. It sets the storyline's [`closedUntil`](/reference/state#storylines) to the current turn plus `turns`. Nothing on the storyline is lost. In a game whose turn is a day (the [calendar](/plugins/calendar#what-a-turn-is)'s default), `turns: 2` is the day after tomorrow.

### turn

```ts
{ kind: 'turn' }
{ kind: 'turn', by: 3 }
```

Ends the turn `by` times (once when left out). Each time, the end of a turn runs: the [turn](/reference/state#turn) counter goes up by one and [`rules.resets`](/reference/rules#resets) are written, then [`rules.turn`](/reference/rules#turn)'s effects apply, then [`rules.onTurn`](/reference/rules#onturn), then each plugin's [`turn` hook](/reference/plugins#hooks). See [the end of a turn](/reference/rules#the-end-of-a-turn).

The engine keeps no time of day, so this effect is how a turn ends: a chapter of a novel, a week of running the café. Put it on the choice that closes a chapter. A plugin may end turns the same way: the [calendar](/plugins/calendar#what-a-turn-is)'s `pass` and `sleep` end one at each day they cross, and its `turn` hook moves its clock on when this effect ends one.

```ts
{ id: 'lock-up', effects: [{ kind: 'turn' }, { kind: 'scene', id: 'cafe.monday' }] }
```

**Gotchas.**
- Here `rules.turn` is asked with the state as the effect found it, not the state before the command.
- A `turn` effect run while a turn is ending — in what [`rules.turn`](/reference/rules#turn) returns, or from `onTurn` or a plugin's `turn` hook — does nothing, so a turn's rules can never end another turn. `by` of 0 or less does nothing.

### collect

```ts
{ kind: 'collect', to: 'letters', entry: { id: 'rosa.thanks', title: 'A note from Rosa', text: 'letter.rosa.thanks' } }
```

Adds an entry to a [collection](/reference/collections), stamped with the current [turn](/reference/state#turn). `entry` is a [`CollectionItem`](/reference/collections#collectionitem); its `text` is a prose key. **An id already in the collection is left as it is** — the effect does nothing. Over the collection's `max`, the oldest entries go.

The loader reports an undeclared collection (`unknown collection "…"`) and a `text` with no prose (`no prose for "…"`) in triggers, activities and data scene choices; [`validatePack`](/reference/game#validatepack) reports `collection … is not declared` in item uses and activities.

### discard

```ts
{ kind: 'discard', from: 'letters', id: 'rosa.thanks' }
```

Takes one entry out of a collection by id. Does nothing if it is not there.

### create

```ts
{ kind: 'create', of: 'staff', entity: { name: 'Dev', stats: { skill: 2, wage: 8, morale: 80 } } }
{ kind: 'create', of: 'staff', entity: { id: 'cleo', name: 'Cleo' } }
```

Adds an [entity](/reference/entities) of kind `of`, after the ones already there. Its stats are each of its kind's stats at that stat's `start`, overridden by `entity.stats`; its variables are `entity.flags`, or none.

Without `id`, it gets the next free number of its kind, `#1`, `#2` and so on, recorded in [`state.created`](/reference/state#created) and never given again, even once the one that had it is [removed](#remove). With `id`, it gets that id — **unless an entity of that kind already has it, when the effect does nothing**: the one there keeps its name and numbers.

A choice that hires someone, from the café's interviews:

```ts
choices: [
  { id: 'dev', effects: [{ kind: 'create', of: 'staff', entity: { name: 'Dev', stats: { skill: 2, wage: 8, morale: 80 } } }, { kind: 'scene', id: null }] },
  { id: 'fen', effects: [{ kind: 'create', of: 'staff', entity: { name: 'Fen', stats: { skill: 7, wage: 18 } } }, { kind: 'scene', id: null }] },
]
```

**Gotchas.**
- The id it was given is not handed back. To refer to someone created without an id, go through them all with [`each`](#each) or [`entitiesOf`](/reference/entities#entitiesof), or give an `id` of your own.
- An `id` that is a whole number, such as `'7'`, does nothing, as one already taken does: it would jump to the front of the kind's order. See [Ids](/reference/entities#ids).
- `entity.stats` is taken as written, not held to range, until an effect next moves it.

In a [trigger](/reference/triggers)'s effects, the loader reports a kind the game does not declare (`unknown kind "…"`). In a data scene's choices and an activity's effects it does not.

### remove

```ts
{ kind: 'remove', of: 'staff:ana' }
{ kind: 'each', of: 'staff', where: { stat: 'morale', of: '$', lt: 20 }, effects: [{ kind: 'remove', of: '$' }] }
```

Takes an [entity](/reference/entities) out of the game, with its stats and variables. Does nothing if it is not there. Its id is not given to anyone created later.

An entity the game declares is also recorded in [`state.removed`](/reference/state#removed), so it stays gone rather than being put back by [`hydrate`](/reference/commands#hydrate), which adds declared entities a save lacks. One created in play is not recorded.

### each

```ts
{ kind: 'each', of: 'staff', effects: [{ kind: 'stat', key: 'morale', by: -8, of: '$' }] }
{ kind: 'each', of: 'staff', where: { stat: 'morale', of: '$', lt: 20 }, effects: [{ kind: 'remove', of: '$' }] }
```

Runs `effects` once for every [entity](/reference/entities) of kind `of`, in the order they came, with `'$'` as the one each time. With `where`, only for those it holds for, `'$'` again being the one. Upkeep, wages, a bad week, everyone who quits.

- **Who it runs for is fixed before it starts.** One created on the way is not visited; one removed on the way — by an earlier entity's effects — is skipped.
- **`where` is tested on the state as it is when each one comes up**, after the effects for the ones before it.
- **`effects` are built for each entity in turn**, with `'$'` bound, against the state as it is then, and can be anything content can write, a `{ custom }` effect included. A custom effect sees the state after the entities before, not the state the list started from. To tell it which entity it is working on, pass `with: { of: '$' }`: every `of: '$'` inside is replaced, a `with` included, so the function gets `args.of` as `'staff:ana'`.
- A nested `each`, or a [`{ count }`](/reference/conditions#count) in `where`, binds its own `'$'`. See [EntityRef](/reference/entities#entityref).

An effect in it that does not name `'$'` runs once per entity all the same: `{ kind: 'stat', key: 'coins', by: -10 }` in an `each` over three members of staff takes 30 coins.

In a [trigger](/reference/triggers)'s effects, the loader reports a kind the game does not declare (`unknown kind "…"`), and checks `where` and `effects` as it checks any other condition and effects.

The [loader](/reference/loader#the-checks) checks an `each`'s kind and everything inside it, wherever it is, with `'$'` standing for one of its kind: a stat named on `'$'` must belong to that kind. Problems from inside say so: `in each staff: stat "quality" belongs to dish, not staff`. [`validatePack`](/reference/game#validatepack) checks the plain effects inside it too; a custom one is only worked out in play.

### notify

```ts
{ kind: 'notify', id: 'rent', title: 'Rent is due on Friday', text: 'notice.rent', tag: 'money' }
```

Raises a [notice](/reference/notices): something the game tells the player outside a scene. `title` is written out; `text` is a prose key for more words; `tag` groups notices for badges. A notice with the `id` of an earlier one replaces it, unseen, as the newest; with no `id`, one is made up. Only the newest [`NOTICES_KEPT`](/reference/notices#notices-kept) are kept.

## Computed effects

Most effects are fixed data. When one has to be worked out from the state — "one more than the counter is now", "the next stage of this ladder" — declare a **custom effect** on the game and name it in the content:

```ts
type CustomEffect = (state: GameState, args: Record<string, unknown>) => EffectRef[]
type EffectRef = Effect | { custom: string; with?: Record<string, unknown> } | PluginCall
```

```ts
const town: Game = {
  // ...
  custom: {
    effects: {
      bumpVisits: (state, args) => {
        const now = Number(state.storylines.rosa?.flags.visits ?? 0)
        return [{ kind: 'storylineFlag', id: 'rosa', key: 'visits', value: now + Number(args.by ?? 1) }]
      },
    },
  },
}
```

```ts
effects: [{ custom: 'bumpVisits', with: { by: 1 } }, { kind: 'scene', id: null }]
```

The custom effect's effects take its place in the list, in order. It can return anything content can write: plain effects, a plugin's effect such as `{ custom: 'quests/start', with: { quest: 'letter' } }`, or another of the game's own custom effects, which is worked out in turn. `with` is passed as `args` (`{}` when left out). A [loader](/reference/loader) pack can ship custom effects in its `custom.effects`. See [Custom functions](/reference/custom) for the other kinds.

A [plugin](/reference/plugins)'s effect is written the same way, with the plugin's id in front: `{ custom: 'quests/start', with: { quest: 'letter' } }`, or in [short](/reference/custom#plugincall), `{ 'quests/start': { quest: 'letter' } }`. It is not worked out up front. It becomes a [`custom`](#custom) effect that runs in its turn, on the state the effects before it left. See [Effects run in order](/reference/plugins#effects-run-in-order).

**Gotchas.**
- `{ custom }` works in the choices of a [data scene](/reference/scenes#datascene), in an [activity](/reference/actions#activitydef)'s `effects`, in a [trigger](/reference/triggers)'s `effects`, and in what a custom effect returns. The [shorthand](/reference/custom#plugincall) works in all the same places. Neither is an `Effect`: item uses and `rules.turn` take plain effects.
- A game's custom effect is worked out from the state before any of the list applies, so it does not see what the effects before it in the same list did. A plugin's effect does — even one a game's custom effect returns: the custom effect is worked out up front, but the plugin effect in its result runs in its turn.
- Custom effects that return custom effects are worked out up to 10 deep, all against the same state. One that names itself, or a loop of them, contributes nothing past that.
- A name that neither the game nor its plugins declare adds nothing. The loader reports it, in a data scene or an activity, as `no custom effect named "…"` — unless it belongs to a plugin the game lacks that one of its plugins [cooperates with](/reference/plugins#cooperates).
- To flatten a list yourself — in a custom runtime, say — use [`buildEffects`](/reference/custom#buildeffects).
