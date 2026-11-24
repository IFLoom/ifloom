---
title: "Render messages, the feed and devices"
description: "How-to for rendering the messages, feed and devices plugins in a UI of your own, in plain JS, React and Vue: threads of texts with replies, a feed of posts, and a phone or laptop with its apps, put together into one phone."
---
Render the plugins a phone is made of: the texts from [messages](/docs/reference/plugins/messages), the posts from the [feed](/docs/reference/plugins/feed), and the phone itself with its apps from [devices](/docs/reference/plugins/devices). Set up the runner first, as [Start your own UI](/docs/how-to/render/start) shows. In the React tabs, each plugin's UI comes from its `/react` subpath and goes in `mountGame`'s `plugins`, as [Show plugins in the React UI](/docs/how-to/react/show-plugin-uis) explains.

A game shows its messages and its feed inside an app on a device, so render them inside the open app, as the last section shows. [Build a phone](/docs/how-to/build-a-phone) writes the content.

## Render messages

`view.plugins.messages` holds the texts as a [`MessagesView`](/docs/api/plugin-messages#messagesview), with each channel's threads and their messages, and how many are `unread`. The React UI's `messagesUi` renders a [`MessagesSection`](/docs/api/plugin-messages#messagessection) wherever a device's app shows a messages channel.

::include[../../../../../snippets/plain/messages.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/mount-messages.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Messages.vue]{meta='tab="Vue" tab-group="framework"'}

Each thread has its `name`, its sender's `portrait`, its messages oldest first, and its `unread` count. A message's `replies` are ready buttons until the player sends one, and then `replied` holds the reply's words. A thread's `typing` is true while a message with `after` is on its way, which is the moment to show the sender typing.

A thread's `read` and a channel's `read` are buttons that mark them read, and each is null while nothing in it is unread. A message's `beats` hold its paragraphs, pictures and videos, rendered as a scene's beats are in [Render the scene and its choices](/docs/how-to/render/scene). [`useMessages`](/docs/api/plugin-messages#usemessages) gives the messages' view to a React component of your own.

## Render a feed

`view.plugins.feed` holds the posts as a [`FeedsView`](/docs/api/plugin-feed#feedsview), with each feed's posts, newest first, and how many are new. The React UI's `feedUi` renders a [`FeedSection`](/docs/api/plugin-feed#feedsection) wherever a device's app shows a feed.

::include[../../../../../snippets/plain/feed.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/mount-feed.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Feed.vue]{meta='tab="Vue" tab-group="framework"'}

Each post has its poster's `name` and `portrait`, its `text`, its `image` and `video`, its `likes` and its `comments`. `mine` is true for the player's own post, which a UI can set apart. A feed's `unread` counts the other people's posts the player hasn't seen, and its `seen` button marks them seen. [`useFeed`](/docs/api/plugin-feed#usefeed) gives the feed's view to a React component of your own.

## Render a device and its apps

`view.plugins.devices` holds each device as a [`DevicesView`](/docs/api/plugin-devices#devicesview), with its apps, whether it's out, and the app open on it. The React UI's `devicesUi` puts a button for each device in the side column, opens the device in a dialog, and puts each app with news in the notice strip.

::include[../../../../../snippets/plain/devices.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/mount-devices.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Devices.vue]{meta='tab="Vue" tab-group="framework"'}

The game's state records whether a device is out and which app is open, so every UI shows the same thing. Render a device only while its `shown` is true. Its `home` button brings it out on its home screen or back from an app, and its `close` button puts it away. Each app has a `badge`, a count or a dot (`true`), and a `command` that opens it, with the reason in `disabled` while it can't open.

The open app's `sections` are each a [`SectionView`](/docs/api/plugin-devices#sectionview), told apart by `type`:

- **`prose`**: words, with their `beats`.
- **`actions`**: buttons, each sending its `command`.
- **`list`**: entries, each with a `title`, `text`, `image` and buttons.
- **`plugin`**: another plugin's part, named by `plugin`, with `with` naming which, such as `{ channel: 'texts' }`.
- **`panel`**: a panel of the game's, rendered as [Render a panel](/docs/how-to/render/timers-minigames-panels#render-a-panel) shows.

Render a `plugin` section from that plugin's view. For `messages`, find the channel whose `id` is `with.channel` in `view.plugins.messages.channels` and render it as the messages section does. For `feed`, find the feed whose `id` is `with.feed`. In React, `devicesUi` leaves each `plugin` section to the UI of the plugin it names, so list `messagesUi` and `feedUi` beside it, or those apps open empty. [`useDevices`](/docs/api/plugin-devices#usedevices) gives the devices' view to a React component of your own.

For more on what these sections render, see:

- [Messages](/docs/reference/plugins/messages), [Feed](/docs/reference/plugins/feed) and [Devices](/docs/reference/plugins/devices).
- [The view](/docs/reference/view).
- [Build a phone](/docs/how-to/build-a-phone).
