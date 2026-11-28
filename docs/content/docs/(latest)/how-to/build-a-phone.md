---
title: "Build a phone"
description: "Put a phone in a game from the devices, messages and feed plugins, with texts, posts, unread badges and apps of your own."
---
Use this to give the player a phone with texts, a social feed, contacts, a gallery and apps of your own. A phone is three plugins put together by your content: [devices](/docs/reference/plugins/devices) shows a device with apps, [messages](/docs/reference/plugins/messages) keeps the texts and [feed](/docs/reference/plugins/feed) keeps the posts. None of them knows about the others. Contacts come from the [cast](/docs/reference/plugins/cast).

In the showcase, Small Town, the whole phone is in [`examples/showcase/src/world/phone.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/world/phone.ts).

## Add the plugins

Install `@ifloom/plugin-devices`, `@ifloom/plugin-messages` and `@ifloom/plugin-feed` as [Add a plugin](/docs/how-to/add-a-plugin#install-the-package) shows, then list them in the game's `plugins`. Put the calendar first, so the phone's plugins see a new day when one begins:

```ts
import { loadGame } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'
import { devices } from '@ifloom/plugin-devices'
import { messages } from '@ifloom/plugin-messages'
import { feed } from '@ifloom/plugin-feed'
import { phone } from './world/phone.ts'
import { town } from './world/town.ts'

export const { game } = loadGame([phone, ...town], {
  id: 'small-town',
  title: 'Small Town',
  plugins: [calendar(), places({ start: 'flat' }), cast(), devices(), messages(), feed()],
})
```

None of the three takes options. Everything about the phone is content in `data`.

## Put the phone in your content

Write the phone as one `Content` of its own, first in your content list, so its apps come first on the home screen. Declare the device, the channel for texts and the feed:

```ts
import type { AppDef, DeviceDef } from '@ifloom/plugin-devices'
import type { Channel } from '@ifloom/plugin-messages'
import type { FeedDef } from '@ifloom/plugin-feed'

const device: DeviceDef = { id: 'phone', name: 'Phone', frame: 'phone', sidebar: true }
const channels: Channel[] = [{ id: 'texts', name: 'Messages' }]
const feeds: FeedDef[] = [{ id: 'social', name: 'Social' }]
```

`frame: 'phone'` asks a UI to render it as a phone, and `sidebar: true` offers it from the side column. Give it a `wallpaper` for a picture behind the home screen.

Add an app for each channel and each feed. Its badge counts what's unread, and its one section names the plugin whose view it shows:

```ts continues
const apps: AppDef[] = [
  ...channels.map((channel): AppDef => ({
    id: channel.id,
    name: channel.name,
    icon: 'messages',
    on: 'phone',
    badge: { value: 'messages/unread', with: { channel: channel.id } },
    sections: [{ plugin: 'messages', with: { channel: channel.id } }],
  })),
  ...feeds.map((entry): AppDef => ({
    id: entry.id,
    name: entry.name,
    icon: 'feed',
    on: 'phone',
    badge: { value: 'feed/unread', with: { feed: entry.id } },
    sections: [{ plugin: 'feed', with: { feed: entry.id } }],
  })),
  { id: 'contacts', name: 'Contacts', icon: 'contacts', on: 'phone', sections: [{ contacts: true }] },
  { id: 'gallery', name: 'Gallery', icon: 'gallery', on: 'phone', sections: [{ things: { of: 'photo' } }] },
]
```

Contacts lists the cast's people the player has met who have a `call`, each with a Call button. The Gallery lists the `photo` things `'you'` hold, newest first. Then put it all in the content, with the `photo` kind the Gallery lists:

```ts continues
import type { Content } from '@ifloom/engine'

export const phone: Content = {
  name: 'phone',
  kinds: [{ id: 'photo', label: 'Photo', plural: 'Photos', listed: false }],
  data: {
    devices: { devices: [device], apps },
    messages: { channels },
    feed: { feeds },
  },
}
```

`listed: false` keeps photos off the town's lists, so only the Gallery shows them. The phone's own badge is every app's count added up. Channels, feeds and apps share one list of ids, so give each its own: a channel and a feed both called `news` would replace one another.

## Send a text with replies

Write each text in `data.messages.messages` with its `channel`, wherever the story needs it. This one is Ava's, the day after the player meets her, with two replies:

```ts
import type { MessageDef } from '@ifloom/plugin-messages'
import { cast } from '@ifloom/plugin-cast'

export const avaText: MessageDef = {
  id: 'ava.text',
  channel: 'texts',
  from: 'ava',
  when: { all: [{ seen: 'ava.hi' }, { since: 'ava.hi', gte: 1 }] },
  body: [{ text: 'Good to meet you yesterday! Coffee’s on me next time 🙂' }],
  replies: [
    { id: 'yes', label: 'Deal!', effects: [{ stat: 'friendship', by: 5, of: cast.character('ava') }] },
    { id: 'later', label: 'Maybe later in the week' },
  ],
}
```

A `from` that names an entity shows its name and picture. The text arrives at the end of the first command after its `when` holds, never on a new game's first screen. The player sends one reply, once, and the others go. To follow up on the reply, give the next text `when: messages.replied('ava.text', 'yes')`.

## Send texts one at a time

Give each text after the first an `after` with how long it takes, and a `when` that waits on the one before. The thread shows the sender typing in between:

```ts
import { messages, type MessageDef } from '@ifloom/plugin-messages'

export const burst: MessageDef[] = [
  { id: 'sam.up', channel: 'texts', from: 'sam', when: { kv: 'phase', is: ['evening'] }, body: [{ text: 'Are you up?' }] },
  { id: 'sam.radiator', channel: 'texts', from: 'sam', when: messages.arrived('sam.up'), after: { ms: 1500 }, body: [{ text: 'The radiator is knocking again.' }] },
  { id: 'sam.never', channel: 'texts', from: 'sam', when: messages.arrived('sam.radiator'), after: { ms: 2500 }, body: [{ text: 'Never mind, it stopped.' }] },
]
```

The waits run on the engine's [timers](/docs/reference/timers), so a UI's clock has to send `tick` commands. The React UI and [`startClock`](/docs/reference/browser#startclock) do. Each arrival raises a notice, and a newer one in the same thread replaces it while it's unseen, so the player sees one notice with the latest line. Give `typing: false` to a text that shouldn't show anyone typing, such as a delivery update.

## Send a text that comes again

Put the texts in a pool with `drawnFrom`, and draw from the pool with `messages.draw`. A [trigger](/docs/reference/triggers) with `once: { per: 'turn' }` draws once a turn:

```ts
import type { TriggerDef } from '@ifloom/engine'
import { messages, type MessageDef } from '@ifloom/plugin-messages'

export const smallTalk: MessageDef[] = ['rain', 'beans', 'river'].map((topic) => ({
  id: `ava.chat.${topic}`,
  channel: 'texts',
  from: 'ava',
  drawnFrom: ['ava.chat'],
  // Not the same line twice within three days.
  when: { not: messages.since(`ava.chat.${topic}`, { lt: 3 }) },
  body: [{ prose: `ava.chat.${topic}` }],
}))

export const chat: TriggerDef = { id: 'ava.chat', once: { per: 'turn' }, when: messages.replied('ava.text'), effects: [messages.draw('ava.chat')] }
```

Each draw delivers one text whose `when` holds as a new arrival, with its own replies and read mark. The draw is seeded by the save, so a replay or an undo draws the same text.

## Post to the feed

Write the town's posts in `data.feed.posts` with their `feed`, and a `when` for when each appears:

```ts
import type { PostDef } from '@ifloom/plugin-feed'
import { calendar } from '@ifloom/plugin-calendar'

export const cake: PostDef = {
  id: 'ava.cake',
  feed: 'social',
  from: 'ava',
  when: calendar.day({ gte: 1 }),
  body: [{ text: 'Lemon drizzle today. It will not last until noon.' }],
  likes: 14,
}
```

To let the player post, put `feed.post` in an action's effects, and react to it with `feed.react`. This park action passes a period, posts a photo of the river and rolls its likes in a [macro](/docs/reference/glossary#macro) of the game's own:

```ts
import type { GameRules } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { feed } from '@ifloom/plugin-feed'
import { places } from '@ifloom/plugin-places'

export const park = places.location({
  id: 'park',
  name: 'Riverside Park',
  exits: ['high-street'],
  body: [{ text: 'The river is slow and brown.' }],
  actions: [{ id: 'photoRiver', label: 'Photograph the river', effects: [calendar.pass(1), feed.post('social', 'river', { text: 'The river at dusk.', image: 'photo/river.svg' }), { 'game/howItDid': true }] }],
})

export const rules: GameRules = {
  macros: {
    howItDid: (_state, _args, { roll }) => [feed.react('river', { likes: 3 + roll(10, 'river.likes'), from: 'ava', text: 'Lovely!' })],
  },
}
```

The player's own posts are never unread, and `feed.posted()` holds once they've made one. The showcase's Camera app posts the newest photo with its `game/postLatest` macro in `examples/showcase/src/rules.ts`.

## Take photos for the gallery

Make a photo in play with the [`create`](/docs/reference/effects#create) effect and give it to the player. The showcase's Camera app does it from a button that's refused while Ava isn't here:

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
          blocked: [{ when: { not: cast.here('ava') }, reason: 'She isn’t here.' }],
          effects: [{ create: 'photo', with: { id: 'ava', name: 'Ava at work', image: 'photo/ava.svg' }, effects: [{ receive: '$', to: 'player' }] }],
        },
      ],
    },
  ],
}
```

Add it to the end of `apps`. Opening an app is free and doesn't move the player, so the camera at the café photographs whoever is at the café. An app's button is done as `{ type: 'action', id: 'devices/photo-ava' }`, so give each an id no other app's button has. The [inventory plugin](/docs/reference/plugins/inventory) lists photos too, unless its `data.inventory.kinds` leaves `photo` out.

## Add an app of your own

Build any app from the same [sections](/docs/reference/plugins/devices#section): `blocks` for words, `actions` for buttons, `things` for a list of what the player holds, and `panel` for a panel of your game's. Refuse an app with `blocked`, keep it off the home screen until its `when` holds, and give it a dot with a badge's `when`:

```ts
import type { AppDef } from '@ifloom/plugin-devices'

export const bank: AppDef = {
  id: 'bank',
  name: 'Bank',
  icon: 'bank',
  on: 'phone',
  blocked: [{ when: { not: { kv: 'bankAccount' } }, reason: 'You have no account yet.' }],
  sections: [{ blocks: [{ text: 'Your account is in good order.' }] }],
}

export const mail: AppDef = {
  id: 'mail',
  name: 'Mail',
  icon: 'mail',
  on: 'phone',
  when: { kv: 'emailSetUp' },
  badge: { when: { kv: 'newMail' } },
  sections: [{ panel: 'inbox', with: { unread: 1 } }],
}
```

A button in an `actions` section takes a `when` too, so a café app's Order a scarf button can hide once the player has one: `when: { not: { owned: 'clothing:scarf' } }`.

## Shut the phone in some places

Add a [lock](/docs/reference/locks) on `devices/*`. Every app greys out with the lock's reason, and an app left open closes:

```ts
import type { Content } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'

export const office: Content = {
  locks: [{ id: 'no-phone', when: places.at('office'), deny: ['devices/*'], reason: 'Not at work.' }],
}
```

A lock on `'*'`, such as one that holds through an intro, shuts the phone too, unless its `except` lists `devices/open`. To shut a single app, give it a `blocked` entry.

## Show it on screen

With the React UI, list `devicesUi`, `messagesUi` and `feedUi` from the three packages' `/react` subpaths in `mountGame`'s `plugins`. `devicesUi` puts a button for the phone in the side column and opens it in a dialog. The texts and the feed inside its apps are rendered by `messagesUi` and `feedUi`, so leave one out and its app opens empty. See [Show it on screen](/docs/how-to/add-a-plugin#show-it-on-screen).

With a UI of your own, render `view.plugins.devices`, and a `plugin` section from `view.plugins.messages` or `view.plugins.feed`, as [Render messages, the feed and devices](/docs/how-to/render/phone-plugins#render-a-device-and-its-apps) shows.

## Check it worked

Run `npm run check`. It reports what a phone names that the game lacks, such as a badge or a section left behind after you drop the feed plugin, or a Gallery with no `photo` kind. The `name: 'phone'` on the content pins each problem on it:

```text
phone · apps social · no plugin value named "feed/unread"; the game has no plugin "feed"
phone · apps gallery · unknown kind "photo"
```

Then play in `npm run dev`. Meet Ava, sleep, and open the phone: the Messages app has a badge of 1, and its thread has Deal! and Maybe later in the week.

## Variations

**Letters on the mat.** A channel doesn't need a device. Add a `letters` channel with no app, and give the flat an action that reads it, `{ id: 'mat', label: 'Pick up the post', command: messages.read({ channel: 'letters' }) }`. Render `view.plugins.messages` wherever the letters should show.

**A notice board.** A feed doesn't need one either. Declare a `board` feed in the high street's content, outside the phone's `feeds`, and give the high street an action `{ id: 'board', label: 'Read the notice board', command: feed.seen('board') }`.

**An app from a mod.** Apps are merged by id, as scenes are, so a [mod](/docs/reference/mods) adds an app with a new id in `data.devices.apps` and replaces one by using its id. It can add a channel or a feed the same way, in `data.messages.channels` or `data.feed.feeds`.

**No feed, gallery or contacts.** Drop the plugin, its apps and its `data` together. In a game without the cast, Contacts is always empty, so drop it there. A device of your own apps, such as a laptop, needs only the devices plugin.

For more, see:

- [Devices](/docs/reference/plugins/devices), with [`AppDef`](/docs/reference/plugins/devices#appdef) and [`Section`](/docs/reference/plugins/devices#section).
- [Messages](/docs/reference/plugins/messages), with [`MessageDef`](/docs/reference/plugins/messages#messagedef) and its [caveats](/docs/reference/plugins/messages#caveats).
- [Feed](/docs/reference/plugins/feed), with [`PostDef`](/docs/reference/plugins/feed#postdef).
- [How plugins work together](/docs/explanation/plugins).
