# Locks

A lock stops the player doing something for a while, and says why. Use one for a stretch of the game with its own limits, such as an intro that only moves through its scenes, or a first night that keeps the player at home. Each lock is data: what it stops, while what holds, and the line the player reads.

```ts
import { lockOn, lockedBy, lockedOut, type Lock, type LockTarget } from '@ifloom/engine'
```

Locks go in [`rules.locks`](/reference/rules#locks) and are checked in order. The reducer refuses a command on the first lock that stops it, and the view greys the button out (or hides it) with the same line, so the two can't disagree.

This is the showcase's pair. Moving day only moves through its scene, and the phone stays in the pocket at work:

```ts
import type { GameRules } from '@ifloom/engine'
import { at } from '@ifloom/plugin-places'

const rules: GameRules = {
  locks: [
    { when: { phase: ['arrival'] }, deny: ['*'], except: ['choose', 'input'], reason: 'Unpack first.' },
    { when: at('office'), deny: ['devices/*'], reason: 'Not at work.' },
  ],
}
```

The examples on this page use the [places plugin](/plugins/places), where `go`, `moveTo` and `at` come from `@ifloom/plugin-places`.

## Lock

```ts
type Lock = {
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
| `when` | While this [condition](/reference/conditions) holds, the lock is on. |
| `deny` | What it stops. Name [command](/reference/commands#command) types, `'*'` for every type not in `except`, a [plugin](/reference/plugins) command by its full name (`'places/go'`), or all of one plugin's commands (`'places/*'`). `'custom'` stops every plugin command. |
| `except` | What it never stops, even under `'*'`. It names things the same way as `deny`. |
| `effect` | Only stop commands that would apply this effect. Give a built-in effect's `kind`, such as `'turn'`, or a plugin's effect by its full name, such as `'calendar/pass'` for everything that passes time. What a command would apply comes from [`effectsOf`](/reference/actions#effectsof). |
| `hide` | Leave a stopped button off the screen instead of greying it out. This works for a [places](/plugins/places#the-view) exit, a room's action, a [game action](/reference/game#game) and a plugin's [button](/reference/plugins#buttons). Scene choices, the [cast](/plugins/cast#personview)'s Talk buttons and buttons a plugin draws elsewhere, such as a [device](/plugins/devices)'s actions, are still greyed out. |
| `reason` | The refusal and the disabled text, written for the player. |

**Gotchas.**
- A lock stops a command wherever it's aimed, so `deny: ['places/go']` stops every journey. To keep the player out of some places and not others, give those places a [`locked`](/plugins/places#locationdef) entry instead.
- A lock with `effect` still only stops what `deny` covers. `deny: ['*']` with `effect: 'turn'` stops every command that would end a turn.
- `effect` only sees what [`effectsOf`](/reference/actions#effectsof) lists, which is an activity's cost and effects, a choice's effects, an item's use, and a plugin command's own [`effectsOf`](/reference/plugins#saying-what-a-command-does). The calendar's `sleep` lists a `calendar/pass`, not a `turn`, so `effect: 'turn'` doesn't stop it but `effect: 'calendar/pass'` does.
- A lock that denies `'*'` counts for [`lockedOut`](#lockedout) even when it has an `effect`, so the room shows no exits, people or actions while it's on.
- Locks are checked before [`rules.commands`](/reference/rules#commands), so they also stop commands your game handles itself. They never stop `start`.
- A plugin command that sets [`ignoresLocks`](/reference/plugins#commands-outside-the-story) is never stopped by a lock, even under `'*'`, and `hide` never leaves its button off. Only tools outside the story set it, such as the [debug plugin](/plugins/debug)'s commands. [`lockOn`](#lockon) and [`lockedBy`](#lockedby) still report the lock that matches it. It's [`whyNot`](/reference/actions#whynot) that skips it.
- `hide` goes by the first lock that stops the command. If a lock without `hide` stops a button first, the button stays on screen greyed out, even if a later lock would hide it.
- `when` is tested against the state before the command runs. A choice that changes the phase is judged by the phase it was picked in.

### LockTarget

```ts
type LockTarget = Command['type'] | '*' | `${string}/${string}`
```

What `deny` and `except` can name. A plugin command's type is always `custom`, so a lock names it by its full name, or names the whole plugin with `/*`:

```ts
// No phone at work: every command of the devices plugin, while the player is in the office.
{ when: at('office'), deny: ['devices/*'], reason: 'Not at work.' }
```

## lockOn

```ts
function lockOn(state: GameState, game: Game, command: Command): Lock | undefined
```

The first lock in `rules.locks` that stops this command right now, or `undefined`.

## lockedBy

```ts
function lockedBy(state: GameState, game: Game, command: Command): string | undefined
```

Why this command is stopped, as `lockOn(...)?.reason`, or `undefined`.

```ts
import { lockedBy } from '@ifloom/engine'
import { go } from '@ifloom/plugin-places'

lockedBy(state, town, go('high-street')) // 'Stay in tonight.' on the first night, with the lock in the example below
```

## lockedOut

```ts
function lockedOut(state: GameState, game: Game): boolean
```

True while a lock that denies `'*'` is on. The player is then in a stretch that only moves through its scenes, and the view shows no exits, no people and no actions, whatever `except` allows.

A curfew isn't a lock. Stopping the player from running past dawn is the [calendar plugin](/plugins/calendar#the-guard)'s guard, which gives a warning on a button the player can still see.

## Examples

The showcase, [Small Town](/guide/showcase#locks), uses the pair at the top of this page.

### An intro that only moves through its scenes

The player starts in the `arrival` phase and can only take choices until the last scene sets the phase to `open`.

```ts
rules: {
  locks: [
    { when: { phase: ['arrival'] }, deny: ['*'], except: ['choose'], reason: 'Not yet.' },
  ],
}
```

The last choice of the intro:

```ts
effects: [{ kind: 'phase', value: 'open' }, moveTo('flat')]
```

In a game with the [calendar](/plugins/calendar), the intro's scenes may need to carry the clock through the night. Build the calendar with `calendar({ curfew: { not: { phase: ['arrival'] } } })` so its curfew doesn't apply during the intro.

### A first night that keeps the player in

On the evening the player moves in, they stay in the flat, and every journey is refused with one line.

```ts
locks: [
  { when: { phase: ['first-night'] }, deny: ['places/go'], reason: 'Stay in tonight.' },
]
```

Every exit shows greyed out with `Stay in tonight.` To keep the player out of the park but let them walk the high street, put the condition on the park itself, as a place's [`locked`](/plugins/places#locationdef) entry. Add `hide: true` for a place that shouldn't be on the map at all:

```ts
{ id: 'park', /* … */ locked: [{ when: { phase: ['first-night'] }, reason: 'Too far for tonight.' }] }
{ id: 'office', /* … */ locked: [{ when: { phase: ['first-night'] }, reason: 'Nobody is in yet.', hide: true }] }
```

A lock's `hide` leaves any button off the screen, not only exits. With this lock, late at night every activity button, such as Buy a coffee, is gone rather than greyed out, while the exits home still show:

```ts
{ when: { flag: 'lateNight' }, deny: ['activity'], hide: true, reason: 'Everything is shut.' }
```

### Nothing that ends the turn

While the café is short-staffed, the player can't do anything in the room that would end the turn, and the button says why. Everything else still works.

```ts
locks: [
  { when: { flag: 'shortStaffed' }, deny: ['activity', 'custom'], effect: 'turn', reason: 'Not while the café is this busy.' },
]
```

An activity whose effects hold `{ kind: 'turn' }` is greyed out with the line, and one without isn't. The lock denies `activity` and `custom` rather than `'*'`, because a lock that denies `'*'` empties the room while it's on (see [`lockedOut`](#lockedout)).

### Stopping what passes time

On the first morning, the player should get to work, not spend the morning jogging. Activities that take no time are still allowed. With the [calendar](/plugins/calendar), time passes through its [`calendar/pass`](/plugins/calendar#effects) effect, so a lock on that effect stops just the activities that pass time:

```ts
import { period } from '@ifloom/plugin-calendar'

locks: [
  {
    when: { all: [{ phase: ['first-day'] }, period('morning')] },
    deny: ['activity'],
    effect: 'calendar/pass',
    reason: 'No time for that. Work starts soon.',
  },
]
```

Buying a coffee takes no time, so it still works. A jog in the park, whose effects hold `pass(1)`, is greyed out with the line. If you deny `'*'` instead, the room empties (see [`lockedOut`](#lockedout)). Deny `['activity', 'choose']` to stop scene choices that pass time too.
