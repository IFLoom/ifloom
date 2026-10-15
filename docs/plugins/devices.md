# Devices

`@ifloom/plugin-devices` gives the player devices, such as a phone, a laptop or a radio, with apps on them that the game declares as data. Each app has a badge, and opening one does not leave the room.

An app is not a place. Opening it does not move the player or pass time. Whatever the player does inside costs what that action says. [Locks](/reference/locks) still apply, so "no phone at work" is a lock on `devices/*`.

```ts
import {
  devices, openApp, closeApp, appOpen,
  type DeviceDef, type AppDef, type Section, type DevicesOptions, type DevicesState,
  type DevicesView, type DeviceView, type AppView, type SectionView,
} from '@ifloom/plugin-devices'
```

An app is built from **sections**, and each one is something the engine already has: prose, actions (the same buttons a room has, with prices and reasons), a list (a [collection](/reference/collections), or the people the player can call), another plugin's view (a [messages](/plugins/messages) channel, a [feed](/plugins/feed)), or a panel the game draws itself.

For a smartphone with messages, a feed, contacts and a gallery already wired up, use the [phone bundle](/plugins/phone), which is built on this plugin.

## Install

Add the package beside the engine, and add `devices(...)` to the game's `plugins`. See [Adding one](/plugins/#adding-one).

```json
{
  "dependencies": {
    "@ifloom/engine": "file:../ifloom/packages/engine",
    "@ifloom/plugin-devices": "file:../ifloom/packages/plugin-devices"
  }
}
```

## devices

```ts
function devices(options: DevicesOptions): DefinedPlugin<DevicesState>
```

The plugin, with the id `devices`. Call it once, when the game is built, with the devices the game has and the apps on them.

It lists `cooperates: ['cast']` (see [`cooperates`](/reference/plugins#cooperates)): a [contacts](#contacts) section lists the [cast](/plugins/cast)'s people when the game has the cast, and nobody without it.

```ts
const { game } = loadGame(packs, {
  id: 'small-town',
  title: 'Small Town',
  introScene: 'intro.wake',
  plugins: [
    places({ start: 'house' }),
    devices({
      devices: [{ id: 'laptop', name: 'Laptop', frame: 'laptop' }],
      apps: [notes, grocer, bank, mail],
    }),
  ],
})
```

### DevicesOptions

```ts
type DevicesOptions = {
  devices: DeviceDef[]
  apps?: AppDef[]
}
```

| Field | What it is |
|---|---|
| `devices` | Every device, in the order the view lists them. |
| `apps` | Apps built into the game. Packs can add more; see [Writing apps](#writing-apps). |

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
| `frame` | How the UI draws it: `'phone'`, `'laptop'`, or a name of the game's own. The device's `id` if left out. |
| `sidebar` | Offer it from the sidebar. No, if left out. |
| `wallpaper` | A picture behind the home screen, passed through. |

The devices are code, not content: a mod cannot add one.

## Writing apps

Apps come from two places. Those in `devices({ apps })` are built into the game. A pack's [`data`](/reference/loader#pack) can add more under `devices.apps`, merged by id as scenes are, so a mod can add an app or replace one. An app in a pack with the same id as a built-in one replaces it.

### AppDef

```ts
type AppDef = {
  id: string
  name: string
  icon: string
  on: string
  when?: Condition
  locked?: { when: Condition; reason: string }[]
  badge?: { count: string } | { when: Condition }
  sections: Section[]
}
```

| Field | What it is |
|---|---|
| `id` | Unique among apps, on every device. `devices/open` names it. |
| `name` | What the player reads under the icon. |
| `icon` | A name the UI maps to a picture. |
| `on` | The [device](#devicedef) it is on. |
| `when` | Installed: the app is off the home screen until this holds. Always installed if left out. |
| `locked` | On the home screen but greyed out while one of these holds, with the first one's `reason`. A [lock](/reference/locks) on `devices/open` greys it out too. |
| `badge` | `{ count: name }` shows the number a [value](/reference/custom) gives, such as `messages/unread-texts`. `{ when }` shows a dot while a condition holds. No badge if left out. |
| `sections` | What fills the app, top to bottom. |

Icon states come from what is already there: *locked* is `locked`, *new* is a badge, and *waiting* is an action's reason.

### Section

```ts
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
| `{ prose }` | Words, as [prose blocks](/reference/scenes#block): the same blocks as a scene's body, with tokens and `when`s. A [custom value](/reference/custom) in a token prints a balance or the weather. |
| `{ actions }` | Buttons, the same [`ActionDef`](/reference/game#actiondef)s as a room's, rendered with [`renderAction`](/reference/view#renderaction): an activity's price, `blocked`, and the reason it cannot be done. An action whose `when` does not hold is left out. |
| `{ collection }` | A declared [collection](/reference/collections)'s entries, newest first: a gallery, notes, a ledger. |
| `{ contacts: true }` | The [cast](/plugins/cast)'s people the player can call and has met, each with a **Call** button that sends the cast's [`call`](/plugins/cast#commands) command. See [Contacts](#contacts). |
| `{ plugin, with? }` | Another plugin's view, for the UI to draw with that plugin's own renderer. `with` says which part, such as `{ channel: 'texts' }` for [messages](/plugins/messages) or `{ feed: 'social' }` for a [feed](/plugins/feed). |
| `{ panel }` | A screen the game draws itself, with the data the game's [custom panel](/reference/custom) of that name returns. |

```ts
const bank: AppDef = {
  id: 'bank', name: 'Bank', icon: 'bank', on: 'laptop',
  locked: [{ when: { not: { flag: 'bankAccount' } }, reason: 'You have no account yet.' }],
  sections: [{ prose: [{ text: 'bank.balance' }] }],   // 'You have {{v:balance}}.'
}

const mail: AppDef = {
  id: 'mail', name: 'Mail', icon: 'mail', on: 'laptop',
  when: { flag: 'emailSetUp' },
  badge: { count: 'messages/unread-email' },
  sections: [{ plugin: 'messages', with: { channel: 'email' } }],
}
```

### Contacts

A `{ contacts: true }` section lists the [cast](/plugins/cast)'s contacts, asked by name through its [`cast/contacts`](/plugins/cast#queries) query: everyone the player has [met](/plugins/cast#meeting-people) who has a [`call`](/plugins/cast#calls). Each entry has their `name` as its title, their `role` as its text (`''` when they have none), their portrait as its image, and one action, **Call** (the [`devices/call`](#strings) string), which sends the contact's command, [`call(id)`](/plugins/cast#commands). The button is greyed out with the call's own refusal, such as their `busy` line.

In a game without the cast, the section is an empty list.

## A worked example

A laptop on the kitchen table. It has a Notes app over a `notes` collection, a grocer that delivers, and a bank app that is locked until the player opens an account. A Mail app appears once email is set up, and shows a dot while there is new mail. The laptop stays at home, so a lock refuses it anywhere else.

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'
import { devices, type AppDef } from '@ifloom/plugin-devices'
import { at, go, places } from '@ifloom/plugin-places'

const apps: AppDef[] = [
  {
    id: 'notes', name: 'Notes', icon: 'notes', on: 'laptop',
    sections: [{ prose: [{ text: 'notes.top' }] }, { collection: 'notes' }],
  },
  {
    id: 'shop', name: 'Grocer', icon: 'basket', on: 'laptop',
    sections: [{
      actions: [
        { id: 'flour', label: 'Order flour', command: { type: 'activity', id: 'orderFlour' } },
        { id: 'eggs', label: 'Order eggs', command: { type: 'activity', id: 'orderEggs' }, when: { flag: 'eggsInSeason' } },
      ],
    }],
  },
  {
    id: 'bank', name: 'Bank', icon: 'bank', on: 'laptop',
    locked: [{ when: { not: { flag: 'bankAccount' } }, reason: 'You have no account yet.' }],
    sections: [{ prose: [{ text: 'bank.balance' }] }],
  },
  {
    id: 'mail', name: 'Mail', icon: 'mail', on: 'laptop',
    when: { flag: 'emailSetUp' },
    badge: { when: { flag: 'newMail' } },
    sections: [{ panel: 'inbox' }],
  },
]

const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  // data.places.locations: house, high-street ...
  stats: [{ id: 'coins', label: 'Coins', start: 20, spendable: true }],
  items: [{ id: 'flour', name: 'Flour', desc: 'A bag of it.', kind: 'stuff' }],
  collections: [{ id: 'notes', name: 'Notes' }],
  activities: [
    { id: 'orderFlour', cost: { stats: { coins: 3 } }, effects: [{ kind: 'item', id: 'flour', by: 1 }] },
    { id: 'orderEggs', cost: { stats: { coins: 2 } } },
    { id: 'jot', effects: [{ kind: 'collect', to: 'notes', entry: { id: 'shopping', title: 'Shopping', text: 'note.shopping' } }] },
    { id: 'setUpMail', effects: [{ kind: 'flag', key: 'emailSetUp', value: true }, { kind: 'flag', key: 'newMail', value: true }] },
  ],
  prose: {
    'notes.top': 'Your notes, newest first.',
    'note.shopping': 'Flour, eggs, a lemon.',
    'bank.balance': 'You have {{v:balance}}.',
  },
  custom: {
    values: { balance: (state) => `${state.stats.coins} coins` },
    panels: { inbox: (state) => ({ unread: state.flags.newMail ? 1 : 0 }) },
  },
}

const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  introScene: 'intro.wake',
  plugins: [places({ start: 'house' }), devices({ devices: [{ id: 'laptop', name: 'Laptop', frame: 'laptop' }], apps })],
  rules: {
    locks: [{ when: { not: at('house') }, deny: ['devices/*'], reason: 'The laptop is at home.' }],
  },
})
```

How it plays, at home:

```ts
const laptop = (state: GameState) => (view(state, game).plugins.devices as DevicesView).devices[0]

laptop(state)
// { id: 'laptop', name: 'Laptop', frame: 'laptop', sidebar: false, wallpaper: null, badge: 0, open: null,
//   apps: [{ id: 'notes', ... }, { id: 'shop', ... }, { id: 'bank', disabled: 'You have no account yet.', ... }] }
// No mail: it is not installed yet.

state = apply(state, game, { type: 'activity', id: 'jot' }).state
state = apply(state, game, openApp('notes')).state     // no time passes, and the player is still at home
laptop(state).open?.sections
// [{ kind: 'prose', text: 'Your notes, newest first.' },
//  { kind: 'list', entries: [{ id: 'shopping', title: 'Shopping', text: 'Flour, eggs, a lemon.', image: null, actions: [] }] }]

state = apply(state, game, openApp('shop')).state      // the notes close: one app open per device
laptop(state).open?.sections
// [{ kind: 'actions', actions: [{ id: 'flour', label: 'Order flour', price: { stats: [{ id: 'coins', amount: 3, text: '3' }] }, ... }] }]
// No eggs: their `when` does not hold.
state = apply(state, game, { type: 'activity', id: 'orderFlour' }).state
state.stats.coins       // 17

whyNot(state, game, openApp('bank'))   // 'You have no account yet.'
whyNot(state, game, openApp('mail'))   // 'That is not installed.'

state = apply(state, game, { type: 'activity', id: 'setUpMail' }).state
laptop(state).badge     // 1: Mail's dot
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
| `{ custom: 'devices/open', with: { app } }` | `appOpen(app)` | That app is open. |
| `{ custom: 'devices/open', with: { device } }` | | Any app is open on that device. |

```ts
{ text: 'cafe/ava-looks-up', when: { custom: 'devices/open', with: { device: 'phone' } } }
```

Short, with the full name as the only key, it is `{ 'devices/open': { device: 'phone' } }` (see [plugin calls](/reference/custom)).

## Commands

| Command | Helper | Does |
|---|---|---|
| `{ type: 'custom', name: 'devices/open', with: { app } }` | `openApp(app)` | Opens the app on its device. Any app already open on that device closes. |
| `{ type: 'custom', name: 'devices/close', with: { device } }` | `closeApp(device)` | Back to the device's home screen. |

Both are free: no time passes and the player does not move. They are refused by [locks](/reference/locks) like any command. `deny: ['devices/*']` stops both, and `deny: ['devices/open']` stops only opening.

`devices/open` is refused, in order, with:
- a [lock](/reference/locks)'s `reason`;
- `There is no such app.`;
- `That is not installed.` while the app's `when` does not hold;
- the `reason` of the first `locked` entry that holds.

An app's `disabled` in the view is exactly this answer, so a lock that stops opening greys out every app with its reason.

`devices/close` is refused by locks, and with `There is no such device.` for a device the plugin was not given.

The plugin's own lines can be reworded; see [Strings](#strings).

## Strings

The plugin's lines in the [strings table](/reference/strings#plugins-strings). A game, a pack or a translation rewords them by their full key.

| Key | English |
|---|---|
| `devices/noSuchApp` | `There is no such app.` |
| `devices/notInstalled` | `That is not installed.` |
| `devices/noSuchDevice` | `There is no such device.` |
| `devices/call` | `Call` — the button on each [contact](#contacts). |

```ts
strings: { 'devices/notInstalled': 'You have not got that app.', 'devices/call': 'Ring' }
```

App and device names are not strings: they are the game's own, given in each [`AppDef`](#appdef) and [`DeviceDef`](#devicedef).

## The view

`view(state, game).plugins.devices` is a `DevicesView`.

### DevicesView

```ts
type DevicesView = { devices: DeviceView[] }
```

Every device, in the order `devices(...)` was given them.

### DeviceView

```ts
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
| `badge` | What the sidebar button shows: every app's count added up, plus one for each dot. |
| `apps` | The installed apps, in order: the built-in ones, then the ones packs add. |
| `open` | The app open on this device, with its sections filled in, or `null` for the home screen. |

### AppView

```ts
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
| `badge` | A count, a dot (`true`, or `false` when the dot's condition does not hold), or `0` for an app with no badge. |
| `disabled` | Why it cannot be opened now: [`whyNot`](/reference/actions#whynot) for its `command`, so a lock's `reason`, `That is not installed.`, or the first `locked` reason that holds. Left out if the app can be opened. |
| `command` | The command that opens it: `openApp(id)`. |
| `sections` | Filled in for the open app only: in `apps`, every app's `sections` is `[]`. Read them from `open`. |

### SectionView

```ts
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
| `actions` | `{ actions }` | The buttons, as [`RenderedChoice`](/reference/view#renderedchoice)s. |
| `list` | `{ collection }`, `{ contacts }` | One entry per collection entry (title, words filled in, image, no actions) or per contact (name, role, portrait, a Call button). |
| `plugin` | `{ plugin, with }` | Only the plugin's id and `with`. The data is the plugin's own slice, at `view.plugins[plugin]`. |
| `panel` | `{ panel }` | What the game's custom panel returned, or `null` if it has none. |

## The state

### DevicesState

```ts
type DevicesState = { open: Record<string, string | null> }
```

What the plugin keeps in a save, at `state.plugins.devices`: the id of the app open on each device, or `null`. A UI reads the view, not this.

## For code

The helpers write the content objects for you, typed. `openApp` and `closeApp` return a `Command`, and `appOpen` returns a `Condition`.

### Helpers

```ts
const openApp: (app: string) => Command
const closeApp: (device: string) => Command
const appOpen: (app: string) => Condition
```

## Checks

When the game loads, the plugin reports, with `where` as `apps <id>`:

- a device the game was not given (`no device called "…"`);
- anything `when`, a `locked` entry or a dot badge names that the game does not have (`unknown storyline "…"`);
- a count badge naming a value no plugin and no custom function has (`no value named "…"`);
- a collection the game does not declare (`unknown collection "…"`);
- a plugin the game was not built with (`the game has no plugin named "…"`);
- a panel the game has no custom panel for (`no custom panel named "…"`);
- a prose block with no prose (`no prose for "…"`), and anything its `when` names;
- anything an action's `when` names, and what its `command` names that the game does not have, checked as the game's own [actions](/reference/game#actiondef) are: an unknown scene, activity or item, a plugin command no plugin has, or one whose plugin refuses its arguments, such as a `cast/call` naming someone the cast does not have (`action <id>: unknown character "…"`).

Apps from a pack are pinned on that pack. Apps given to `devices(...)` are pinned on `base`.

```text
base · apps mail · no value named "messages/unread-mail"
mod:radio · apps tuner · no custom panel named "dial"
```

## Gotchas

- **Opening an app is free and does not leave the room.** No time passes and the player stays where they are, so what a room shows, who is there and the actions on offer do not change. What the player does inside the app costs what each action says.
- **Section data is filled in for the open app only.** `apps[i].sections` is always `[]`. Draw the home screen from `apps`, and the screen of an app from `open`.
- **A `plugin` section only names the slice.** It carries the plugin's id and `with`, not the plugin's data. The UI draws `view.plugins[section.plugin]` with that plugin's renderer, picking out the part `with` names, such as one channel or one feed.
- **Contacts are the cast's.** They are the people with a `call` whom the player has [met](/plugins/cast#meeting-people): by default, once one of their talk or call scenes has been on screen. On a new game, contacts are empty. To list someone from the start, give them a `met` condition that holds from the start. Without the cast, contacts are always empty.
- **An app closes as soon as it could not be opened.** The plugin checks after every command. If an effect undoes the app's `when`, one of its `locked` entries starts to hold, or a [lock](/reference/locks) on `devices/open` starts to hold (no phone at work), the device goes back to its home screen, so its buttons are not left live.
- **Any lock that stops opening greys out the whole device.** `deny: ['devices/*']`, `['devices/open']`, `['custom']` and `'*'` all stop `devices/open`, so every app reads the lock's `reason` and an open one closes. An intro that locks `'*'` keeps the device shut too, unless its `except` lists `devices/open`.
- **Actions in an app are ordinary commands.** A lock on `devices/*` does not stop the activity an app's button sends. If that activity must not happen at work, put the condition on the activity.
- **A count badge reads a value by name.** Values from the [messages](/plugins/messages) and [feed](/plugins/feed) plugins are named after the channels and feeds you configure, such as `messages/unread-texts`. A value that is not a number counts as `0`.
- **One app open per device.** Opening another app on the same device closes the first. Apps on different devices stay open side by side.
