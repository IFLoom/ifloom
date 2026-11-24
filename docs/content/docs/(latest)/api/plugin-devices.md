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

An app the game declares in `data.devices.apps`. Opening it changes no location and passes no time.

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
| `id` | `string` |  |  | The app's id, unique among the game's apps. |
| `name` | `string` |  |  | The app's name. |
| `icon` | `string` |  |  | The app's icon, a name a UI maps to a picture. |
| `on` | `string` |  |  | The id of the device the app is on. |
| `when` | [`Condition`](/docs/api/engine#condition) | yes |  | The app's install condition. The app stays off the home screen until it holds. |
| `blocked` | [`Blocked[]`](/docs/api/engine#blocked) | yes |  | The app's refusals. The first entry whose `when` holds disables the app with its reason, or leaves it off the home screen with `hide`. |
| `badge` | [`Amount`](/docs/api/engine#amount) `\| { when:` [`Condition`](/docs/api/engine#condition) `}` | yes |  | The app's badge, a count or a dot. A count is an `Amount`, such as a value asked with its arguments (`{ value: 'messages/unread', with: { channel: 'texts' } }`), a stat or a kv key's number. `{ when }` shows a dot while the condition holds. |
| `sections` | [`Section[]`](#section) |  |  | The app's sections, top to bottom. Each is a `Section`. |

### appsOf

Function. Explained in [Devices](/docs/plugins/devices#devicesof-and-appsof).

Returns the game's apps on every device, `data.devices.apps` from its content and packs, in declared order.

```ts shape
import { appsOf } from '@ifloom/plugin-devices'
function appsOf(game: Game): AppDef[]
```

Uses: [`Game`](/docs/api/engine#game), [`AppDef`](#appdef).

### AppView

Type. Explained in [Devices](/docs/plugins/devices#appview).

An app as the player sees it, in a `DeviceView`'s `apps` and `open`.

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
| `id` | `string` |  |  | The app's id. |
| `name` | `string` |  |  | The app's name. |
| `icon` | `string` |  |  | The app's icon, a name a UI maps to a picture. |
| `badge` | `number \| boolean` |  |  | The app's badge, a count, a dot (`true`), or nothing (`0` or `false`). |
| `disabled` | `string` | yes |  | The reason the app can't open now, from its `blocked` or a lock on `devices/open`. Left out when it can open. |
| `command` | [`Command`](/docs/api/engine#command) |  |  | The `devices/open` command that opens the app. |
| `sections` | [`SectionView[]`](#sectionview) |  |  | The app's sections. They're filled in only for the open app, and empty otherwise. |

### DeviceDef

Type. Explained in [Devices](/docs/plugins/devices#devicedef).

A device the game declares in `data.devices.devices`, such as a phone or a laptop. Its apps name it in their `on`.

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
| `id` | `string` |  |  | The device's id, unique among the game's devices. |
| `name` | `string` |  |  | The device's name. |
| `frame` | `string` | yes |  | The device's frame, a name such as `'phone'` or `'laptop'` that a UI renders it in. The device's id if left out. |
| `sidebar` | `boolean` | yes |  | Offers the device from the sidebar, when true. |
| `wallpaper` | `string` | yes |  | The picture behind the device's home screen. |

### devices

Function. Explained in [Devices](/docs/plugins/devices#devices).

Returns the devices plugin, for the game's `plugins`. It cooperates with the cast, whose people a `contacts` section
lists.

Content declares devices and apps in `data.devices.devices` and `data.devices.apps`, and the helpers write its calls,
such as `devices.open('camera')`.

```ts shape
import { devices, type DevicesState } from '@ifloom/plugin-devices'
function devices(): DefinedPlugin<DevicesState, DevicesView>
```

Uses: [`DefinedPlugin`](/docs/api/engine-plugin#definedplugin), [`DevicesView`](#devicesview).

| Helper | Signature | Description |
|---|---|---|
| `devices.open` | `(app: string):` [`CommandRef`](/docs/api/engine#commandref) | Returns the `devices/open` command, which opens the app and shows its device. It passes no time. |
| `devices.home` | `(device: string):` [`CommandRef`](/docs/api/engine#commandref) | Returns the `devices/home` command, which shows the device on its home screen, from put away or from an app. |
| `devices.close` | `(device: string):` [`CommandRef`](/docs/api/engine#commandref) | Returns the `devices/close` command, which puts the device away. |
| `devices.appOpen` | `(app: string):` [`Condition`](/docs/api/engine#condition) | Returns the `devices/open` condition, which holds while the app is open on a device that's shown. |

### devicesOf

Function. Explained in [Devices](/docs/plugins/devices#devicesof-and-appsof).

Returns the game's devices, `data.devices.devices` from its content and packs, in declared order.

```ts shape
import { devicesOf } from '@ifloom/plugin-devices'
function devicesOf(game: Game): DeviceDef[]
```

Uses: [`Game`](/docs/api/engine#game), [`DeviceDef`](#devicedef).

### DevicesState

Type. Explained in [Devices](/docs/plugins/devices#devicesstate).

The devices a save keeps out, each mapped to its open app, or null on its home screen. A device left out of `shown`
is put away.

Definitions are read from content.

```ts shape
import type { DevicesState } from '@ifloom/plugin-devices'
type DevicesState = {
  shown: Record<string, string | null>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `shown` | `Record<string, string \| null>` |  |  | The devices out, each id mapped to the open app's id, or null on the home screen. |

### DevicesView

Type. Explained in [Devices](/docs/plugins/devices#devicesview).

The devices as the player sees them, in `view.plugins.devices`.

```ts shape
import type { DevicesView } from '@ifloom/plugin-devices'
type DevicesView = {
  devices: DeviceView[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `devices` | [`DeviceView[]`](#deviceview) |  |  | The game's devices, in declared order, whether shown or not. |

### DeviceView

Type. Explained in [Devices](/docs/plugins/devices#deviceview).

A device as the player sees it, in `view.plugins.devices.devices`.

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
| `id` | `string` |  |  | The device's id. |
| `name` | `string` |  |  | The device's name. |
| `frame` | `string` |  |  | The device's frame, such as `'phone'` or `'laptop'`. The device's id when it gives none. |
| `sidebar` | `boolean` |  |  | True when the sidebar offers the device. |
| `wallpaper` | `string \| null` |  |  | The device's `wallpaper` as written, or null when it has none. |
| `badge` | `number` |  |  | The device's badge, the sum of its apps' counts plus one for each dot. The sidebar button shows it. |
| `apps` | [`AppView[]`](#appview) |  |  | The device's installed apps, in declared order. A `hide` entry that holds leaves an app out. |
| `shown` | `boolean` |  |  | True while the device is out, on its home screen or an app. A UI renders a device only while it's shown. |
| `open` | [`AppView`](#appview) `\| null` |  |  | The app open on the device while it's shown, or null on its home screen or while put away. |
| `home` | [`RenderedChoice`](/docs/api/engine#renderedchoice) |  |  | The button that shows the device's home screen, from put away or from an app. Its label is the `devices/home` string, "Home". |
| `close` | [`RenderedChoice`](/docs/api/engine#renderedchoice) `\| null` |  |  | The button that puts the device away, labelled with the `devices/close` string, "Close". Null while the device isn't shown. |

### Section

Type. Explained in [Devices](/docs/plugins/devices#section).

A section of an app, one entry of an app's `sections`. Each form is told apart by its key.

```ts shape
import type { Section } from '@ifloom/plugin-devices'
type Section = { blocks: Block[] } | { actions: ActionDef[] } | { things: { of: string; at?: string } } | { contacts: true } | { plugin: string; with?: Record<string, unknown> } | { panel: string; with?: Record<string, unknown> }
```

Uses: [`Block`](/docs/api/engine#block), [`ActionDef`](/docs/api/engine#actiondef).

### SectionView

Type. Explained in [Devices](/docs/plugins/devices#sectionview).

An app's section as the player sees it, in an `AppView`'s `sections`. Each form is told apart by its `type`.

```ts shape
import type { SectionView } from '@ifloom/plugin-devices'
type SectionView = { type: 'prose'; text: string; beats: SceneBeat[] } | { type: 'actions'; actions: RenderedChoice[] } | { type: 'list'; entries: { id: string; title: string; text: string; image: string | null; actions: RenderedChoice[] }[] } | { type: 'plugin'; plugin: string; with: Record<string, unknown> } | { type: 'panel'; panel: string; with: Record<string, unknown> }
```

Uses: [`SceneBeat`](/docs/api/engine#scenebeat), [`RenderedChoice`](/docs/api/engine#renderedchoice).

## @ifloom/plugin-devices/react

- Functions: [`useDevice`](#usedevice), [`useDevices`](#usedevices), [`useOpenApp`](#useopenapp)
- Constants: [`AppSection`](#appsection), [`DeviceButtons`](#devicebuttons), [`DeviceDialog`](#devicedialog), [`DeviceScreen`](#devicescreen), [`DeviceStrip`](#devicestrip), [`devicesUi`](#devicesui)
- Types: [`DevicesState`](#devicesstate-1), [`DeviceState`](#devicestate), [`OpenAppState`](#openappstate)

### AppSection

Const. Explained in [Devices](/docs/plugins/devices#appsection).

Renders one section of an open app by its `type`. A preset styles its `app-prose`, `app-entries`, `app-entry` and
related parts.

A `plugin` section renders with the section component that plugin's UI registers, and a `panel` section with the
game's panel of that name. Either renders nothing when no UI supplies one.

```ts shape
import { AppSection } from '@ifloom/plugin-devices/react'
const AppSection: ComponentType<{ section: SectionView; }>
```

Uses: [`SectionView`](#sectionview).

### DeviceButtons

Const. Explained in [Devices](/docs/plugins/devices#devicebuttons).

Renders a button for each device with `sidebar` set, from `view.plugins.devices`, each with its badge. A preset
styles its `devices`, `device-button` and `device-badge` parts.

A button brings its device out on its home screen, and the `DeviceDialog` shows it.

```ts shape
import { DeviceButtons } from '@ifloom/plugin-devices/react'
const DeviceButtons: ComponentType<object>
```

### DeviceDialog

Const. Explained in [Devices](/docs/plugins/devices#devicedialog).

Renders the device that's out in a dialog, with its frame in `data-frame` for a preset to style a phone or a
laptop. With `deviceId`, it renders only that device.

Closing the dialog puts the device away and calls `onClose`. `devicesUi` renders one for the whole game.

```ts shape
import { DeviceDialog } from '@ifloom/plugin-devices/react'
const DeviceDialog: ComponentType<{ deviceId?: string | null; onClose?: (() => void); }>
```

### DeviceScreen

Const. Explained in [Devices](/docs/plugins/devices#devicescreen).

Renders a device's screen, its home screen of apps or the open app with a back button. A preset styles its
`device-screen`, `app-launcher`, `app-button`, `app-icon`, `app-badge`, `app` and `app-header` parts.

```ts shape
import { DeviceScreen } from '@ifloom/plugin-devices/react'
const DeviceScreen: ComponentType<{ device: DeviceView; }>
```

Uses: [`DeviceView`](#deviceview).

### DevicesState

Type. Explained in [Devices](/docs/plugins/devices#devicesstate).

The devices in `view.plugins.devices.devices`, as `useDevices` returns them. The list is empty in a game without the plugin.

```ts shape
import type { DevicesState } from '@ifloom/plugin-devices/react'
type DevicesState = DeviceView[]
```

Uses: [`DeviceView`](#deviceview).

### DeviceState

Type.

The device that's out and the controls to bring a device out or put it away, as `useDevice` returns them. The
state comes from the save, so every UI agrees.

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
| `openId` | `string \| null` |  |  | The id of the device that's out, the first if more than one is, or null when none is. |
| `device` | [`DeviceView`](#deviceview) `\| null` |  |  | The device that's out, or null when none is. |
| `open` | `(id: string) => void` |  |  | Brings the device out on its home screen by sending its `home` button's command. |
| `close` | `() => void` |  |  | Puts the device that's out away by sending its `close` button's command. |

### DeviceStrip

Const. Explained in [Devices](/docs/plugins/devices#devicestrip).

Renders a button in the `NoticeStrip` for each app with a badge that can open, with its count or a dot. A preset
styles its `notice-strip-item` and `badge` parts.

A button opens its app, which brings the device out. `devicesUi` places it in the layout's `strip`.

```ts shape
import { DeviceStrip } from '@ifloom/plugin-devices/react'
const DeviceStrip: ComponentType<object>
```

### devicesUi

Const. Explained in [Devices](/docs/plugins/devices#devicesui).

The devices plugin's React UI, for `plugins` on `mountGame` or `GameProvider`. It adds the `DeviceButtons` to the
sidebar, the `DeviceStrip` to the notice strip and one `DeviceDialog` for the device that's out.

The UI of the plugin an app's `plugin` section names renders that section, so list `messagesUi` and `feedUi` too.

```ts shape
import { devicesUi } from '@ifloom/plugin-devices/react'
const devicesUi: PluginUi
```

Uses: [`PluginUi`](/docs/api/react-kit#pluginui).

### OpenAppState

Type.

The app being rendered and its device, as `useOpenApp` returns them.

```ts shape
import type { OpenAppState } from '@ifloom/plugin-devices/react'
type OpenAppState = {
  device: DeviceView
  app: AppView
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `device` | [`DeviceView`](#deviceview) |  |  | The device the app is open on. |
| `app` | [`AppView`](#appview) |  |  | The open app, with all its sections. |

### useDevice

Function. Explained in [Devices](/docs/plugins/devices#usedevice).

Returns the device that's out and the controls to open and close devices, from the running game. It re-renders when the view changes.

```ts shape
import { useDevice } from '@ifloom/plugin-devices/react'
function useDevice(): DeviceState
```

Uses: [`DeviceState`](#devicestate).

### useDevices

Function. Explained in [Devices](/docs/plugins/devices#usedevices).

Returns the devices from the running game, or an empty list in a game without the plugin. It re-renders when the view changes.

```ts shape
import { useDevices, type DevicesState } from '@ifloom/plugin-devices/react'
function useDevices(): DevicesState
```

### useOpenApp

Function. Explained in [Devices](/docs/plugins/devices#useopenapp).

Returns the open app a section renders in, with its device, or null outside an open app. It re-renders when the
open app changes.

A `{ panel }` section's component gets only its `with` as `data`, so it reads the app's other sections here, such
as an `actions` section's buttons to render on a card of its own.

```ts shape
import { useOpenApp } from '@ifloom/plugin-devices/react'
function useOpenApp(): OpenAppState | null
```

Uses: [`OpenAppState`](#openappstate).
