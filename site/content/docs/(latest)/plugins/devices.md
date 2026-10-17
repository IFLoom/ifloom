---
title: "Devices"
description: "Devices such as a phone or a laptop, with apps declared as data, badges, and opening an app without leaving the room."
---
`@ifloom/plugin-devices` gives the player devices, such as a phone, a laptop or a radio, with apps on them that the game declares as data. Each app can show a badge, and opening one doesn't take the player out of the room.

You'd want it when the player carries or uses something with screens of its own: a phone for texts, a laptop with a bank app, a radio with stations. For a smartphone with messages, a feed, contacts and a gallery already wired up, use the [phone bundle](/docs/plugins/phone) instead, which is built on this plugin.

To add it, list `@ifloom/plugin-devices` in your game's `package.json` and add `devices()` to the game's `plugins`. The devices and their apps are content, in a pack's `data.devices`. [Install](#install) has the details.

```ts
import {
  devices, devicesOf, appsOf, openApp, closeApp, appOpen,
  type DeviceDef, type AppDef, type Section, type DevicesState,
  type DevicesView, type DeviceView, type AppView, type SectionView,
} from '@ifloom/plugin-devices'
```

An app isn't a place. Opening it doesn't move the player or pass time, and whatever the player does inside it costs what that action says. [Locks](/docs/reference/locks) still apply, so "no phone at work" is a lock on `devices/*`.

You build an app from sections, and each section is something the engine already has:

- prose
- actions, the same buttons a room has, with prices and reasons
- a list, either a [collection](/docs/reference/collections) or the people the player can call
- another plugin's view, such as a [messages](/docs/plugins/messages) channel or a [feed](/docs/plugins/feed)
- a panel the game draws itself

## Install

Add the package beside the engine, then add `devices()` to the game's `plugins`. See [Adding one](/docs/plugins#adding-one).

```json
{
  "dependencies": {
    "@ifloom/engine": "0.0.0",
    "@ifloom/plugin-devices": "0.0.0"
  }
}
```

## devices

```ts
function devices(): DefinedPlugin<DevicesState, DevicesView>
```

Builds the plugin, with the id `devices`. Call it once, when you build the game. It takes no options: the devices and the apps on them are content, in a pack's `data.devices`, so a mod can add a device or an app.

It lists `cooperates: ['cast']` (see [`cooperates`](/docs/reference/plugins#cooperates)). A [contacts](#contacts) section lists the [cast](/docs/plugins/cast)'s people when the game has the cast, and nobody when it doesn't.

```ts
import { SCHEMA, loadGame, type Pack } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'
import { devices, type AppDef } from '@ifloom/plugin-devices'

declare const notes: AppDef, bank: AppDef, mail: AppDef

const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  // … the rest of your content
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
  introScene: 'intro',
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

Devices are content. List them in a pack's `data.devices.devices`, in the order the view lists them. They're merged by id, so a mod can add a device.

### devicesOf and appsOf

```ts
function devicesOf(game: Game): DeviceDef[]
function appsOf(game: Game): AppDef[]
```

The game's devices and apps, merged from its packs, in order.

## Writing apps

Apps are content, in a pack's [`data`](/docs/reference/loader#pack) under `devices.apps`, merged by id as scenes are, so a mod can add an app or replace one. Apps given in the base game's `data`, as the [phone](/docs/plugins/phone) gives its stock apps, come first, and a pack's app with the same id replaces one.

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
  badge?: ValueRef | { when: Condition }
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
| `badge` | A [`ValueRef`](/docs/reference/custom#values), `{ value, with }`, shows the number that value gives for its arguments, such as `{ value: 'messages/unread', with: { channel: 'texts' } }`. `{ when }` shows a dot while a condition holds. There's no badge if you leave it out. |
| `sections` | What fills the app, top to bottom. |

An icon's states come from fields you already have. A locked icon comes from `blocked`, a new one from a badge, and a waiting one from an action's reason.

### Section

```ts
import type { Block, ActionDef } from '@ifloom/engine'

type Section =
  | { prose: Block[] }
  | { actions: ActionDef[] }
  | { collection: string }
  | { contacts: true }
  | { plugin: string; with?: Record<string, unknown> }
  | { panel: string }
```

| Section | What it shows |
|---|---|
| `{ prose }` | Words, as [prose blocks](/docs/reference/scenes#block). They're the same blocks as a scene's body, with tokens and `when`s, so a [custom value](/docs/reference/custom) in a token can print a balance or the weather. |
| `{ actions }` | Buttons, the same [`ActionDef`](/docs/reference/actions#actiondef)s as a room's, rendered with [`renderAction`](/docs/reference/view#renderaction), so each has an activity's price, `blocked` and the reason it can't be done. An action whose `when` doesn't hold is left out. |
| `{ collection }` | A declared [collection](/docs/reference/collections)'s entries, newest first, such as a gallery or notes. |
| `{ contacts: true }` | The [cast](/docs/plugins/cast)'s people the player can call and has met, each with a **Call** button that sends the cast's [`call`](/docs/plugins/cast#commands) command. See [Contacts](#contacts). |
| `{ plugin, with? }` | Another plugin's view, for the UI to draw with that plugin's own renderer. `with` says which part, such as `{ channel: 'texts' }` for [messages](/docs/plugins/messages) or `{ feed: 'social' }` for a [feed](/docs/plugins/feed). |
| `{ panel }` | A screen the game draws itself, with the data the game's [custom panel](/docs/reference/custom) of that name returns. |

```ts
import type { AppDef } from '@ifloom/plugin-devices'

const bank: AppDef = {
  id: 'bank', name: 'Bank', icon: 'bank', on: 'laptop',
  blocked: [{ when: { not: { kv: 'bankAccount' } }, reason: 'You have no account yet.' }],
  sections: [{ prose: [{ text: 'bank.balance' }] }],   // 'You have {{v:balance}}.'
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
- their `role` as its text, or `''` when they have none
- their portrait as its image
- one action, labelled with the [`devices/call`](#strings) string ("Call"), which sends [`call(id)`](/docs/plugins/cast#commands)

The button is greyed out with the call's own refusal, such as the character's `busy` line.

In a game without the cast, the section is an empty list.

## A worked example

Here's a laptop in the player's flat, in a town like the [showcase](/docs/guide/showcase)'s. It has four apps:

- Notes, over a `notes` collection
- a café app that delivers, with a button that only shows while the player has no scarf
- a bank app that's locked until the player opens an account
- a Mail app that appears once email is set up, with a dot while there's new mail

The laptop stays at home, so a lock refuses it anywhere else.

```ts
import { SCHEMA, loadGame, type Pack } from '@ifloom/engine'
import { devices, type AppDef } from '@ifloom/plugin-devices'
import { at, places, type LocationDef } from '@ifloom/plugin-places'

const apps: AppDef[] = [
  {
    id: 'notes', name: 'Notes', icon: 'notes', on: 'laptop',
    sections: [{ prose: [{ text: 'notes.top' }] }, { collection: 'notes' }],
  },
  {
    id: 'shop', name: 'Corner Café', icon: 'basket', on: 'laptop',
    sections: [{
      actions: [
        { id: 'sandwich', label: 'Order a sandwich', command: { type: 'activity', id: 'orderSandwich' } },
        { id: 'scarf', label: 'Order a scarf', command: { type: 'activity', id: 'orderScarf' }, when: { not: { item: 'scarf' } } },
      ],
    }],
  },
  {
    id: 'bank', name: 'Bank', icon: 'bank', on: 'laptop',
    blocked: [{ when: { not: { kv: 'bankAccount' } }, reason: 'You have no account yet.' }],
    sections: [{ prose: [{ text: 'bank.balance' }] }],
  },
  {
    id: 'mail', name: 'Mail', icon: 'mail', on: 'laptop',
    when: { kv: 'emailSetUp' },
    badge: { when: { kv: 'newMail' } },
    sections: [{ panel: 'inbox' }],
  },
]

const locations: LocationDef[] = [
  { id: 'flat', name: 'Your flat', tag: 'Home', art: 'place/flat', exits: ['high-street'], body: [{ text: 'place.flat' }] },
  { id: 'high-street', name: 'High Street', tag: 'Small Town', art: 'place/high-street', exits: ['flat'], body: [{ text: 'place.high-street' }] },
]

const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  stats: [{ id: 'coins', label: 'Coins', start: 12, spendable: true }],
  items: [
    { id: 'sandwich', name: 'sandwich', desc: 'Cheese and pickle, wrapped in paper.' },
    { id: 'scarf', name: 'scarf', desc: 'Knitted by someone who loved you.' },
  ],
  collections: [{ id: 'notes', name: 'Notes' }],
  activities: [
    { id: 'orderSandwich', cost: { stats: { coins: 4 } }, effects: [{ kind: 'item', item: 'sandwich', by: 1 }] },
    { id: 'orderScarf', cost: { stats: { coins: 8 } }, effects: [{ kind: 'item', item: 'scarf', by: 1 }] },
    { id: 'jot', effects: [{ kind: 'collect', collection: 'notes', entry: { id: 'shopping', title: 'Shopping', text: 'note.shopping' } }] },
    { id: 'setUpMail', effects: [{ kind: 'kv', key: 'emailSetUp', to: true }, { kind: 'kv', key: 'newMail', to: true }] },
  ],
  prose: {
    'place.flat': 'Boxes, mostly.',
    'place.high-street': 'The high street.',
    'notes.top': 'Your notes, newest first.',
    'note.shopping': 'Milk, bread, a lemon.',
    'bank.balance': 'You have {{v:balance}}.',
  },
  custom: {
    values: { balance: (state) => `${state.stats.coins} coins` },
    panels: { inbox: (state) => ({ unread: state.kv.newMail ? 1 : 0 }) },
  },
  data: {
    places: { locations },
    devices: { devices: [{ id: 'laptop', name: 'Laptop', frame: 'laptop' }], apps },
  },
}

export const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  plugins: [places({ start: 'flat' }), devices()],
  rules: {
    locks: [{ when: { not: at('flat') }, deny: ['devices/*'], reason: 'The laptop is at home.' }],
  },
})
```

Here's how it plays, starting at home:

```ts
import { apply, startingState, view, whyNot, type Game, type GameState } from '@ifloom/engine'
import { openApp, type DevicesView } from '@ifloom/plugin-devices'
import { go } from '@ifloom/plugin-places'

declare const game: Game // the game above

const laptop = (state: GameState) => (view(state, game).plugins.devices as DevicesView).devices[0]
let state = startingState(game)

laptop(state)
// { id: 'laptop', name: 'Laptop', frame: 'laptop', sidebar: false, wallpaper: null, badge: 0, open: null,
//   apps: [{ id: 'notes', ... }, { id: 'shop', ... }, { id: 'bank', disabled: 'You have no account yet.', ... }] }
// No Mail: it isn't installed yet.

state = apply(state, game, { type: 'activity', id: 'jot' }).state
state = apply(state, game, openApp('notes')).state     // no time passes, and the player is still at home
laptop(state).open?.sections
// [{ kind: 'prose', text: 'Your notes, newest first.' },
//  { kind: 'list', entries: [{ id: 'shopping', title: 'Shopping', text: 'Milk, bread, a lemon.', image: null, actions: [] }] }]

state = apply(state, game, openApp('shop')).state      // the notes close: one app open per device
laptop(state).open?.sections
// [{ kind: 'actions', actions: [{ id: 'sandwich', label: 'Order a sandwich', ... }, { id: 'scarf', label: 'Order a scarf', ... }] }]
state = apply(state, game, { type: 'activity', id: 'orderScarf' }).state
state.stats.coins       // 4
laptop(state).open?.sections
// [{ kind: 'actions', actions: [{ id: 'sandwich', ... }] }]   The scarf button's `when` no longer holds.

whyNot(state, game, openApp('bank'))   // 'You have no account yet.'
whyNot(state, game, openApp('mail'))   // 'That is not installed.'

state = apply(state, game, { type: 'activity', id: 'setUpMail' }).state
laptop(state).badge     // 1, for Mail's dot
state = apply(state, game, openApp('mail')).state
laptop(state).open?.sections    // [{ kind: 'panel', panel: 'inbox', data: { unread: 1 } }]

state = apply(state, game, go('high-street')).state
whyNot(state, game, openApp('notes'))  // 'The laptop is at home.'
laptop(state).open                     // null: Mail closed when the lock started to hold
laptop(state).apps[0].disabled         // 'The laptop is at home.', and the same on every app
```

## Conditions

| Content writes | Helper | Holds when |
|---|---|---|
| `{ 'devices/open': { app } }` | `appOpen(app)` | That app is open. |
| `{ 'devices/open': { device } }` | | Any app is open on that device. |

```ts
import type { Block } from '@ifloom/engine'
import { appOpen } from '@ifloom/plugin-devices'

const body: Block[] = [
  { text: 'place.cafe' },
  // Ava looks up when you're on your phone at the counter.
  { text: 'place.cafe.ava-looks-up', when: { custom: 'devices/open', with: { device: 'phone' } } },
  { text: 'place.cafe.camera', when: appOpen('camera') },
]
```

The first `when` is the long form. In the short form, with the full name as the only key, it's `{ 'devices/open': { device: 'phone' } }`, which is what `appOpen` writes (see [plugin calls](/docs/reference/custom#plugincall)).

## Commands

| Command | Helper | Does |
|---|---|---|
| `{ 'devices/open': { id } }` | `openApp(app)` | Opens the app `id` on its device. Any app already open on that device closes. |
| `{ 'devices/close': { id } }` | `closeApp(device)` | Takes the device `id` back to its home screen. |

Both are free, so no time passes and the player doesn't move. [Locks](/docs/reference/locks) refuse them like any other command. `deny: ['devices/*']` stops both, and `deny: ['devices/open']` stops only opening.

`devices/open` is refused with the first of these that applies:

1. a [lock](/docs/reference/locks)'s `reason`
2. `There is no such app.`
3. `That is not installed.`, while the app's `when` doesn't hold
4. the `reason` of the first `blocked` entry that holds

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
import type { Pack } from '@ifloom/engine'

const strings: Pack['strings'] = { 'devices/notInstalled': 'You have not got that app.', 'devices/call': 'Ring' }
```

App and device names aren't strings. They're the game's own, given in each [`AppDef`](#appdef) and [`DeviceDef`](#devicedef).

## The view

`view(state, game).plugins.devices` is a `DevicesView`.

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
| `apps` | The installed apps, in order: the base game's first, then the ones packs add. |
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
| `command` | The command that opens it, `openApp(id)` in the long form. |
| `sections` | Only filled in for the open app. In `apps`, every app's `sections` is `[]`, so read them from `open`. |

### SectionView

```ts
import type { RenderedChoice } from '@ifloom/engine'

type SectionView =
  | { kind: 'prose'; text: string }
  | { kind: 'actions'; actions: RenderedChoice[] }
  | { kind: 'list'; entries: { id: string; title: string; text: string; image: string | null; actions: RenderedChoice[] }[] }
  | { kind: 'plugin'; plugin: string; with: Record<string, unknown> }
  | { kind: 'panel'; panel: string; data: unknown }
```

| Kind | From | What it holds |
|---|---|---|
| `prose` | `{ prose }` | The blocks rendered for the current state. |
| `actions` | `{ actions }` | The buttons, as [`RenderedChoice`](/docs/reference/view#renderedchoice)s. |
| `list` | `{ collection }`, `{ contacts }` | One entry per collection entry (title, words filled in, image, no actions) or per contact (name, role, portrait, a Call button). |
| `plugin` | `{ plugin, with }` | Only the plugin's id and `with`. The data is the plugin's own slice, at `view.plugins[plugin]`. |
| `panel` | `{ panel }` | What the game's custom panel returned, or `null` if it has none. |

## The state

### DevicesState

```ts
type DevicesState = { open: Record<string, string | null> }
```

This is what the plugin keeps in a save, at `state.plugins.devices`. It holds the id of the app open on each device, or `null`. A UI should read the view, not this.

## For code

The helpers build the content objects for you, typed, in the [short form](/docs/reference/custom#plugincall). `openApp` and `closeApp` return a [`CommandRef`](/docs/reference/custom#commandref), and `appOpen` returns a `Condition`.

### Helpers

```ts
import type { CommandRef, Condition } from '@ifloom/engine'

const openApp: (app: string) => CommandRef
const closeApp: (device: string) => CommandRef
const appOpen: (app: string) => Condition
```

## Checks

When the game loads, the plugin reports, with `where` as `apps <id>`:

- an app on a device the game doesn't have (`unknown device "…"`)
- anything the app's `when`, a `blocked` entry or a dot badge names that the game doesn't have, such as `unknown storyline "…"`
- a count badge naming a value no plugin and no custom function has (`no custom value named "…"`)
- a collection the game doesn't declare (`unknown collection "…"`)
- a plugin the game wasn't built with (`the game has no plugin named "…"`)
- a panel the game has no custom panel for (`no custom panel named "…"`)
- a prose block with no prose (`no prose for "…"`), and anything its `when` names
- anything an action's `when`, `blocked` conditions or `command` names that the game doesn't have, checked as the game's own [actions](/docs/reference/actions#actiondef) are

The action check catches an unknown scene, activity or item, a plugin command no plugin has, and a command whose plugin refuses its arguments. A `cast/call` naming someone the cast doesn't have, for example, gives `action <id>: unknown character "…"`.

A problem with an app is pinned on the pack it came from, or on `base` for one in the base game's `data`.

```text
base · apps mail · no custom value named "messages/unread"
mod:radio · apps tuner · no custom panel named "dial"
```

## Gotchas

- **Opening an app is free and doesn't leave the room.** No time passes and the player stays where they are, so what the room shows, who's there and the actions on offer don't change. What the player does inside the app costs what each action says.
- **Section data is filled in for the open app only.** `apps[i].sections` is always `[]`. Draw the home screen from `apps`, and the screen of an app from `open`.
- **A `plugin` section only names the slice.** It carries the plugin's id and `with`, not the plugin's data. The UI draws `view.plugins[section.plugin]` with that plugin's renderer, picking out the part `with` names, such as one channel or one feed.
- **Contacts come from the cast.** They're the people with a `call` whom the player has [met](/docs/plugins/cast#meeting-people), which by default means one of their talk or call scenes has been on screen. On a new game, contacts are empty. To list someone from the start, give them a `met` condition that holds from the start. Without the cast, contacts are always empty.
- **An app closes as soon as it couldn't be opened.** The plugin checks after every command. If an effect undoes the app's `when`, or one of its `blocked` entries or a [lock](/docs/reference/locks) on `devices/open` starts to hold (no phone at work), the device goes back to its home screen. That way its buttons aren't left live.
- **Any lock that stops opening greys out the whole device.** `deny: ['devices/*']`, `['devices/open']`, `['custom']` and `'*'` all stop `devices/open`, so every app reads the lock's `reason` and an open one closes. An intro that locks `'*'` keeps the device shut too, unless its `except` lists `devices/open`.
- **Actions in an app are ordinary commands.** A lock on `devices/*` doesn't stop the activity an app's button sends. If that activity must not happen at work, put the condition on the activity.
- **A count badge reads a value by name, with arguments.** The [messages](/docs/plugins/messages) and [feed](/docs/plugins/feed) plugins' values take the channel or feed as an argument, such as `{ value: 'feed/unseen', with: { feed: 'social' } }`. A value that isn't a number counts as `0`.
- **One app open per device.** Opening another app on the same device closes the first. Apps on different devices stay open side by side.

## See it in an example

Small Town: the phone in [`examples/showcase/src/game.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/game.ts) has two apps of the game's own, a camera with buttons and a notes app showing a collection, and `openApp('camera')` opens it.
