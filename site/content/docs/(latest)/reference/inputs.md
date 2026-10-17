---
title: "Inputs"
---
An input is something the player types or picks, which the engine writes to a key in the [kv store](/docs/reference/state#kv). It might be a name for the cat, the hour the alarm goes off, or their usual order at the café. The game declares each input with what it accepts, and the [`input`](/docs/reference/commands#input) command writes it. The engine checks the value against the declaration, so a UI can't put anything else in.

```ts
import { inputById, inputRefusal, inputValue, type InputDef } from '@ifloom/engine'
```

## A worked example

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'

const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  inputs: [
    // The showcase asks for this on moving day.
    { id: 'catName', label: 'Name your cat', kind: 'text', maxLength: 16, when: { phase: ['arrival'] } },
    { id: 'alarm', label: 'Wake at', kind: 'number', min: 5, max: 10, key: 'wakeAt' },
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

The UI reads what to draw from [`view.inputs`](/docs/reference/view#inputs), and sends what the player entered:

```ts
import { apply, view } from '@ifloom/engine'

view(state, game).inputs.alarm
// { id: 'alarm', label: 'Wake at', kind: 'number', maxLength: null, min: 5, max: 10, options: [], value: null }

state = apply(state, game, { type: 'input', id: 'alarm', to: 7 }).state
state = apply(state, game, { type: 'input', id: 'catName', to: '  Biscuit ' }).state

state.kv  // { wakeAt: 7, catName: 'Biscuit', ... }
```

Prose reads the value back like any kv key, and conditions test it with [`{ kv }`](/docs/reference/conditions#kv), such as `{ kv: 'order', is: 'tea' }`.

A button can send the command with no `to`, as `{ type: 'input', id: 'catName' }`, and the UI asks for the value when it's pressed. If the command arrives without one, it's refused with `Enter something first.`, so the UI must fill the value in before passing it on.

## InputDef

```ts
type InputDef = {
  id: string
  label: string
  kind: 'text' | 'number' | 'choice'
  key?: string
  when?: Condition
  maxLength?: number
  min?: number
  max?: number
  options?: { value: KvValue; label: string }[]
}
```

| Field | What it does |
|---|---|
| `id` | What the `input` command names. |
| `label` | What the field is called, for the UI. |
| `kind` | `'text'`, `'number'` or `'choice'`. |
| `key` | The kv key it writes. The input's `id` if left out. |
| `when` | The input is only on offer while this [condition](/docs/reference/conditions) holds. Otherwise it's left out of the view, and refused with `Not now.` |
| `maxLength` | Text only. The most characters, after trimming. 40 if left out. |
| `min`, `max` | Number only. The range, inclusive. Either may be left out. |
| `options` | Choice only. The values on offer, each with what the player reads. |

Declare inputs in [`Game.inputs`](/docs/reference/game#game), either on the base you give [`loadGame`](/docs/reference/loader#loadgame) or in a [pack](/docs/reference/loader#pack)'s `inputs`, or both. They merge by id with the base's first, so a later pack's input replaces an earlier one with the same id.

## inputRefusal

```ts
function inputRefusal(state: GameState, game: Game, id: string, value: KvValue | undefined): string | undefined
```

Why this value can't be entered, as the player reads it, or `undefined` if it can. [`whyNot`](/docs/reference/actions#whynot) gives this line for an `input` command, after the [locks](/docs/reference/locks) and any hard plugin [guard](/docs/reference/plugins#guards) have had their say. A guard's soft warning still refuses the command when it runs. A game that handles `input` itself in [`rules.commands`](/docs/reference/rules#commands) skips it. These are the lines, in the order they're checked:

| Line | When |
|---|---|
| `There is no such thing to fill in.` | No input has that id. |
| `Not now.` | Its `when` doesn't hold. |
| `Enter something first.` | There's no value. For text, also a value that isn't a string or is only spaces. |
| `Keep it to <n> characters.` | Text longer than `maxLength` after trimming. |
| `Enter a number.` | For a number, a value that isn't a finite number. |
| `Between <min> and <max>.` | A number out of range, with both bounds declared. |
| `At least <min>.` / `At most <max>.` | A number out of range, with only one bound declared. |
| `That is not one of the options.` | For a choice, a value that isn't one of the `options`' values. |

Each line is the engine's English from the [strings table](/docs/reference/strings#input) (`noSuchInput`, `notNow`, `enterSomething`, `tooLong`, `enterNumber`, `between`, `atLeast`, `atMost`, `notAnOption`), and a game can reword it.

```ts
inputRefusal(state, game, 'alarm', 11)  // 'Between 5 and 10.'
```

## inputValue

```ts
function inputValue(input: InputDef, value: KvValue): KvValue
```

The value as it will be written. Text is trimmed, and anything else is left as it is.

## inputById

```ts
function inputById(game: Game, id: string): InputDef | undefined
```

The declaration with that id, or `undefined`.

## Gotchas

- **A number must be sent as a number.** An HTML field gives a string, and `'7'` is refused with `Enter a number.`, so convert it before sending.
- **Choice values are compared exactly.** `1` and `'1'` are different options.
- **An input writes a kv key, not a stat.** To let the player set a number that effects spend, have a choice or activity read the key through a [custom effect](/docs/reference/effects#computed-effects).
- **It works with a scene open.** Inputs aren't refused with `Finish this first.`, so a scene can ask for a name halfway through. To keep an input to one scene, use `when` (for example `{ scene: ['intro'] }`) or a [lock](/docs/reference/locks) that denies `'input'`.
- **The loader checks the declaration.** It reports a `'choice'` input with no options and a `min` above `max`. See [Checking content](/docs/reference/checks).

## See it in an example

- Small Town: [`examples/showcase/src/content/town.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/content/town.ts) asks for the cat's name with the `catName` input, offered only on moving day with `when: { phase: ['arrival'] }`.
- The Letter: [`examples/novel/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/novel/src/game.ts) asks for the reader's name with `playerName` until one is typed, and the first chapter's choices wait for it.
