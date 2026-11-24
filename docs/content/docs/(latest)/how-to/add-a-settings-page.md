---
title: "Add a settings page"
description: "Let the player change settings such as hints or the text size, on the React UI's settings page or one of your own."
---
Use this to let the player change things such as hints or the text size. The engine has no settings of its own, so your content declares each one, and their [profile](/docs/reference/profile) keeps the player's choices, so a new game starts with them.

## Declare the settings

List them in your content's `settings`. A [setting](/docs/reference/settings#settingdef) is a `toggle`, a `choice` or a `range`. This declares one of each sort the showcase uses:

```ts
import type { Content } from '@ifloom/engine'

export const settings: Content = {
  settings: [
    { id: 'hints', label: 'Show hints', type: 'toggle', default: true },
    {
      id: 'textSize',
      label: 'Text size',
      type: 'choice',
      affects: 'ui',
      options: [
        { value: 'normal', label: 'Normal' },
        { value: 'large', label: 'Large' },
      ],
      default: 'normal',
    },
  ],
}
```

`hints` leaves out `affects`, so it's a play setting, part of the game state and the save. `textSize` has `affects: 'ui'`, so it never enters the game state. It's kept only in the profile, and only your UI reads it.

## Read a play setting in the story

Read a play setting with the [`{ setting }`](/docs/reference/conditions#setting) condition, as you would a kv key. This high street shows a hint line only while hints are on:

```ts fragment
body: [
  { text: 'Bunting, a bus stop and the smell of the bakery.' },
  { text: 'The café is open in the mornings.', when: { setting: 'hints' } },
],
```

A change to a play setting goes through the game as a [`setting`](/docs/reference/commands#setting) command, so it applies at once, is logged with the other commands and replays the same. A save keeps the settings it was made with, so loading an old save brings its values back.

## Show the settings page

In the React UI, turn on `pages`, and the title screen and the player's menu gain a Settings button once the game declares a setting. Its page renders a checkbox for a toggle, radio buttons for a choice and a slider for a range. With a UI of your own, render `view.settings` and send each change with `runner.setSetting`:

::include[../../../../snippets/plain/settings.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../snippets/react/mount-settings.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../snippets/vue/Settings.vue]{meta='tab="Vue" tab-group="framework"'}

Read each value from [`runner.snapshot().settings`](/docs/reference/runner#settings), which holds both sorts, and fall back to the setting's `default`. [Render a settings screen](/docs/how-to/render/saves-and-settings#render-a-settings-screen) says what each `SettingView` holds.

## Apply a ui setting where you render the story

Read the value where you render the story. The runner calls its listeners when the player changes it, so whatever renders on a change reads the new value. In the React UI, [`useSetting`](/docs/reference/react/components#usesetting) reads it and renders the component again:

```ts fragment tab="Plain JS" tab-group="framework"
// src/main.ts, in the vanilla template. In draw():
root.classList.toggle('large', runner.snapshot().settings.textSize === 'large')
```

```tsx tab="React" tab-group="framework"
import type { ReactNode } from 'react'
import { useSetting } from '@ifloom/react'

export function Story({ children }: { children: ReactNode }) {
  const size = useSetting('textSize')
  return <div className={size === 'large' ? 'text-lg' : undefined}>{children}</div>
}
```

```vue tab="Vue" tab-group="framework"
<!-- src/Story.vue -->
<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { runner } from './runner.ts'

const size = ref(runner.snapshot().settings.textSize)
const stop = runner.subscribe(() => (size.value = runner.snapshot().settings.textSize))
onUnmounted(stop)
</script>

<template>
  <div :class="{ large: size === 'large' }"><slot /></div>
</template>
```

## Apply it to the whole page

To size every page, the title screen included, put the setting on `<html>`. In the React UI, name the setting in the game's [`ui.settings`](/docs/reference/react/hints#settings) hint. The React UI copies the text size to `data-text-size` on `<html>`, where its styles size the page for `small`, `normal`, `large` or `larger`. It leaves the story's pictures out while the toggle named in `images` is off:

```ts
import type { Content } from '@ifloom/engine'

export const look: Content = {
  ui: { settings: { textSize: 'textSize' } },
}
```

With a UI of your own, copy the value to the attribute now and whenever it changes:

```ts given
// src/main.ts
function showTextSize() {
  document.documentElement.dataset.textSize = String(runner.snapshot().settings.textSize)
}
showTextSize()
runner.subscribe(showTextSize)
```

Then size the page by it. The React UI sizes everything in `rem`, so a larger root font scales the whole page, and so will your stylesheet if it does the same:

```css
/* src/styles.css */
:root[data-text-size="large"] {
  font-size: 118.75%;
}
```

## Change a setting from code

Call `runner.setSetting` with the setting's id and its new value. It checks the value against the declaration and answers a [`Result`](/docs/reference/common#result):

```ts given
const changed = runner.setSetting('textSize', 'large')
if (!changed.ok) console.warn(changed.reason)
```

A ui setting is written to the profile, so it needs a runner made with one. `mountGame` and [`browserRunner`](/docs/reference/browser#browserrunner) make one.

## Check it worked

Run `npm run check`. It reports a `{ setting }` condition that names a setting the game doesn't declare, or a ui setting, which conditions can't read. [`checkUiHints`](/docs/reference/react/hints#checkuihints), run in a test, reports a `ui.settings` hint that names a setting of the wrong sort. Then play in `npm run dev`, open Settings, and turn hints off: the hint line goes from the high street at once. Reload the page, and the setting is still off.

For more, see:

- [Settings](/docs/reference/settings), with [`SettingDef`](/docs/reference/settings#settingdef).
- [`setSetting`](/docs/reference/runner#setsetting) and the snapshot's [`settings`](/docs/reference/runner#settings).
- [The React UI's `settings` hint](/docs/reference/react/hints#settings).
- [Add music and sound](/docs/how-to/add-music-and-sound#declare-the-tracks), for volume and mute settings.
