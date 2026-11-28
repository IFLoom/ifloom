---
title: "Effects"
description: "Every kind of effect, one change to the state written as data, and applyEffects, which runs a list of them."
---
An effect is one change to the [state](/docs/reference/state), written as plain data. Choices, actions, triggers and timers carry lists of effects, and so does a plugin's content, such as a thing's use in the [inventory plugin](/docs/reference/plugins/inventory). [State, commands and the view](/docs/explanation/state-and-commands#effects-and-conditions-are-data) explains why effects are data, and [Write your own condition, effect or macro](/docs/how-to/write-your-own-condition-or-effect) adds one of the game's own.

In the showcase: `examples/showcase/src/story/`, whose choices and actions change stats, kv keys, scenes and what the player holds.

```ts
import { applyEffects, type CreateFields, type CreatedEntity, type Effect } from '@ifloom/engine'
```

## Effect

A change to the state, told apart by its one key, such as `{ stat: 'coins', by: -4 }`. Every form is in [`Effect`](/docs/api/engine#effect).

The key names what the effect changes and holds its target. `by` changes a number, `to` sets a value, and `of` names whose it is when it isn't the player's. A plugin's effect or the game's own is a [call](#effectcall), whose one key is its full name. Conditions use the same keys, so `{ stat: 'coins', gte: 4 }` asks about the stat that `{ stat: 'coins', by: -4 }` changes. The field decides which one an object is, a condition in `when` and an effect in `effects`.

A list of effects runs in order, each on the state the one before it left. An effect that can't apply does nothing and the rest still run, so an effect never refuses a command. The command around it can refuse first, as a plugin's guard does for a choice that would pass time past dawn (see [`choose`](/docs/reference/commands#choose)).

An effect with no key the engine knows does nothing, and so does one with two, such as `{ stat: 'coins', kv: 'met', by: 1 }`. The [content checker](/docs/reference/checks) reports both. Code narrows an `Effect` by its key with `in`, so inside `if ('stat' in effect)` the field `effect.stat` is the stat's key.

Where an effect takes an [`Amount`](/docs/reference/amounts#amount), the engine works the number out as the effect applies. This list buys lunch, gives the player a sandwich and notes it on Ava's storyline:

```ts
import type { Effect } from '@ifloom/engine'

export const lunch: Effect[] = [
  { stat: 'coins', by: -4 },
  { receive: 'item:sandwich' },
  { kv: 'boughtLunch', of: 'storyline:ava', to: true },
]
```

## CreateFields

The fields a [`create`](#create) effect takes besides its kind. Every field is in [`CreateFields`](/docs/api/engine#createfields).

`like` names a declared entity of the same kind to copy from, `with` gives what the new entity is made with, and `effects` run once it's made, with `'$'` as the new entity, such as `[{ receive: '$' }]` to hand it to someone.

## CreatedEntity

The record a save keeps of an entity made in play, from a `create` effect's `with`. Every field is in [`CreatedEntity`](/docs/api/engine#createdentity).

Its `description` is read as a declared entity's is, with tokens filled in, and its `image` goes through [`artSrc`](/docs/reference/prose#artsrc). A stat of its kind that `stats` leaves out reads as that stat's `start`. `stats` is kept as written, outside the stat's range, until an effect next changes it.

## Effects

Each kind of effect the engine keeps, by the key that tells it apart.

### stat

Adds `by` to a [stat](/docs/reference/stats), or sets it `to` a value, held to the stat's `min` and `max` (0 to 100 unless the stat sets them). Spending and earning both use this effect, since coins, energy and every other number are stats the game declares.

```ts fragment
{ stat: 'fitness', by: 1 }
{ stat: 'energy', to: 100 }
{ stat: 'quality', by: 1, of: 'dish:soup' }
```

After a change to one of the player's stats, [`onStat`](/docs/reference/rules#onstat) sees the state before and after, and can veto or add to it. With `to`, its `by` is the change the effect made. The effect adds to the value the save keeps, which is 0 for a stat the save doesn't have yet. A `stat` effect on a [derived stat](/docs/reference/stats#statdef) does nothing, and the loader reports it.

With `of`, the effect changes an [entity](/docs/reference/entities)'s stat. `of` is an [`EntityRef`](/docs/reference/common#entityref) such as `'staff:ana'`, or `'$'` inside an [`each`](#each). It does nothing when the entity isn't there. `onStat` isn't called for it, and a negative `by` on it is never part of a button's [price](/docs/reference/view#price).

### kv

Sets a key in the [kv store](/docs/reference/glossary#kv) `to` a value, or changes its number `by` an [`Amount`](/docs/reference/amounts#amount). A key that isn't a number yet (unset, text or `true`) counts as 0, so the first `by: 1` makes it 1. `to` is set as written, since text there is a value, not a stat's id. `by` has no bounds, so a negative `by` can take the number below 0.

```ts fragment
{ kv: 'hadCoffee', to: true }
{ kv: 'coffeesBought', by: 1 }
{ kv: 'savings', by: { stat: 'wage' } }
{ kv: 'arrow', random: [1, 4] }
```

With `random`, the key is set to a whole number between the two ends, both included, and each end can be an amount. The engine draws it from the save's seed, so the same commands draw the same number.

Without `of`, the key is the player's. `of` names another kv store, as the [`kv` condition](/docs/reference/conditions#kv) reads it:

- **An entity**, such as `of: 'staff:ana'`, or `of: '$'` inside an `each`. The effect does nothing when the entity isn't there.
- **A storyline**, such as `of: 'storyline:ava'`, its own kv store.
- **The running minigame**, `of: 'minigame'`. The effect does nothing with no minigame running, and the checker reports a key no minigame declares.

```ts fragment
{ kv: 'role', to: 'cook', of: 'staff:ana' }
{ kv: 'visits', by: 1, of: 'storyline:ava' }
{ kv: 'score', by: 1, of: 'minigame' }
```

The stretch of the game the player is in is the player's kv key [`phase`](/docs/reference/state#phase), set as any key is, `{ kv: 'phase', to: 'open' }`.

### scene

Puts a [scene](/docs/reference/scenes) on screen, or closes it with `null`. The engine doesn't check the id as the effect runs, and the content checker does. Only the scene on screen at the end of the command counts as [seen](/docs/reference/state#seen).

```ts fragment
{ scene: 'ava.hi' }
{ scene: null }
{ scene: { from: 'cafe', otherwise: 'cafe.quiet' } }
```

With `{ from }`, it draws a [storylet](/docs/reference/storylets) from the set `from` names, among the scenes whose `when` holds, by their `weight`. When none can be drawn, it puts `otherwise` on screen, and with no `otherwise` it leaves the screen as it was. The draw is seeded by the save, the turn and a count of draws from that set, kept in the kv key `storylet:<from>`, so [`replay`](/docs/reference/runner#replay) draws the same scene.

The engine has no effect that moves the player. The [places plugin](/docs/reference/plugins/places)'s `places.move('park')` writes `{ 'places/move': { location: 'park' } }`, which does.

### closeStoryline

Closes a [storyline](/docs/reference/storylines) until `turns` turns from now, by setting its `closedUntil` to the current turn plus `turns`. While it's closed, [`{ storyline }`](/docs/reference/conditions#storyline) stops holding. A character of the [cast plugin](/docs/reference/plugins/cast) who belongs to it is still here, and the player can't talk to them or call them. The storyline keeps its kv store.

```ts fragment
{ closeStoryline: 'ava', turns: 2 }
```

### turn

Ends the [turn](/docs/reference/state#turn) once with `true`, or `by` times. Each time, the engine moves the counter on, writes content's [`resets`](/docs/reference/rules#resets), and runs the turn hooks in the order [`onTurn`](/docs/reference/rules#onturn) lists. [Turns and time](/docs/explanation/turns-and-time#only-the-turn-effect-ends-a-turn) explains why this effect is the engine's one way to end a turn.

```ts fragment
{ turn: true }
{ turn: { by: 3 } }
```

A `by` of 0 or less does nothing. A `turn` effect applied while a turn is ending does nothing either, so a turn hook can never end another turn. The hooks' `before` is the state as the effect found it, not the state before the command.

### create

Adds an [entity](/docs/reference/entities) of the kind `create` names, after the ones already there, with the [`CreateFields`](#createfields) beside it. The save keeps it as a [`CreatedEntity`](#createdentity). A game keeps notes, photos and letters this way.

```ts fragment
{ create: 'staff', with: { name: 'Dev', stats: { skill: 2, wage: 8, morale: 80 } } }
{ create: 'food', like: 'food:cake', with: { stats: { fresh: 3 } }, effects: [{ receive: '$' }] }
{ create: 'photo', with: { id: 'ava', name: 'Ava at work', image: 'photo/ava.svg' }, effects: [{ receive: '$', to: 'player' }] }
```

With `like`, the new entity reads whatever `with` doesn't give from the one it copies: name, description, picture, tags, stats, kv and traits. Its `effects` run once it's made, with `'$'` as the new entity, the only way to name an entity made without an `id`. They're the place to [`receive`](#receive) it, set its kv keys or note it on a storyline. A `'$'` outside them, such as in `with`, is the `each` or `count` around the `create`, if any.

Without `id`, the entity gets the next free number of its kind (`#1`, `#2` and so on), recorded in [`state.created`](/docs/reference/state#created). The engine never gives a number again, even once its entity is removed. With `id`, it gets that id, unless an entity of that kind already has it, and then the effect does nothing. A declared entity's id counts as taken unless that entity was removed, which brings it back with the name the `create` gives. An `id` that is a whole number, such as `'7'`, does nothing.

The effect doesn't hand back the id it gave. Content reaches the new entity through `effects`, and code through [`each`](#each) or [`entitiesOf`](/docs/reference/entities#entitiesof).

### remove

Takes an [entity](/docs/reference/entities) out of the game, with what the save kept about it. It does nothing when the entity isn't there, and the engine never gives its id to an entity made later.

```ts fragment
{ remove: 'staff:ana' }
{ each: 'staff', where: { stat: 'morale', of: '$', lt: 20 }, effects: [{ remove: '$' }] }
```

A declared entity is also recorded in [`state.removed`](/docs/reference/state#removed), which keeps it gone in this save and when it loads again. An entity made in play has no record left once removed. A receiver forgets a removed entity, so nobody owns it any more. When it was the [protagonist](/docs/reference/glossary#you) being played, `'you'` is the player again.

### each

Runs `effects` once for each [entity](/docs/reference/entities) of the kind `each` names, in the order they arrived, with `'$'` as that entity. With `where`, it runs only for the entities `where` holds for, again with `'$'` as each.

```ts fragment
{ each: 'staff', effects: [{ stat: 'morale', by: -8, of: '$' }] }
{ each: { of: 'food', where: { owned: '$' } }, effects: [{ stat: 'fresh', by: -1, of: '$' }] }
```

In place of a kind, `each` takes a [`Select`](/docs/reference/entities#select), narrowed by `tag`, `trait` and `where`. `where: { owned: '$' }` runs the effects once for each thing someone has, however many of it. A `Select` with no `of` runs over every kind.

- **The list of entities is fixed before the first runs.** One made along the way isn't visited, and one removed by an earlier entity's effects is skipped.
- **`where` is tested as each entity comes up**, after the effects for the ones before it.
- **`effects` are built for each entity in turn**, with every `'$'` replaced, a call's arguments included. A call sees the state the entities before it left, and gets `args.of` as `'staff:ana'` from `with: { of: '$' }`.
- **A nested `each`**, or a [`count`](/docs/reference/conditions#count) in `where`, binds its own `'$'`.

An effect inside that doesn't name `'$'` still runs once per entity, so `{ stat: 'coins', by: -10 }` in an `each` over three staff takes 30 coins. The checker reads the effects with `'$'` as one of the kind, so a stat named on `'$'` has to belong to that kind.

### receive

Gives someone a thing, `by` how many (1 if left out), through the game's [receivers](/docs/reference/entities#receivers), the plugins that keep things. The first receiver in the game's [`receivers`](/docs/reference/content#gamebase) order that claims the thing takes it, so a wardrobe listed first takes clothes and the inventory takes the rest. `via` names one receiver, which takes it whether it claims it or not.

```ts fragment
{ receive: 'food:apple', by: 2 }
{ receive: 'gift:scarf', to: 'character:ava' }
{ receive: 'clothing:shirt', via: 'wardrobe' }
```

`to` names [someone](/docs/reference/entities#someone-and-played), `'player'`, `'you'` or a unique entity, and the receiver that takes the thing chooses when it's left out: the first-party ones give it to the protagonist being played, else the player. `by` is an [`Amount`](/docs/reference/amounts#amount).

It does nothing when no receiver claims the thing, so a game with no plugin that keeps things gives the player things with [kv keys](/docs/how-to/hand-roll-an-inventory) instead, and the checker reports a `receive` there. A purchase or a find that should do more than hand a thing over runs its own effects beside it.

### release

Takes back `by` of a thing (1 if left out) `from` someone, asking each receiver in turn until that many are gone, and never more than there is. `via` asks one receiver only.

```ts fragment
{ release: 'food:apple' }
{ release: 'food:bread', by: 2, from: 'character:ava' }
{ release: 'clothing:shirt', via: 'wardrobe' }
```

`from` names someone, and each receiver chooses when it's left out. The first-party ones take from the protagonist being played, then from the player. Moving a thing between two receivers, or between two people, is a `release` and a `receive` together, or a receiver's own effect, such as the inventory's `inventory/move`.

### you

Sets who [`'you'`](/docs/reference/glossary#you) is, a unique entity kept in [`state.you`](/docs/reference/state#you). `null` or `'player'` goes back to the player. It does nothing for an entity that isn't there or isn't of a unique kind.

```ts fragment
{ you: 'character:sam' }
{ you: null }
```

### notify

Raises a [notice](/docs/reference/notices), a line the game tells the player outside a scene. `notify` is its title and `text` its longer words, both written in place with tokens filled as it's shown, and `tag` groups notices for badges. A notice with the `id` of an earlier one replaces it as the newest, unseen. With no `id`, the engine makes one up. The state keeps the newest 50.

```ts fragment
{ notify: 'Rent is due on Friday', id: 'rent', text: 'Leave it with Rosa at the café.', tag: 'money' }
```

### audio

Sets the background [channel](/docs/reference/audio) `audio` names `to` a track or playlist, kept in the save in `state.audio.channels`. It plays over the location's audio and the game's default, and an open scene that names the same channel still wins while it's open. `to: null` silences the channel. Leaving `to` out hands the channel back to the location's audio or the game's default.

```ts fragment
{ audio: 'music', to: 'radio' }
{ audio: 'music', to: null }
{ audio: 'music' }
```

The loader reports an unknown track or channel, a cue channel such as `sfx`, and a sound effect's track on a background channel.

### sound

Plays a [track](/docs/reference/audio#trackdef) once, on its own channel, `sfx` unless the track names another. The state keeps the last 20 in `state.audio.cues`, each with a running count, so a UI plays each one once. The loader reports an unknown track, a playlist, and a track on a background channel.

```ts fragment
{ sound: 'knock' }
```

### minigame

Starts a [minigame](/docs/reference/minigames) in its `start` state, with its kv at its starting values, and drops any minigame already running. It also adds 1 to the kv key `minigame:<id>`, which counts its starts. Until it ends, the engine refuses every command but the minigame's own, `tick`, `dismiss`, `setting` and `closePanel`, with `Finish this first.`

```ts fragment
{ minigame: 'arrows' }
```

### timer

Starts, stops or changes one of the game's [timers](/docs/reference/timers), by its id in `timers`. Starting a running timer starts it again from the top. `to` sets how long it runs this time in place of its `ms`, and `to: null` stops it without running its effects. `by` adds milliseconds to a running timer, or takes them away down to 0, and does nothing to a timer that isn't running.

```ts fragment
{ timer: 'phone' }
{ timer: 'phone', to: 5000 }
{ timer: 'phone', to: null }
{ timer: 'phone', by: -2000 }
```

A timer at 0 runs out on the next [`tick`](/docs/reference/commands#tick), which stops it and runs its `effects`.

### roll

Throws dice and keeps the total in the kv store under the key `roll` names, so `{ kv: 'skim', gte: 8 }` tests it and `{{skim}}` prints it. The engine records the roll too, for the [`roll` condition](/docs/reference/conditions#roll) and for `view.rolls`. [Dice rolls](/docs/reference/rolls) describes the fields, the notation and how each die is drawn.

```ts fragment
{ roll: 'skim', dice: '2d6', against: 8 }
{ roll: 'climb', dice: '1d20', plus: { stat: 'strength' }, against: 12 }
```

### panel

Opens a [panel](/docs/reference/panels) over the story by name, such as a vendor's counter or a job board, with what it needs in `with`. It replaces any open panel, and `panel: null` closes it. The panel stays open until a later command ends a turn or changes the scene. The UI decides what each name renders, and the checker allows any name, while a plugin that knows the name checks its `with`.

```ts fragment
{ panel: 'shop', with: { vendor: 'counter' } }
{ panel: null }
```

### point

Sends a [flow](/docs/reference/flows) to a point once a choice's `then` is done, in place of carrying on after the decision. The point can be anywhere in the scene, a section or another choice's `then` included. `jump('questions')` writes `{ point: 'questions' }`. It works only as a choice's effect in the scene that has the point, so a flow loops only through a choice. Anywhere else it does nothing, and the loader reports it.

```ts fragment
{ point: 'questions' }
```

### EffectCall

A plugin's effect or the game's own, written as its full name with its arguments as the value, or `true` for none. Every form is in [`EffectCall`](/docs/api/engine#effectcall), and [`PluginCall`](/docs/reference/custom#plugincall) describes the short form.

```ts fragment
{ 'quests/start': { quest: 'letter' } }
{ 'game/payRent': { by: 2 } }
```

The game's own effects are in its [`rules`](/docs/reference/rules), called with `game/` in front, and a plugin's with the plugin's id in front. A call runs in its turn, on the state the effects before it left. A [macro](/docs/reference/custom#macros) returns the effects it stands for, which then apply there, and an [effect](/docs/reference/custom#effects) returns the next state. A name neither the game nor its plugins declare does nothing, and the checker reports it.

## Functions

### applyEffects

Returns the state after a list of effects, run with no command around them. Its signature is in [`applyEffects`](/docs/api/engine#applyeffects).

Nothing is refused, no turn ends unless an effect ends one, and no scene counts as seen. It takes effects in the form content writes them, so a plugin's helper goes straight in. A call to an effect the game doesn't have, such as one from a plugin it leaves out, is skipped.

```ts given
import { applyEffects } from '@ifloom/engine'
import { quests } from '@ifloom/plugin-quests'

const next = applyEffects(state, game, [{ stat: 'coins', by: 5 }, { scene: 'ava.hi' }, quests.start('bread')])
```

## Checks

The [content checker](/docs/reference/checks) checks every effect content writes:

| Problem | Cause |
|---|---|
| `an effect does one thing, but this one has 2 keys that each say what it does: stat, kv` | One object holds two of the engine's keys. |
| `an effect needs one key that says what it does, such as stat or kv, or a call by name; this one has only "at"` | The object holds no key the engine knows. |
| `unknown stat "gold"`, `unknown kind "pet"` | The effect names a stat, kind, scene, timer, track or minigame the game doesn't declare. |
| `no game effect named "game/payRnet"`, `no plugin effect named "quests/finsh"` | A call names an effect nobody declares. |

## Caveats

- A `stat` effect never refuses, so spending 4 coins the player doesn't have leaves them at the stat's `min`. An action's [`cost`](/docs/reference/actions#actioncost) refuses instead.
- A `stat` effect with `of` can name a stat of another owner, such as the player's `coins` on `'staff:ana'`, and gives the entity a stat nothing shows. The checker reports a stat named on the wrong owner.
- A call that `onTurn` or another function applies isn't checked, since the checker can't look inside code, so a typo there does nothing.
