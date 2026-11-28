---
title: "Actions"
description: "An action is something the player does outside a scene's choices, with the cost, blocked and once fields a choice shares."
---
An action is something the player can do outside a scene's choices, such as buying a coffee, doing a shift or waiting a while. Your content declares the game's own in `actions`, and plugins offer theirs, such as a location's actions in the [places plugin](/docs/reference/plugins/places) and an app's in the [devices plugin](/docs/reference/plugins/devices). [State, commands and the view](/docs/explanation/state-and-commands#locks-and-blocked-reasons) explains how refusals work, and [Give the player things to hold and use](/docs/how-to/give-the-player-things) offers actions in a game.

In the showcase: `examples/showcase/src/story/cafe.ts`, whose `coffee` action costs 3 coins and is refused once you've had one today.

```ts
import { actionOf, effectsOf, need, whyNot, type ActionCost, type ActionDef, type Blocked, type ButtonDef, type Once, type Reason } from '@ifloom/engine'
import { actionReferences } from '@ifloom/engine/plugin'
```

## ButtonDef

The fields a scene's [`Choice`](/docs/reference/scenes#choice) and an [`ActionDef`](#actiondef) share, so the two are written and read the same way. Every field is in [`ButtonDef`](/docs/api/engine#buttondef).

When the player chooses a choice or does an action, the engine runs its `command`, then pays its `cost`, then applies its `effects`. A `label` and its `labels` are words in place, with tokens filled in, and the first entry of `labels` whose `when` holds wins over `label`. `tags` reach the [`RenderedChoice`](/docs/reference/view#renderedchoice) for a UI to style or filter by, and the engine gives them no meaning. `irreversible` is a warning the UI shows, and `ui` holds [presentation hints](/docs/reference/ui-hints).

## ActionDef

An action the game declares in `actions`, or a plugin offers, with a choice's fields. Every field is in [`ActionDef`](/docs/api/engine#actiondef).

While no scene is open, each action with a `label` is a button in the room. An action with no label is never rendered, and a choice's `command`, another action or a hotspot does it with `{ type: 'action', id }`. The engine adds no action of its own, so the showcase declares a `wait` action in its content.

| Field | Meaning |
|---|---|
| `id` | The action's id, unique among the game's actions. The view passes it on as the `RenderedChoice`'s `id`, and `[[act:id]]` in a room's prose names it. |
| `when` | The condition the action is offered and done under. Without it, the action is always there. |
| `command` | A [`CommandRef`](/docs/reference/custom#commandref) the action sends before its cost and effects, any command but `choose` and never the action itself. |
| `once` | How often the action can be done, a [`Once`](#once), counted in [`state.chosen`](/docs/reference/state#chosen) under its id. |

Doing an action sends one command, which is the one the runner's log keeps. An action with only a `command` sends that command, so a lock on the command stops it. An action with a cost, effects or `once` sends [`{ type: 'action', id }`](/docs/reference/commands#action), which runs its `command` first.

A plugin's action is named with the plugin's id in front, such as `{ type: 'action', id: 'places/coffee' }`. The engine asks that plugin for it, through its `action` provider or else the actions it offers in this state, so the café's coffee can be bought only while the café's actions are offered.

This is the showcase's coffee, with a [macro](/docs/reference/custom#macros) of the game's own that counts the cups:

```ts
import type { ActionDef } from '@ifloom/engine'

export const coffee: ActionDef = {
  id: 'coffee',
  label: 'Buy a coffee',
  cost: { stats: { coins: 3 }, reasons: { coins: 'Not even for a small one.' } },
  blocked: [{ when: { kv: 'hadCoffee' }, reason: 'One is enough for today.' }],
  effects: [{ stat: 'energy', by: 15 }, { kv: 'hadCoffee', to: true }, { 'game/countCoffee': true }],
}
```

A macro of the game's own in `effects` sees the state before the cost was paid. The [content checker](/docs/reference/checks) checks what an action names, and doesn't look inside the game's code.

## ActionCost

The [stats](/docs/reference/stats) an action spends, by id, with the words for a player who has too little. Every field is in [`ActionCost`](/docs/api/engine#actioncost).

The engine refuses the action when the player has less of any stat in `stats` than it costs. The refusal is the entry in `reasons` for that stat, or else the stat's [`lackingLine`](/docs/reference/stats#lackingline). The view shows the cost on the button before it's pressed, as its [`Price`](/docs/reference/view#price), listing the stats in the order `stats` gives them.

A negative amount pays the player, so `{ coins: -5 }` adds 5 coins. It isn't checked against what the player has and isn't shown in the price, and [`effectsOf`](#effectsof) lists it as `{ stat: 'coins', by: 5 }`. An amount of 0 does nothing.

```ts fragment
cost: { stats: { coins: 3, energy: 10 }, reasons: { coins: 'Not even for a small one.' } }
```

## Blocked

A reason something the player could do is refused for now, while its `when` holds. Every field is in [`Blocked`](/docs/api/engine#blocked).

An action, a scene's choice, a location, a device's app and a job each take a `blocked` list. The engine tests the entries in order, and the first whose `when` holds refuses with its `reason`, which is also the button's disabled text. With `hide: true`, the button leaves the screen while `when` holds, in place of being greyed out. The reducer and the view read the same list, so the two can't disagree.

```ts
import type { Blocked } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'

export const opening: Blocked[] = [
  { when: calendar.weekday(6), reason: 'The café is shut on Sundays.' },
  { when: { kv: 'barred' }, reason: 'Rosa won’t serve you.', hide: true },
]
```

A [lock](/docs/reference/locks) in content's `locks` is the other way to refuse things. A lock covers a rule across many commands, such as a stretch of the game that keeps the player at home, and `blocked` covers a reason that belongs to one thing.

## Reason

The words a player reads when something is refused, written in place or named by key in the [strings table](/docs/reference/strings). Every form is in [`Reason`](/docs/api/engine#reason).

A reason written in place, such as `'Too tired.'`, is the game's own words. `{ string: 'shop/closed' }` names a line of the strings table, so a game rewords it once for every place it's used. The helpers that write a `blocked` entry use this form, such as `places.onlyAt()` with `places/notHere` and `shop.hours()` with `shop/closed`. [`reasonOf`](/docs/reference/strings#reasonof) reads one, and the checker reports `no string named "…"` for a key no table has.

## Once

How often something can be done, once in the whole game or once a turn. Every field is in [`Once`](/docs/api/engine#once).

A choice, an action and a [cheat](/docs/reference/plugins/unlocks#cheatdef) take one as `once`, and a [trigger](/docs/reference/triggers#triggerdef) takes its `per`. `per: 'game'` is spent once it has been done, and `per: 'turn'` is spent until the turn ends. A spent one is refused with `reason`, which shows on its button, or with the engine's `done` string, `Already done.`, when `reason` is left out.

```ts fragment
once: { per: 'turn', reason: 'Once a day is plenty.' }
```

For a wait of more than one turn, leave out `once` and refuse the choice with a `blocked` entry on the [`since`](/docs/reference/conditions#since) condition, counting from the last time it was chosen, as [Rest a scene between visits](/docs/how-to/schedule-daily-work#rest-a-scene-between-visits) shows:

```ts fragment
blocked: [{ when: { since: 'cafe.counter#chat', last: true, lt: 3 }, reason: 'You only just talked.' }]
```

## View

While no scene is open, `view.actions` lists the room's actions, each a [`RenderedChoice`](/docs/reference/view#renderedchoice) made by [`renderAction`](/docs/reference/view#renderaction). It lists the game's own first, then each plugin's, then content's actions with a label. A lock that denies `'*'` empties it (see [`lockedOut`](/docs/reference/locks#lockedout)). The view leaves out an action whose command a lock with `hide` stops, and one whose own `blocked` entry with `hide` holds.

A rendered action's `disabled` text is [`whyNot`](#whynot) for the command it sends, the function the reducer refuses with. Its `warning` is the first soft refusal a plugin's guard gives, on a button the player can still press, and its `price` is the action's cost with the notes plugins' prices add.

To render the room's actions, see [Render the room's actions](/docs/how-to/render/scene#render-the-rooms-actions).

## Functions

### actionOf

Returns the action that `{ type: 'action', id }` does in a state, or `undefined`. Its signature is in [`actionOf`](/docs/api/engine#actionof).

An id with no plugin in front is one of content's `actions`. An id with a plugin's id in front, such as `'places/coffee'`, is that plugin's, from its `action` provider or else the action of that id it offers now.

```ts given
import { actionOf } from '@ifloom/engine'

actionOf(state, game, 'wait')?.label // 'Wait a while'
```

### need

Returns a [`Blocked`](#blocked) entry written the other way round, refused with `reason` unless `when` holds. Its signature is in [`need`](/docs/api/engine#need).

`need(reason, when)` is `{ when: { not: when }, reason }`, for a refusal that reads better as what the action needs.

```ts
import { need, type Blocked } from '@ifloom/engine'

export const scarfNeeded: Blocked[] = [need('You need a scarf for this.', { owned: 'clothing:scarf' })]
```

### whyNot

Returns the line a command is refused with in a state, or `undefined` when it would go ahead. Its signature is in [`whyNot`](/docs/api/engine#whynot).

It answers for every command, actions, choices, inputs and plugin commands included. The reducer refuses with this line and the view greys out buttons with it. It tests a [lock](/docs/reference/locks) first, then a plugin's guard or the game's own [`guard`](/docs/reference/rules#gamerules), then what the command itself needs, whose lines are under [Commands](/docs/reference/commands#command). A plugin command that sets `ignoresLocks` skips the first two, and so does the [`setting`](/docs/reference/commands#setting) command.

For an action, the engine tests in this order and refuses with the first that fails:

1. A scene is open: `Finish this first.`
2. Its `when` doesn't hold: `That is not on offer.`
3. A lock stops `{ type: 'action', id }`: the lock's `reason`.
4. An entry of `blocked` holds: its `reason`.
5. Its `once` is spent: `once.reason`, or `Already done.`
6. A stat in `cost.stats`, in the order written, is short: `cost.reasons[id]`, or the stat's `lackingLine`.
7. Its `command` would be refused: that command's reason.

The engine's own lines come from the [strings table](/docs/reference/strings) (`finishFirst`, `notOnOffer`, `done` and `notEnough`), so a game can reword them.

```ts given
import { whyNot } from '@ifloom/engine'
import { cast } from '@ifloom/plugin-cast'

whyNot(state, game, cast.talk('ava')) // 'Ava is not here.' while she's elsewhere
```

### effectsOf

Returns the effects a command would apply, worked out before it runs. Its signature is in [`effectsOf`](/docs/api/engine#effectsof).

Plugins' guards and prices, and [locks with `effect`](/docs/reference/locks#lock), read it. The game's own macros among the effects are worked out against the state given.

| Kind | Meaning |
|---|---|
| `action` | The effects its `command` would apply, then a `stat` effect of minus the amount for each stat in `cost.stats`, then its `effects`. |
| `choose` | The effects of that choice in the open scene, as it renders now. |
| `custom` | The plugin command's own `effectsOf`, or none when it has none. |
| Any other | None, so `scene` gives none, and an unknown action or choice gives none. |

```ts given
import { effectsOf } from '@ifloom/engine'

effectsOf(state, game, { type: 'action', id: 'places/work' })
// [{ stat: 'energy', by: -30 }, { 'calendar/pass': { by: 2 } }, { stat: 'coins', by: 20 }]
```

### actionReferences

Returns what an action names, for the [content checker](/docs/reference/checks): its conditions, effects, command, reasons and hints. Its signature is in [`actionReferences`](/docs/api/engine-plugin#actionreferences).

A plugin whose content holds actions, as a location's or an app's do, returns these from its `references`, so the checker checks them as it checks the game's own.

```ts
import { actionReferences } from '@ifloom/engine/plugin'

export const named = actionReferences({ id: 'wait', label: 'Wait a while', effects: [{ turn: true }] })
```

## Checks

The [content checker](/docs/reference/checks) checks every action:

| Problem | Cause |
|---|---|
| `no string named "shop/close"` | A `reason` names a key no strings table has. |
| `spends unknown stat "gold"` | `cost.stats` names a stat the game doesn't declare. |
| `an action's command can't be the action itself; give it the effects` | The action's `command` sends the action, and the engine leaves the command out. |

## Caveats

- A plugin guard's soft refusal isn't in the order `whyNot` tests for an action. The button stays pressable with the line as its `warning`, and the engine refuses the command with it.
- `effectsOf` lists only the effects the command applies directly. It leaves out what a plugin's effect applies in turn, and what `places/go` and `cast/talk` do, since neither lists effects.
- `blocked` comes before `cost`, so a player short of energy reads a `blocked` line first when both hold. A `blocked` entry on the stat itself, ahead of the others, puts the energy line first.
