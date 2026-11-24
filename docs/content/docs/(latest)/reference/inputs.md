---
title: "Inputs"
description: "Reference for InputDef: values the player types or picks, such as a name, checked against their declaration and written to a kv key, with the lines that refuse a value."
---
An input is a value the player types or picks, such as a name for the cat or the hour the alarm goes off, which the engine writes to a key in the [kv store](/docs/reference/glossary#kv). Your content declares each input in `inputs` with what it accepts, and the [`input`](/docs/reference/commands#input) command writes it, so a UI can't store anything the declaration refuses. [Ask the player for a name](/docs/how-to/ask-for-a-name) adds one to a scene.

In the showcase: `examples/showcase/src/story/moving-day.ts`, whose `catName` input is offered only on moving day.

```ts
import type { InputDef } from '@ifloom/engine'
```

## InputDef

A value the game declares in `inputs` for the player to enter, a text, a number or a choice of options. Every field is in [`InputDef`](/docs/api/engine#inputdef).

The input writes the kv key `key`, or its own `id` when `key` is left out. Prose prints the value as `{{catName}}`, and the [`kv` condition](/docs/reference/conditions#kv) tests it, such as `{ kv: 'order', is: 'tea' }`. The engine trims a text value before it checks and writes it, so `'  Biscuit '` is kept as `'Biscuit'`. Inputs merge by id, so a pack's input replaces one with the same id.

| Field | Meaning |
|---|---|
| `when` | A [condition](/docs/reference/conditions). The input is on offer only while it holds. Otherwise the view leaves the input out and the command is refused with `Not now.` |
| `maxLength` | A text input's most characters after trimming, 40 if left out. |
| `min`, `max` | A number input's range, inclusive. Either can be left out. |
| `options` | A choice input's values on offer, each with the label the player reads. The engine compares values exactly, so `1` and `'1'` are different options. |

```ts
import type { InputDef } from '@ifloom/engine'

export const inputs: InputDef[] = [
  { id: 'catName', label: 'Name your cat', type: 'text', maxLength: 16, when: { kv: 'phase', is: ['arrival'] } },
  { id: 'alarm', label: 'Wake at', type: 'number', min: 5, max: 10, key: 'wakeAt' },
  { id: 'order', label: 'Your usual', type: 'choice', options: [{ value: 'tea', label: 'Tea' }, { value: 'coffee', label: 'Coffee' }] },
]
```

A choice or an action can send `{ type: 'input', id: 'catName' }` with no `to`, and the UI asks for the value when it's pressed. The engine refuses the command with `Enter something first.` if it still arrives with no value. The command works with a scene open, so a scene can ask for a name halfway through.

## View

`view.inputs` lists each input on offer now, in declaration order, each an [`InputView`](/docs/api/engine#inputview) with its `label`, `type`, limits, options and the `value` its kv key holds. To render them, see [Render inputs](/docs/how-to/render/scene#render-inputs).

## Strings

An `input` command whose value can't be entered is refused with one of these [strings](/docs/reference/strings#input), checked in this order. [`whyNot`](/docs/reference/actions#whynot) gives the same line after the [locks](/docs/reference/locks) and any plugin's hard guard. A game that handles `input` in [`rules.commands`](/docs/reference/rules) skips them.

| Key | Meaning |
|---|---|
| `noSuchInput` | `There is no such thing to fill in.` when no input has the id. |
| `notNow` | `Not now.` when the input's `when` doesn't hold. |
| `enterSomething` | `Enter something first.` when there's no value, or a text value isn't a string or is only spaces. |
| `tooLong` | `Keep it to <n> characters.` when a text value is longer than `maxLength` after trimming. |
| `enterNumber` | `Enter a number.` when a number input's value isn't a finite number. |
| `between` | `Between <min> and <max>.` when a number is out of range and both bounds are declared. |
| `atLeast`, `atMost` | `At least <min>.` or `At most <max>.` when a number is out of range and only one bound is declared. |
| `notAnOption` | `That is not one of the options.` when a choice's value isn't one of its options. |

```ts given
import { whyNot } from '@ifloom/engine'

whyNot(state, game, { type: 'input', id: 'alarm', to: 11 }) // 'Between 5 and 10.'
```

## Checks

The [content checker](/docs/reference/checks) reports a `choice` input with no options and a number input whose `min` is above its `max`. [`loadGame`](/docs/reference/content#checks) reports an input id that the game's content declares twice.

## Caveats

- A number input takes a number. An HTML field gives a string, and the engine refuses `'7'` with `Enter a number.`, so convert the value before sending it.
- An input writes a kv key, never a stat. To let the player set a number that effects spend, read the key in one of the game's own [effects](/docs/reference/custom#effects).
- No `Finish this first.` refusal stops an input while a scene is open. To keep one to a scene, give it a `when` such as `{ scene: ['moving-day'] }`, or add a [lock](/docs/reference/locks) that denies `'input'`.
