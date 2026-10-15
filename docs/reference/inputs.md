# Inputs

An input is something the player types or picks, written to a [variable](/reference/state#flags): a name for the cat, the hour the alarm goes off, their usual order at the café. The game declares each one with what it accepts; the [`input`](/reference/commands#input) command writes it; the engine checks the value against the declaration, so a UI cannot put anything else in.

```ts
import { inputById, inputRefusal, inputValue, type InputDef } from '@ifloom/engine'
```

## A worked example

```ts
const core: Pack = {
  id: 'core',
  schema: SCHEMA,
  inputs: [
    { id: 'catName', label: 'Name the cat', kind: 'text', maxLength: 12, when: { flag: 'hasCat' } },
    { id: 'alarm', label: 'Wake at', kind: 'number', min: 5, max: 10, variable: 'wakeAt' },
    {
      id: 'order',
      label: 'Your usual',
      kind: 'choice',
      options: [{ value: 'tea', label: 'Tea' }, { value: 'coffee', label: 'Coffee' }],
    },
  ],
  // ...
}
```

The UI reads what to draw from [`view.inputs`](/reference/view#inputs) and sends what the player entered:

```ts
view(state, game).inputs.alarm
// { id: 'alarm', label: 'Wake at', kind: 'number', maxLength: null, min: 5, max: 10, options: [], value: null }

state = apply(state, game, { type: 'input', id: 'alarm', value: 7 }).state
state = apply(state, game, { type: 'input', id: 'catName', value: '  Biscuit ' }).state

state.flags  // { wakeAt: 7, catName: 'Biscuit', ... }
```

Prose reads the value back like any variable, and conditions test it with [`{ flag }`](/reference/conditions#flag): `{ flag: 'order', is: 'tea' }`.

A button can send the command with no `value` — `{ type: 'input', id: 'catName' }` — and the UI asks for the value when it is pressed. Sent without one, the command is refused with `Enter something first.`, so the UI must fill it in before passing it on.

## InputDef

```ts
type InputDef = {
  id: string
  label: string
  kind: 'text' | 'number' | 'choice'
  variable?: string
  when?: Condition
  maxLength?: number
  min?: number
  max?: number
  options?: { value: FlagValue; label: string }[]
}
```

| Field | What it does |
|---|---|
| `id` | What the `input` command names. |
| `label` | What the field is called, for the UI. |
| `kind` | `'text'`, `'number'` or `'choice'`. |
| `variable` | The variable it writes. The input's `id` if left out. |
| `when` | Only on offer while this [condition](/reference/conditions) holds: left out of the view, and refused with `Not now.`, otherwise. |
| `maxLength` | Text only: the most characters, after trimming. 40 if left out. |
| `min`, `max` | Number only: the range, inclusive. Either may be left out. |
| `options` | Choice only: the values on offer, each with what the player reads. |

Declared in [`Game.inputs`](/reference/game#game): on the base given to [`loadGame`](/reference/loader#loadgame), or in a [pack](/reference/loader#pack)'s `inputs`, or both. They merge by id, the base's first: a later pack's input replaces an earlier one's with the same id.

## inputRefusal

```ts
function inputRefusal(state: GameState, game: Game, id: string, value: FlagValue | undefined): string | undefined
```

Why this value cannot be entered, as the player reads it, or `undefined` if it can. [`whyNot`](/reference/actions#whynot) gives this line for an `input` command, after any [lock](/reference/locks). The lines, in the order they are checked:

| Line | When |
|---|---|
| `There is no such thing to fill in.` | No input with that id. |
| `Not now.` | Its `when` does not hold. |
| `Enter something first.` | No value; or, for text, a value that is not a string or is only spaces. |
| `Keep it to <n> characters.` | Text longer than `maxLength` after trimming. |
| `Enter a number.` | Number: the value is not a finite number. |
| `Between <min> and <max>.` | Number out of range, with both bounds declared. |
| `At least <min>.` / `At most <max>.` | Number out of range, with only one bound declared. |
| `That is not one of the options.` | Choice: the value is not one of the `options`' values. |

Each is the engine's English, from the [strings table](/reference/strings#input) (`noSuchInput`, `notNow`, `enterSomething`, `tooLong`, `enterNumber`, `between`, `atLeast`, `atMost`, `notAnOption`), and a game can reword it.

```ts
inputRefusal(state, game, 'alarm', 11)  // 'Between 5 and 10.'
```

## inputValue

```ts
function inputValue(input: InputDef, value: FlagValue): FlagValue
```

The value as it will be written: text trimmed, anything else as it is.

## inputById

```ts
function inputById(game: Game, id: string): InputDef | undefined
```

The declaration with that id, or `undefined`.

## Gotchas

- **A number must be sent as a number.** An HTML field gives a string; `'7'` is refused with `Enter a number.` Convert it before sending.
- **Choice values are compared exactly.** `1` and `'1'` are different options.
- **An input writes a game variable, not a stat.** To let the player set a number that effects spend, have a choice or activity read the variable through a [custom effect](/reference/effects#computed-effects).
- **It works with a scene open.** Inputs are not refused with `Finish this first.`, so a scene can ask for a name halfway through. Use `when` (for example `{ scene: ['house.cat'] }`) to keep an input to one scene, or a [lock](/reference/locks) denying `'input'`.
- The loader reports a `'choice'` input with no options and a `min` above `max`.
