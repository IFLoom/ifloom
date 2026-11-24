---
title: "Devices"
description: "The devices plugin gives the player devices such as a phone or a laptop, with apps built from sections and unread badges."
---
`@ifloom/plugin-devices` gives the player devices, such as a phone or a laptop, with apps on them that the game declares in `data.devices`. An app is built from sections the engine already has, such as words, [actions](/docs/reference/glossary#action), the [things](/docs/reference/glossary#thing) of a kind the player holds or another plugin's view. Opening an app passes no time and doesn't move the player, and [locks](/docs/reference/locks) still refuse it. The plugin needs no other plugin, and it [cooperates](/docs/reference/plugins#cooperates) with the [cast](/docs/reference/plugins/cast), whose people a contacts section lists. [Add a plugin](/docs/how-to/add-a-plugin) installs it, and [Build a phone](/docs/how-to/build-a-phone) puts it together with [messages](/docs/reference/plugins/messages) and the [feed](/docs/reference/plugins/feed).

In the showcase: `examples/showcase/src/world/phone.ts`, whose phone has an app for its texts and one for its feed, contacts, a gallery of the photos you hold, a camera with buttons and a notes app.

```ts
import {
  devices,
  devicesOf,
  appsOf,
  type AppDef,
  type AppView,
  type DeviceDef,
  type DevicesState,
  type DevicesView,
  type DeviceView,
  type Section,
  type SectionView,
} from '@ifloom/plugin-devices'
```

## devices

The plugin's factory, which returns the plugin with the id `devices`. It takes no options, because the devices and their apps are content a mod can change. Every field of its result is in [`devices`](/docs/api/plugin-devices#devices), and its helpers are listed under [Functions](#functions).

After each command that goes through, the plugin's [`onCommand`](/docs/reference/plugin-api#oncommand) hook checks every open app. An app that `devices/open` would now refuse closes, and its device goes back to its home screen, so its buttons aren't left live. An effect that undoes the app's `when`, a `blocked` entry that starts to hold or a lock on `devices/open` all close it this way.

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { cast } from '@ifloom/plugin-cast'
import { devices } from '@ifloom/plugin-devices'

declare const town: Content

export const { game } = loadGame([town], { id: 'small-town', title: 'Small Town', plugins: [cast(), devices()] })
```

## Content

The devices and the apps are two lists in `data.devices`, merged by id, so a pack adds a device or an app, or replaces one with the same id. An app in content that comes earlier in the list comes first.

### DeviceDef

A device the game declares in `data.devices.devices`, such as a phone or a laptop. Every field is in [`DeviceDef`](/docs/api/plugin-devices#devicedef).

Apps name their device by its `id` in their `on`. `frame` names the shape a UI renders the device in, such as `'phone'`, `'laptop'` or a name of the game's own, and it's the device's `id` if left out. A device with `sidebar: true` gets a button in the React UI's sidebar. The view lists the devices in the order the game declares them.

### AppDef

An app the game declares in `data.devices.apps`, on the device its `on` names. Every field is in [`AppDef`](/docs/api/plugin-devices#appdef).

| Field | Meaning |
|---|---|
| `when` | The app's install condition. The app is off the home screen until it holds, and `devices/open` refuses it with `That is not installed.`. It's always installed if left out. |
| `blocked` | [`Blocked`](/docs/reference/actions#blocked) entries. The first whose `when` holds refuses the app with its reason, and the home screen shows it disabled. An entry with `hide` leaves the app off the home screen instead. |
| `badge` | An [`Amount`](/docs/reference/amounts#amount) shows that number, such as `{ value: 'messages/unread', with: { channel: 'texts' } }` or a kv key's `{ kv: 'letters' }`. `{ when }` shows a dot while the condition holds. No badge if left out. |
| `sections` | The app's [sections](#section), top to bottom. |

The showcase's messages app has a count of unread texts and the messages plugin's view as its one section:

```ts
import type { AppDef } from '@ifloom/plugin-devices'

export const texts: AppDef = {
  id: 'texts',
  name: 'Messages',
  icon: 'messages',
  on: 'phone',
  badge: { value: 'messages/unread', with: { channel: 'texts' } },
  sections: [{ plugin: 'messages', with: { channel: 'texts' } }],
}
```

### Section

One entry of an app's `sections`, told apart by its key. Its forms are in [`Section`](/docs/api/plugin-devices#section).

| Key | Meaning |
|---|---|
| `blocks` | Words, written as a scene's [body](/docs/reference/glossary#body) is, with tokens and `when`s, so a [value](/docs/reference/custom#values) of the game's own can print a balance. |
| `actions` | [`ActionDef`](/docs/reference/actions#actiondef)s, rendered as a location's are, each with its price and the reason it's refused. One whose `when` fails, or that a `hide` entry refuses, is left out. One with a cost or effects runs as `{ type: 'action', id: 'devices/<id>' }`, so its id must be unique among every app's actions. |
| `things` | The things of the kind `of` that a [holder](/docs/reference/glossary#holder) holds, newest first. `at` is `'you'` if left out. Each entry has the thing's reference, name, description and picture, and no buttons. |
| `contacts` | The people the cast's `cast/contacts` [query](/docs/reference/plugins/cast#queries) answers, the characters the player has met who can be called. Each entry has the person's name, description and portrait, and a Call button that sends the cast's [`cast/call`](/docs/reference/plugins/cast#castcall). It's empty in a game without the cast. |
| `plugin` | Another plugin's view, named by its id, for a UI to render with that plugin's own components. `with` names the part, such as `{ channel: 'texts' }` for messages or `{ feed: 'social' }` for a feed. |
| `panel` | A [panel](/docs/reference/panels) a UI renders by name, with the values in `with`, as one the `panel` effect opens. |

The showcase's camera offers a button for each person here, refused with a reason while they aren't:

```ts
import type { AppDef } from '@ifloom/plugin-devices'
import { cast } from '@ifloom/plugin-cast'

export const camera: AppDef = {
  id: 'camera',
  name: 'Camera',
  icon: 'camera',
  on: 'phone',
  sections: [
    {
      actions: [
        {
          id: 'photo-ava',
          label: 'Photograph Ava',
          blocked: [{ when: { not: cast.here('ava') }, reason: 'They aren’t here.' }],
          effects: [{ create: 'photo', with: { id: 'ava', name: 'Ava at work', image: 'photo/ava.svg' }, at: 'player' }],
        },
      ],
    },
  ],
}
```

## Conditions

The condition is a [plugin call](/docs/reference/custom#plugincall). An unknown app or device is false.

### devices/open

Holds while the app is open on a device that's out. With `device` in place of `app`, it holds while that device is out, on its home screen or on an app. It takes one of the two.

```ts fragment
{ 'devices/open': { app: 'camera' } } // devices.appOpen('camera')
{ 'devices/open': { device: 'phone' } }
```

## Commands

The three commands are free, so no time passes and the player stays where they are. A [lock](/docs/reference/locks) refuses them as it does any command, by name or as `devices/*`. The save keeps which device is out and on what, so every UI shows the same and a replay plays the same.

### devices/open

Opens the app, with its device out on it. Any other app open on that device closes, and apps on other devices stay open.

```ts fragment
{ 'devices/open': { id: 'camera' } } // devices.open('camera')
```

The plugin refuses it, in this order:

1. With a lock's reason.
2. With `There is no such app.` (`devices/noSuchApp`) for an app the game doesn't have.
3. With `That is not installed.` (`devices/notInstalled`) while the app's `when` doesn't hold.
4. With the reason of the app's first `blocked` entry that holds.

An app's `disabled` in the view is this same refusal, so a lock on `devices/open` disables every app with its reason.

### devices/home

Brings the device out on its home screen, from put away or from an app. It's refused with a lock's reason, or with `There is no such device.` (`devices/noSuchDevice`).

```ts fragment
{ 'devices/home': { id: 'phone' } } // devices.home('phone')
```

### devices/close

Puts the device away, and forgets the app open on it. It's refused with a lock's reason, with `There is no such device.`, or with `That is put away.` (`devices/notShown`) for a device that isn't out.

```ts fragment
{ 'devices/close': { id: 'phone' } } // devices.close('phone')
```

## State

### DevicesState

The devices a save keeps out, at `state.plugins.devices`. Every field is in [`DevicesState`](/docs/api/plugin-devices#devicesstate).

`shown` maps each device that's out to the id of the app open on it, or `null` on its home screen. A device missing from `shown` is put away. The plugin reads the devices and apps from content, and a UI reads [`DevicesView`](#devicesview) instead.

## View

The plugin adds nothing to the room or the screen. A UI renders each device that's out from the plugin's view.

### DevicesView

The devices as the player sees them, in `view.plugins.devices`. Every field is in [`DevicesView`](/docs/api/plugin-devices#devicesview). `devices` lists every device in the order the game declares them, out or not.

### DeviceView

One device as the player sees it, an entry of `devices`. Every field is in [`DeviceView`](/docs/api/plugin-devices#deviceview).

`shown` is `true` while the device is out, and `open` is the app open on it, or `null` on its home screen or put away. `apps` lists the installed apps, leaving out one whose `when` fails or that a `hide` entry refuses. `badge` adds up the apps' counts, plus one for each dot. `home` and `close` are [`RenderedChoice`](/docs/reference/view#renderedchoice) buttons that send `devices/home` and `devices/close`, labelled with the `devices/home` and `devices/close` strings, and `close` is `null` while the device isn't out.

### AppView

One app as the player sees it, an entry of a device's `apps` or its `open`. Every field is in [`AppView`](/docs/api/plugin-devices#appview).

`badge` is a count, `true` for a dot that shows, or `0` or `false` for none. `disabled` is the reason `devices/open` would be refused, and it's left out while the app can open. `command` is the `devices/open` command that opens the app. The plugin fills in `sections` only for the app in `open`, and leaves it `[]` in `apps`, so a UI renders the home screen from `apps` and the open app from `open`.

### SectionView

One section of the open app as the player sees it, told apart by its `type`. Its forms are in [`SectionView`](/docs/api/plugin-devices#sectionview).

| Field | Meaning |
|---|---|
| `prose` | A `blocks` section, rendered as [beats](/docs/reference/prose#scenebeat), with their words joined as `text` for a UI that renders no beats. |
| `actions` | An `actions` section's buttons, as `RenderedChoice`s. |
| `list` | A `things` or `contacts` section's entries, each with an `id`, a `title`, a `text`, an `image` or `null`, and its buttons. |
| `plugin` | A `plugin` section's plugin id and its `with`, or `{}`. The plugin's own data is at `view.plugins[plugin]`. |
| `panel` | A `panel` section's panel name and its `with`, or `{}`. |

[Render a device and its apps](/docs/how-to/render/phone-plugins#render-a-device-and-its-apps) renders this view in Plain JS, React and Vue.

## React UI

The React UI is optional: the `@ifloom/plugin-devices/react` subpath renders the devices for a game that uses [`@ifloom/react`](/docs/reference/react), and a game rendered another way never loads it. [Show plugins in the React UI](/docs/how-to/react/show-plugin-uis) adds it to a game.

### devicesUi

The plugin's [`PluginUi`](/docs/reference/react/kit#pluginui), listed in `mountGame`'s `plugins`. It adds the [`DeviceButtons`](#devicebuttons) to the sidebar and the [`DeviceStrip`](#devicestrip) to the notice strip, and renders one [`DeviceDialog`](#devicedialog) for the whole game. Its type is in [`devicesUi`](/docs/api/plugin-devices#devicesui).

An app's `plugin` section renders with the components the named plugin's UI registers, so a game lists `messagesUi` and `feedUi` beside it, or those apps open empty.

### DeviceButtons

Renders a button for each device with `sidebar: true`, with its badge. A button sends the device's `home` command, which brings it out on its home screen, and the `DeviceDialog` then shows it. Its type is in [`DeviceButtons`](/docs/api/plugin-devices#devicebuttons).

A game replaces it as `DeviceButtons` in [`components`](/docs/reference/react/components#components). Its parts are `devices`, `device-button` (with `data-device`) and `device-badge`.

### DeviceStrip

Renders a button in the [`NoticeStrip`](/docs/reference/react/components#noticestrip) for each app with a badge that can open, on any device, with its count or a dot. A button opens its app, which brings its device out on it. It renders nothing while no app has a badge. Its type is in [`DeviceStrip`](/docs/api/plugin-devices#devicestrip).

A game replaces it as `DeviceStrip` in `components`. Its parts are `notice-strip-item` (with `data-strip`, the device's and the app's ids) and `badge`.

### DeviceDialog

Renders the device that's out in a dialog titled with its name, as a [`DeviceScreen`](#devicescreen), or only the device `deviceId` while it's out. Its props are in [`DeviceDialog`](/docs/api/plugin-devices#devicedialog).

The dialog is closed while no device is out. Closing it sends the device's `close` command, then calls `onClose`. The content carries `data-frame` with the device's frame, and a phone's dialog is narrower. A game without `devicesUi` places one itself:

::include[../../../../../snippets/react/device-dialog.tsx]

A game replaces it as `DeviceDialog` in `components`. Its parts are `dialog` (with `data-frame`), `dialog-overlay`, `dialog-title` and `dialog-close`.

### DeviceScreen

Renders one device's screen from its [`DeviceView`](#deviceview), the home screen or the open app. Its props are in [`DeviceScreen`](/docs/api/plugin-devices#devicescreen).

The home screen is the wallpaper, through [`assetUrl`](/docs/reference/react/components#asseturl), under a grid of apps. Each app is a button with its name, its badge and an icon square carrying `data-icon`, and it sends the app's `command`. A disabled app's reason is only in the button's `title`. With an app open, the screen shows a back button (`ui.back`) that sends the device's `home` command, the app's name, and each section as an [`AppSection`](#appsection).

A game replaces it as `DeviceScreen` in `components`. Its parts are `device-screen`, `app` (with `data-app`), `app-header`, `app-back`, `app-title`, `app-launcher`, `app-button` (with `data-open-app`), `app-icon` (with `data-icon`) and `app-badge`.

### AppSection

Renders one [`SectionView`](#sectionview) of the open app by its `type`. Its props are in [`AppSection`](/docs/api/plugin-devices#appsection).

A `prose` section renders its beats with [`Beat`](/docs/reference/react/components#beat), and an `actions` section is a [`ChoiceList`](/docs/reference/react/components#choicelist). A `list` section renders each entry (`data-entry`) with its picture, title, text and buttons. A `plugin` section renders with the section component the named plugin's UI registers, and a `panel` section with the game's panel of that name, given the section's `with`. Either renders nothing when no UI supplies one.

A game replaces it as `AppSection` in `components`. Its parts are `app-prose`, `app-entries`, `app-entry` (with `data-entry`), `app-entry-image`, `app-entry-title` and `app-entry-text`.

### useDevices

Returns the devices from the running game, `view.plugins.devices.devices`, or `[]` in a game without the plugin. It re-renders when the view changes. Its signature is in [`useDevices`](/docs/api/plugin-devices#usedevices), and the list's type, the subpath's own `DevicesState`, is in [`DevicesState`](/docs/api/plugin-devices#devicesstate-1).

::include[../../../../../snippets/react/use-devices.tsx]

### useDevice

Returns the device that's out and the controls that bring a device out and put it away. It re-renders when the view changes. Its signature is in [`useDevice`](/docs/api/plugin-devices#usedevice).

### DeviceState

The value `useDevice` returns. Every field is in [`DeviceState`](/docs/api/plugin-devices#devicestate). `openId` and `device` name the device that's out, the first if more than one is, or `null`. `open(id)` sends that device's `home` command, and `close()` sends the `close` command of the device that's out.

::include[../../../../../snippets/react/use-device.tsx]

### useOpenApp

Returns the open app that a section renders in, with all its sections and its device, or `null` outside an open app. Its signature is in [`useOpenApp`](/docs/api/plugin-devices#useopenapp).

A `panel` section's component gets only the section's `with` as `data`, so it reads the app's other sections here, such as the buttons of an `actions` section to render on a card of its own:

```tsx fragment
function MatchCard({ data }: { data: unknown }) {
  const open = useOpenApp()
  const buttons = open?.app.sections.flatMap((section) => (section.type === 'actions' ? section.actions : [])) ?? []
  return (
    <div>
      <p>{(data as { name: string }).name}</p>
      <ChoiceList choices={buttons} />
    </div>
  )
}
```

### OpenAppState

The value `useOpenApp` returns, the open app and the device it's open on. Every field is in [`OpenAppState`](/docs/api/plugin-devices#openappstate).

## Functions

The helpers are properties of `devices` and write its calls, typed:

- **`devices.open(app)`**, **`devices.home(device)`** and **`devices.close(device)`** return the [commands](#commands) as a [`CommandRef`](/docs/reference/custom#commandref).
- **`devices.appOpen(app)`** returns the [`devices/open`](#conditions) condition for an app. The condition for a device has no helper.

The showcase's flat has an action that opens the texts app while a text is waiting:

```ts
import type { ActionDef } from '@ifloom/engine'
import { devices } from '@ifloom/plugin-devices'

export const readText: ActionDef = { id: 'read-text', label: 'Read your messages', command: devices.open('texts') }
```

### devicesOf

Returns the game's devices, `data.devices.devices` from its content and packs, in the order they're declared. Its signature is in [`devicesOf`](/docs/api/plugin-devices#devicesof).

### appsOf

Returns the game's apps on every device, `data.devices.apps` from its content and packs, in the order they're declared. Its signature is in [`appsOf`](/docs/api/plugin-devices#appsof).

## Checks

When the game loads, the plugin checks each app. An app's problems are pinned on the content or pack it came from, with `where` as `apps <id>`, such as `phone · apps mail · no plugin value named "messages/unread"`.

| Problem | Cause |
|---|---|
| `unknown device "tablet"` | The app's `on` names a device the game doesn't have. |
| `the game has no plugin named "radio"` | A `plugin` section names a plugin the game wasn't built with. |
| `unknown kind "postcard"` | A `things` section's `of` names a kind the game doesn't declare. |
| `no plugin value named "messages/unread"`, `no game value named "balance"` | A count badge reads a value no plugin or the game has, or a stat the game doesn't declare. |
| `no prose for "bank.balance"` | A `blocks` section has a prose block with no prose. |
| `action shop: unknown character "ghost"` | An action's `when`, `blocked` or `command` names something the game doesn't have, checked as the game's own actions are. |

The app's `when`, its `blocked` entries and a dot badge are checked as any condition is, such as `unknown storyline "bank"`. A `things` section's `at` must name a holder that can hold things, and a `panel` section's `with` must be one the plugin that renders that panel accepts, such as the shop's vendor. A `devices/open` condition that takes both an app and a device, or neither, gives `"devices/open" takes an app or a device, one of them`.

## Strings

A game, a pack or a translation rewords these by their full key in its [strings](/docs/reference/strings#stringkey-and-strings). App and device names aren't strings, since each `AppDef` and `DeviceDef` names its own.

| Key | Meaning |
|---|---|
| `devices/noSuchApp` | `There is no such app.` |
| `devices/notInstalled` | `That is not installed.`, the refusal of an app whose `when` doesn't hold. |
| `devices/noSuchDevice` | `There is no such device.` |
| `devices/notShown` | `That is put away.`, the refusal of `devices/close` for a device that isn't out. |
| `devices/call` | `Call`, the label of each contact's button. |
| `devices/home` | `Home`, the label of a device's `home` button. |
| `devices/close` | `Close`, the label of a device's `close` button. |

## Caveats

- Opening an app leaves the room as it was, so the location, the people here and the actions on offer don't change while it's open.
- A lock on `devices/*` doesn't stop the `action` command an app's button sends, so an action that mustn't run at work needs a `blocked` entry of its own, or a lock on `action`.
- A lock that denies `'*'` or `custom` also stops `devices/open`, so an intro locked that way keeps every device shut unless its `except` lists `devices/open`.
- A count badge reads a value that isn't a number as `0`.
