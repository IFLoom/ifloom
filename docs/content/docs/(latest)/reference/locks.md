---
title: "Locks"
description: "Locks that refuse commands while a condition holds, with one line the player reads, for intros, curfews and places off limits."
---
A lock stops the player doing something for a while, and says why. Use one for a stretch of the game with its own limits, such as an intro that only moves through its scenes, or a first night that keeps the player at home. Each lock is data: what it stops, while what holds, and the line the player reads.

```ts
import { lockOn, lockedOut, type Lock, type LockTarget } from '@ifloom/engine/plugin'
```

Locks are content: they go in your content's `locks`, so a mod can add one, and are checked in order. The reducer refuses a command on the first lock that stops it, and the view greys the button out (or hides it) with the same line, so the two can't disagree.

This is the showcase's pair. Moving day only moves through its scene, and the phone stays in the pocket at work:

```ts
import type { Content } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'

// in story/moving-day.ts
export const movingDay: Content = {
  kv: { phase: 'arrival' },
  locks: [{ id: 'moving-day', when: { kv: 'phase', is: ['arrival'] }, deny: ['*'], except: ['choose', 'input'], reason: 'Unpack first.' }],
}

// in story/office.ts
export const office: Content = {
  locks: [{ id: 'no-phone', when: places.at('office'), deny: ['devices/*'], reason: 'Not at work.' }],
}
```

The examples on this page use the [places plugin](/docs/plugins/places), where `go`, `places.move` and `at` come from `@ifloom/plugin-places`.

## Lock

```ts shape
type Lock = {
  id?: string
  when: Condition
  deny: readonly LockTarget[]
  except?: readonly LockTarget[]
  effect?: string
  hide?: boolean
  reason: string
}
```

| Field | What it does |
|---|---|
| `id` | Optional. Names the lock in problems, as `lock <id>`, and lets a pack replace it: a pack's lock with the same `id` takes its place. Your content declares each `id` once. Without one, a pack's locks are added after the ones before. |
| `when` | While this [condition](/docs/reference/conditions) holds, the lock is on. |
| `deny` | What it stops. Name [command](/docs/reference/commands#command) types, `'*'` for every type not in `except`, a [plugin](/docs/reference/plugins) command by its full name (`'places/go'`), or all of one plugin's commands (`'places/*'`). `'custom'` stops every plugin command. |
| `except` | What it never stops, even under `'*'`. It names things the same way as `deny`. |
| `effect` | Only stop commands that would apply this effect. Give a built-in effect's key, such as `'turn'`, or a plugin's effect by its full name, such as `'calendar/pass'` for everything that passes time. What a command would apply comes from [`effectsOf`](/docs/reference/actions#effectsof). |
| `hide` | Leave a stopped button off the screen instead of greying it out. This works for a [places](/docs/plugins/places#the-view) exit, a room's action, one of your content's [actions](/docs/reference/actions#actiondef) and a plugin's [button](/docs/reference/plugins#actions). Scene choices, the [cast](/docs/plugins/cast#personview)'s Talk buttons and buttons a plugin draws elsewhere, such as a [device](/docs/plugins/devices)'s actions, are still greyed out. |
| `reason` | The refusal and the disabled text, written for the player. |

**Gotchas.**
- A lock stops a command wherever it's aimed, so `deny: ['places/go']` stops every journey. To keep the player out of some places and not others, give those places a [`blocked`](/docs/plugins/places#the-location-trait) entry instead.
- A lock with `effect` still only stops what `deny` covers. `deny: ['*']` with `effect: 'turn'` stops every command that would end a turn.
- `effect` only sees what [`effectsOf`](/docs/reference/actions#effectsof) lists, which is an action's cost and effects (and its command's), a choice's effects, and a plugin command's own [`effectsOf`](/docs/reference/plugins#saying-what-a-command-does). The calendar's `sleep` lists a `calendar/pass`, not a `turn`, so `effect: 'turn'` doesn't stop it but `effect: 'calendar/pass'` does.
- A lock that denies `'*'` counts for [`lockedOut`](#lockedout) even when it has an `effect`, so the room shows no exits, people or actions while it's on.
- Locks stop the game's own [`rules.commands`](/docs/reference/rules#commands) too, named `'game/rest'` or `'game/*'`. They never stop `start`.
- A plugin command that sets [`ignoresLocks`](/docs/reference/plugins#commands-outside-the-story) is never stopped by a lock, even under `'*'`, and `hide` never leaves its button off. Only tools outside the story set it, such as the [debug plugin](/docs/plugins/debug)'s commands. [`lockOn`](#lockon) still reports the lock that matches it. It's [`whyNot`](/docs/reference/actions#whynot) that skips it.
- The [`setting`](/docs/reference/commands#setting) command is never stopped by a lock either, because changing a setting is the menu's business.
- `hide` goes by the first lock that stops the command. If a lock without `hide` stops a button first, the button stays on screen greyed out, even if a later lock would hide it.
- `when` is tested against the state before the command runs. A choice that sets the kv key `phase` is judged by the phase it was picked in.
- An action is the command `action`, so `deny: ['action']` stops every action with a cost, effects or `once`, the game's and the plugins' alike. A plugin's action, such as `{ type: 'action', id: 'places/coffee' }`, is the plugin's too, so `'places/*'` stops it as it stops the plugin's commands. A single name such as `'places/go'` names a command, never an action. An action that only sends a command is that command, so a lock on the command stops its button.

### LockTarget

```ts shape
type LockTarget = Command['type'] | '*' | `${string}/${string}`
```

What `deny` and `except` can name. A plugin command's type is always `custom`, so a lock names it by its full name, or names the whole plugin with `/*`:

```ts fragment
// No phone at work: every command of the devices plugin, while the player is in the office.
{ when: places.at('office'), deny: ['devices/*'], reason: 'Not at work.' }
```

## lockOn

```ts shape
function lockOn(state: GameState, game: Game, command: Command): Lock | undefined
```

The first lock in `game.locks` that stops this command right now, or `undefined`.

## lockedOut

```ts shape
function lockedOut(state: GameState, game: Game): boolean
```

True while a lock that denies `'*'` is on. The player is then in a stretch that only moves through its scenes, and the view shows no exits, no people and no actions, whatever `except` allows.

A curfew isn't a lock. Stopping the player from running past dawn is the [calendar plugin](/docs/plugins/calendar#the-guard)'s guard, which gives a warning on a button the player can still see.

## Examples

The showcase, [Small Town](/docs/guide/showcase#locks), uses the pair at the top of this page.

### An intro that only moves through its scenes

The player starts with the kv key `phase` at `arrival`, and can only take choices until the last scene sets it to `open`.

```ts fragment
kv: { phase: 'arrival' },
locks: [{ id: 'intro', when: { kv: 'phase', is: 'arrival' }, deny: ['*'], except: ['choose'], reason: 'Not yet.' }],
```

The last choice of the intro:

```ts fragment
effects: [{ kv: 'phase', to: 'open' }, places.move('flat')]
```

In a game with the [calendar](/docs/plugins/calendar), the intro's scenes may need to carry the clock through the night. Build the calendar with `calendar({ curfew: { not: { kv: 'phase', is: 'arrival' } } })` so its curfew doesn't apply during the intro.

### A first night that keeps the player in

On the evening the player moves in, they stay in the flat, and every journey is refused with one line.

```ts
locks: [
  { when: { kv: 'phase', is: 'first-night' }, deny: ['places/go'], reason: 'Stay in tonight.' },
]
```

Every exit shows greyed out with `Stay in tonight.` To keep the player out of the park but let them walk the high street, put the condition on the park itself, as a place's [`blocked`](/docs/plugins/places#the-location-trait) entry. Add `hide: true` for a place that shouldn't be on the map at all:

```ts fragment
{ id: 'park', /* … */ blocked: [{ when: { kv: 'phase', is: 'first-night' }, reason: 'Too far for tonight.' }] }
{ id: 'office', /* … */ blocked: [{ when: { kv: 'phase', is: 'first-night' }, reason: 'Nobody is in yet.', hide: true }] }
```

A lock's `hide` leaves any button off the screen, not only exits. With this lock, late at night every button that does an action, such as Buy a coffee, is gone rather than greyed out, while the exits home still show:

```ts fragment
{ when: { kv: 'lateNight' }, deny: ['action'], hide: true, reason: 'Everything is shut.' }
```

### Nothing that ends the turn

While the café is short-staffed, the player can't do anything in the room that would end the turn, and the button says why. Everything else still works.

```ts
locks: [
  { when: { kv: 'shortStaffed' }, deny: ['action', 'custom'], effect: 'turn', reason: 'Not while the café is this busy.' },
]
```

An action whose effects hold `{ turn: true }` is greyed out with the line, and one without isn't. The lock denies `action` and `custom` rather than `'*'`, because a lock that denies `'*'` empties the room while it's on (see [`lockedOut`](#lockedout)).

### Stopping what passes time

On the first morning, the player should get to work, not spend the morning jogging. Actions that take no time are still allowed. With the [calendar](/docs/plugins/calendar), time passes through its [`calendar/pass`](/docs/plugins/calendar#effects) effect, so a lock on that effect stops only the actions that pass time:

```ts
import { calendar } from '@ifloom/plugin-calendar'

locks: [
  {
    when: { all: [{ kv: 'phase', is: 'first-day' }, calendar.period('morning')] },
    deny: ['action', 'custom'],
    effect: 'calendar/pass',
    reason: 'No time for that. Work starts soon.',
  },
]
```

Buying a coffee takes no time, so it still works. A jog in the park, whose effects hold `calendar.pass(1)`, is greyed out with the line. If you deny `'*'` instead, the room empties (see [`lockedOut`](#lockedout)). Add `'choose'` to stop scene choices that pass time too.

## See it in an example

Small Town: the lock in [`examples/showcase/src/story/moving-day.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/moving-day.ts) keeps moving day to its scene with `deny: ['*']` and `except: ['choose', 'input']`, and the one in [`story/office.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/office.ts) keeps the phone away at the office with `deny: ['devices/*']`. The tests `holds the player in moving day until they unpack` and `keeps the phone in the pocket at work` in [`examples/showcase/tests/showcase.test.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/tests/showcase.test.ts) play both.
