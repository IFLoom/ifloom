# Activities and buttons

This page covers two things that work together:

- An activity is something the player does, such as buying a coffee, doing a shift or going for a jog. It's an [`ActivityDef`](#activitydef) in `game.activities`, with a cost, requirements and effects. The [`activity`](/reference/commands#activity) command runs it.
- An action is a button. It's an [`ActionDef`](#actiondef) with a label and one [command](/reference/commands) to send when it's pressed. The command is often `{ type: 'activity', id }`, but it can be any command, such as opening a scene or walking somewhere.

So the café's "Buy a coffee" button is an action whose command runs the `coffee` activity. The game lists its own actions in `game.actions`, and plugins add theirs, such as the [places plugin](/plugins/places#the-buttons)'s room actions.

```ts
import { activityBlocked, activityById, effectsOf, need, payCost, warningOf, whyNot, type ActionDef, type ActivityCost, type ActivityDef, type Requirement } from '@ifloom/engine'
```

## ActivityDef

```ts
type ActivityDef = {
  id: string
  cost?: ActivityCost
  requires?: readonly Requirement[]
  effects?: readonly EffectRef[]
}
```

| Field | What it does |
|---|---|
| `id` | Unique among activities. |
| `cost` | The stats it spends. See [`ActivityCost`](#activitycost). |
| `requires` | [Conditions](/reference/conditions) that must hold, each with the line the player reads when it doesn't. See [`Requirement`](#requirement). |
| `effects` | [Effects](/reference/effects) applied in order after the cost is paid. A `{ custom: name }` entry is a [custom effect](/reference/custom#effects) that's worked out from the state, and a plugin's effect can be written [in short](/reference/custom#plugincall). |

This is the showcase's coffee, with a custom effect added to count the cups:

```ts
import type { ActivityDef, Custom } from '@ifloom/engine'
import { onlyAt } from '@ifloom/plugin-places'

const coffee: ActivityDef = {
  id: 'coffee',
  cost: { stats: { coins: 3 }, reasons: { coins: 'Not even for a small one.' } },
  requires: [onlyAt(['cafe']), { reason: 'One is enough for today.', when: { not: { flag: 'hadCoffee' } } }],
  effects: [{ kind: 'stat', key: 'energy', by: 15 }, { kind: 'flag', key: 'hadCoffee', value: true }, { custom: 'countCoffee' }],
}

// goes on the game as `custom`
const custom: Custom = {
  effects: {
    countCoffee: () => [{ kind: 'flag', key: 'coffees', add: 1 }],
  },
}
```

`coins` and `energy` are stats the game declares. The engine has none of its own (see [Stats](/reference/stats)).

An activity runs anywhere unless a requirement says otherwise. The engine keeps no places, so "only in the café" comes from the [places plugin](/plugins/places)'s [`onlyAt`](/plugins/places#helpers). It's a requirement whose reason is `Not here.` unless you give one.

The engine keeps no time of day either. An activity that takes time says so in its `effects`, with the [calendar plugin](/plugins/calendar)'s [`pass`](/plugins/calendar#effects), as in `effects: [pass(2), ...]`.

**Gotchas.**
- A custom effect sees the state before the cost was paid.
- The [loader](/reference/loader#the-checks) and [`validatePack`](/reference/game#validatepack) check an activity's ids. Neither looks inside a custom effect, and an undeclared one adds nothing.
- The engine adds no button of its own. To let the player wait in any room, declare a `wait` activity and offer it from the game's [`actions`](/reference/game#game), as the showcase does:

```ts
import { pass } from '@ifloom/plugin-calendar'

activities: [{ id: 'wait', effects: [pass(1)] }]
actions: [{ id: 'wait', label: 'Wait a while', command: { type: 'activity', id: 'wait' } }]
```

## ActivityCost

```ts
type ActivityCost = {
  stats?: Record<string, number>
  reasons?: Record<string, string>
}
```

| Field | What it does |
|---|---|
| `stats` | The [stats](/reference/stats) it spends, by id, as in `{ coins: 3, energy: 10 }`. The activity is refused if the player has less of any of them. Write them in the order the button should list them. |
| `reasons` | Refusal lines by stat id, for when this activity should say it differently from the stat. Without one, the player reads the stat's [`lacking`](/reference/stats#lackingline) line. |

The cost shows on the button before it's pressed, as its [`Price`](/reference/view#price).

**Gotcha.** A negative amount pays the player. `{ coins: -5 }` adds 5 coins when the activity runs, and [`effectsOf`](#effectsof) lists it as `{ kind: 'stat', key: 'coins', by: 5 }`. It isn't checked against what the player has, and it isn't shown in the price, so the button gives no hint of it. An amount of 0 does nothing. For a payment the player should see coming in your code, a [`stat` effect](/reference/effects#stat) in `effects` is clearer.

## Requirement

```ts
type Requirement = {
  reason: string
  when: Condition
}
```

One thing that must hold for the activity to run. It's met while `when` [holds](/reference/conditions). `reason` is both the refusal and the button's disabled text. Requirements are checked in order, and the first that fails is the one the player reads.

The reducer refuses on the `requires` list and the view greys the button out with it, so the two can't disagree.

### need

```ts
function need(reason: string, when: Condition): Requirement
```

Shorthand for `{ reason, when }`.

```ts
import { need } from '@ifloom/engine'
import { weekday } from '@ifloom/plugin-calendar'

requires: [
  need('The café is shut on Sundays.', { not: weekday(6) }),
  need('You need a scarf for this.', { item: 'scarf' }),
]
```

For a test worked out from several values, use a [custom condition](/reference/custom#conditions): `need('Not on market day.', { not: { custom: 'marketDay' } })`.

## activityById

```ts
function activityById(game: Game, id: string): ActivityDef | undefined
```

The activity with that id, or `undefined`.

## activityBlocked

```ts
function activityBlocked(state: GameState, game: Game, activity: ActivityDef): string | undefined
```

Why the player can't do this activity right now, or `undefined` if they can. It checks in this order, and the first that fails gives the line:

1. A scene is open: `Finish this first.`
2. A [lock](/reference/locks) stops `{ type: 'activity', id }`: the lock's `reason`.
3. Each requirement in `requires`, in order: its `reason`. The places plugin's [`onlyAt`](/plugins/places#helpers) is one, with `Not here.`
4. Each stat in `cost.stats`, in the order written, that the player has less of than the cost: `cost.reasons[id]`, or the stat's [`lackingLine`](/reference/stats#lackingline).

The [`activity`](/reference/commands#activity) command refuses with this line, and the view uses it as the button's disabled text. You can reword the engine's own lines here (`finishFirst` and `notEnough`) in the [strings table](/reference/strings#refusals). A lock's and a requirement's `reason` are already your game's words.

**Gotcha.** A plugin guard's soft refusal isn't in this list. An activity a plugin warns against, such as one the [calendar](/plugins/calendar#the-guard) says `That would run past dawn.` about, isn't blocked. Its button stays pressable with the line as its `warning`, and the command is refused with it. See [`warningOf`](#warningof).

## payCost

```ts
function payCost(state: GameState, game: Game, cost: ActivityCost): GameState
```

Spends a cost without checking it. Each stat in `cost.stats` goes down by its amount, held to the stat's range by [`clampStat`](/reference/stats#clampstat). The `activity` command calls it after `activityBlocked` has passed. Use it when a command you handle yourself needs to charge the same way.

## ActionDef

```ts
type ActionDef = {
  id: string
  label: string
  command: Command
  when?: Condition
  blocked?: { when: Condition; reason: string }[]
}
```

A button that sends one [command](/reference/commands). The game's own go in [`game.actions`](/reference/game#game). A plugin's [`buttons`](/reference/plugins#buttons) return the same shape, such as the places plugin's room `actions` from its [`LocationDef`](/plugins/places#locationdef).

While no scene is open, the view shows the plugins' buttons first and then the game's. It shows none at all while a [lock](/reference/locks) that denies `'*'` is on (see [`lockedOut`](/reference/locks#lockedout)), and it leaves off any button whose command is stopped by a lock with `hide`.

| Field | What it does |
|---|---|
| `id` | Names the button. The view passes it on as the [`RenderedChoice`](/reference/view#renderedchoice)'s `id`. |
| `label` | The button's text. |
| `command` | What to send when it's pressed. |
| `when` | The button is only on screen while this holds. Without it, it's always there. |
| `blocked` | The button is on screen but greyed out while one of these holds. The first that does gives the disabled text. |

```ts
import type { ActionDef } from '@ifloom/engine'
import { period } from '@ifloom/plugin-calendar'

const actions: ActionDef[] = [
  { id: 'coffee', label: 'Buy a coffee', command: { type: 'activity', id: 'coffee' } },
  {
    id: 'chat',
    label: 'Chat with Ava',
    command: { type: 'scene', id: 'ava.hi' },
    when: { seen: 'intro' },
    blocked: [{ when: period('afternoon'), reason: 'The afternoon queue is out the door.' }],
  },
]
```

### A "go home" button

The engine offers no travel shortcuts of its own. With the [places plugin](/plugins/places), you can add a game action that walks home, so every room offers it:

```ts
import type { Game } from '@ifloom/engine'
import { at, go } from '@ifloom/plugin-places'

const town: Game = {
  // ...
  actions: [
    { id: 'home', label: 'Go home', command: go('flat'), when: { not: at('flat') } },
  ],
}
```

`places/go` only goes to an exit of where the player stands, so further away the button is greyed out with `You cannot get there from here.` For a button that works from anywhere, send an [activity](#activitydef) whose effects hold the plugin's [`moveTo('flat')`](/plugins/places#effects). That doesn't run the plugin's [`arrive`](/plugins/places#placesoptions) option.

### How a button and the reducer agree

The view turns each action into a [`RenderedChoice`](/reference/view#renderedchoice) with [`renderAction`](/reference/view#renderaction):

- Its disabled text is [`whyNot`](#whynot) for its command, the same function the reducer refuses with.
- Its `warning` is [`warningOf`](#warningof), the line the reducer refuses a pressable button with.
- An activity's button carries the activity's cost as its [price](/reference/view#price), along with any notes [plugins' prices](/reference/plugins#prices) add.

A `blocked` entry that holds takes the place of `whyNot`'s line. Use it sparingly, because the reducer doesn't know about it, so a command sent anyway still runs. For a reason the engine already knows, such as a lock or an activity's requirement, leave it to `whyNot`. To keep a button off the screen until it's needed, give it a `when`.

## whyNot

```ts
function whyNot(state: GameState, game: Game, command: Command): string | undefined
```

Why the player can't do this right now, or `undefined` if they can. It answers for every command: activities, choices, items, inputs and plugin commands such as the [cast](/plugins/cast#commands)'s talking and calling. The reducer refuses with this line and the view greys buttons out with it, so the two can't disagree, and every refusal is a sentence a UI can show as it is.

It checks in this order:

1. A [lock](/reference/locks).
2. A refusal from a plugin's [guard](/reference/plugins#guards).
3. The game's own handler in [`rules.commands`](/reference/rules#commands), if it has one for this command type. A string it returns is the refusal, and the built-in checks below don't run.
4. What the command itself needs. The lines for each command are under [Commands](/reference/commands#command).

A plugin command that sets [`ignoresLocks`](/reference/plugins#commands-outside-the-story) skips the first two. The engine's own lines come from the [strings table](/reference/strings), so a game can reword them.

```ts
import { whyNot } from '@ifloom/engine'
import { go } from '@ifloom/plugin-places'
import { talk } from '@ifloom/plugin-cast'

whyNot(state, game, go('cafe'))
// a `locked` reason on the café, such as 'Closed. Opens tomorrow morning.', while it holds
whyNot(state, game, talk('ava'))
// 'Finish this first.' while a scene is open, or 'Ava is not here.' when she's elsewhere
```

## warningOf

```ts
function warningOf(state: GameState, game: Game, command: Command, effects?: readonly Effect[]): string | undefined
```

A warning on a command that can still be pressed, or `undefined`. It's the `reason` of the first soft refusal a plugin's [guard](/reference/plugins#guards) gives, with the plugins asked in the order `game.plugins` lists them. The engine has no warnings of its own. It isn't asked for a plugin command that sets [`ignoresLocks`](/reference/plugins#commands-outside-the-story), or in a game where no plugin has a `guard` or a `price`.

It's kept apart from `whyNot` because it isn't a reason the thing can't be done. A UI shows the line and offers something else, as when the [calendar](/plugins/calendar#the-guard) warns `That would run past dawn.` and the player goes to bed instead.

The view sets it as the button's [`warning`](/reference/view#renderedchoice). Once [`whyNot`](#whynot) has let a command through, the reducer refuses it with the warning, so a warned button never runs. `effects` saves working out the command's effects again when you already have them. Without it, they come from [`effectsOf`](#effectsof).

```ts
import { warningOf } from '@ifloom/engine'

warningOf(state, game, { type: 'activity', id: 'work' })
// 'That would run past dawn.' when the shift would pass the end of the day, from the calendar's guard
```

**Gotcha.** A refusal from `whyNot` comes first. A command that's both refused and warned against is refused with the `whyNot` line.

## effectsOf

```ts
function effectsOf(state: GameState, game: Game, command: Command): Effect[]
```

What a command would apply, worked out before it runs, as plain [effects](/reference/effects). [Plugins' guards and prices](/reference/plugins#guards-prices-and-labels) and [locks with `effect`](/reference/locks#lock) look at this.

| Command | Effects |
|---|---|
| `activity` | First its cost, as a `stat` effect of minus the amount for each stat in `cost.stats`, then its `effects`, with custom ones built as the activity would build them. |
| `choose` | The effects of that choice in the open scene, as it renders now. |
| `use` | The item down by one, then the item's `use` effects. |
| `custom` | The plugin command's [`effectsOf`](/reference/plugins#saying-what-a-command-does), or none if it has none. |
| anything else | None. |

An unknown activity, choice or item, or an item with no `use`, gives none.

```ts
import { effectsOf } from '@ifloom/engine'

// the showcase's { id: 'work', cost: { stats: { energy: 30 } }, effects: [pass(2), { kind: 'stat', key: 'coins', by: 20 }] }
effectsOf(state, game, { type: 'activity', id: 'work' })
// [{ kind: 'stat', key: 'energy', by: -30 },
//  { kind: 'custom', name: 'calendar/pass', with: { value: 2 } },
//  { kind: 'stat', key: 'coins', by: 20 }]
```

**Gotchas.**
- `scene` gives none. Look at the command itself for that. The places plugin's `places/go` and the cast's `cast/talk` give none either, though one moves the player and the other opens a scene. A plugin command such as the calendar's [`sleep`](/plugins/calendar#commands) gives what its own `effectsOf` says.
- It's only the list the command applies directly. What a plugin's effect applies in turn, through its context's [`apply`](/reference/plugins#applying-effects), isn't in it.
