---
title: "Devices"
description: "Devices such as a phone or a laptop, with apps declared as data, badges, and opening an app without leaving the room."
---
`@ifloom/plugin-devices` gives the player devices, such as a phone, a laptop or a radio, with apps on them that the game declares as data. Each app can show a badge, and opening one doesn't take the player out of the room.

You'd want it when the player carries or uses something with screens of its own: a phone for texts, a laptop with a bank app, a radio with stations. For a smartphone with messages, a feed, contacts and a gallery, see [A phone](/docs/recipes/phone), which puts this plugin together with messages and feed.

To add it, list `@ifloom/plugin-devices` in your game's `package.json` and add `devices()` to the game's `plugins`. The devices and their apps are content, in your content's `data.devices`. [Install](#install) has the details.

```ts
import { devices, devicesOf, appsOf, type DeviceDef, type AppDef, type Section, type DevicesState, type DevicesView, type DeviceView, type AppView, type SectionView } from '@ifloom/plugin-devices'
```

An app isn't a place. Opening it doesn't move the player or pass time, and whatever the player does inside it costs what that action says. [Locks](/docs/reference/locks) still apply, so "no phone at work" is a lock on `devices/*`.

You build an app from sections, and each section is something the engine already has:

- words, as a scene's blocks
- actions, the same buttons a room has, with prices and reasons
- a list, either the [things of a kind](/docs/reference/entities#notes-photos-and-other-things-made-in-play) you hold, such as notes or photos, or the people the player can call
- another plugin's view, such as a [messages](/docs/plugins/messages) channel or a [feed](/docs/plugins/feed)
- a panel the game draws itself

## Install

Add the package beside the engine, then add `devices()` to the game's `plugins`. See [Adding one](/docs/plugins#adding-one).

```json
{
  "dependencies": {
    "@ifloom/engine": "^0.0.0",
    "@ifloom/plugin-devices": "^0.0.0"
  }
}
```

## devices

```ts
function devices(): DefinedPlugin<DevicesState, DevicesView>
```

Builds the plugin, with the id `devices`. Call it once, when you build the game. It takes no options: the devices and the apps on them are content, in your content's `data.devices`, so a mod can add a device or an app.

It lists `cooperates: ['cast']` (see [`cooperates`](/docs/reference/plugins#cooperates)). A [contacts](#contacts) section lists the [cast](/docs/plugins/cast)'s people when the game has the cast, and nobody when it doesn't.

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'
import { devices, type AppDef } from '@ifloom/plugin-devices'

declare const notes: AppDef, bank: AppDef, mail: AppDef

const town: Content = {
  // … the rest of your content
  introScene: 'intro',
  data: {
    devices: {
      devices: [{ id: 'laptop', name: 'Laptop', frame: 'laptop' }],
      apps: [notes, bank, mail],
    },
  },
}

const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  plugins: [places({ start: 'flat' }), devices()],
})
```

### DeviceDef

```ts
type DeviceDef = {
  id: string
  name: string
  frame?: string
  sidebar?: boolean
  wallpaper?: string
}
```

| Field | What it is |
|---|---|
| `id` | What apps name the device by in `on`, and what `devices/close` closes. |
| `name` | What the player reads. |
| `frame` | How the UI draws it, such as `'phone'`, `'laptop'` or a name of the game's own. If you leave it out, it's the device's `id`. |
| `sidebar` | Whether to offer it from the sidebar. `false` if you leave it out. |
| `wallpaper` | A picture behind the home screen, passed through to the UI. |

Devices are content. List them in your content's `data.devices.devices`, in the order the view lists them. They're merged by id, so a mod can add a device.

### devicesOf and appsOf

```ts
function devicesOf(game: Game): DeviceDef[]
function appsOf(game: Game): AppDef[]
```

The game's devices and apps, merged from its content and packs, in order.

## Writing apps

Apps are content, in your content's [`data`](/docs/reference/loader#content) under `devices.apps`, merged by id as scenes are, so a mod can add an app or replace one. Apps in content that comes earlier in the list, such as a [phone](/docs/recipes/phone)'s own content, come first, and later content or a pack with an app of the same id replaces it.

### AppDef

```ts
import type { Condition } from '@ifloom/engine'
import type { Section } from '@ifloom/plugin-devices'

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

| Field | What it is |
|---|---|
| `id` | Unique among apps, on every device. `devices/open` names it. |
| `name` | What the player reads under the icon. |
| `icon` | A name the UI maps to a picture. |
| `on` | The [device](#devicedef) it's on. |
| `when` | When the app is installed. It stays off the home screen until this holds. If you leave it out, it's always installed. |
| `blocked` | The app shows on the home screen but is greyed out while one of these [`Blocked`](/docs/reference/actions#blocked) entries holds, with the first one's `reason`. With `hide: true`, it's left off the home screen instead. A [lock](/docs/reference/locks) on `devices/open` greys it out too. |
| `badge` | An [`Amount`](/docs/reference/amounts#amount) shows that number, such as a value with its arguments, `{ value: 'messages/unread', with: { channel: 'texts' } }`, or a kv key's count, `{ kv: 'letters' }`. `{ when }` shows a dot while a condition holds. There's no badge if you leave it out. |
| `sections` | What fills the app, top to bottom. |

An icon's states come from fields you already have. A locked icon comes from `blocked`, a new one from a badge, and a waiting one from an action's reason.

### Section

```ts
import type { Block, ActionDef } from '@ifloom/engine'

type Section =
  | { blocks: Block[] }
  | { actions: ActionDef[] }
  | { things: { of: string; at?: string } }
  | { contacts: true }
  | { plugin: string; with?: Record<string, unknown> }
  | { panel: string; with?: Record<string, unknown> }
```

| Section | What it shows |
|---|---|
| `{ blocks }` | Words, as [blocks](/docs/reference/scenes#block), written as a scene's body is. They're the same blocks as a scene's body, with tokens and `when`s, so a [value](/docs/reference/custom#values) of the game's own in a token can print a balance or the weather. |
| `{ actions }` | Buttons, the same [`ActionDef`](/docs/reference/actions#actiondef)s as a room's, rendered with [`renderAction`](/docs/reference/view#renderaction), so each has its price, `blocked` and the reason it can't be done. An action whose `when` doesn't hold is left out. One with a cost or effects is done as `{ type: 'action', id: 'devices/<id>' }`, so give each an id no other app's action has. |
| `{ things: { of, at? } }` | The [things](/docs/reference/entities#notes-photos-and-other-things-made-in-play) of the kind `of` that a holder holds, newest first, such as photos or notes. `at` is `'you'` if left out, or name `'player'` or a unique entity. Each entry is the thing's reference, name, description and picture, and has no buttons. |
| `{ contacts: true }` | The [cast](/docs/plugins/cast)'s people the player can call and has met, each with a Call button that sends the cast's [`call`](/docs/plugins/cast#commands) command. See [Contacts](#contacts). |
| `{ plugin, with? }` | Another plugin's view, for the UI to draw with that plugin's own renderer. `with` says which part, such as `{ channel: 'texts' }` for [messages](/docs/plugins/messages) or `{ feed: 'social' }` for a [feed](/docs/plugins/feed). |
| `{ panel, with? }` | A [panel](/docs/reference/panels) the UI draws by name, as one the `panel` effect opens is, with what it's opened with in `with`. |

```ts
import type { AppDef } from '@ifloom/plugin-devices'

const bank: AppDef = {
  id: 'bank', name: 'Bank', icon: 'bank', on: 'laptop',
  blocked: [{ when: { not: { kv: 'bankAccount' } }, reason: 'You have no account yet.' }],
  sections: [{ blocks: [{ prose: 'bank.balance' }] }],   // 'You have {{v:game/balance}}.'
}

const mail: AppDef = {
  id: 'mail', name: 'Mail', icon: 'mail', on: 'laptop',
  when: { kv: 'emailSetUp' },
  badge: { value: 'messages/unread', with: { channel: 'email' } },
  sections: [{ plugin: 'messages', with: { channel: 'email' } }],
}
```

### Contacts

A `{ contacts: true }` section lists the [cast](/docs/plugins/cast)'s contacts, which it gets from the cast's [`cast/contacts`](/docs/plugins/cast#queries) query. That's everyone the player has [met](/docs/plugins/cast#meeting-people) who has a [`call`](/docs/plugins/cast#calls). Each entry has:

- their `name` as its title
- their `description` as its text, or `''` when they have none
- their portrait as its image
- one action, labelled with the [`devices/call`](#strings) string ("Call"), which sends [`cast.call(id)`](/docs/plugins/cast#commands)

The button is greyed out with the call's own refusal, such as the character's `busy` line.

In a game without the cast, the section is an empty list.

## A worked example

This laptop sits in the player's flat, in a town like the [showcase](/docs/guide/showcase)'s. It has four apps:

- Notes, listing the `note` things the player holds
- a café app that delivers, with a button that only shows while the player has no scarf
- a bank app that's locked until the player opens an account
- a Mail app that appears once email is set up, with a dot while there's new mail

The laptop stays at home, so a lock refuses it anywhere else.

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { devices, type AppDef } from '@ifloom/plugin-devices'
import { places } from '@ifloom/plugin-places'

const apps: AppDef[] = [
  {
    id: 'notes', name: 'Notes', icon: 'notes', on: 'laptop',
    sections: [{ blocks: [{ prose: 'notes.top' }] }, { things: { of: 'note' } }],
  },
  {
    id: 'shop', name: 'Corner Café', icon: 'basket', on: 'laptop',
    sections: [{
      actions: [
        { id: 'sandwich', label: 'Order a sandwich', cost: { stats: { coins: 4 } }, effects: [{ entity: 'item:sandwich', by: 1 }] },
        {
          id: 'scarf',
          label: 'Order a scarf',
          when: { not: { entity: 'clothing:scarf', at: 'you' } },
          cost: { stats: { coins: 8 } },
          effects: [{ entity: 'clothing:scarf', by: 1 }],
        },
      ],
    }],
  },
  {
    id: 'bank', name: 'Bank', icon: 'bank', on: 'laptop',
    blocked: [{ when: { not: { kv: 'bankAccount' } }, reason: 'You have no account yet.' }],
    sections: [{ blocks: [{ prose: 'bank.balance' }] }],
  },
  {
    id: 'mail', name: 'Mail', icon: 'mail', on: 'laptop',
    when: { kv: 'emailSetUp' },
    badge: { when: { kv: 'newMail' } },
    sections: [{ panel: 'inbox', with: { unread: 1 } }],
  },
]

const locations = [
  places.location({ id: 'flat', name: 'Your flat', description: 'Home', exits: ['high-street'], body: [{ prose: 'place.flat' }] }),
  places.location({ id: 'high-street', name: 'High Street', description: 'Small Town', exits: ['flat'], body: [{ prose: 'place.high-street' }] }),
]

const town: Content = {
  stats: [{ id: 'coins', label: 'Coins', start: 12, spendable: true }],
  kinds: [
    { id: 'item', label: 'Thing', listed: false },
    { id: 'clothing', label: 'Clothing', unique: true, listed: false },
    { id: 'note', label: 'Note', listed: false },
  ],
  entities: [
    { id: 'sandwich', of: 'item', name: 'sandwich', description: 'Cheese and pickle, wrapped in paper.' },
    { id: 'scarf', of: 'clothing', name: 'scarf', description: 'Knitted by someone who loved you.' },
    ...locations,
  ],
  // Done from elsewhere in the game, by a choice or a test: no label, so no button of their own.
  actions: [
    { id: 'jot', effects: [{ create: 'note', with: { id: 'shopping', name: 'Shopping', description: 'Milk, bread, a lemon.' }, at: 'player' }] },
    { id: 'setUpMail', effects: [{ kv: 'emailSetUp', to: true }, { kv: 'newMail', to: true }] },
  ],
  locks: [{ when: { not: places.at('flat') }, deny: ['devices/*'], reason: 'The laptop is at home.' }],
  prose: {
    'place.flat': 'Boxes, mostly.',
    'place.high-street': 'The high street.',
    'notes.top': 'Your notes, newest first.',
    'bank.balance': 'You have {{v:game/balance}}.',
  },
  data: {
    devices: { devices: [{ id: 'laptop', name: 'Laptop', frame: 'laptop' }], apps },
  },
}

export const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  plugins: [places({ start: 'flat' }), devices()],
  rules: {
    values: { balance: (state) => `${state.stats.coins} coins` },
  },
})
```

Played from a new game, starting at home:

```ts
import { apply, startingState, view, whyNot, type Game, type GameState } from '@ifloom/engine'
import { devices, type DevicesView } from '@ifloom/plugin-devices'
import { places } from '@ifloom/plugin-places'

declare const game: Game // the game above

const laptop = (state: GameState) => (view(state, game).plugins.devices as DevicesView).devices[0]
let state = startingState(game)

laptop(state)
// { id: 'laptop', name: 'Laptop', frame: 'laptop', sidebar: false, wallpaper: null, badge: 0, open: null,
//   apps: [{ id: 'notes', ... }, { id: 'shop', ... }, { id: 'bank', disabled: 'You have no account yet.', ... }] }
// No Mail: it isn't installed yet.

state = apply(state, game, { type: 'action', id: 'jot' }).state
state = apply(state, game, devices.open('notes')).state     // no time passes, and the player is still at home
laptop(state).open?.sections
// [{ type: 'prose', text: 'Your notes, newest first.', beats: [{ type: 'text', text: 'Your notes, newest first.' }] },
//  { type: 'list', entries: [{ id: 'note:shopping', title: 'Shopping', text: 'Milk, bread, a lemon.', image: null, actions: [] }] }]

state = apply(state, game, devices.open('shop')).state      // the notes close: one app open per device
laptop(state).open?.sections
// [{ type: 'actions', actions: [{ id: 'sandwich', label: 'Order a sandwich', ... }, { id: 'scarf', label: 'Order a scarf', ... }] }]
state = apply(state, game, { type: 'action', id: 'devices/scarf' }).state
state.stats.coins       // 4
laptop(state).open?.sections
// [{ type: 'actions', actions: [{ id: 'sandwich', ... }] }]   The scarf button's `when` no longer holds.

whyNot(state, game, devices.open('bank'))   // 'You have no account yet.'
whyNot(state, game, devices.open('mail'))   // 'That is not installed.'

state = apply(state, game, { type: 'action', id: 'setUpMail' }).state
laptop(state).badge     // 1, for Mail's dot
state = apply(state, game, devices.open('mail')).state
laptop(state).open?.sections    // [{ type: 'panel', panel: 'inbox', with: { unread: 1 } }]

state = apply(state, game, places.go('high-street')).state
whyNot(state, game, devices.open('notes'))  // 'The laptop is at home.'
laptop(state).open                     // null: Mail closed when the lock started to hold
laptop(state).apps[0].disabled         // 'The laptop is at home.', and the same on every app
```

## Conditions

| Content writes | Helper | Holds when |
|---|---|---|
| `{ 'devices/open': { app } }` | `devices.appOpen(app)` | That app is open. |
| `{ 'devices/open': { device } }` | | Any app is open on that device. |

```ts
import type { Block } from '@ifloom/engine'
import { devices } from '@ifloom/plugin-devices'

const body: Block[] = [
  { prose: 'place.cafe' },
  // Ava looks up when you're on your phone at the counter.
  { prose: 'place.cafe.ava-looks-up', when: { 'devices/open': { device: 'phone' } } },
  { prose: 'place.cafe.camera', when: devices.appOpen('camera') },
]
```

The first `when` is the call written out. `appOpen` writes the same call for an app (see [plugin calls](/docs/reference/custom#plugincall)).

## Commands

| Command | Helper | Does |
|---|---|---|
| `{ 'devices/open': { id } }` | `devices.open(app)` | Opens the app `id` on its device. Any app already open on that device closes. |
| `{ 'devices/close': { id } }` | `devices.close(device)` | Takes the device `id` back to its home screen. |

Both are free, so no time passes and the player doesn't move. [Locks](/docs/reference/locks) refuse them like any other command. `deny: ['devices/*']` stops both, and `deny: ['devices/open']` stops only opening.

`devices/open` is refused with the first of these that applies:

1. A [lock](/docs/reference/locks)'s `reason`.
2. `There is no such app.`
3. `That is not installed.`, while the app's `when` doesn't hold.
4. The `reason` of the first `blocked` entry that holds.

An app's `disabled` in the view is this same answer, so a lock that stops opening greys out every app with its reason.

`devices/close` is refused by locks, and with `There is no such device.` for a device the plugin wasn't given.

You can reword the plugin's own lines (see [Strings](#strings)).

## Strings

These are the plugin's lines in the [strings table](/docs/reference/strings#plugins-strings). A game, a pack or a translation rewords them by their full key.

| Key | English |
|---|---|
| `devices/noSuchApp` | `There is no such app.` |
| `devices/notInstalled` | `That is not installed.` |
| `devices/noSuchDevice` | `There is no such device.` |
| `devices/call` | `Call`, the button on each [contact](#contacts). |

```ts
import type { Content } from '@ifloom/engine'

const strings: Content['strings'] = { 'devices/notInstalled': 'You have not got that app.', 'devices/call': 'Ring' }
```

App and device names aren't strings. They're the game's own, given in each [`AppDef`](#appdef) and [`DeviceDef`](#devicedef).

## The view

`view(state, game).plugins.devices` is a `DevicesView`.

Its [React UI](#drawing-it) draws it with [`DeviceButtons`](#devicebuttons) and a [`DeviceDialog`](#devicedialog), and [`useDevices`](#usedevices) gives the devices with no markup.

### DevicesView

```ts
import type { DeviceView } from '@ifloom/plugin-devices'

type DevicesView = { devices: DeviceView[] }
```

It lists every device, in the order you gave them to `devices(...)`.

### DeviceView

```ts
import type { AppView } from '@ifloom/plugin-devices'

type DeviceView = {
  id: string
  name: string
  frame: string
  sidebar: boolean
  wallpaper: string | null
  badge: number
  apps: AppView[]
  open: AppView | null
}
```

| Field | What it is |
|---|---|
| `frame` | The device's `frame`, or its `id`. |
| `badge` | What the sidebar button shows. It's every app's count added up, plus one for each dot. |
| `apps` | The installed apps, in order: as the content gives them, then the ones packs add. |
| `open` | The app open on this device, with its sections filled in, or `null` for the home screen. |

### AppView

```ts
import type { Command } from '@ifloom/engine'
import type { SectionView } from '@ifloom/plugin-devices'

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

| Field | What it is |
|---|---|
| `badge` | A count, a dot (`true`, or `false` when the dot's condition doesn't hold), or `0` for an app with no badge. |
| `disabled` | Why it can't be opened now. It's [`whyNot`](/docs/reference/actions#whynot) for its `command`, so a lock's `reason`, `That is not installed.` or the first `blocked` reason that holds. It's left out if the app can be opened. |
| `command` | The command that opens it, `devices.open(id)` as the view writes commands, `{ type: 'custom', name: 'devices/open', with: { id } }`. |
| `sections` | Only filled in for the open app. In `apps`, every app's `sections` is `[]`, so read them from `open`. |

### SectionView

```ts
import type { RenderedChoice } from '@ifloom/engine'

type SectionView =
  | { type: 'prose'; text: string; beats: SceneBeat[] }
  | { type: 'actions'; actions: RenderedChoice[] }
  | { type: 'list'; entries: { id: string; title: string; text: string; image: string | null; actions: RenderedChoice[] }[] }
  | { type: 'plugin'; plugin: string; with: Record<string, unknown> }
  | { type: 'panel'; panel: string; with: Record<string, unknown> }
```

| Type | From | What it holds |
|---|---|---|
| `prose` | `{ blocks }` | The blocks drawn as [beats](/docs/reference/prose#scenebeat) for the current state, with [`context.beats`](/docs/reference/plugins#beats), and their words joined as `text` for a UI that draws no beats. |
| `actions` | `{ actions }` | The buttons, as [`RenderedChoice`](/docs/reference/view#renderedchoice)s. |
| `list` | `{ things }`, `{ contacts }` | One entry per thing (its reference as `id`, name, description filled in, picture, no actions) or per contact (name, description, portrait, a Call button). |
| `plugin` | `{ plugin, with }` | Only the plugin's id and `with`. The data is the plugin's own slice, at `view.plugins[plugin]`. |
| `panel` | `{ panel, with }` | The panel's name, and the section's `with`, or `{}`. |

## Drawing it

`view.plugins.devices` is a [`DevicesView`](#devicesview): each device with its apps, and the app that's open, if one is. An app's `command` opens it, and `devices/close` takes the device back to its home screen. The open app's `sections` are words, buttons, lists, or another plugin's part, such as a messages channel.

`@ifloom/plugin-devices/react` draws the devices and their apps, for a game drawn with [`@ifloom/react`](/docs/react). List `devicesUi` in the game's [`plugins`](/docs/react/kit#the-plugins-option) and a button for each device goes in the side column, and each app with news goes in the [`NoticeStrip`](/docs/react/components#noticestrip). An app's plugin sections are drawn by the UI of the plugin they name, so list [`messagesUi`](/docs/plugins/messages#messagesui) and [`feedUi`](/docs/plugins/feed#feedui) too. The Plain JS tab uses `runner`, `add` and `drawChoices` from the vanilla template's `src/main.ts`, whose `draw` hands each part the runner's [snapshot](/docs/reference/runner#runnersnapshot), and the Vue tab reads `view`, `snapshot` and `runner` from the vue template's `src/runner.ts` (see [Start the runner](/docs/guide/frameworks#start-the-runner)).

::include[../../../../snippets/plain/devices.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../snippets/react/mount-devices.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../snippets/vue/Devices.vue]{meta='tab="Vue" tab-group="framework"'}

The React UI is yours to leave out. Draw the plugin yourself from `view.plugins.devices`, or from [`useDevices`](#usedevices) with your own markup, and nothing of ours is drawn: that's as much a way to use the plugin as ours. React and `@ifloom/react` are optional peers of the plugin, and a game drawn with another UI never loads this subpath.

### devicesUi

```ts
const devicesUi: PluginUi
```

The plugin's [`PluginUi`](/docs/react/kit#pluginui): a button for each device goes in the side column, and each app with news goes in the [`NoticeStrip`](/docs/react/components#noticestrip). An app's plugin sections are drawn by the UI of the plugin they name, so list [`messagesUi`](/docs/plugins/messages#messagesui) and [`feedUi`](/docs/plugins/feed#feedui) too.

### DeviceStrip

```tsx
function DeviceStrip(): JSX.Element | null
```

What `devicesUi` adds to the [`NoticeStrip`](/docs/react/components#noticestrip): a count for each app with a badge, on any device, as a button that opens the device on that app. It draws nothing while no app has news.

Replaceable as `DeviceStrip` in [`components`](/docs/react/components#components). Parts: `notice-strip-item` (with `data-strip`, the device and the app) and `badge`.

### DeviceButtons

```tsx
function DeviceButtons(): JSX.Element | null
```

A button for each device offered from the sidebar (`sidebar: true`), with its badge. Each button opens the device in a [`DeviceDialog`](#devicedialog) and carries `data-device`. Opening the dialog sends no command and costs nothing.

Replaceable as `DeviceButtons` in [`components`](/docs/react/components#components). Parts: `devices`, `device-button` (with `data-device`) and `device-badge`.

### DeviceDialog

```tsx
function DeviceDialog(props: { deviceId: string | null; onClose: () => void }): JSX.Element
```

The device with this id in a [`Dialog`](/docs/react/components#dialog), titled with its name and drawn as a [`DeviceScreen`](#devicescreen). It's closed while `deviceId` is `null` or matches no device. `onClose` is called when the player closes it. The content carries `data-frame` with the device's frame, and a phone's dialog is narrower.

::include[../../../../snippets/react/device-dialog.tsx]

Replaceable as `DeviceDialog` in [`components`](/docs/react/components#components). Parts: `dialog` (with `data-frame`), `dialog-overlay`, `dialog-title` and `dialog-close`.

### DeviceScreen

```tsx
function DeviceScreen(props: { device: DeviceView }): JSX.Element
```

A device, open. With no app open, it shows the home screen: the wallpaper (through [`assetUrl`](/docs/react/components#asseturl)) and a grid of apps. Each app is a button with its name, a badge and an icon square carrying `data-icon`, and it sends the app's command (`devices/open`). A locked app is greyed out, with its reason only in its `title`, shown on hover. Unlike a [`ChoiceButton`](/docs/react/components#choicebutton), the icon doesn't print the reason.

With an app open (`data-app`), it shows a **Back** button (`ui.back`, sending `devices/close`), the app's name, and each of the app's sections as an [`AppSection`](#appsection).

`device` is one entry of [`useDevices`](#usedevices), a [`DeviceView`](/docs/plugins/devices#deviceview).

Replaceable as `DeviceScreen` in [`components`](/docs/react/components#components). Parts: `device-screen`, `app` (with `data-app`), `app-header`, `app-back`, `app-title`, `app-launcher`, `app-button` (with `data-open-app`), `app-icon` (with `data-icon`) and `app-badge`.

### AppSection

```tsx
function AppSection(props: { section: SectionView }): JSX.Element | null
```

One [`SectionView`](/docs/plugins/devices#sectionview) of an open app, drawn by its type:

| Type | Drawn as |
|---|---|
| `prose` | Its beats, drawn with [`Beat`](/docs/react/components#beat). |
| `actions` | A [`ChoiceList`](/docs/react/components#choicelist). |
| `list` | Each entry (`data-entry`) with its picture, title, text and actions. |
| `plugin` | The renderer in `sections` for that plugin id, given the plugin's view and the section's `with`. Nothing if there's no renderer. |
| `panel` | The component in `panels` with the panel's name, given the section's `with`. Nothing if there's no component. |

Replaceable as `AppSection` in [`components`](/docs/react/components#components). Parts: `app-prose`, `app-entries`, `app-entry` (with `data-entry`), `app-entry-image`, `app-entry-title` and `app-entry-text`.

### useDevices

```ts
function useDevices(): DevicesState

type DevicesState = DeviceView[]
```

The devices in the view, `view.plugins.devices.devices`, as [`DeviceView`](/docs/plugins/devices#deviceview)s. It returns `[]` in a game without the plugin. Use it for a device button of your own:

::include[../../../../snippets/react/use-devices.tsx]

### useDevice

```ts
function useDevice(): DeviceState

type DeviceState = {
  openId: string | null
  device: DeviceView | null
  open: (id: string) => void
  close: () => void
}
```

Which device is open in a dialog, and how to open and close one. `device` is the open device as the view has it, or `null`, also when `openId` no longer names one. Each call keeps its own state, so call it once and share it between your buttons and the dialog. [`DeviceButtons`](#devicebuttons) uses it.

::include[../../../../snippets/react/use-device.tsx]

## The state

### DevicesState

```ts
type DevicesState = { open: Record<string, string | null> }
```

This is what the plugin keeps in a save, at `state.plugins.devices`. It holds the id of the app open on each device, or `null`. A UI should read the view, not this.

## For code

The helpers build the content objects for you, typed, in the [short form](/docs/reference/custom#plugincall). `devices.open` and `devices.close` return a [`CommandRef`](/docs/reference/custom#commandref), and `devices.appOpen` returns a `Condition`.

### Helpers

```ts
const devices: {
  (): DefinedPlugin<DevicesState, DevicesView>
  open(app: string): CommandRef
  close(device: string): CommandRef
  appOpen(app: string): Condition
}

import type { CommandRef, Condition } from '@ifloom/engine'
```

## Checks

When the game loads, the plugin reports, with `where` as `apps <id>`:

- an app on a device the game doesn't have (`unknown device "…"`)
- anything the app's `when`, a `blocked` entry or a dot badge names that the game doesn't have, such as `unknown storyline "…"`
- a count badge naming a value neither a plugin nor the game has (`no plugin value named "…"` or `no game value named "…"`), or a stat the game doesn't declare
- a `things` section's kind the game doesn't declare (`unknown kind "…"`), and a holder in its `at` that can't hold things
- a plugin the game wasn't built with (`the game has no plugin named "…"`)
- a panel's `with` that the plugin drawing that panel refuses, such as the shop's unknown vendor
- a prose block with no prose (`no prose for "…"`), and anything its `when` names
- anything an action's `when`, `blocked` conditions or `command` names that the game doesn't have, checked as the game's own [actions](/docs/reference/actions#actiondef) are

The action check catches an unknown scene or action, a plugin command no plugin has, and a command whose plugin refuses its arguments. A `cast/call` naming someone the cast doesn't have, for example, gives `action <id>: unknown character "…"`.

A problem with an app is pinned on the content or pack it came from, such as `phone` for one of the phone's own apps.

```text
phone · apps mail · no plugin value named "messages/unread"; the game has no plugin "messages"
```

## Gotchas

- **Opening an app is free and doesn't leave the room.** No time passes and the player stays where they are, so what the room shows, who's there and the actions on offer don't change. What the player does inside the app costs what each action says.
- **Section data is filled in for the open app only.** `apps[i].sections` is always `[]`. Draw the home screen from `apps`, and the screen of an app from `open`.
- **A `plugin` section only names the slice.** It carries the plugin's id and `with`, not the plugin's data. The UI draws `view.plugins[section.plugin]` with that plugin's renderer, picking out the part `with` names, such as one channel or one feed.
- **Contacts come from the cast.** They're the people with a `call` whom the player has [met](/docs/plugins/cast#meeting-people), which by default means one of their talk or call scenes has been on screen. On a new game, contacts are empty. To list someone from the start, give them a `met` condition that holds from the start. Without the cast, contacts are always empty.
- **An app closes as soon as it couldn't be opened.** The plugin checks after every command. If an effect undoes the app's `when`, or one of its `blocked` entries or a [lock](/docs/reference/locks) on `devices/open` starts to hold (no phone at work), the device goes back to its home screen. That way its buttons aren't left live.
- **Any lock that stops opening greys out the whole device.** `deny: ['devices/*']`, `['devices/open']`, `['custom']` and `'*'` all stop `devices/open`, so every app reads the lock's `reason` and an open one closes. An intro that locks `'*'` keeps the device shut too, unless its `except` lists `devices/open`.
- **Actions in an app are ordinary actions.** A lock on `devices/*` doesn't stop the `action` command an app's button sends. If that action must not happen at work, put the condition in its `blocked`, or lock `action`.
- **A count badge reads a value by name, with arguments.** The [messages](/docs/plugins/messages) and [feed](/docs/plugins/feed) plugins' values take the channel or feed as an argument, such as `{ value: 'feed/unread', with: { feed: 'social' } }`. A value that isn't a number counts as `0`.
- **One app open per device.** Opening another app on the same device closes the first. Apps on different devices stay open side by side.

## See it in an example

Small Town: the phone in [`examples/showcase/src/world/phone.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/world/phone.ts) is a device with an app for its texts and its feed, contacts, a gallery, a camera with buttons and a notes app listing the notes you hold. `devices.open('camera')` in `src/game.ts` opens the camera.
