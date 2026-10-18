---
title: "Activities and buttons"
description: "Activities with costs and blocked reasons, game buttons, the order refusals come in, whyNot, warnings and effectsOf."
---
Activities and buttons work together:

- An activity is something the player does, such as buying a coffee, doing a shift or going for a jog. It's an [`ActivityDef`](#activitydef) in `game.activities`, with a cost, the reasons it's refused, and effects. The [`activity`](/docs/reference/commands#activity) command runs it.
- An action is a button. It's an [`ActionDef`](#actiondef) with a label and one [command](/docs/reference/commands) to send when it's pressed. The command is often `{ type: 'activity', id }`, but it can be any command, such as opening a scene or walking somewhere.

So the café's "Buy a coffee" button is an action whose command runs the `coffee` activity. The game lists its own actions in `game.actions`, and plugins add theirs, such as the [places plugin](/docs/plugins/places#the-buttons)'s room actions.

```ts
import { activityBlocked, activityById, effectsOf, need, payCost, warningOf, whyNot, type ActionDef, type ActivityCost, type ActivityDef, type Blocked } from '@ifloom/engine'
```

## ActivityDef

```ts
type ActivityDef = {
  id: string
  cost?: ActivityCost
  blocked?: readonly Blocked[]
  effects?: readonly EffectRef[]
}
```

| Field | What it does |
|---|---|
| `id` | Unique among activities. |
| `cost` | The stats it spends. See [`ActivityCost`](#activitycost). |
| `blocked` | [Conditions](/docs/reference/conditions) that refuse it while they hold, each with the line the player reads. See [`Blocked`](#blocked). |
| `effects` | [Effects](/docs/reference/effects) applied in order after the cost is paid. A `{ custom: name }` entry is a [custom effect](/docs/reference/custom#effects) that's worked out from the state, and a plugin's effect can be written [in short](/docs/reference/custom#plugincall). |

This is the showcase's coffee, with a custom effect added to count the cups:

```ts
import type { ActivityDef, Custom } from '@ifloom/engine'
import { onlyAt } from '@ifloom/plugin-places'

const coffee: ActivityDef = {
  id: 'coffee',
  cost: { stats: { coins: 3 }, reasons: { coins: 'Not even for a small one.' } },
  blocked: [onlyAt(['cafe']), { when: { kv: 'hadCoffee' }, reason: 'One is enough for today.' }],
  effects: [{ kind: 'stat', stat: 'energy', by: 15 }, { kind: 'kv', key: 'hadCoffee', to: true }, { custom: 'countCoffee' }],
}

// goes on the game as `custom`
const custom: Custom = {
  effects: {
    countCoffee: () => [{ kind: 'kv', key: 'coffees', by: 1 }],
  },
}
```

`coins` and `energy` are stats the game declares. The engine has none of its own (see [Stats](/docs/reference/stats)).

An activity runs anywhere unless a `blocked` entry says otherwise. The engine keeps no places, so "only in the café" comes from the [places plugin](/docs/plugins/places)'s [`onlyAt`](/docs/plugins/places#helpers). It's a `blocked` entry that holds anywhere but the café, with the reason `Not here.` unless you give one.

The engine keeps no time of day either. An activity that takes time says so in its `effects`, with the [calendar plugin](/docs/plugins/calendar)'s [`pass`](/docs/plugins/calendar#effects), as in `effects: [pass(2), ...]`.

**Gotchas.**
- A custom effect sees the state before the cost was paid.
- The [content checker](/docs/reference/checks) checks an activity's ids. It doesn't look inside a custom effect, and an undeclared one adds nothing.
- The engine adds no button of its own. To let the player wait in any room, declare a `wait` activity and offer it from the game's [`actions`](/docs/reference/game#game), as the showcase does:

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
| `stats` | The [stats](/docs/reference/stats) it spends, by id, as in `{ coins: 3, energy: 10 }`. The activity is refused if the player has less of any of them. Write them in the order the button should list them. |
| `reasons` | Refusal lines by stat id, for when this activity should say it differently from the stat. Without one, the player reads the stat's [`lacking`](/docs/reference/stats#lackingline) line. |

The cost shows on the button before it's pressed, as its [`Price`](/docs/reference/view#price).

**Gotcha.** A negative amount pays the player. `{ coins: -5 }` adds 5 coins when the activity runs, and [`effectsOf`](#effectsof) lists it as `{ kind: 'stat', stat: 'coins', by: 5 }`. It isn't checked against what the player has, and it isn't shown in the price, so the button gives no hint of it. An amount of 0 does nothing. For a payment the player should see coming in your code, a [`stat` effect](/docs/reference/effects#stat) in `effects` is clearer.

## Blocked

```ts
type Blocked = {
  when: Condition
  reason: string
  hide?: boolean
}
```

Why something the player could do is refused for now. Everything that can be refused takes a `blocked` list of these: an activity, a scene's [choice](/docs/reference/scenes#choice), an [action](#actiondef), a [place](/docs/plugins/places#locationdef), a device's [app](/docs/plugins/devices#appdef) and a [job](/docs/plugins/jobs#jobdef). The entries are checked in order, and the first whose `when` [holds](/docs/reference/conditions) refuses it. Its `reason` is both the refusal and the button's disabled text.

| Field | What it does |
|---|---|
| `when` | Refused while this holds. |
| `reason` | What the player reads, on the greyed-out button and as the refusal. |
| `hide` | Leave the button off the screen while `when` holds, rather than greyed out. |

The reducer refuses an activity on its `blocked` list and the view greys the button out with it, so the two can't disagree.

```ts
import { weekday } from '@ifloom/plugin-calendar'

blocked: [
  { when: weekday(6), reason: 'The café is shut on Sundays.' },
  { when: { kv: 'barred' }, reason: 'Rosa won’t serve you.', hide: true },
]
```

A lock in [`rules.locks`](/docs/reference/locks) is the other way to refuse things. Use a lock for a rule that spans many commands at once, such as a stretch of the game where the player can't leave the house, and `blocked` for a reason that belongs to one thing.

### need

```ts
function need(reason: string, when: Condition): Blocked
```

A `blocked` entry written the other way round: refused with `reason` unless `when` holds. It's `{ when: { not: when }, reason }`, for when it reads better to say what the activity needs.

```ts
import { need } from '@ifloom/engine'

blocked: [need('You need a scarf for this.', { item: 'scarf' })]
```

For a test worked out from several values, use a [custom condition](/docs/reference/custom#conditions): `{ when: { custom: 'marketDay' }, reason: 'Not on market day.' }`.

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
2. A [lock](/docs/reference/locks) stops `{ type: 'activity', id }`: the lock's `reason`.
3. Each entry in `blocked`, in order, whose `when` holds: its `reason`. The places plugin's [`onlyAt`](/docs/plugins/places#helpers) is one, with `Not here.`
4. Each stat in `cost.stats`, in the order written, that the player has less of than the cost: `cost.reasons[id]`, or the stat's [`lackingLine`](/docs/reference/stats#lackingline).

The [`activity`](/docs/reference/commands#activity) command refuses with this line, and the view uses it as the button's disabled text.

Because `blocked` comes before `cost`, a player short of energy is told `Too late for that.` before `Not enough energy.` when both hold. To have the energy line come first, give it a `blocked` entry of its own, ahead of the others, and keep the cost for spending it:

```ts
import type { ActivityDef } from '@ifloom/engine'
import { pass, period } from '@ifloom/plugin-calendar'

const jog: ActivityDef = {
  id: 'jog',
  cost: { stats: { energy: 10 } },
  blocked: [
    { when: { stat: 'energy', lt: 10 }, reason: 'Too tired.' },
    { when: period('night'), reason: 'Too late for that.' },
    { when: { kv: 'jogged' }, reason: 'Once a day is plenty.' },
  ],
  effects: [pass(1), { kind: 'kv', key: 'jogged', to: true }],
}
```

If the activity also costs coins, that's still checked last, so the player hears that they can't afford it only once nothing else stands in the way. You can reword the engine's own lines here (`finishFirst` and `notEnough`) in the [strings table](/docs/reference/strings#refusals). A lock's and a `blocked` entry's `reason` are already your game's words.

**Gotcha.** A plugin guard's soft refusal isn't in this list. An activity a plugin warns against, such as one the [calendar](/docs/plugins/calendar#the-guard) says `That would run past dawn.` about, isn't blocked. Its button stays pressable with the line as its `warning`, and the command is refused with it. See [`warningOf`](#warningof).

## payCost

```ts
function payCost(state: GameState, game: Game, cost: ActivityCost): GameState
```

Spends a cost without checking it. Each stat in `cost.stats` goes down by its amount, held to the stat's range by [`clampStat`](/docs/reference/stats#clampstat). The `activity` command calls it after `activityBlocked` has passed. Use it when a command you handle yourself needs to charge the same way.

## ActionDef

```ts
type ActionDef = {
  id: string
  label: string
  command: CommandRef
  when?: Condition
  blocked?: Blocked[]
}
```

A button that sends one [command](/docs/reference/commands). The game's own go in [`game.actions`](/docs/reference/game#game). A plugin's [`buttons`](/docs/reference/plugins#buttons) return the same shape, such as the places plugin's room `actions` from its [`LocationDef`](/docs/plugins/places#locationdef).

While no scene is open, the view shows the plugins' buttons first and then the game's. It shows none at all while a [lock](/docs/reference/locks) that denies `'*'` is on (see [`lockedOut`](/docs/reference/locks#lockedout)). It leaves off any button whose command is stopped by a lock with `hide`, whose own `blocked` entry with `hide` holds, or whose activity's does.

| Field | What it does |
|---|---|
| `id` | Names the button. The view passes it on as the [`RenderedChoice`](/docs/reference/view#renderedchoice)'s `id`. |
| `label` | The button's text. |
| `command` | What to send when it's pressed: a [command](/docs/reference/commands), or a plugin's in short, as in `{ 'places/go': { id: 'cafe' } }` (see [`CommandRef`](/docs/reference/custom#commandref)). The view shows it in the long form. |
| `when` | The button is only on screen while this holds. Without it, it's always there. |
| `blocked` | The button is on screen but greyed out while one of these holds, or left off with `hide`. The first that does gives the disabled text. See [`Blocked`](#blocked). |

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

The engine offers no travel shortcuts of its own. With the [places plugin](/docs/plugins/places), you can add a game action that walks home, so every room offers it:

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

`places/go` only goes to an exit of where the player stands, so further away the button is greyed out with `You cannot get there from here.` For a button that works from anywhere, send an [activity](#activitydef) whose effects hold the plugin's [`moveTo('flat')`](/docs/plugins/places#effects). That doesn't run the place's [`arrive`](/docs/plugins/places#arrival).

### How a button and the reducer agree

The view turns each action into a [`RenderedChoice`](/docs/reference/view#renderedchoice) with [`renderAction`](/docs/reference/view#renderaction):

- Its disabled text is [`whyNot`](#whynot) for its command, the same function the reducer refuses with.
- Its `warning` is [`warningOf`](#warningof), the line the reducer refuses a pressable button with.
- An activity's button carries the activity's cost as its [price](/docs/reference/view#price), along with any notes [plugins' prices](/docs/reference/plugins#prices) add.

A `blocked` entry that holds takes the place of `whyNot`'s line. Use it sparingly, because the reducer doesn't know about it, so a command sent anyway still runs. For a reason the engine already knows, such as a lock or an activity's own `blocked`, leave it to `whyNot`. To keep a button off the screen until it's needed, give it a `when`.

## whyNot

```ts
function whyNot(state: GameState, game: Game, command: CommandRef): string | undefined
```

Why the player can't do this right now, or `undefined` if they can. It answers for every command: activities, choices, items, inputs and plugin commands such as the [cast](/docs/plugins/cast#commands)'s talking and calling. The reducer refuses with this line and the view greys buttons out with it, so the two can't disagree, and every refusal is a sentence a UI can show as it is.

It checks in this order:

1. A [lock](/docs/reference/locks).
2. A refusal from a plugin's [guard](/docs/reference/plugins#guards).
3. The game's own handler in [`rules.commands`](/docs/reference/rules#commands), if it has one for this command type. A string it returns is the refusal, and the built-in checks below don't run.
4. What the command itself needs. The lines for each command are under [Commands](/docs/reference/commands#command).

A plugin command that sets [`ignoresLocks`](/docs/reference/plugins#commands-outside-the-story) skips the first two, and so does the [`setting`](/docs/reference/commands#setting) command. The engine's own lines come from the [strings table](/docs/reference/strings), so a game can reword them.

```ts
import { whyNot } from '@ifloom/engine'
import { go } from '@ifloom/plugin-places'
import { talk } from '@ifloom/plugin-cast'

whyNot(state, game, go('cafe'))
// a `blocked` reason on the café, such as 'Closed. Opens tomorrow morning.', while it holds
whyNot(state, game, talk('ava'))
// 'Finish this first.' while a scene is open, or 'Ava is not here.' when she's elsewhere
```

## warningOf

```ts
function warningOf(state: GameState, game: Game, command: CommandRef, effects?: readonly Effect[]): string | undefined
```

A warning on a command that can still be pressed, or `undefined`. It's the `reason` of the first soft refusal a plugin's [guard](/docs/reference/plugins#guards) gives, with the plugins asked in the order `game.plugins` lists them. The engine has no warnings of its own. It isn't asked for a plugin command that sets [`ignoresLocks`](/docs/reference/plugins#commands-outside-the-story), for the [`setting`](/docs/reference/commands#setting) command, or in a game where no plugin has a `guard` or a `price`.

It's kept apart from `whyNot` because it isn't a reason the thing can't be done. A UI shows the line and offers something else, as when the [calendar](/docs/plugins/calendar#the-guard) warns `That would run past dawn.` and the player goes to bed instead.

The view sets it as the button's [`warning`](/docs/reference/view#renderedchoice). Once [`whyNot`](#whynot) has let a command through, the reducer refuses it with the warning, so a warned button never runs. `effects` saves working out the command's effects again when you already have them. Without it, they come from [`effectsOf`](#effectsof).

```ts
import { warningOf } from '@ifloom/engine'

warningOf(state, game, { type: 'activity', id: 'work' })
// 'That would run past dawn.' when the shift would pass the end of the day, from the calendar's guard
```

**Gotcha.** A refusal from `whyNot` comes first. A command that's both refused and warned against is refused with the `whyNot` line.

## effectsOf

```ts
function effectsOf(state: GameState, game: Game, command: CommandRef): Effect[]
```

What a command would apply, worked out before it runs, as plain [effects](/docs/reference/effects). [Plugins' guards and prices](/docs/reference/plugins#guards-prices-and-labels) and [locks with `effect`](/docs/reference/locks#lock) look at this. The game's own [custom effects](/docs/reference/custom#effects) among them are worked out against `state`, as [`previewEffects`](/docs/reference/custom#previeweffects) does, so a guard sees what they'd do.

| Command | Effects |
|---|---|
| `activity` | First its cost, as a `stat` effect of minus the amount for each stat in `cost.stats`, then its `effects`, with the game's custom ones worked out against `state`. |
| `choose` | The effects of that choice in the open scene, as it renders now. |
| `use` | The item down by one, then the item's `use` effects. |
| `custom` | The plugin command's [`effectsOf`](/docs/reference/plugins#saying-what-a-command-does), or none if it has none. |
| anything else | None. |

An unknown activity, choice or item, or an item with no `use`, gives none.

```ts
import { effectsOf } from '@ifloom/engine'

// the showcase's { id: 'work', cost: { stats: { energy: 30 } }, effects: [pass(2), { kind: 'stat', stat: 'coins', by: 20 }] }
effectsOf(state, game, { type: 'activity', id: 'work' })
// [{ kind: 'stat', stat: 'energy', by: -30 },
//  { kind: 'custom', name: 'calendar/pass', with: { by: 2 } },
//  { kind: 'stat', stat: 'coins', by: 20 }]
```

**Gotchas.**
- `scene` gives none. Look at the command itself for that. The places plugin's `places/go` and the cast's `cast/talk` give none either, though one moves the player and the other opens a scene. A plugin command such as the calendar's [`sleep`](/docs/plugins/calendar#commands) gives what its own `effectsOf` says.
- It's only the list the command applies directly. What a plugin's effect applies in turn, through its context's [`apply`](/docs/reference/plugins#applying-effects), isn't in it.

## See it in an example

- Small Town: the café's `coffee` activity in [`examples/showcase/src/story/cafe.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/cafe.ts) costs 3 coins and has two `blocked` entries, anywhere but the café and a coffee already today, each with its own reason. The "Wait a while" button is an `ActionDef` in the game's `actions` in [`examples/showcase/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/game.ts).
- The Corner Café: its four buttons are the game's `actions` in [`examples/cafe/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/cafe/src/game.ts), and its `staffLunch` activity in [`examples/cafe/src/world/activities.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/cafe/src/world/activities.ts) costs 25 coins and is blocked when there's nobody to feed.
