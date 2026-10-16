---
title: "Settings"
---
Settings are what the player can change from a settings screen, such as whether hints are shown or how large the text is. The engine has none of its own, so you declare every one your game offers in `game.settings` or a pack's `settings`.

```ts
import type { SettingDef } from '@ifloom/engine'

const settings: SettingDef[] = [
  { id: 'hints', label: 'Show hints', kind: 'toggle', default: true },
  {
    id: 'difficulty',
    label: 'Difficulty',
    kind: 'choice',
    options: [
      { value: 'gentle', label: 'Gentle' },
      { value: 'usual', label: 'Usual' },
      { value: 'hard', label: 'Hard' },
    ],
    default: 'usual',
  },
  {
    id: 'textSize',
    label: 'Text size',
    kind: 'choice',
    affects: 'ui',
    options: [
      { value: 'small', label: 'Small' },
      { value: 'large', label: 'Large' },
    ],
    default: 'small',
  },
]
```

Each setting either changes the game or only changes how it looks:

- **A `play` setting** (the default) is part of the game. Its value is in [`state.settings`](/docs/reference/state#settings), it's saved with the game, and conditions can read it. `hints` and `difficulty` above are play settings.
- **A `ui` setting** never enters the state. It lives in the player's [profile](/docs/reference/profile), and only your UI reads it. `textSize` is one, and so is a volume.

Whichever kind it is, the player's last choice is stored in the profile's `settings`, so it carries over to their next game.

## SettingDef

```ts
type SettingDef = {
  id: string
  label: string
  affects?: 'play' | 'ui'
} & (
  | { kind: 'toggle'; default: boolean }
  | { kind: 'choice'; options: { value: string; label: string }[]; default: string }
  | { kind: 'range'; min: number; max: number; step?: number; default: number }
)
```

| Field | What it is |
|---|---|
| `id` | How content and the profile name it. |
| `label` | What the settings screen calls it. |
| `affects` | `'play'` if left out. `'ui'` keeps it out of the state. |
| `kind` | A `toggle` is on or off. A `choice` is one of its `options`, by `value`. A `range` is a number from `min` to `max`, in steps of `step` from `min` if given. |
| `default` | Its value until the player changes it. It has to be one the setting can take. |

## Reading a setting

Content reads a play setting with the [`{ setting }`](/docs/reference/conditions#setting) condition, which works like `{ flag }`:

```ts
// Rosa offers a hint only to players who keep hints on.
{ id: 'ask-rosa', label: 'bakery#ask-rosa', when: { setting: 'hints' }, effects: [] }

// Something only a hard game has.
{ when: { setting: 'difficulty', is: 'hard' }, text: 'bakery.queue-long' }
```

A UI reads every setting, play and ui alike, from [`view.settings`](/docs/reference/view#settings). That's enough to draw the whole settings screen. A `ui` setting's `value` there is `null`, so read it from the profile.

### settingValue

```ts
function settingValue(game: Game, stored: Record<string, unknown> | undefined, id: string): FlagValue | undefined
```

`settingValue` reads a setting from the player's stored settings, which are the profile's `settings`. It gives the stored value if the setting can still take it, and the setting's `default` otherwise. A stored value is checked the same way the `setting` command checks one, so a number outside the range or off the `step`, or an option you've since removed, falls back to the default. It returns `undefined` for an id the game doesn't declare.

```ts
const stored = await runner.profile?.get<Record<string, unknown>>('settings')
const size = settingValue(runner.game, stored, 'textSize')
```

Use it for `ui` settings, and for play settings before a game starts. During a game, a play setting's value is in the state, and `view.settings` has it. React's [`useSetting`](/docs/react/components#usesetting) and the [audio player](/docs/reference/audio-player#volume-and-mute) both read settings this way.

## Changing a setting

A play setting changes through the [`setting`](/docs/reference/commands#setting) command. It's a command like any other, so it's logged and a replay gives the same game. No lock stops it.

```ts
runner.apply({ type: 'setting', id: 'difficulty', value: 'hard' })
```

A ui setting changes through [`runner.setUiSetting`](/docs/reference/runner#setuisetting), which writes the profile and leaves the state alone:

```ts
runner.setUiSetting('textSize', 'large')
```

Both check the value against the declaration, and refuse an unknown id, the wrong kind of setting, or a value it can't take.

## A new game

A new game takes the player's stored values for play settings. Pass them to [`startingState`](/docs/reference/commands#startingstate) as `settings`, or let [`runner.newGame`](/docs/reference/runner#newgame) read them from the profile. A setting with no stored value, or one it can't take any more, starts at its default.

A save keeps the play settings it was made with. Loading it doesn't apply the player's newer choices. A save from before settings existed, or one made before you added a setting, gets each missing setting's default when it loads.

## Checks

The [content checker](/docs/reference/checks) and [`loadGame`](/docs/reference/loader#what-the-loader-adds) report:

- two settings with the same id in one list
- a `default` the setting can't take
- a choice with no options
- a range whose `min` is above its `max`
- a `{ setting }` condition that names an unknown setting, a ui setting, or an `is` value the setting can't take

**Gotcha.** Conditions can only read play settings. If the story needs to branch on something, make it a play setting, even if the player thinks of it as a preference.

## See it in an example

Small Town: [`examples/showcase/src/content/town.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/content/town.ts) declares `hints`, a play setting the high street reads with `{ setting: 'hints' }`, and `textSize`, a ui setting that [`examples/showcase/src/main.tsx`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/main.tsx) copies onto the page.
