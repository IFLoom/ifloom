# Phone

`@ifloom/phone` puts a smartphone in a game in one call. It wires together the [devices](/plugins/devices), [messages](/plugins/messages) and [feed](/plugins/feed) plugins and puts the usual apps on the phone:

- one app for each message channel, with an unread badge;
- one app for each feed, with an unseen badge;
- Contacts, for the people the player can call, from the [cast](/plugins/cast);
- a Gallery, over a `gallery` collection it declares;
- any apps of the game's own.

```ts
import { phone, type PhoneOptions, type PhoneKit } from '@ifloom/phone'
```

It is a bundle, not a plugin. `phone()` returns the three plugins and the collection, ready to spread into the game. Everything else is content: messages, posts and the game's own apps are data, built from the same [sections](/plugins/devices#section) as any app.

## Install

The bundle needs the three plugins it wires together, beside the engine. See [Adding one](/plugins/#adding-one).

```json
{
  "dependencies": {
    "@ifloom/engine": "file:../ifloom/packages/engine",
    "@ifloom/plugin-devices": "file:../ifloom/packages/plugin-devices",
    "@ifloom/plugin-messages": "file:../ifloom/packages/plugin-messages",
    "@ifloom/plugin-feed": "file:../ifloom/packages/plugin-feed",
    "@ifloom/phone": "file:../ifloom/packages/phone"
  }
}
```

## phone

```ts
function phone(options?: PhoneOptions): PhoneKit
```

Builds the phone. Call it once, when the game is built, and pass on **both** halves of what it returns:

```ts
const kit = phone()

const { game } = loadGame(packs, {
  id: 'small-town',
  title: 'Small Town',
  introScene: 'intro.wake',
  plugins: [calendar(), places({ start: 'house' }), ...kit.plugins, quests()],
  collections: [...kit.collections],
})
```

With no options, that is a phone on the sidebar with Messages, Social, Contacts and Gallery.

### PhoneOptions

```ts
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
| `id` | `'phone'` | The device's id: what `devices/close`, `{ device }` conditions and the view call it. |
| `name` | `'Phone'` | What the player reads. |
| `sidebar` | `true` | Offer it from the sidebar. |
| `wallpaper` | none | A picture behind the home screen. |
| `channels` | `[{ id: 'texts', name: 'Messages' }]` | The [message channels](/plugins/messages#channel). Each is an app. |
| `feeds` | `[{ id: 'social', name: 'Social' }]` | The [feeds](/plugins/feed#feeddef). Each is an app. `[]` for none, and then the feed plugin is left out. |
| `contacts` | `true` | A Contacts app, listing the [cast](/plugins/cast)'s people the player has met and can call. Empty in a game without the cast. |
| `gallery` | `true` | A Gallery app over a `gallery` collection, which the kit declares. |
| `apps` | none | The game's own apps, after the stock ones. They are [`AppDef`](/plugins/devices#appdef)s without `on`: the kit puts them on the phone. |

The device's `frame` is always `'phone'`.

### PhoneKit

```ts
type PhoneKit = {
  plugins: Plugin[]
  collections: CollectionDef[]
}
```

| Field | What it is |
|---|---|
| `plugins` | The devices, messages and feed plugins, in that order, for [`game.plugins`](/reference/game#game). No feed plugin when `feeds` is `[]`. |
| `collections` | The `gallery` [collection](/reference/collections), named `Photos`, for `game.collections`. Empty when `gallery` is `false`. |

### The stock apps

| App id | Name | Icon | Badge | Sections |
|---|---|---|---|---|
| each channel's id | the channel's name | `messages` | `messages/unread-<channel>` | `{ plugin: 'messages', with: { channel } }` |
| each feed's id | the feed's name | `feed` | `feed/unseen-<feed>` | `{ plugin: 'feed', with: { feed } }` |
| `contacts` | Contacts | `contacts` | none | `{ contacts: true }` |
| `gallery` | Gallery | `gallery` | none | `{ collection: 'gallery' }` |

They are listed on the home screen in that order, then the game's own `apps`. A pack can add more apps to the phone in `data.devices.apps` with `on: 'phone'`. See [Writing apps](/plugins/devices#writing-apps).

## A worked example

A smartphone on the sidebar for a game in the small town. The player meets Ava at the café, and she texts the next day. The phone has a camera that only works with someone to photograph and keeps what it takes in the gallery. A creator app posts one photo a day for energy and a period of the day, and the game rolls how the post did. The player can call Ava, unless it is night. Time of day and bed are the [calendar](/plugins/calendar)'s. The phone stays in the player's pocket at work.

The [showcase](/guide/showcase#the-phone-kit-with-its-own-apps) builds the same phone, with a camera and a notes app of its own.

Ava is the [cast](/plugins/cast)'s, listed after places in `plugins`. This is everything the game writes for its phone. Apart from the content, it is one `phone()` call, two apps and one lock.

```ts
import { SCHEMA, loadGame, roll, type Pack } from '@ifloom/engine'
import { postTo, react } from '@ifloom/plugin-feed'
import { phone } from '@ifloom/phone'
import { calendar, pass, period, sleep } from '@ifloom/plugin-calendar'
import { at, places } from '@ifloom/plugin-places'
import { cast, call, here } from '@ifloom/plugin-cast'

const kit = phone({
  wallpaper: 'art/wall.jpg',
  feeds: [
    { id: 'social', name: 'Social' },
    { id: 'fans', name: 'Fans' },
  ],
  apps: [
    {
      id: 'camera', name: 'Camera', icon: 'camera',
      sections: [{ actions: [{ id: 'photo', label: 'Take a photo', command: { type: 'activity', id: 'photo' } }] }],
    },
    {
      id: 'studio', name: 'Fans · post', icon: 'star',
      sections: [
        { prose: [{ text: 'studio.stats' }] },
        { actions: [{ id: 'post', label: 'Post a photo', command: { type: 'activity', id: 'post' } }] },
      ],
    },
  ],
})

const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  // data.places.locations: house (with a Go to bed action, command: sleep()), cafe, work ...
  stats: [
    { id: 'energy', label: 'Energy', start: 50, spendable: true },
    { id: 'subscribers', label: 'Subscribers' },
  ],
  // scenes: ava.hi, ava.call ...
  activities: [
    {
      id: 'photo',
      requires: [{ reason: 'Nobody to take a picture of.', when: here('ava') }],
      effects: [{ kind: 'collect', to: 'gallery', entry: { id: 'ava.cafe', title: 'Ava at the café', image: 'art/ava-cafe.jpg' } }],
    },
    {
      id: 'post',
      cost: { stats: { energy: 10 } },
      requires: [
        { reason: 'Nothing to post yet.', when: { collection: 'gallery' } },
        { reason: 'You have posted today.', when: { not: { flag: 'postedToday' } } },
      ],
      effects: [
        pass(1),
        postTo('fans', 'fans.ava-cafe', { text: 'fans.ava-cafe', image: 'art/ava-cafe.jpg' }),
        { kind: 'flag', key: 'postedToday', value: true },
        { custom: 'fanReaction' },
      ],
    },
  ],
  prose: {
    'ava.hey': 'Good seeing you today.',
    'ava.hey#reply': 'You too!',
    'studio.stats': '{{v:subscribersLine}}',
    'fans.ava-cafe': 'Coffee with a friend.',
    'fans.nice': 'Love this',
    // places, ava.hi, ava.call ...
  },
  data: {
    cast: {
      characters: [
        {
          id: 'ava', name: 'Ava', role: 'Friend', home: 'cafe', talk: 'ava.hi',
          call: { scene: 'ava.call', when: { not: period('night') }, busy: 'Straight to voicemail.' },
        },
      ],
    },
    messages: {
      messages: [
        // A text that arrives the turn after the café: here, a turn is a day.
        {
          id: 'ava.hey', channel: 'texts', from: 'ava',
          when: { all: [{ seen: 'ava.hi' }, { since: 'ava.hi', gte: 1 }] },
          body: [{ text: 'ava.hey' }],
          replies: [{ id: 'reply' }],
        },
      ],
    },
  },
  custom: {
    values: { subscribersLine: (state) => `${state.stats.subscribers ?? 0} subscribers` },
    // How a post did: the game's own roll.
    effects: {
      fanReaction: (state) => [
        { kind: 'stat', key: 'subscribers', by: 1 + roll(5, state.seed, state.turn, 'fans.subscribers') },
        react('fans.ava-cafe', { likes: 5 + roll(20, state.seed, state.turn, 'fans.likes'), from: 'ava', text: 'fans.nice' }),
      ],
    },
  },
}

const { game, problems } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  introScene: 'intro.wake',
  // The calendar first, so the phone's plugins see the new day.
  plugins: [calendar(), places({ start: 'house' }), cast(), ...kit.plugins],
  collections: [...kit.collections],
  rules: {
    resets: { postedToday: false },
    // No phone at work.
    locks: [{ when: at('office'), deny: ['devices/*'], reason: 'Not at work.' }],
  },
})
```

How it plays, from a morning at home:

```ts
const phoneOf = (state: GameState) => (view(state, game).plugins.devices as DevicesView).devices[0]

phoneOf(state)
// { id: 'phone', name: 'Phone', frame: 'phone', sidebar: true, wallpaper: 'art/wall.jpg', badge: 0, open: null, apps: [...] }
phoneOf(state).apps.map((app) => app.name)
// ['Messages', 'Social', 'Fans', 'Contacts', 'Gallery', 'Camera', 'Fans · post']
```

**A text, with a notice and a badge.** The player meets Ava at the café, goes home and sleeps. Ava's text arrives on the first command of the next day, here going to bed itself, the calendar's [`sleep()`](/plugins/calendar#commands):

```ts
// ...to the café, talk to Ava, home, and sleep
view(state, game).notices.byTag                           // { texts: 1 }
phoneOf(state).badge                                       // 1
phoneOf(state).apps.find((app) => app.id === 'texts')?.badge   // 1

state = apply(state, game, openApp('texts')).state
phoneOf(state).open?.sections   // [{ kind: 'plugin', plugin: 'messages', with: { channel: 'texts' } }]
// The UI draws view.plugins.messages, channel 'texts'.
state = apply(state, game, replyTo('ava.hey', 'reply')).state
phoneOf(state).badge                                       // 0
```

**The camera and the gallery.** At home there is nobody to photograph. At the café the button works, and the photo goes in the gallery:

```ts
state = apply(state, game, openApp('camera')).state
phoneOf(state).open?.sections[0]
// { kind: 'actions', actions: [{ label: 'Take a photo', disabled: 'Nobody to take a picture of.', ... }] }

// ...to the café: the phone is still open on the camera
state = apply(state, game, { type: 'activity', id: 'photo' }).state
state = apply(state, game, openApp('gallery')).state
phoneOf(state).open?.sections[0]
// { kind: 'list', entries: [{ id: 'ava.cafe', title: 'Ava at the café', image: 'art/ava-cafe.jpg', ... }] }
```

**A post, once a day, at a price.** The creator app shows the subscriber count and the post button, priced from the activity:

```ts
state = apply(state, game, openApp('studio')).state
state = apply(state, game, { type: 'activity', id: 'post' }).state
state.stats.energy      // 40
phoneOf(state).open?.sections[0]   // { kind: 'prose', text: '<n> subscribers' }: n is 1 to 5, as rolled
phoneOf(state).open?.sections[1]   // { kind: 'actions', actions: [{ label: 'Post a photo', disabled: 'You have posted today.', ... }] }

const fans = (view(state, game).plugins.feed as FeedsView).feeds.find((entry) => entry.id === 'fans')!
fans.posts[0]
// { id: 'fans.ava-cafe', mine: true, text: 'Coffee with a friend.', likes: 5 to 24,
//   comments: [{ from: 'ava', name: 'Ava', text: 'Love this' }], ... }
```

**Calls.** Contacts lists Ava once the player has met her, because she has a `call` and the cast counts her met once `ava.hi`, her talk scene, has been on screen. Before the café, Contacts is empty. Calling her opens `ava.call` with the player still at home. At night, she does not pick up:

```ts
state = apply(state, game, openApp('contacts')).state
phoneOf(state).open?.sections[0]
// { kind: 'list', entries: [{ id: 'ava', title: 'Ava', text: 'Friend', actions: [{ label: 'Call', disabled: undefined, ... }] }] }
state = apply(state, game, call('ava')).state
state.sceneId           // 'ava.call'
// at night: refused, 'Straight to voicemail.'
```

**At work.** The lock refuses every devices command, greys out every app with its reason, and closes the app that was open when the player arrived:

```ts
state = apply(state, game, openApp('camera')).state
// ...at work
phoneOf(state).open                              // null: the camera closed on arrival
phoneOf(state).apps.map((app) => app.disabled)   // ['Not at work.', 'Not at work.', ...]
apply(state, game, openApp('texts')).refused     // 'Not at work.'
```

## Gotchas

- **Pass on `collections` as well as `plugins`.** The Gallery app lists the `gallery` collection, and the loader reports an app over a collection the game does not declare (`apps gallery · unknown collection "gallery"`), and every effect that collects into it (`activity photo · unknown collection "gallery"`). Spread `kit.collections` into the game's `collections`, beside any of your own, or turn the gallery off with `gallery: false`.
- **Don't add the plugins a second time.** The kit already has devices, messages and feed. Adding `messages(...)` again gives two plugins with one id, which the loader reports. For more channels or feeds, pass `channels` and `feeds` to `phone()`.
- **Channels, feeds and apps share one list of ids.** Each becomes an app with its own id, so a channel and a feed with the same id, or an app of yours called `contacts`, replace one another. Give each its own id.
- **Badges are named after the channels and feeds.** The texts app counts `messages/unread-texts`, and a feed called `fans` counts `feed/unseen-fans`. Renaming a channel renames its value.
- **Messages and posts arrive only after a command.** A text whose `when` holds on the first frame arrives after the player's first command. See [Messages](/plugins/messages#gotchas).
- **Opening an app is free and does not leave the room.** The camera at the café photographs who is at the café. Opening the phone takes no time and moves nobody.
- **A `plugin` section only names the slice.** The Messages and feed apps carry `{ kind: 'plugin', plugin, with }`. The UI draws `view.plugins.messages` or `view.plugins.feed`, picking the channel or feed in `with`.
- **Contacts are the cast's.** The app lists the [cast](/plugins/cast)'s [`cast/contacts`](/plugins/cast#queries): people with a `call` whom the player has [met](/plugins/cast#meeting-people). On a new game Contacts is empty until someone is met, and in a game without the cast it is always empty.
- **A lock on `devices/*` shuts the whole phone.** Every app is greyed out with the lock's reason, and an app left open closes after the command that makes the lock hold. A lock on `'*'`, such as an intro's, does the same unless its `except` lists `devices/open`. See [Devices](/plugins/devices#gotchas).
- **Stock app names are not in the strings table.** They are names, not lines the plugins say, so a game sets them through `phone()`: `Messages` and `Social` are the default `channels` and `feeds`, so pass your own with the names you want. `Contacts`, `Gallery` and the `Photos` collection have no option of their own: turn the stock app off and add your own with the same sections, such as `{ id: 'people', name: 'People', icon: 'contacts', sections: [{ contacts: true }] }`. The **Call** button on each contact is a string, [`devices/call`](/plugins/devices#strings), and so are the devices, messages and feed plugins' refusals; see each plugin's **Strings** section and the [strings table](/reference/strings).
