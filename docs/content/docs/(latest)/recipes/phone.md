---
title: "A phone: devices, messages and feeds together"
description: "Put a smartphone in a game from three plugins and some content: an app per message channel and feed with unread badges, contacts, a gallery of photos, and apps of your own."
---
A phone in a game set in the present day is three plugins working together. The [devices](/docs/plugins/devices) plugin draws a device with apps on it, the [messages](/docs/plugins/messages) plugin keeps the texts, and the [feed](/docs/plugins/feed) plugin keeps the social posts. None of them knows about the others. You put them together with content: a device called `phone`, and an app on it for each channel and each feed.

This page builds the phone in the [showcase](/docs/guide/showcase), which has:

- a Messages app for texts, with an unread badge
- a Social app for the town's feed, with a badge for posts you haven't seen
- Contacts, for the people the player has met and can call
- a Gallery of the photos you hold
- a Camera and a Notes app of the game's own

The whole of it is in [`examples/showcase/src/world/phone.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/world/phone.ts).

## The plugins

List the three packages in your game's `package.json`, beside the engine (see [Adding one](/docs/plugins#adding-one)):

```json
{
  "dependencies": {
    "@ifloom/engine": "^0.0.0",
    "@ifloom/plugin-devices": "^0.0.0",
    "@ifloom/plugin-messages": "^0.0.0",
    "@ifloom/plugin-feed": "^0.0.0"
  }
}
```

Then add them to the game's `plugins`. Contacts come from the [cast](/docs/plugins/cast), so add that too if you want them:

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'
import { devices } from '@ifloom/plugin-devices'
import { messages } from '@ifloom/plugin-messages'
import { feed } from '@ifloom/plugin-feed'

declare const phone: Content // the phone, below
declare const town: Content[] // the rest of your content

const { game } = loadGame([phone, ...town], {
  id: 'small-town',
  title: 'Small Town',
  // The calendar first, so the phone's plugins see the new day.
  plugins: [calendar(), places({ start: 'flat' }), cast(), devices(), messages(), feed()],
})
```

None of the three takes options. Everything about the phone is content, in your content's `data`.

## The phone as content

The phone is one `Content` of its own. Put it first in your content list, so its apps come first on the home screen and the content after it can add to them.

```ts
import type { Content } from '@ifloom/engine'
import type { AppDef, DeviceDef } from '@ifloom/plugin-devices'
import type { Channel } from '@ifloom/plugin-messages'
import type { FeedDef } from '@ifloom/plugin-feed'

const device: DeviceDef = { id: 'phone', name: 'Phone', frame: 'phone', sidebar: true }

const channels: Channel[] = [{ id: 'texts', name: 'Messages' }]
const feeds: FeedDef[] = [{ id: 'social', name: 'Social' }]

const apps: AppDef[] = [
  // An app for each channel, counting its unread messages, with the messages plugin's view as its one section.
  ...channels.map((channel): AppDef => ({
    id: channel.id,
    name: channel.name,
    icon: 'messages',
    on: 'phone',
    badge: { value: 'messages/unread', with: { channel: channel.id } },
    sections: [{ plugin: 'messages', with: { channel: channel.id } }],
  })),
  // The same for each feed, counting the posts you haven't seen.
  ...feeds.map((entry): AppDef => ({
    id: entry.id,
    name: entry.name,
    icon: 'feed',
    on: 'phone',
    badge: { value: 'feed/unread', with: { feed: entry.id } },
    sections: [{ plugin: 'feed', with: { feed: entry.id } }],
  })),
  // The people you've met who have a `call`, each with a Call button.
  { id: 'contacts', name: 'Contacts', icon: 'contacts', on: 'phone', sections: [{ contacts: true }] },
  // The photos you hold, newest first.
  { id: 'gallery', name: 'Gallery', icon: 'gallery', on: 'phone', sections: [{ things: { of: 'photo' } }] },
]

export const phone: Content = {
  name: 'phone',
  // Photos are things the player holds. Unlisted, so they stay off the town's lists: the Gallery shows them.
  kinds: [{ id: 'photo', label: 'Photo', plural: 'Photos', listed: false }],
  data: {
    devices: { devices: [device], apps },
    messages: { channels },
    feed: { feeds },
  },
}
```

Each piece does one thing:

- **The device.** `frame: 'phone'` tells a UI to draw it as a phone (the React UI makes its dialog narrower), and `sidebar: true` offers it from the side column. Add a `wallpaper` for a picture behind the home screen. See [`DeviceDef`](/docs/plugins/devices#devicedef).
- **A messages app.** Its section `{ plugin: 'messages', with: { channel } }` doesn't hold any messages. It names the messages plugin's slice of the view and the channel to show, and the UI draws that. Its badge asks the messages plugin's `messages/unread` value for that channel. Write the messages themselves wherever the story needs them, in `data.messages.messages` with `channel: 'texts'` (see [Messages](/docs/plugins/messages)).
- **A social app.** It's the same as a messages app, with the feed plugin's section and its `feed/unread` value. Posts go in `data.feed.posts` with `feed: 'social'` (see [Feed](/docs/plugins/feed)).
- **Contacts.** `{ contacts: true }` lists the cast's people the player has [met](/docs/plugins/cast#meeting-people) who have a [`call`](/docs/plugins/cast#calls), each with a Call button. Without the cast it's empty.
- **The gallery.** `{ things: { of: 'photo' } }` lists the `photo` things `'you'` hold, newest first. The phone's content declares the `photo` kind itself, since neither the engine nor these plugins has one.

The phone's own badge, on the sidebar button, is every app's count added up, so a new text and two new posts show 3.

The channel and feed names are what the apps are called, written in place like every other name in content. To call the texts app "Texts", change the channel's `name`.

## Texts that arrive one at a time

A friend who sends three texts in a row shouldn't land them all at once. Give each message after the first an `after` with how long it takes, and a `when` that waits on the one before. The thread shows them typing in between:

```ts
import type { Content } from '@ifloom/engine'
import { messages, type MessageDef } from '@ifloom/plugin-messages'

const burst: MessageDef[] = [
  { id: 'ava.cafe.1', channel: 'texts', from: 'ava', when: { kv: 'phase', is: ['evening'] }, body: [{ text: 'Are you still at the café?' }] },
  { id: 'ava.cafe.2', channel: 'texts', from: 'ava', when: messages.arrived('ava.cafe.1'), after: { ms: 1500 }, body: [{ text: 'They have the good cake in.' }] },
  {
    id: 'ava.cafe.3',
    channel: 'texts',
    from: 'ava',
    when: messages.arrived('ava.cafe.2'),
    after: { ms: 2500 },
    body: [{ text: 'Save me a slice?' }],
    replies: [{ id: 'yes', label: 'On it' }, { id: 'no', label: 'Too late, sorry' }],
  },
]

export const evening: Content = { data: { messages: { messages: burst } } }
```

The first text arrives when the phase turns to evening. The second starts waiting in the same command, and arrives 1.5 seconds later. Then the third waits 2.5 seconds. Each raises a notice, and the newest replaces the one before while it's unseen, so the player sees one notice with the latest line.

The waits run on the engine's timers, so a UI's clock has to send `tick` commands. The React UI and [`startClock`](/docs/browser#startclock) do that whenever a timer runs. See [Messages that take a moment](/docs/plugins/messages#messages-that-take-a-moment).

## Taking photos

A photo is a thing made in play with [`create`](/docs/reference/effects#create) and given to the player, so the gallery has something to list. The showcase makes them from a Camera app, which is the next section.

```ts
import type { EffectRef } from '@ifloom/engine'

const snap: EffectRef = { create: 'photo', with: { id: 'ava', name: 'Ava at work', image: 'photo/ava.svg' }, at: 'player' }
```

The inventory would list photos too. To keep them in the phone only, list the kinds the inventory shows in its [`data.inventory.kinds`](/docs/plugins/inventory).

## An app of your own

Any app is built from the same [sections](/docs/plugins/devices#section), so an app of your own is another `AppDef` on the phone. The showcase's Camera is one section of actions. It can photograph Ava or Sam while they're in the room, and post the latest photo once a day:

```ts
import type { AppDef } from '@ifloom/plugin-devices'
import { cast } from '@ifloom/plugin-cast'

const camera: AppDef = {
  id: 'camera',
  name: 'Camera',
  icon: 'camera',
  on: 'phone',
  sections: [
    {
      actions: [
        ...(['ava', 'sam'] as const).map((who) => ({
          id: `photo-${who}`,
          label: who === 'ava' ? 'Photograph Ava' : 'Photograph Sam',
          blocked: [{ when: { not: cast.here(who) }, reason: 'They aren’t here.' }],
          effects: [{ create: 'photo', with: { id: who, name: who === 'ava' ? 'Ava at work' : 'Sam and the dog', image: `photo/${who}.svg` }, at: 'player' }],
        })),
        {
          id: 'post',
          label: 'Post your latest photo',
          cost: { stats: { energy: 5 } },
          blocked: [
            { when: { not: { count: { of: 'photo', at: 'player' } } }, reason: 'Take a photo first.' },
            { when: { kv: 'postedToday' }, reason: 'You have posted today.' },
          ],
          // postLatest is the game's own macro, in its rules: it posts the newest photo to the feed and rolls its likes.
          effects: [{ 'game/postLatest': true }, { kv: 'postedToday', to: true }],
        },
      ],
    },
  ],
}

// The notes you keep, such as a welcome note under the door.
const notes: AppDef = { id: 'notes', name: 'Notes', icon: 'notes', on: 'phone', sections: [{ things: { of: 'note' } }] }
```

Add them to the end of `apps`. The camera's buttons are priced and refused like any action, and one is done as `{ type: 'action', id: 'devices/photo-ava' }`, so give each an id no other app's action has. Opening an app is free and doesn't leave the room, so the camera at the café photographs whoever is at the café.

Other apps follow the same pattern. A bank is a `{ blocks }` section that prints a balance, and a shop that delivers is a section of actions. [Writing apps](/docs/plugins/devices#writing-apps) has the full list of sections.

## No phone at work

The phone is a device like any other, so a [lock](/docs/reference/locks) on `devices/*` shuts it. Every app greys out with the lock's reason, and an app left open closes:

```ts
import type { Content } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'

const office: Content = {
  locks: [{ id: 'no-phone', when: places.at('office'), deny: ['devices/*'], reason: 'Not at work.' }],
}
```

To lock a single app instead, give it a `blocked` entry, or a `when` to keep it off the home screen until it's installed.

## Mods can change the phone

Because the phone is content, a [mod](/docs/reference/mods) or any content after it can add an app or replace one. Apps are merged by id, as scenes are, so a pack with an app called `gallery` replaces the stock one, and a new id adds an app after the others:

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'

const radio: Pack = {
  id: 'mod:radio',
  schema: SCHEMA,
  prose: { 'radio.now': 'Town FM is playing something with a lot of brass in it.' },
  data: {
    devices: {
      apps: [{ id: 'radio', name: 'Radio', icon: 'radio', on: 'phone', sections: [{ blocks: [{ prose: 'radio.now' }] }] }],
    },
  },
}
```

A mod can add a channel or a feed the same way, in `data.messages.channels` or `data.feed.feeds`, with an app that shows it.

## Leaving things out

Take out what your game doesn't need:

- **No feed.** Drop `feed()` from `plugins`, the social apps and `data.feed`. Leave nothing behind that names the feed plugin: an app whose badge asks `feed/unread` or whose section names `feed` is reported when the game loads, as `no plugin value named "feed/unread"` or `the game has no plugin named "feed"`.
- **No gallery.** Drop the Gallery app. If nothing else makes photos, drop the `photo` kind too. A `things` section or a `create` naming a kind the game doesn't declare is reported as `unknown kind "photo"`.
- **No contacts.** Drop the Contacts app. In a game without the cast it's always empty, so drop it there.
- **No messages.** Then it isn't much of a phone. A device with your own apps needs only the devices plugin, as the [laptop](/docs/plugins/devices#a-worked-example) on the devices page shows.

## Drawing the phone

With the React UI, list the three plugins' UIs in [`plugins`](/docs/react/kit#the-plugins-option). `devicesUi` puts a button for the phone in the side column and opens it in a dialog. The messages and social apps' sections are drawn by `messagesUi` and `feedUi`, so list those too, or those apps open empty. The messages app opens on a list of conversations, each with a portrait, a name, the last line and an unread dot, and a tap opens the thread with a back button. A thread shows a typing bubble while a text with `after` is on its way.

With your own UI, read `view.plugins.devices` for the phone and its apps. The open app's sections are in `open.sections`. A `plugin` section only names a slice, so draw it from `view.plugins.messages` or `view.plugins.feed`, picking out the channel or feed in its `with`:

```ts tab="Plain JS" tab-group="framework"
// src/phone.ts
import type { Runner, View } from '@ifloom/engine'
import { devices, type DevicesView } from '@ifloom/plugin-devices'
import type { MessagesView } from '@ifloom/plugin-messages'
import type { FeedsView } from '@ifloom/plugin-feed'

export function phone(view: View, runner: Runner): HTMLElement | null {
  const device = (view.plugins.devices as DevicesView | undefined)?.devices.find((one) => one.id === 'phone')
  if (!device) return null
  const screen = document.createElement('section')
  screen.className = 'phone'
  if (!device.open) {
    // The home screen: a button for each app, with its badge, greyed out with why it can't be opened.
    for (const app of device.apps) {
      const button = screen.appendChild(document.createElement('button'))
      button.textContent = app.badge ? `${app.name} (${app.badge === true ? '•' : app.badge})` : app.name
      if (app.disabled) Object.assign(button, { disabled: true, title: app.disabled })
      button.onclick = () => runner.apply(app.command)
    }
    return screen
  }
  const back = screen.appendChild(document.createElement('button'))
  back.textContent = 'Back'
  back.onclick = () => runner.apply(device.home.command)
  screen.appendChild(document.createElement('h2')).textContent = device.open.name
  for (const section of device.open.sections) {
    if (section.type === 'plugin' && section.plugin === 'messages') {
      const channel = (view.plugins.messages as MessagesView).channels.find((one) => one.id === section.with.channel)
      for (const thread of channel?.threads ?? [])
        for (const message of thread.messages) screen.appendChild(document.createElement('p')).textContent = `${message.name}: ${message.text}`
    }
    if (section.type === 'plugin' && section.plugin === 'feed') {
      const feed = (view.plugins.feed as FeedsView).feeds.find((one) => one.id === section.with.feed)
      for (const post of feed?.posts ?? []) screen.appendChild(document.createElement('p')).textContent = `${post.name}: ${post.text} ♥ ${post.likes}`
    }
    if (section.type === 'list')
      for (const entry of section.entries) screen.appendChild(document.createElement('p')).textContent = entry.title
  }
  return screen
}
```

```tsx tab="React" tab-group="framework"
// src/main.ts
import { mountGame } from '@ifloom/react'
import { devicesUi } from '@ifloom/plugin-devices/react'
import { messagesUi } from '@ifloom/plugin-messages/react'
import { feedUi } from '@ifloom/plugin-feed/react'
import module from './game.ts'

// The phone's button in the side column, its dialog, and the texts and the feed inside its apps.
mountGame(module.build(), { plugins: [devicesUi, messagesUi, feedUi] })
```

```vue tab="Vue" tab-group="framework"
<!-- src/Phone.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { devices, type DevicesView, type SectionView } from '@ifloom/plugin-devices'
import type { MessagesView } from '@ifloom/plugin-messages'
import type { FeedsView } from '@ifloom/plugin-feed'
import { runner, view } from './runner.ts'

const device = computed(() => (view.value.plugins.devices as DevicesView | undefined)?.devices.find((one) => one.id === 'phone'))
const channel = (section: SectionView & { type: 'plugin' }) =>
  (view.value.plugins.messages as MessagesView).channels.find((one) => one.id === section.with.channel)
const feed = (section: SectionView & { type: 'plugin' }) => (view.value.plugins.feed as FeedsView).feeds.find((one) => one.id === section.with.feed)
</script>

<template>
  <section v-if="device" class="phone">
    <template v-if="!device.open">
      <button v-for="app in device.apps" :key="app.id" :disabled="!!app.disabled" :title="app.disabled" @click="runner.apply(app.command)">
        {{ app.name }}<span v-if="app.badge"> ({{ app.badge === true ? '•' : app.badge }})</span>
      </button>
    </template>
    <template v-else>
      <button @click="runner.apply(device.home.command)">Back</button>
      <h2>{{ device.open.name }}</h2>
      <template v-for="(section, index) in device.open.sections" :key="index">
        <template v-if="section.type === 'plugin' && section.plugin === 'messages'">
          <template v-for="thread in channel(section)?.threads ?? []" :key="thread.id">
            <p v-for="message in thread.messages" :key="message.key">{{ message.name }}: {{ message.text }}</p>
          </template>
        </template>
        <template v-if="section.type === 'plugin' && section.plugin === 'feed'">
          <p v-for="post in feed(section)?.posts ?? []" :key="post.id">{{ post.name }}: {{ post.text }} ♥ {{ post.likes }}</p>
        </template>
        <template v-if="section.type === 'list'">
          <p v-for="entry in section.entries" :key="entry.id">{{ entry.title }}</p>
        </template>
      </template>
    </template>
  </section>
</template>
```

These draw only the words. A message's `beats` and a post's `image` and `video` hold its pictures and clips, and a message's `replies` are buttons like any choice, each sending its `command`. The [Messages](/docs/plugins/messages#the-view) and [Feed](/docs/plugins/feed#the-view) pages list what each view holds, and [Building UI for plugins](/docs/recipes/plugin-ui) shows the same approach for other plugins.

## Gotchas

- **Channels, feeds and apps share one list of ids.** The `.map` gives each app its channel's or feed's id, so a channel and a feed with the same id, or an app of yours called `contacts`, replace one another. Give each its own id.
- **A badge names its channel or feed.** Renaming a channel's id means renaming it in its app's badge and section too. The `.map` above does that for you.
- **Messages and posts arrive only after a command.** One whose `when` holds on a new game arrives after the player's first command. See [Messages](/docs/plugins/messages#gotchas).
- **A lock on `'*'` shuts the phone too.** An intro that locks everything greys out every app, unless its `except` lists `devices/open`.
- **Problems are pinned on the phone's content.** With `name: 'phone'` on it, the loader reports a broken app as `phone · apps gallery · …`, so you know where to look.
