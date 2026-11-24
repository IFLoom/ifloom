---
title: "@ifloom/plugin-devices"
description: "Every export of @ifloom/plugin-devices and its /react subpath: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-devices` and `@ifloom/plugin-devices/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

## @ifloom/plugin-devices

- Functions: [`appsOf`](#appsof), [`devices`](#devices), [`devicesOf`](#devicesof)
- Types: [`AppDef`](#appdef), [`AppView`](#appview), [`DeviceDef`](#devicedef), [`DevicesState`](#devicesstate), [`DevicesView`](#devicesview), [`DeviceView`](#deviceview), [`Section`](#section), [`SectionView`](#sectionview)

### AppDef

Type. Explained in [Devices](/docs/plugins/devices#appdef).

```ts shape
import type { AppDef, Section } from '@ifloom/plugin-devices'
type AppDef = {
  id: string
  name: string
  icon: string
  on: string
  when?: Condition
  blocked?: Blocked[]
  badge?: Amount | { when: Condition }
  sections: Section[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `name` | `string` |  |  |  |
| `icon` | `string` |  |  | A name the UI maps to a picture. |
| `on` | `string` |  |  | The device it is on. |
| `when` | `Condition` | yes |  | Installed: off the home screen until this holds. |
| `blocked` | `Blocked[]` | yes |  | On the home screen but greyed out while one holds, with its reason; with `hide`, off the home screen. |
| `badge` | `Amount \| { when: Condition }` | yes |  | A count, as an `Amount`: a value asked with its arguments (`{ value: 'messages/unread', with: { channel: 'texts' } }`), a stat or a kv key's number. Or a dot while a condition holds (`{ when }`). |
| `sections` | `Section[]` |  |  | What the app shows, top to bottom: words, actions, inputs, or a plugin's list (messages, a feed). See `Section`. |

### appsOf

Function. Explained in [Devices](/docs/plugins/devices#devicesof-and-appsof).

The game's apps, on every device: `data.devices.apps`, from its packs.

```ts shape
import { appsOf } from '@ifloom/plugin-devices'
function appsOf(game: Game): AppDef[]
```

### AppView

Type. Explained in [Devices](/docs/plugins/devices#appview).

```ts shape
import type { AppView } from '@ifloom/plugin-devices'
type AppView = {
  id: string
  name: string
  icon: string
  badge: number | boolean
  disabled?: string
  command: Command
  sections: SectionView[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `name` | `string` |  |  |  |
| `icon` | `string` |  |  | A name the UI maps to a picture. |
| `badge` | `number \| boolean` |  |  | A count, a dot (`true`), or nothing (`0`). |
| `disabled` | `string` | yes |  | Why it can't be opened now, if it can't. |
| `command` | `Command` |  |  | What opening it sends: `devices/open`. |
| `sections` | `SectionView[]` |  |  | Filled in for the open app only. |

### DeviceDef

Type. Explained in [Devices](/docs/plugins/devices#devicedef).

```ts shape
import type { DeviceDef } from '@ifloom/plugin-devices'
type DeviceDef = {
  id: string
  name: string
  frame?: string
  sidebar?: boolean
  wallpaper?: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `name` | `string` |  |  |  |
| `frame` | `string` | yes |  | How the UI draws it: `'phone'`, `'laptop'`, or the game's own. |
| `sidebar` | `boolean` | yes |  | Offer it from the sidebar. |
| `wallpaper` | `string` | yes |  | A picture behind the home screen. |

### devices

Function. Explained in [Devices](/docs/plugins/devices#devices).

The plugin, with its helpers on it: `devices()` makes the plugin for the
game's `plugins`, and content is written with `devices.open('camera')`.

```ts shape
import { devices, type DevicesState } from '@ifloom/plugin-devices'
function devices(): DefinedPlugin<DevicesState, DevicesView>
```

| Helper | Signature | Description |
|---|---|---|
| `devices.open` | `(app: string): CommandRef` |  |
| `devices.home` | `(device: string): CommandRef` |  |
| `devices.close` | `(device: string): CommandRef` |  |
| `devices.appOpen` | `(app: string): Condition` |  |

### devicesOf

Function. Explained in [Devices](/docs/plugins/devices#devicesof-and-appsof).

The game's devices: `data.devices.devices`, from its packs.

```ts shape
import { devicesOf } from '@ifloom/plugin-devices'
function devicesOf(game: Game): DeviceDef[]
```

### DevicesState

Type. Explained in [Devices](/docs/plugins/devices#devicesstate).

What the plugin keeps in a save: each device the player has out, by id,
with the app open on it, or null on its home screen. A device not in
`shown` is put away. So every UI draws the same thing.

```ts shape
import type { DevicesState } from '@ifloom/plugin-devices'
type DevicesState = {
  shown: Record<string, string | null>
}
```

### DevicesView

Type. Explained in [Devices](/docs/plugins/devices#devicesview).

```ts shape
import type { DevicesView } from '@ifloom/plugin-devices'
type DevicesView = {
  devices: DeviceView[]
}
```

### DeviceView

Type. Explained in [Devices](/docs/plugins/devices#deviceview).

```ts shape
import type { DeviceView } from '@ifloom/plugin-devices'
type DeviceView = {
  id: string
  name: string
  frame: string
  sidebar: boolean
  wallpaper: string | null
  badge: number
  apps: AppView[]
  shown: boolean
  open: AppView | null
  home: RenderedChoice
  close: RenderedChoice | null
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `name` | `string` |  |  |  |
| `frame` | `string` |  |  | How the UI draws it: `'phone'`, `'laptop'`, or the game's own. The device's id if it gives none. |
| `sidebar` | `boolean` |  |  | Whether the sidebar offers it. |
| `wallpaper` | `string \| null` |  |  | The picture behind its home screen, through `artSrc`, or null. |
| `badge` | `number` |  |  | Every count, plus one for each dot: what the sidebar button shows. |
| `apps` | `AppView[]` |  |  | Installed apps, in order. |
| `shown` | `boolean` |  |  | Out: on its home screen, or on an app. A UI draws a device that's shown, and none that isn't. |
| `open` | `AppView \| null` |  |  | The app open on it while it's shown, or null on its home screen or put away. |
| `home` | `RenderedChoice` |  |  | The button that shows it on its home screen, from put away or from an app (the `devices/home` string, `Home`). |
| `close` | `RenderedChoice \| null` |  |  | The button that puts it away (the `devices/close` string, `Close`), or null while it isn't shown. |

### Section

Type. Explained in [Devices](/docs/plugins/devices#section).

What fills an app.

```ts shape
import type { Section } from '@ifloom/plugin-devices'
type Section = { blocks: Block[] } | { actions: ActionDef[] } | { things: { of: string; at?: string } } | { contacts: true } | { plugin: string; with?: Record<string, unknown> } | { panel: string; with?: Record<string, unknown> }
```

### SectionView

Type. Explained in [Devices](/docs/plugins/devices#sectionview).

```ts shape
import type { SectionView } from '@ifloom/plugin-devices'
type SectionView = { type: 'prose'; text: string; beats: SceneBeat[] } | { type: 'actions'; actions: RenderedChoice[] } | { type: 'list'; entries: { id: string; title: string; text: string; image: string | null; actions: RenderedChoice[] }[] } | { type: 'plugin'; plugin: string; with: Record<string, unknown> } | { type: 'panel'; panel: string; with: Record<string, unknown> }
```

## @ifloom/plugin-devices/react

- Functions: [`useDevice`](#usedevice), [`useDevices`](#usedevices), [`useOpenApp`](#useopenapp)
- Constants: [`AppSection`](#appsection), [`DeviceButtons`](#devicebuttons), [`DeviceDialog`](#devicedialog), [`DeviceScreen`](#devicescreen), [`DeviceStrip`](#devicestrip), [`devicesUi`](#devicesui)
- Types: [`DevicesState`](#devicesstate-1), [`DeviceState`](#devicestate), [`OpenAppState`](#openappstate)

### AppSection

Const. Explained in [Devices](/docs/plugins/devices#appsection).

One section of an open app, drawn by kind; a plugin section by that plugin's renderer.

```ts shape
import { AppSection } from '@ifloom/plugin-devices/react'
const AppSection: ComponentType<{ section: SectionView; }>
```

### DeviceButtons

Const. Explained in [Devices](/docs/plugins/devices#devicebuttons).

The sidebar's device buttons, each with its badge; a button brings the device out on its home screen, and the `DeviceDialog` shows it.

```ts shape
import { DeviceButtons } from '@ifloom/plugin-devices/react'
const DeviceButtons: ComponentType<object>
```

### DeviceDialog

Const. Explained in [Devices](/docs/plugins/devices#devicedialog).

The device that's out, in a dialog, drawn in its frame (`data-frame` for
the theme to style a phone or a laptop); `deviceId` draws only that one.
Closing the dialog puts the device away, and calls `onClose` if given. The
devices UI draws one for the whole game.

```ts shape
import { DeviceDialog } from '@ifloom/plugin-devices/react'
const DeviceDialog: ComponentType<{ deviceId?: string | null; onClose?: (() => void); }>
```

### DeviceScreen

Const. Explained in [Devices](/docs/plugins/devices#devicescreen).

A device, open: its home screen of apps, or the app that is open, with a way back.

```ts shape
import { DeviceScreen } from '@ifloom/plugin-devices/react'
const DeviceScreen: ComponentType<{ device: DeviceView; }>
```

### DevicesState

Type. Explained in [Devices](/docs/plugins/devices#devicesstate).

The devices in the view (an empty list when the game has no devices plugin).

```ts shape
import type { DevicesState } from '@ifloom/plugin-devices/react'
type DevicesState = DeviceView[]
```

### DeviceState

Type.

Which device is out, as the game's state has it, and how to bring one out and put it away.

```ts shape
import type { DeviceState } from '@ifloom/plugin-devices/react'
type DeviceState = {
  openId: string | null
  device: DeviceView | null
  open: (id: string) => void
  close: () => void
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `openId` | `string \| null` |  |  | The id of the device that's out, the first if more than one is, or `null`. |
| `device` | `DeviceView \| null` |  |  | That device as the view has it, or `null`. |
| `open` | `(id: string) => void` |  |  | Brings a device out on its home screen: sends its `home` button's command. |
| `close` | `() => void` |  |  | Puts the device that's out away: sends its `close` button's command. |

### DeviceStrip

Const. Explained in [Devices](/docs/plugins/devices#devicestrip).

Each app with news on the game's devices, as a count in the `NoticeStrip`:
a button that opens the device on that app. The devices UI puts it at the
strip's `strip` spot.

```ts shape
import { DeviceStrip } from '@ifloom/plugin-devices/react'
const DeviceStrip: ComponentType<object>
```

### devicesUi

Const. Explained in [Devices](/docs/plugins/devices#devicesui).

The devices plugin's React UI, for `plugins` on `mountGame` or
`GameProvider`: the `DeviceButtons` in the side column, each app with
news in the `NoticeStrip`, and the `DeviceDialog` for the device that's
out. An app's plugin sections are drawn by the UI of the plugin they name,
such as `messagesUi` and `feedUi`.

```ts shape
import { devicesUi } from '@ifloom/plugin-devices/react'
const devicesUi: PluginUi
```

### OpenAppState

Type.

The app being drawn, and its device.

```ts shape
import type { OpenAppState } from '@ifloom/plugin-devices/react'
type OpenAppState = {
  device: DeviceView
  app: AppView
}
```

### useDevice

Function. Explained in [Devices](/docs/plugins/devices#usedevice).

Which device is out, for a button row and the dialog that shows it. Every call reads the same, from the view.

```ts shape
import { useDevice } from '@ifloom/plugin-devices/react'
function useDevice(): DeviceState
```

### useDevices

Function. Explained in [Devices](/docs/plugins/devices#usedevices).

The devices in the view, if the game has the devices plugin.

```ts shape
import { useDevices, type DevicesState } from '@ifloom/plugin-devices/react'
function useDevices(): DevicesState
```

### useOpenApp

Function. Explained in [Devices](/docs/plugins/devices#useopenapp).

The app a section is drawn in, with all its sections, and its device; null
outside an open app. A `{ panel }` section's component gets only its `with`
as `data`, so it reads the app's other sections here: the buttons of an
`actions` section, to draw them on a card of its own.

```ts shape
import { useOpenApp } from '@ifloom/plugin-devices/react'
function useOpenApp(): OpenAppState | null
```
