---
title: "Effects"
description: "Every effect: stats, kv, scenes and storylet draws, entities and what holds them, each, turns, notices, audio, minigames, and custom effects."
---
An effect is one change to the [state](/docs/reference/state), written as data. Choices, activities, triggers and the end of a turn all carry lists of them, and so can a plugin's content, such as a thing's use in the inventory.

```ts
import type { Effect } from '@ifloom/engine'

const effects: Effect[] = [
  { kind: 'stat', stat: 'coins', by: -4 },
  { kind: 'entity', entity: 'item:sandwich', by: 1 },
  { kind: 'storylineKv', storyline: 'ava', key: 'boughtLunch', to: true },
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
  { kind: 'stat', stat: 'coins', by: 5 },
  { kind: 'scene', scene: 'ava.hi' },
])
```

**Gotcha.** It only takes plain `Effect`s. Flatten a `{ custom }` reference, or its [shorthand](/docs/reference/custom#plugincall), with [`buildEffects`](/docs/reference/custom#buildeffects) first. A plugin's effect in its long form, `{ kind: 'custom', name }`, is a plain effect and runs.

## Effect

Every effect follows one naming rule. Its target is named by its noun (`stat`, `entity`, `storyline`, `scene`, or `key` in a kv store), `by` changes a number, and `to` sets a value.

```ts
type Effect =
  | { kind: 'stat'; stat: StatKey; by: number; of?: string }
  | { kind: 'stat'; stat: StatKey; to: number; of?: string }
  | { kind: 'custom'; name: string; with?: Record<string, unknown> }
  | { kind: 'storylineKv'; storyline: string; key: string; to: KvValue }
  | { kind: 'storylineKv'; storyline: string; key: string; by: number }
  | { kind: 'kv'; key: string; to: KvValue; of?: string }
  | { kind: 'kv'; key: string; by: number; of?: string }
  | { kind: 'create'; of: string; like?: string; entity?: CreatedEntity; at?: Placement }
  | { kind: 'create'; of?: string; like: string; entity?: CreatedEntity; at?: Placement }
  | { kind: 'remove'; entity: string }
  | ({ kind: 'each'; effects: EffectRef[] } & Select)
  | { kind: 'entity'; entity: string; at?: string; by: number }
  | { kind: 'entity'; entity: string; at?: string; to: number }
  | { kind: 'move'; entity: string; from?: string; to: string; by?: number }
  | { kind: 'you'; to: string | null }
  | { kind: 'scene'; scene: string | null }
  | { kind: 'scene'; from: string; otherwise?: string }
  | { kind: 'phase'; to: Phase }
  | { kind: 'closeStoryline'; storyline: string; turns: number }
  | { kind: 'turn'; by?: number }
  | { kind: 'notify'; title: string; text?: string; image?: string; tag?: string; id?: string }
  | { kind: 'audio'; channel: string; to?: string | null }
  | { kind: 'sound'; track: string }
  | { kind: 'minigame'; minigame: string }
  | { kind: 'minigameVar'; key: string; to: number }
  | { kind: 'minigameVar'; key: string; by: number }
  | { kind: 'minigameVar'; key: string; random: [number, number] }
  | { kind: 'panel'; panel: string | null; with?: Record<string, unknown> }
  | { kind: 'roll'; key: string; dice: Dice; plus?: number | { stat: string }; against?: number }
```

### stat

```ts
{ kind: 'stat', stat: 'fitness', by: 1 }
{ kind: 'stat', stat: 'energy', to: 100 }
```

Adds `by` to a stat, or puts it `to` a value, held to the stat's declared `min` and [`max`](/docs/reference/stats#statmax) (0 to 100 unless it says otherwise). Spending and earning both use this effect, because coins, energy and every other number are [declared stats](/docs/reference/stats). Afterwards [`rules.onStat`](/docs/reference/rules#onstat) sees the before and after, and can veto or add to the change. `stat` must be a [declared stat](/docs/reference/stats).

A [derived stat](/docs/reference/stats#derived-stats) is never written, so a `stat` effect on one does nothing, and the loader reports it. The effect adds to the value the save keeps, which is 0 for a stat the save doesn't have yet, such as one added in an update. See [Filling new content](/docs/reference/saves#filling-new-content).

**Gotcha.** A `stat` effect never refuses. Spending 4 coins the player doesn't have leaves them at the stat's `min` rather than stopping the choice. Check `{ stat: 'coins', gte: 4 }` first, or use an activity [cost](/docs/reference/actions#activitycost), which refuses.

#### An entity's stat

```ts
{ kind: 'stat', stat: 'quality', by: 1, of: 'dish:soup' }
{ kind: 'each', of: 'staff', effects: [{ kind: 'stat', stat: 'morale', by: -8, of: '$' }] }
```

With `of`, the stat belongs to an [entity](/docs/reference/entities). `of` is an [entity reference](/docs/reference/entities#entityref) such as `'staff:ana'`, or `'$'` inside an [`each`](#each). The value is held to the stat's range as the player's would be. If the entity isn't there, the effect does nothing. `rules.onStat` isn't called, because it only runs for the player's stats. A negative amount here is never part of a button's [price](/docs/reference/view#price), even on a spendable stat.

**Gotcha.** At run time, nothing stops a `stat` effect from naming the player's `coins` with `of: 'staff:ana'`. It gives Ana a `coins` of her own, which nothing shows. The [content checker](/docs/reference/checks) reports a stat named on the wrong owner, so run it.

#### Setting a stat

```ts
// In rules.onTurn, through apply: wake up with a full tank, whatever the ceiling is today.
effects: [{ kind: 'stat', stat: 'energy', to: 9999 }]
```

With `to` in place of `by`, the stat is set to `to`, held to its declared range. Use it for energy back to full overnight, or a mood reset at the start of a day. [`rules.onStat`](/docs/reference/rules#onstat) is called as for `by`, with `by` being the change it made (`to` held to range, minus the value before). With `of`, it sets an [entity](/docs/reference/entities)'s stat: `{ kind: 'stat', stat: 'morale', to: 80, of: 'staff:ana' }`.

### custom

```ts
{ kind: 'custom', name: 'loyalty/stamp' }
{ kind: 'custom', name: 'quests/start', with: { quest: 'letter' } }
```

Runs a [plugin](/docs/reference/plugins)'s effect by its full name, or one of the game's own [custom effects](/docs/reference/custom#effects), on the state the effects before it left. `with` is passed as its arguments, or `{}` when left out. A name that neither the game nor its plugins has does nothing.

In a data scene choice, an activity or a trigger, write the short form, `{ custom: 'loyalty/stamp' }`, or shorter still, [`{ 'loyalty/stamp': true }`](/docs/reference/custom#plugincall). [`buildEffects`](/docs/reference/custom#buildeffects) turns either into this one.

**Gotcha.** The [content checker](/docs/reference/checks) checks the name in every form, as `no plugin effect named "…"` for the long form and `no custom effect named "…"` for the others, wherever the effect is data. [`rules.onTurn`](/docs/reference/rules#onturn) is a function, so nothing checks a name it applies, and a typo there silently does nothing.

### storylineKv

```ts
{ kind: 'storylineKv', storyline: 'ava', key: 'lentBook', to: true }
```

```ts
{ kind: 'storylineKv', storyline: 'ava', key: 'visits', by: 1 }
```

Sets a key in a [storyline](/docs/reference/storylines)'s own kv store `to` a value, or changes its number `by` an amount, as [`kv`](#kv) does. Read it back with [`{ storylineKv }`](/docs/reference/conditions#storylinekv), with a range for a number.

A storyline doesn't keep score of how well someone likes the player. Keep that as a stat on the [cast](/docs/plugins/cast#each-one-is-an-entity)'s characters: `{ kind: 'stat', stat: 'friendship', by: 5, of: character('ava') }`.

### kv

```ts
{ kind: 'kv', key: 'hadCoffee', to: true }
{ kind: 'kv', key: 'coffeesBought', by: 1 }
```

Sets a key in the [kv store](/docs/reference/state#kv) `to` a value, or changes its number `by` an amount. A key that isn't a number yet (unset, text or `true`) counts as 0, so the first `by: 1` makes it 1. Test a count with a [range](/docs/reference/conditions#kv), such as `{ kv: 'coffeesBought', gte: 3 }`.

With `of`, both forms set a key in an [entity](/docs/reference/entities)'s kv store instead, as in `{ kind: 'kv', key: 'role', to: 'cook', of: 'staff:ana' }`, or `of: '$'` inside an [`each`](#each). Read it back with [`{ kv, of }`](/docs/reference/conditions#kv). If the entity isn't there, the effect does nothing.

**Gotcha.** `by` has no bounds here. Unlike a [stat](#stat), the number isn't held to any range, and a negative `by` can take it below 0.

### scene

```ts
{ kind: 'scene', scene: 'ava.hi' }
{ kind: 'scene', scene: null }
```

Puts a scene on screen, or closes it with `null`. The id isn't checked when the effect runs, but the [content checker](/docs/reference/checks) checks it. Only the scene left on screen at the end of the command counts as [seen](/docs/reference/state#seen).

#### Drawing a storylet

```ts
{ kind: 'scene', from: 'cafe' }
{ kind: 'scene', from: 'cafe', otherwise: 'cafe.quiet' }
```

With `from` instead of `scene`, it draws a [storylet](/docs/reference/storylets): one of the scenes whose `drawnFrom` names `from` and whose `when` holds, picked by their `weight`, and puts it on screen. If none can be drawn, it puts `otherwise` on screen, and with no `otherwise` it leaves the screen as it was.

The draw is seeded by the save, the turn and a count of draws from that set, kept in the kv key `storylet:<from>`, so the same save always draws the same scene and [`replay`](/docs/reference/runner#replay) draws it again. See [Storylets](/docs/reference/storylets) for the details and the checks.

The engine has no effect that moves the player. The [places plugin](/docs/plugins/places) keeps track of places, and its [`places/move`](/docs/plugins/places#effects) effect, written `moveTo('park')`, puts the player somewhere at once. In a plain-effect list, such as a plugin's `effectsOf`, write it in the long form: `{ kind: 'custom', name: 'places/move', with: { location: 'park' } }`.

### phase

```ts
{ kind: 'phase', to: 'open' }
```

Moves the game `to` another [stage](/docs/reference/state#phase). It's typically on the last choice of an intro.

### closeStoryline

```ts
{ kind: 'closeStoryline', storyline: 'ava', turns: 2 }
```

Closes a storyline until `turns` [turns](/docs/reference/state#turn) from now, by setting its [`closedUntil`](/docs/reference/state#storylines) to the current turn plus `turns`. While it's closed, [`{ storyline: 'ava' }`](/docs/reference/conditions#storyline) stops holding. A [cast](/docs/plugins/cast) character who belongs to it is still in the room, but the player can't talk to them or call them. Nothing on the storyline is lost. In a game whose turn is a day (the [calendar](/docs/plugins/calendar#what-a-turn-is)'s default), `turns: 2` is the day after tomorrow.

### turn

```ts
{ kind: 'turn' }
{ kind: 'turn', by: 3 }
```

Ends the turn `by` times, or once when `by` is left out. Each time, the [turn](/docs/reference/state#turn) counter goes up by one and [`rules.resets`](/docs/reference/rules#resets) are written. Then [`rules.onTurn`](/docs/reference/rules#onturn) runs, then each plugin's [`onTurn` hook](/docs/reference/plugins#hooks-and-providers). See [The end of a turn](/docs/reference/rules#the-end-of-a-turn).

The engine keeps no time of day, so this effect is how a turn ends, whether a turn is a chapter of a novel or a week of running the café. Put it on the choice that closes a chapter. A plugin can end turns the same way. The [calendar](/docs/plugins/calendar#what-a-turn-is)'s `pass` and `sleep` end one at each day they cross, and its `onTurn` hook moves its clock on when this effect ends one.

```ts
{ id: 'lock-up', effects: [{ kind: 'turn' }, { kind: 'scene', scene: 'cafe.monday' }] }
```

**Gotchas.**
- Here `rules.onTurn`'s `before` is the state as the effect found it, not the state before the command.
- A `turn` effect run while a turn is ending does nothing, so a turn's rules can never end another turn. That covers anything the game's [`rules.onTurn`](/docs/reference/rules#onturn) or a plugin's `onTurn` hook applies.
- A `by` of 0 or less does nothing.

### create

```ts
{ kind: 'create', of: 'staff', entity: { name: 'Dev', stats: { skill: 2, wage: 8, morale: 80 } } }
{ kind: 'create', of: 'staff', entity: { id: 'cleo', name: 'Cleo' } }
{ kind: 'create', like: 'food:cake', at: 'you', entity: { stats: { fresh: 3 } } }
```

Adds an [entity](/docs/reference/entities) of kind `of`, after the ones already there. The save keeps a record of it with what `entity` gives:

```ts
type CreatedEntity = {
  id?: string
  name?: string
  desc?: string
  image?: string
  tags?: string[]
  traits?: Record<string, unknown>
  stats?: Record<string, number>
  kv?: Record<string, KvValue>
}
```

Its `desc` is read like a declared entity's, with tokens filled in, and its `image` goes through [`artSrc`](/docs/reference/prose#artsrc). Every other stat of its kind reads as that stat's `start`.

A thing made in play this way is how a game keeps notes, photos or letters. The phone's camera makes a photo the player keeps:

```ts
{ kind: 'create', of: 'photo', entity: { id: 'ava', name: 'Ava at work', image: 'photo/ava.svg' }, at: 'player' }
```

The phone's gallery lists the `photo` things you hold, and `{ count: { of: 'photo', at: 'you' } }` asks whether you have any. See [Notes, photos and other things made in play](/docs/reference/entities#notes-photos-and-other-things-made-in-play).

With `like`, the new entity is [made like](/docs/reference/entities#things-made-like-another) another, and reads whatever it isn't given from that one: name, description, picture, tags, stats, kv and traits. Its kind is the `like`'s if `of` is left out, and `entity` can be left out altogether. `like` names an entity your content declares.

With `at`, it's given to a [holder](/docs/reference/entities#holding-things) once made: one holder for one of it, or how many each holder has, such as `{ 'place:larder': 6 }`.

Without `id`, it gets the next free number of its kind (`#1`, `#2` and so on), recorded in [`state.created`](/docs/reference/state#created). A number is never given again, even once the entity that had it is [removed](#remove). With `id`, it gets that id, unless an entity of that kind already has it. In that case the effect does nothing, and the entity there keeps its name and numbers. An id the game declares counts as taken, unless that entity was removed: then it comes back, with the name the `create` gives.

This choice, from the café's interviews, hires someone:

```ts
choices: [
  { id: 'dev', effects: [{ kind: 'create', of: 'staff', entity: { name: 'Dev', stats: { skill: 2, wage: 8, morale: 80 } } }, { kind: 'scene', scene: null }] },
  { id: 'fen', effects: [{ kind: 'create', of: 'staff', entity: { name: 'Fen', stats: { skill: 7, wage: 18 } } }, { kind: 'scene', scene: null }] },
]
```

**Gotchas.**
- The id it was given isn't handed back. To refer to someone created without an id, go through them all with [`each`](#each) or [`entitiesOf`](/docs/reference/entities#entitiesof), or give an `id` of your own.
- An `id` that's a whole number, such as `'7'`, does nothing, as one that's already taken does. It would otherwise jump to the front of the kind's order. See [Ids](/docs/reference/entities#ids).
- `entity.stats` is taken as written, not held to range, until an effect next moves it.
- The [content checker](/docs/reference/checks) reports a kind the game doesn't declare, a `like` it doesn't declare or of another kind than `of`, and a holder in `at` that can't hold things.

### remove

```ts
{ kind: 'remove', entity: 'staff:ana' }
{ kind: 'each', of: 'staff', where: { stat: 'morale', of: '$', lt: 20 }, effects: [{ kind: 'remove', entity: '$' }] }
```

Takes an [entity](/docs/reference/entities) out of the game, with what the save kept about it. It does nothing if the entity isn't there. Its id isn't given to anyone created later.

An entity the game declares is also recorded in [`state.removed`](/docs/reference/state#removed). A declared entity is in the game unless it's recorded there, so that's what keeps it gone, in this save and when it [loads](/docs/reference/entities#entities-in-old-saves) again. An entity created in play isn't recorded: once its record goes, it's gone.

Nobody holds it any more, and what it [held](/docs/reference/entities#holding-things) goes to whoever held it. If nobody did, what it held goes with it. If it was the [protagonist](/docs/reference/entities#protagonists-you-and-player) being played, `'you'` is the player again.

### each

```ts
{ kind: 'each', of: 'staff', effects: [{ kind: 'stat', stat: 'morale', by: -8, of: '$' }] }
{ kind: 'each', of: 'staff', where: { stat: 'morale', of: '$', lt: 20 }, effects: [{ kind: 'remove', entity: '$' }] }
{ kind: 'each', at: 'you', of: 'food', effects: [{ kind: 'stat', stat: 'fresh', by: -1, of: '$' }] }
```

Runs `effects` once for every [entity](/docs/reference/entities) of kind `of`, in the order they arrived, with `'$'` standing for the current one each time. With `where`, it only runs for those the condition holds for, with `'$'` again standing for the current one. Use it for upkeep, wages, a bad week, or everyone who quits.

It picks what it runs over as a [`Select`](/docs/reference/entities#select) does. `at` runs it over what a [holder](/docs/reference/entities#holding-things) holds (once for each thing, however many of it), and `tag` and `trait` narrow it further. With no `of`, it runs over every kind.

- **Who it runs for is fixed before it starts.** One created along the way isn't visited, and one removed along the way by an earlier entity's effects is skipped.
- **`where` is tested on the state as it is when each entity comes up**, after the effects for the ones before it.
- **`effects` are built for each entity in turn**, with `'$'` bound, against the state as it is then. They can be anything content can write, a `{ custom }` effect included. A custom effect sees the state after the entities before it, not the state the list started from. To tell it which entity it's working on, pass `with: { of: '$' }`. Every `of: '$'` inside is replaced, a `with` included, so the function gets `args.of` as `'staff:ana'`.
- **A nested `each`**, or a [`{ count }`](/docs/reference/conditions#count) in `where`, binds its own `'$'`. See [EntityRef](/docs/reference/entities#entityref).

An effect inside that doesn't name `'$'` still runs once per entity. `{ kind: 'stat', stat: 'coins', by: -10 }` in an `each` over three members of staff takes 30 coins.

The [content checker](/docs/reference/checks) looks inside an `each`, with `'$'` standing for one of its kind, so a stat named on `'$'` has to belong to that kind.

### entity

```ts
{ kind: 'entity', entity: 'food:apple', by: 2 }                       // two more apples for you
{ kind: 'entity', entity: 'food:apple', at: 'place:larder', to: 6 }   // the larder restocked
{ kind: 'entity', entity: 'gift:scarf', at: 'character:ava', to: 1 }  // Ava has the scarf now
```

Changes how many of a thing a [holder](/docs/reference/entities#holding-things) holds, `by` an amount or `to` a count. `at` is `'you'` if left out: the [protagonist](/docs/reference/entities#protagonists-you-and-player) being played, or the player. It never goes below 0. A unique thing's count is 0 or 1, and giving it to one holder takes it from whoever had it.

It does nothing if the thing isn't in the game, or the holder can't hold things: one that isn't there, or an entity whose kind isn't [unique](/docs/reference/entities#kinddef). Nor does it put a thing inside itself. [`give`](/docs/reference/entities#give-take-move-and-holding) and `take` write it with `by`.

### move

```ts
{ kind: 'move', entity: 'food:apple', to: 'character:ava', by: 1 }    // hand Ava an apple
{ kind: 'move', entity: 'food:bread', from: 'place:larder', to: 'you' }
{ kind: 'move', entity: 'gift:scarf', to: 'gift:box' }               // wrap it
```

Moves a thing from one [holder](/docs/reference/entities#holding-things) `to` another. `from` is where it comes from: if it's left out, a unique thing moves from wherever it is, and anything else from `'you'`. `by` is how many: all there is, if left out. It moves at most what `from` holds, so asking for 10 apples from someone with 2 moves 2.

It does nothing when `to` can't hold things, when `from` and `to` are the same, or when the thing would end up holding itself, however far round: a box can't go into the scarf it holds. The [content checker](/docs/reference/checks) reports a `to` that names the thing itself.

**Gotcha.** Here `to` names a holder, not a value to set, as in every effect that names two places. [`move`](/docs/reference/entities#give-take-move-and-holding) writes it.

### you

```ts
{ kind: 'you', to: 'character:sam' }   // play as Sam
{ kind: 'you', to: null }              // back to the player
```

Switches who `'you'` is: the [protagonist](/docs/reference/entities#protagonists-you-and-player) being played, a unique entity, kept in [`state.you`](/docs/reference/state#you). `to: null`, or `'player'`, goes back to the player. It does nothing for an entity that isn't there or can't hold things. A game with one protagonist never needs it.

### notify

```ts
{ kind: 'notify', id: 'rent', title: 'Rent is due on Friday', text: 'notice.rent', tag: 'money' }
```

Raises a [notice](/docs/reference/notices), which is something the game tells the player outside a scene. `title` is written out, `text` is a prose key for more words, and `tag` groups notices for badges. A notice with the `id` of an earlier one replaces it as the newest, unseen. With no `id`, one is made up. Only the newest [`NOTICES_KEPT`](/docs/reference/notices#notices_kept) are kept.

### audio

```ts
{ kind: 'audio', channel: 'music', to: 'radio' }
```

Puts a background [channel](/docs/reference/audio#channels) `to` a track or playlist and keeps it in the save, in `state.audio.channels`. It plays over the place's audio and the game's default, but an open scene that names the same channel still wins while it's open. See [what plays on a background channel](/docs/reference/audio#what-plays-on-a-background-channel).

- **`to: null`** silences the channel, place and default included.
- **Leave `to` out** to hand the channel back, so the place's audio or the game's default plays again.

```ts
{ kind: 'audio', channel: 'music', to: null }  // the music stops
{ kind: 'audio', channel: 'music' }            // back to whatever the flat or the default plays
```

The loader reports an unknown track or channel, a cue channel such as `sfx`, and a sound effect's track put on a background channel.

### sound

```ts
{ kind: 'sound', track: 'knock' }
```

Plays a [track](/docs/reference/audio#trackdef) once, on its own channel (`sfx` unless the track says otherwise). The state keeps the last 20 in `state.audio.cues`, each with a running count, and [`view.audio.cues`](/docs/reference/audio#sounds-and-voices) gives each a key so a player plays it once. The loader reports an unknown track, a playlist, and a track on a background channel.

### minigame

```ts
{ kind: 'minigame', minigame: 'arrows' }
```

Starts a [minigame](/docs/reference/minigames) in its `start` state, with its variables at their starting values. A minigame already running is dropped. Until it ends, the view draws it over the scene or the room, and every command but its own (and `dismiss` and `setting`) is refused with `Finish this first.`

It also adds 1 to the kv key `minigame:<id>`, which counts how many times the minigame has started. The [content checker](/docs/reference/checks) reports an unknown minigame.

### minigameVar

```ts
{ kind: 'minigameVar', key: 'score', by: 1 }
{ kind: 'minigameVar', key: 'round', to: 0 }
{ kind: 'minigameVar', key: 'arrow', random: [1, 4] }
```

Changes a variable of the [minigame](/docs/reference/minigames#its-variables) being played: sets it `to` a value, changes it `by` an amount, or sets it to a whole number drawn from `random`, both ends included. The draw comes from the save's seed, so it's the same every time the same commands are played. With no minigame running, it does nothing.

The checker reports a variable that no minigame declares in its `vars`, and one a minigame uses but doesn't declare itself.

### panel

```ts
{ kind: 'panel', panel: 'shop', with: { vendor: 'counter' } }
{ kind: 'panel', panel: 'jobs' }
{ kind: 'panel', panel: null }
```

Opens a [panel](/docs/reference/panels) over the story by name, such as a shop's counter or a job board, with what it needs in `with`. A panel already open is replaced, and `panel: null` closes it. The UI decides what each name draws. The shop and jobs plugins write these for you with [`openShop`](/docs/plugins/shop#opening-a-counter) and [`openJobs`](/docs/plugins/jobs#opening-the-job-board).

The panel stays open while the player uses it, and closes when a later command ends a turn or changes the scene. See [How long a panel stays open](/docs/reference/panels#how-long-a-panel-stays-open).

The checker allows any name. A plugin that knows a panel checks its `with`, so the shop reports an unknown vendor. See [Checking a panel](/docs/reference/panels#checking-a-panel).

### roll

```ts
{ kind: 'roll', key: 'skim', dice: '2d6', against: 8 }
{ kind: 'roll', key: 'climb', dice: '1d20', plus: { stat: 'strength' }, against: 12 }
{ kind: 'roll', key: 'ducks', dice: { count: 1, sides: 6 }, plus: 2 }
```

Throws dice and keeps the total in the [kv store](/docs/reference/state#kv) under `key`, so `{ kv: 'skim', gte: 8 }` tests it and `{{skim}}` prints it in prose. The roll itself is recorded too: the [`roll` condition](/docs/reference/conditions#roll) reads whether it passed, and [`view.rolls`](/docs/reference/view#rolls) gives a UI the faces to show.

- **`dice`** is notation, `'2d6'`, `'1d20'`, `'d100'` or `'2d6+1'`, or an object, `{ count: 2, sides: 6 }`. A notation's `+1` or `-1` is added to the total.
- **`plus`** adds a number, or the player's stat as [`statValue`](/docs/reference/stats#statvalue) reads it (modifiers included): `plus: { stat: 'strength' }`.
- **`against`** is a target. The roll passes when the total reaches it, so `2d6` against 8 passes on 8 or more.

A roll is a critical when every die shows its top face (`'max'`) or every die shows 1 (`'min'`). On one die, that's a natural 20 or a natural 1 on a d20. A critical doesn't change whether a roll passed. Test it with the condition's `critical` if your game says a natural 20 always succeeds.

Each die is drawn from the save's seed, the turn, the save's count of rolls so far, the key and the die's place. The count goes up with every roll, so two rolls in one command differ and trying again in the same turn rolls afresh. A replay of the same commands makes the same rolls, and reloading a save and trying again gives the same result. See [Dice rolls](/docs/reference/rolls).

The [content checker](/docs/reference/checks#in-an-effect) reports dice it can't read, a die with fewer than 2 sides, more than 100 dice, a key that `{{key}}` couldn't print, a `plus` that isn't a number or `{ stat }`, an unknown stat, and an `against` that isn't a number. Dice it can't read roll nothing.

## Computed effects

Most effects are fixed data. When one has to be worked out from the state, such as "one more than the counter is now" or "the next stage of this ladder", declare a custom effect on the game and name it in the content:

```ts
type CustomEffect = (state: GameState, args: PluginArgs, context: CustomContext) => EffectRef[]
type EffectRef = Effect | { custom: string; with?: Record<string, unknown> } | PluginCall
```

```ts
import type { Custom } from '@ifloom/engine'

// goes on the game as `custom`
const custom: Custom = {
  effects: {
    bumpVisits: (state, args) => {
      const now = Number(state.storylines.ava?.kv.visits ?? 0)
      return [{ kind: 'storylineKv', storyline: 'ava', key: 'visits', to: now + Number(args.by ?? 1) }]
    },
  },
}
```

```ts
effects: [{ custom: 'bumpVisits', with: { by: 1 } }, { kind: 'scene', scene: null }]
```

A custom effect runs in its turn. Its function is called with the state the effects before it left, and what it returns applies there and then. It can return anything content can write: plain effects, a plugin's effect such as `{ 'quests/start': { quest: 'letter' } }`, or another of the game's own custom effects, which runs in its turn too. `with` is passed as `args`, or `{}` when left out. Your [content](/docs/reference/loader#content) can ship custom effects in its `custom.effects`. See [Custom functions](/docs/reference/custom) for the other kinds.

You write a [plugin](/docs/reference/plugins)'s effect the same way, with the plugin's id in front: `{ custom: 'quests/start', with: { quest: 'letter' } }`, or in [short](/docs/reference/custom#plugincall), `{ 'quests/start': { quest: 'letter' } }`. Either kind becomes a [`custom`](#custom) effect that runs in its turn. See [Effects run in order](/docs/reference/plugins#effects-run-in-order).

**Gotchas.**
- `{ custom }` works in the choices of a [data scene](/docs/reference/scenes#datascene), in an [activity](/docs/reference/actions#activitydef)'s `effects`, in a [trigger](/docs/reference/triggers)'s `effects`, in a thing's [`inventory/usable`](/docs/plugins/inventory) trait, inside an `each`, and in what a custom effect returns. The [shorthand](/docs/reference/custom#plugincall) works in all the same places, and `rules.onTurn`'s `apply` takes either. Neither is a plain `Effect`, so a list that takes only those, such as a plugin's `effectsOf`, needs the long form.
- A button's price, a guard and a lock see a custom effect worked out against the state on screen, before anything applies ([`previewEffects`](/docs/reference/custom#previeweffects)). In play it's worked out again in its turn.
- Custom effects that return custom effects run up to 10 deep. One that names itself, or a loop of them, does nothing past that.
- A name that neither the game nor its plugins declare adds nothing. The [content checker](/docs/reference/checks) reports it.
- To flatten a list yourself, in a custom runtime for example, use [`buildEffects`](/docs/reference/custom#buildeffects).

## See it in an example

- The Corner Café: the `endWeek` activity in [`examples/cafe/src/world/activities.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/cafe/src/world/activities.ts) runs two custom effects, then `each` over the staff to lower their morale, `remove` on anyone below 20, and `{ kind: 'turn' }`. The `hiring` scene's choices `create` new staff.
- The Letter: in [`examples/novel/src/story/`](https://github.com/IFLoom/ifloom/tree/main/examples/novel/src/story), `{ kind: 'kv', key: 'fibs', by: 1 }` counts a lie, and the choices in the first two chapters end with `{ kind: 'turn' }` and a `scene` effect.
- Small Town: in [`examples/showcase/src/story/`](https://github.com/IFLoom/ifloom/tree/main/examples/showcase/src/story), the café's `sit` activity draws a storylet with `{ kind: 'scene', from: 'cafe', otherwise: 'cafe.quiet' }`, the park's `arrows` activity starts a minigame, its `skim` activity rolls two dice against 8, and Ava's choices raise her friendship with `{ kind: 'stat', stat: 'friendship', by: 5, of: character('ava') }`.
