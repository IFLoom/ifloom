---
title: "Render messages, the feed and devices"
description: "Render texts with replies, a feed of posts and a device with its apps in a UI of your own, in plain JS, React or Vue."
---
Render the plugins a phone is made of: the texts from [messages](/docs/0.1.2/reference/plugins/messages), the posts from the [feed](/docs/0.1.2/reference/plugins/feed), and the phone itself with its apps from [devices](/docs/0.1.2/reference/plugins/devices). Set up the runner first, as [Start your own UI](/docs/0.1.2/how-to/render/start) shows. In the React tabs, each plugin's UI comes from its `/react` subpath and goes in `mountGame`'s `plugins`, as [Show plugins in the React UI](/docs/0.1.2/how-to/react/show-plugin-uis) explains.

A game shows its messages and its feed inside an app on a device, so render them inside the open app, as the last section shows. [Build a phone](/docs/0.1.2/how-to/build-a-phone) writes the content.

## Render messages

`view.plugins.messages` holds the texts as a [`MessagesView`](/docs/0.1.2/api/plugin-messages#messagesview), with each channel's threads and their messages, and how many are `unread`. The React UI's `messagesUi` renders a [`MessagesSection`](/docs/0.1.2/api/plugin-messages#messagessection) wherever a device's app shows a messages channel.

```ts tab="Plain JS" tab-group="framework"
import type { RunnerSnapshot } from '@ifloom/engine'
// runner, add and drawChoices, as in the vanilla template's src/main.ts.
import { add, drawChoices } from './runner.ts'

/** Each channel's threads, with their messages and the replies on offer, who is typing, and a button that marks a thread read. */
export function drawMessages(parent: HTMLElement, { view }: RunnerSnapshot): void {
  for (const channel of view.plugins.messages?.channels ?? []) {
    add(parent, 'h3', channel.unread ? `${channel.name} (${channel.unread})` : channel.name)
    for (const thread of channel.threads) {
      const box = add(parent, 'section', '', 'thread')
      add(box, 'h4', thread.name)
      for (const message of thread.messages) {
        const bubble = add(box, 'div', '', 'message')
        if (!message.read) bubble.dataset.unread = ''
        add(bubble, 'strong', message.name)
        add(bubble, 'p', message.text)
        // A reply is a button like any other; once sent, it's the words of the reply.
        if (message.replied) add(bubble, 'p', message.replied, 'replied')
        else drawChoices(bubble, message.replies)
      }
      // A message with `after` is on its way.
      if (thread.typing) add(box, 'p', `${thread.name} is typing…`, 'typing')
      // Mark read, while anything in the thread is unread.
      if (thread.read) drawChoices(box, [thread.read])
    }
  }
}
```

```tsx tab="React" tab-group="framework"
import { mountGame } from '@ifloom/react'
import { messagesUi } from '@ifloom/plugin-messages/react'
import module from './game.ts'

// A MessagesSection is rendered wherever a device’s app shows a messages channel.
mountGame(module.build(), { plugins: [messagesUi] })
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { runner, view } from './runner.ts'

// Each channel's threads, with their messages and the replies on offer, who is typing, and a button that marks a thread read.
</script>

<template>
  <template v-for="channel in view.plugins.messages?.channels" :key="channel.id">
    <h3>
      {{ channel.name }}<template v-if="channel.unread"> ({{ channel.unread }})</template>
    </h3>
    <section v-for="thread in channel.threads" :key="thread.id" class="thread">
      <h4>{{ thread.name }}</h4>
      <div v-for="message in thread.messages" :key="message.key" class="message" :data-unread="message.read ? undefined : ''">
        <strong>{{ message.name }}</strong>
        <p>{{ message.text }}</p>
        <!-- A reply is a button like any other; once sent, it's the words of the reply. -->
        <p v-if="message.replied" class="replied">{{ message.replied }}</p>
        <template v-else>
          <button
            v-for="reply in message.replies"
            :key="reply.id"
            :disabled="Boolean(reply.disabled)"
            :title="reply.disabled"
            @click="runner.apply(reply.command)"
          >
            {{ reply.label }}
          </button>
        </template>
      </div>
      <!-- A message with `after` is on its way. -->
      <p v-if="thread.typing" class="typing">{{ thread.name }} is typing…</p>
      <!-- Mark read, while anything in the thread is unread. -->
      <button v-if="thread.read" @click="runner.apply(thread.read.command)">{{ thread.read.label }}</button>
    </section>
  </template>
</template>
```

Each thread has its `name`, its sender's `portrait`, its messages oldest first, and its `unread` count. A message's `replies` are ready buttons until the player sends one, and then `replied` holds the reply's words. A thread's `typing` is true while a message with `after` is on its way, which is the moment to show the sender typing.

A thread's `read` and a channel's `read` are buttons that mark them read, and each is null while nothing in it is unread. A message's `beats` hold its paragraphs, pictures and videos, rendered as a scene's beats are in [Render the scene and its choices](/docs/0.1.2/how-to/render/scene). [`useMessages`](/docs/0.1.2/api/plugin-messages#usemessages) gives the messages' view to a React component of your own.

## Render a feed

`view.plugins.feed` holds the posts as a [`FeedsView`](/docs/0.1.2/api/plugin-feed#feedsview), with each feed's posts, newest first, and how many are new. The React UI's `feedUi` renders a [`FeedSection`](/docs/0.1.2/api/plugin-feed#feedsection) wherever a device's app shows a feed.

```ts tab="Plain JS" tab-group="framework"
import type { RunnerSnapshot } from '@ifloom/engine'
// add and drawChoices, as in the vanilla template's src/main.ts.
import { add, drawChoices } from './runner.ts'

/** Each feed's posts, newest first, with their likes and comments, and a button that marks the feed seen. */
export function drawFeed(parent: HTMLElement, { view }: RunnerSnapshot): void {
  for (const feed of view.plugins.feed?.feeds ?? []) {
    add(parent, 'h3', feed.unread ? `${feed.name} (${feed.unread} new)` : feed.name)
    for (const post of feed.posts) {
      const card = add(parent, 'article', '', post.mine ? 'post mine' : 'post')
      add(card, 'strong', post.name)
      add(card, 'p', post.text)
      if (post.image) Object.assign(add(card, 'img'), { src: post.image, alt: '' })
      add(card, 'span', `${post.likes} likes`, 'likes')
      for (const comment of post.comments) add(card, 'p', `${comment.name}: ${comment.text}`, 'comment')
    }
    // Mark all seen, while anything in the feed is new.
    if (feed.seen) drawChoices(parent, [feed.seen])
  }
}
```

```tsx tab="React" tab-group="framework"
import { mountGame } from '@ifloom/react'
import { feedUi } from '@ifloom/plugin-feed/react'
import module from './game.ts'

// A FeedSection is rendered wherever a device’s app shows a feed.
mountGame(module.build(), { plugins: [feedUi] })
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { runner, view } from './runner.ts'

// Each feed's posts, newest first, with their likes and comments, and a button that marks the feed seen.
</script>

<template>
  <template v-for="feed in view.plugins.feed?.feeds" :key="feed.id">
    <h3>
      {{ feed.name }}<template v-if="feed.unread"> ({{ feed.unread }} new)</template>
    </h3>
    <article v-for="post in feed.posts" :key="post.id" :class="['post', { mine: post.mine }]">
      <strong>{{ post.name }}</strong>
      <p>{{ post.text }}</p>
      <img v-if="post.image" :src="post.image" alt="" />
      <span class="likes">{{ post.likes }} likes</span>
      <p v-for="(comment, at) in post.comments" :key="at" class="comment">{{ comment.name }}: {{ comment.text }}</p>
    </article>
    <!-- Mark all seen, while anything in the feed is new. -->
    <button v-if="feed.seen" @click="runner.apply(feed.seen.command)">{{ feed.seen.label }}</button>
  </template>
</template>
```

Each post has its poster's `name` and `portrait`, its `text`, its `image` and `video`, its `likes` and its `comments`. `mine` is true for the player's own post, which a UI can set apart. A feed's `unread` counts the other people's posts the player hasn't seen, and its `seen` button marks them seen. [`useFeed`](/docs/0.1.2/api/plugin-feed#usefeed) gives the feed's view to a React component of your own.

## Render a device and its apps

`view.plugins.devices` holds each device as a [`DevicesView`](/docs/0.1.2/api/plugin-devices#devicesview), with its apps, whether it's out, and the app open on it. The React UI's `devicesUi` puts a button for each device in the side column, opens the device in a dialog, and puts each app with news in the notice strip.

```ts tab="Plain JS" tab-group="framework"
import type { RunnerSnapshot } from '@ifloom/engine'
import type { DeviceView } from '@ifloom/plugin-devices'
// add and drawChoices, as in the vanilla template's src/main.ts.
import { add, drawChoices } from './runner.ts'

/** Each device: a button that brings it out, and while it's out, its open app or else its home screen of apps, with Home and Close. */
export function drawDevices(parent: HTMLElement, { view }: RunnerSnapshot): void {
  for (const device of view.plugins.devices?.devices ?? []) {
    const screen = add(parent, 'section', '', 'device')
    screen.dataset.device = device.id
    add(screen, 'h3', device.badge ? `${device.name} (${device.badge})` : device.name)
    // Whether it's out, and on what, is the game's state, so every UI shows the same.
    if (!device.shown) {
      drawChoices(screen, [{ ...device.home, label: `Take out the ${device.name}` }])
      continue
    }
    if (device.open) drawApp(screen, device)
    else
      drawChoices(
        screen,
        device.apps.map((app) => ({ id: app.id, label: app.name, disabled: app.disabled, command: app.command })),
      )
    // Home goes back from an app; Close puts it away.
    drawChoices(screen, device.open ? [device.home, device.close!] : [device.close!])
  }
}

/** The open app's sections. A `plugin` section is the messages' or the feed's, rendered as their pages show. */
function drawApp(screen: HTMLElement, device: DeviceView): void {
  for (const section of device.open?.sections ?? []) {
    if (section.type === 'prose') add(screen, 'p', section.text)
    else if (section.type === 'actions') drawChoices(add(screen, 'div'), section.actions)
    else if (section.type === 'list') {
      for (const entry of section.entries) {
        const row = add(screen, 'div', '', 'entry')
        add(row, 'strong', entry.title)
        add(row, 'p', entry.text)
        drawChoices(row, entry.actions)
      }
    }
  }
}
```

```tsx tab="React" tab-group="framework"
import { mountGame } from '@ifloom/react'
import { devicesUi } from '@ifloom/plugin-devices/react'
import { feedUi } from '@ifloom/plugin-feed/react'
import { messagesUi } from '@ifloom/plugin-messages/react'
import module from './game.ts'

// A button for each device goes in the side column. An app's messages and feed are rendered by those plugins' UIs, so list them too.
mountGame(module.build(), { plugins: [devicesUi, messagesUi, feedUi] })
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { runner, view } from './runner.ts'

// Each device: a button that brings it out, and while it's out, its open app or else its home screen of apps, with Home and Close.
// Whether it's out, and on what, is the game's state, so every UI shows the same.
// A `plugin` section is the messages' or the feed's, rendered as their pages show.
</script>

<template>
  <section v-for="device in view.plugins.devices?.devices" :key="device.id" class="device" :data-device="device.id">
    <h3>
      {{ device.name }}<template v-if="device.badge"> ({{ device.badge }})</template>
    </h3>
    <button v-if="!device.shown" @click="runner.apply(device.home.command)">Take out the {{ device.name }}</button>
    <template v-else-if="device.open">
      <template v-for="(section, at) in device.open.sections" :key="at">
        <p v-if="section.type === 'prose'">{{ section.text }}</p>
        <div v-else-if="section.type === 'actions'">
          <button v-for="action in section.actions" :key="action.id" :disabled="Boolean(action.disabled)" @click="runner.apply(action.command)">
            {{ action.label }}
          </button>
        </div>
        <template v-else-if="section.type === 'list'">
          <div v-for="entry in section.entries" :key="entry.id" class="entry">
            <strong>{{ entry.title }}</strong>
            <p>{{ entry.text }}</p>
            <button v-for="action in entry.actions" :key="action.id" :disabled="Boolean(action.disabled)" @click="runner.apply(action.command)">
              {{ action.label }}
            </button>
          </div>
        </template>
      </template>
      <!-- Home goes back from an app. -->
      <button @click="runner.apply(device.home.command)">{{ device.home.label }}</button>
    </template>
    <template v-else>
      <button v-for="app in device.apps" :key="app.id" :disabled="Boolean(app.disabled)" :title="app.disabled" @click="runner.apply(app.command)">
        {{ app.name }}<template v-if="app.badge"> ({{ app.badge }})</template>
      </button>
    </template>
    <!-- Close puts it away. -->
    <button v-if="device.close" @click="runner.apply(device.close.command)">{{ device.close.label }}</button>
  </section>
</template>
```

The game's state records whether a device is out and which app is open, so every UI shows the same thing. Render a device only while its `shown` is true. Its `home` button brings it out on its home screen or back from an app, and its `close` button puts it away. Each app has a `badge`, a count or a dot (`true`), and a `command` that opens it, with the reason in `disabled` while it can't open.

The open app's `sections` are each a [`SectionView`](/docs/0.1.2/api/plugin-devices#sectionview), told apart by `type`:

- **`prose`**: words, with their `beats`.
- **`actions`**: buttons, each sending its `command`.
- **`list`**: entries, each with a `title`, `text`, `image` and buttons.
- **`plugin`**: another plugin's part, named by `plugin`, with `with` naming which, such as `{ channel: 'texts' }`.
- **`panel`**: a panel of the game's, rendered as [Render a panel](/docs/0.1.2/how-to/render/timers-minigames-panels#render-a-panel) shows.

Render a `plugin` section from that plugin's view. For `messages`, find the channel whose `id` is `with.channel` in `view.plugins.messages.channels` and render it as the messages section does. For `feed`, find the feed whose `id` is `with.feed`. In React, `devicesUi` leaves each `plugin` section to the UI of the plugin it names, so list `messagesUi` and `feedUi` beside it, or those apps open empty. [`useDevices`](/docs/0.1.2/api/plugin-devices#usedevices) gives the devices' view to a React component of your own.

For more on what these sections render, see:

- [Messages](/docs/0.1.2/reference/plugins/messages), [Feed](/docs/0.1.2/reference/plugins/feed) and [Devices](/docs/0.1.2/reference/plugins/devices).
- [The view](/docs/0.1.2/reference/view).
- [Build a phone](/docs/0.1.2/how-to/build-a-phone).
