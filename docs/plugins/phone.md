# Phone

`@ifloom/phone` puts a smartphone in a game in one call. It wires together the [devices](/plugins/devices), [messages](/plugins/messages) and [feed](/plugins/feed) plugins and puts the usual apps on the phone:

- one app for each message channel, with an unread badge
- one app for each feed, with an unseen badge
- Contacts, for the people the player can call, from the [cast](/plugins/cast)
- a Gallery, over a `gallery` collection it declares
- any apps of the game's own

You'd want it in a game set in the present day, where the player gets texts, scrolls a feed and calls people, as in the [showcase](/guide/showcase). If your game needs a device that isn't a phone, or a phone without messages or a feed, use the [devices](/plugins/devices) plugin on its own.

To add it, list `@ifloom/phone` and the three plugins it wires together in your game's `package.json`. Then call `phone()` once and spread both its `plugins` and its `collections` into the game, as [phone](#phone-1) shows.

```ts
import { phone, type PhoneOptions, type PhoneKit } from '@ifloom/phone'
```

It's a bundle, not a plugin. `phone()` returns the three plugins and the collection, ready to spread into the game. Everything else is content. Messages, posts and the game's own apps are data, built from the same [sections](/plugins/devices#section) as any app.

## Install

The bundle needs the three plugins it wires together, beside the engine. See [Adding one](/plugins/#adding-one).

```json
{
  "dependencies": {
    "@ifloom/engine": "0.0.0",
    "@ifloom/plugin-devices": "0.0.0",
    "@ifloom/plugin-messages": "0.0.0",
    "@ifloom/plugin-feed": "0.0.0",
    "@ifloom/phone": "0.0.0"
  }
}
```

## phone

```ts
function phone(options?: PhoneOptions): PhoneKit
```

Builds the phone. Call it once, when you build the game, and pass on both halves of what it returns:

```ts
import { loadGame, type Pack } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { quests } from '@ifloom/plugin-quests'
import { phone } from '@ifloom/phone'

declare const town: Pack // your content

const kit = phone()

const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  introScene: 'intro',
  plugins: [calendar(), places({ start: 'flat' }), ...kit.plugins, quests()],
  collections: [...kit.collections],
})
```

With no options, you get a phone on the sidebar with Messages, Social, Contacts and Gallery.

### PhoneOptions

```ts
import type { AppDef } from '@ifloom/plugin-devices'
import type { Channel } from '@ifloom/plugin-messages'
import type { FeedDef } from '@ifloom/plugin-feed'

type PhoneOptions = {
  id?: string
  name?: string
  sidebar?: boolean
  wallpaper?: string
  channels?: Channel[]
  feeds?: FeedDef[]
  contacts?: boolean
  gallery?: boolean
  apps?: Omit<AppDef, 'on'>[]
}
```

| Field | Default | What it does |
|---|---|---|
| `id` | `'phone'` | The device's id. It's what `devices/close`, `{ device }` conditions and the view call it. |
| `name` | `'Phone'` | What the player reads. |
| `sidebar` | `true` | Whether to offer it from the sidebar. |
| `wallpaper` | none | A picture behind the home screen. |
| `channels` | `[{ id: 'texts', name: 'Messages' }]` | The [message channels](/plugins/messages#channel). Each one is an app. |
| `feeds` | `[{ id: 'social', name: 'Social' }]` | The [feeds](/plugins/feed#feeddef). Each one is an app. Pass `[]` for none, and the feed plugin is left out too. |
| `contacts` | `true` | A Contacts app, listing the [cast](/plugins/cast)'s people the player has met and can call. It's empty in a game without the cast. |
| `gallery` | `true` | A Gallery app over a `gallery` collection, which the kit declares. |
| `apps` | none | The game's own apps, after the stock ones. They're [`AppDef`](/plugins/devices#appdef)s without `on`, because the kit puts them on the phone. |

The device's `frame` is always `'phone'`.

### PhoneKit

```ts
import type { CollectionDef, Plugin } from '@ifloom/engine'

type PhoneKit = {
  plugins: Plugin[]
  collections: CollectionDef[]
}
```

| Field | What it is |
|---|---|
| `plugins` | The devices, messages and feed plugins, in that order, for [`game.plugins`](/reference/game#game). There's no feed plugin when `feeds` is `[]`. |
| `collections` | The `gallery` [collection](/reference/collections), named `Photos`, for `game.collections`. It's empty when `gallery` is `false`. |

### The stock apps

| App id | Name | Icon | Badge | Sections |
|---|---|---|---|---|
| each channel's id | the channel's name | `messages` | `messages/unread-<channel>` | `{ plugin: 'messages', with: { channel } }` |
| each feed's id | the feed's name | `feed` | `feed/unseen-<feed>` | `{ plugin: 'feed', with: { feed } }` |
| `contacts` | Contacts | `contacts` | none | `{ contacts: true }` |
| `gallery` | Gallery | `gallery` | none | `{ collection: 'gallery' }` |

The home screen lists them in that order, then the game's own `apps`. A pack can add more apps to the phone in `data.devices.apps` with `on: 'phone'`. See [Writing apps](/plugins/devices#writing-apps).

## A worked example

This is the [showcase](/guide/showcase#the-phone-kit-with-its-own-apps)'s phone. It sits on the sidebar with the stock apps, plus a Camera and a Notes app of the game's own. The camera can photograph Ava or Sam when they're in the room, and post the latest photo once a day. The player meets Ava at the café and she texts the next day. They can call her in the evening. The phone stays in the player's pocket at work.

The phone itself is one `phone()` call and one lock:

```ts
import { loadGame, type Pack } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { at, places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'
import { phone } from '@ifloom/phone'

declare const town: Pack // the showcase's content, below

const kit = phone({
  sidebar: true,
  apps: [
    {
      id: 'camera',
      name: 'Camera',
      icon: 'camera',
      sections: [
        {
          actions: [
            { id: 'photo-ava', label: 'Photograph Ava', command: { type: 'activity', id: 'photo-ava' } },
            { id: 'photo-sam', label: 'Photograph Sam', command: { type: 'activity', id: 'photo-sam' } },
            { id: 'post', label: 'Post your latest photo', command: { type: 'activity', id: 'post' } },
          ],
        },
      ],
    },
    { id: 'notes', name: 'Notes', icon: 'notes', sections: [{ collection: 'notes' }] },
  ],
})

const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  introScene: 'intro',
  startPhase: 'arrival',
  collections: kit.collections,
  // The calendar first, so the phone's plugins see the new day.
  plugins: [calendar({ start: { day: 0, period: 'night' } }), places({ start: 'flat' }), cast(), ...kit.plugins],
  rules: {
    resets: { postedToday: false },
    locks: [
      { when: { phase: ['arrival'] }, deny: ['*'], except: ['choose', 'input'], reason: 'Unpack first.' },
      // No phone at work.
      { when: at('office'), deny: ['devices/*'], reason: 'Not at work.' },
    ],
  },
})
```

The rest is content in the town's pack. These are the parts the phone uses (the full pack is in `examples/showcase/src/content/town.ts`):

```ts
import { type ActivityDef } from '@ifloom/engine'
import { here, person, type CharacterDef } from '@ifloom/plugin-cast'
import { period } from '@ifloom/plugin-calendar'
import type { MessageDef } from '@ifloom/plugin-messages'

// The camera: one photo of each person, if they're here to take.
const activities: ActivityDef[] = [
  ...(['ava', 'sam'] as const).map((who) => ({
    id: `photo-${who}`,
    requires: [{ reason: 'They aren’t here.', when: here(who) }],
    effects: [
      {
        kind: 'collect' as const,
        to: 'gallery',
        entry: { id: `photo.${who}`, title: who === 'ava' ? 'Ava at work' : 'Sam and the dog', image: `art/photo/${who}.svg` },
      },
    ],
  })),
  {
    id: 'post',
    cost: { stats: { energy: 5 } },
    requires: [
      { reason: 'Take a photo first.', when: { collection: 'gallery' } },
      { reason: 'You have posted today.', when: { not: { flag: 'postedToday' } } },
    ],
    // postLatest is a custom effect that posts the photo and rolls its likes.
    effects: [{ custom: 'postLatest' }, { kind: 'flag', key: 'postedToday', value: true }],
  },
]

// Ava can be called in the evening and at night (the rest of her entry is left out here).
const ava: Pick<CharacterDef, 'id' | 'call'> = {
  id: 'ava',
  call: { scene: 'ava.call', when: period('evening', 'night'), busy: 'She’s busy at the counter. Try her this evening.' },
}

// Her text arrives a turn after the player first talks to her. In the showcase, a turn is a day.
const text: MessageDef = {
  id: 'ava.text',
  channel: 'texts',
  from: 'ava',
  when: { all: [{ seen: 'ava.hi' }, { since: 'ava.hi', gte: 1 }] },
  body: [{ text: 'ava.text' }],
  replies: [{ id: 'yes', effects: [{ kind: 'stat', key: 'friendship', by: 5, of: person('ava') }] }, { id: 'later' }],
}
```

Here's how it plays. Moving day locks everything with `'*'`, so every app reads `Unpack first.` until the player unpacks:

```ts
import { apply, startingState, view, type Game, type GameState } from '@ifloom/engine'
import type { DevicesView } from '@ifloom/plugin-devices'

declare const game: Game // the game above

const phoneOf = (state: GameState) => (view(state, game).plugins.devices as DevicesView).devices[0]

let state = startingState(game)
phoneOf(state).apps.map((app) => app.disabled)   // ['Unpack first.', 'Unpack first.', ...]

state = apply(state, game, { type: 'choose', id: 'unpack' }).state
phoneOf(state)
// { id: 'phone', name: 'Phone', frame: 'phone', sidebar: true, wallpaper: null, badge: 0, open: null, apps: [...] }
phoneOf(state).apps.map((app) => app.name)
// ['Messages', 'Social', 'Contacts', 'Gallery', 'Camera', 'Notes']
```

### The camera and the gallery

The next morning the player goes to the café and talks to Ava. The camera's buttons are priced and refused like any action. Sam isn't here, and there's nothing to post yet:

```ts
import { apply, view, type Game, type GameState } from '@ifloom/engine'
import { openApp, type DevicesView } from '@ifloom/plugin-devices'
import type { FeedsView } from '@ifloom/plugin-feed'

declare const game: Game
declare let state: GameState // at the café on the first morning, after talking to Ava
const phoneOf = (state: GameState) => (view(state, game).plugins.devices as DevicesView).devices[0]

state = apply(state, game, openApp('camera')).state
phoneOf(state).open?.sections[0]
// { kind: 'actions', actions: [
//   { id: 'photo-ava', label: 'Photograph Ava', ... },
//   { id: 'photo-sam', label: 'Photograph Sam', disabled: 'They aren’t here.', ... },
//   { id: 'post', label: 'Post your latest photo', price: { stats: [{ id: 'energy', amount: 5, text: '5%' }] },
//     disabled: 'Take a photo first.', ... }] }

state = apply(state, game, { type: 'activity', id: 'photo-ava' }).state
state = apply(state, game, openApp('gallery')).state
phoneOf(state).open?.sections[0]
// { kind: 'list', entries: [{ id: 'photo.ava', title: 'Ava at work', text: '', image: 'art/photo/ava.svg', actions: [] }] }

state = apply(state, game, openApp('camera')).state
state = apply(state, game, { type: 'activity', id: 'post' }).state
const social = (view(state, game).plugins.feed as FeedsView).feeds.find((feed) => feed.id === 'social')!
social.posts[0]
// { id: 'post.photo.ava', mine: true, name: 'You', text: 'New town, new faces.', image: 'art/photo/ava.svg',
//   likes: <rolled>, comments: [{ from: 'ava', name: 'Ava', text: 'Lovely!' }], ... }
// The post button now reads 'You have posted today.'
```

### Calls

Contacts lists Ava once the player has met her, because she has a `call` and the cast counts her as met once `ava.hi`, her talk scene, has been on screen. Before that, Contacts is empty. In the morning she's busy, and in the evening she picks up, with the player still at home:

```ts
import { apply, view, type Game, type GameState } from '@ifloom/engine'
import { openApp, type DevicesView } from '@ifloom/plugin-devices'
import { call } from '@ifloom/plugin-cast'

declare const game: Game
declare let state: GameState // the same day, at home
const phoneOf = (state: GameState) => (view(state, game).plugins.devices as DevicesView).devices[0]

apply(state, game, call('ava')).refused   // in the morning: 'She’s busy at the counter. Try her this evening.'

// ...wait until the evening
state = apply(state, game, openApp('contacts')).state
phoneOf(state).open?.sections[0]
// { kind: 'list', entries: [{ id: 'ava', title: 'Ava', text: 'Runs the café', image: 'art/character/ava.svg',
//   actions: [{ id: 'call-ava', label: 'Call', command: { type: 'custom', name: 'cast/call', with: { who: 'ava' } } }] }] }
state = apply(state, game, call('ava')).state
state.sceneId           // 'ava.call'
```

### A text, with a notice and a badge

The player goes to bed with the calendar's [`sleep()`](/plugins/calendar#commands). That command ends the day, which is a turn in the showcase, so `{ since: 'ava.hi', gte: 1 }` holds once it has run. Ava's text arrives at the end of the `sleep` command itself, with a notice tagged with the channel:

```ts
import { apply, view, type Game, type GameState } from '@ifloom/engine'
import { openApp, type DevicesView } from '@ifloom/plugin-devices'
import { replyTo } from '@ifloom/plugin-messages'
import { sleep } from '@ifloom/plugin-calendar'

declare const game: Game
declare let state: GameState // that night, after the call
const phoneOf = (state: GameState) => (view(state, game).plugins.devices as DevicesView).devices[0]

state = apply(state, game, sleep()).state
view(state, game).notices.byTag.texts                          // 1
phoneOf(state).apps.find((app) => app.id === 'texts')?.badge   // 1
phoneOf(state).badge     // 3: the text, and Ava's and Sam's posts on Social

state = apply(state, game, openApp('texts')).state
phoneOf(state).open?.sections   // [{ kind: 'plugin', plugin: 'messages', with: { channel: 'texts' } }]
// The UI draws view.plugins.messages, channel 'texts'.
state = apply(state, game, replyTo('ava.text', 'yes')).state
phoneOf(state).badge     // 2: Social is still unseen
```

### At work

The lock refuses every devices command, greys out every app with its reason, and closes the app that was open when the player arrived:

```ts
import { apply, view, type Game, type GameState } from '@ifloom/engine'
import { openApp, type DevicesView } from '@ifloom/plugin-devices'
import { go } from '@ifloom/plugin-places'

declare const game: Game
declare let state: GameState // a weekday morning, at home
const phoneOf = (state: GameState) => (view(state, game).plugins.devices as DevicesView).devices[0]

state = apply(state, game, openApp('camera')).state
state = apply(state, game, go('high-street')).state
state = apply(state, game, go('office')).state
phoneOf(state).open                              // null: the camera closed on arrival
phoneOf(state).apps.map((app) => app.disabled)   // ['Not at work.', 'Not at work.', ...]
apply(state, game, openApp('texts')).refused     // 'Not at work.'
```

## Gotchas

- **Pass on `collections` as well as `plugins`.** The Gallery app lists the `gallery` collection. If the game doesn't declare it, the loader reports the app (`apps gallery · unknown collection "gallery"`) and every effect that collects into it (`activity photo-ava · unknown collection "gallery"`). Spread `kit.collections` into the game's `collections`, beside any of your own, or turn the gallery off with `gallery: false`.
- **Don't add the plugins a second time.** The kit already has devices, messages and feed. Adding `messages(...)` again gives two plugins with one id, which the loader reports. For more channels or feeds, pass `channels` and `feeds` to `phone()`.
- **Channels, feeds and apps share one list of ids.** Each one becomes an app with its own id, so a channel and a feed with the same id, or an app of yours called `contacts`, replace one another. Give each its own id.
- **Badges are named after the channels and feeds.** The texts app counts `messages/unread-texts`, and the Social app counts `feed/unseen-social`. Renaming a channel renames its value.
- **Messages and posts arrive only after a command.** They arrive at the end of the first command after which their `when` holds, so a text whose `when` holds on a new game arrives after the player's first command. See [Messages](/plugins/messages#gotchas).
- **Opening an app is free and doesn't leave the room.** The camera at the café photographs whoever is at the café. Opening the phone takes no time and moves nobody.
- **A `plugin` section only names the slice.** The Messages and Social apps carry `{ kind: 'plugin', plugin, with }`. The UI draws `view.plugins.messages` or `view.plugins.feed`, picking the channel or feed in `with`.
- **Contacts come from the cast.** The app lists the [cast](/plugins/cast)'s [`cast/contacts`](/plugins/cast#queries), which is the people with a `call` whom the player has [met](/plugins/cast#meeting-people). On a new game Contacts is empty until someone is met, and in a game without the cast it's always empty.
- **A lock on `devices/*` shuts the whole phone.** Every app is greyed out with the lock's reason, and an app left open closes after the command that makes the lock hold. A lock on `'*'`, such as the showcase's moving day, does the same unless its `except` lists `devices/open`. See [Devices](/plugins/devices#gotchas).
- **Stock app names aren't in the strings table.** They're names, not lines the plugins say, so you set them through `phone()`. `Messages` and `Social` come from the default `channels` and `feeds`, so pass your own with the names you want. `Contacts`, `Gallery` and the `Photos` collection have no option of their own. To rename one, turn the stock app off and add your own with the same sections, such as `{ id: 'people', name: 'People', icon: 'contacts', sections: [{ contacts: true }] }`.
- **The Call button's label is a string.** It's [`devices/call`](/plugins/devices#strings), and the devices, messages and feed plugins' refusals are strings too. See each plugin's Strings section and the [strings table](/reference/strings).
