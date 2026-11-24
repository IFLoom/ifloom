---
title: "Messages"
description: "The messages plugin delivers texts, emails or letters when the story allows, kept in threads with replies that work like choices."
---
`@ifloom/plugin-messages` delivers messages to the player when the story allows, such as texts, emails or letters on the mat, kept in threads with replies that work like choices. A message has a sender, a body of [blocks](/docs/0.1.0/reference/scenes#block) and replies that carry [effects](/docs/0.1.0/reference/effects). It arrives the first time its condition holds at the end of a command, or each time an effect draws it from a pool, and it raises a [notice](/docs/0.1.0/reference/notices) tagged with its channel. The game declares its channels and messages in `data.messages`, so a mod adds either. The plugin needs no other plugin and has no phone of its own. It cooperates with the [cast](/docs/0.1.0/reference/plugins/cast) for senders' names and faces, and with the [calendar](/docs/0.1.0/reference/plugins/calendar) for days. [Add a plugin](/docs/0.1.0/how-to/add-a-plugin) installs it, and [Build a phone](/docs/0.1.0/how-to/build-a-phone) shows a channel as an app.

In the showcase: `examples/showcase/src/story/ava.ts`, where Ava texts the day after you meet her, follows up a moment later, and sends a line of small talk from a pool each day once you've answered. `examples/showcase/src/world/phone.ts` declares the `texts` channel.

```ts
import {
  messages,
  messagesOf,
  channelsOf,
  type Arrival,
  type Channel,
  type ChannelView,
  type MessageDef,
  type MessagesState,
  type MessagesView,
  type MessageView,
  type ReplyDef,
  type ThreadView,
} from '@ifloom/plugin-messages'
```

## messages

The plugin's factory, which returns the plugin with the id `messages`. It takes no options. Every field of its result is in [`messages`](/docs/0.1.0/api/plugin-messages#messages), and its helpers are listed under [Functions](#functions).

After every command that goes through, the plugin's [`onCommand`](/docs/0.1.0/reference/plugin-api#oncommand) hook delivers each message whose `when` now holds and that hasn't arrived, in the order the game declares them. It never runs on `start`, so a message whose `when` holds in a new game arrives after the player's first command. A day is the calendar's day, or a turn in a game without the calendar, so list messages after the calendar in `plugins`.

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { cast } from '@ifloom/plugin-cast'
import { messages } from '@ifloom/plugin-messages'

declare const town: Content

export const { game } = loadGame([town], { id: 'small-town', title: 'Small Town', plugins: [calendar(), cast(), messages()] })
```

## Content

### Channel

A channel the game declares in `data.messages.channels`, such as texts, email or the doormat. Every field is in [`Channel`](/docs/0.1.0/api/plugin-messages#channel).

The loader merges channels by id, so a mod adds a channel or renames one, and the view lists them in order. A message names its channel by `id`, which is also the `tag` on the notices it raises.

```ts
import type { Content } from '@ifloom/engine'

export const phone: Content = { data: { messages: { channels: [{ id: 'texts', name: 'Messages' }, { id: 'letters', name: 'Letters' }] } } }
```

### MessageDef

A message the game declares in `data.messages.messages`. Every field is in [`MessageDef`](/docs/0.1.0/api/plugin-messages#messagedef).

The loader merges messages by id, so a mod adds a message or replaces one whole. A message arrives once, the first time its `when` holds at the end of a command, and stays whatever `when` does after. With no `when` it arrives after the first command. The `body` renders as a scene's does, with tokens, `when`s, speech and pictures, and the message's `effects` run each time it arrives, in the same command.

| Field | Meaning |
|---|---|
| `from` | The sender, an entity by reference or by a bare id read as a scene's [`speaker`](/docs/0.1.0/reference/scenes#speaker) is, or a name shown as written, such as `'Town council'`. |
| `thread` | The thread it goes in. The thread is the sender if left out, so every message from `ava` in a channel shares one thread. |
| `drawnFrom` | The pools [`messages/draw`](#messagesdraw) draws it from. A message with pools arrives only when drawn, never by `when` alone, and arrives again each time it's drawn, while its `when` holds. |
| `weight` | Its weight in a draw, against the others that can be drawn. 1 if left out, and 0 is never. |
| `after` | How long it waits once its `when` holds, `{ ms: 1500 }`, with its thread showing the sender typing unless `typing` is `false`. It arrives at once if left out. |

A message with `after` runs on the engine's [timers](/docs/0.1.0/reference/timers). The plugin keeps the waiting message in the save as `due` and starts its own timer, `messages.due`, which delivers it through the [`messages/due`](#messagesdue) effect when it runs out. Only the logged `tick` command runs a timer down, so a replay delivers it at the same point and a save made while it waits keeps waiting. One message waits at a time. While one does, any other message with `after` and every later message in its thread wait behind it, and a message without `after` in another thread still arrives at once.

Ava's first text arrives a day after you meet her, and a second follows two seconds later:

```ts
import { cast } from '@ifloom/plugin-cast'
import { messages, type MessageDef } from '@ifloom/plugin-messages'

export const texts: MessageDef[] = [
  {
    id: 'ava.text',
    channel: 'texts',
    from: 'ava',
    when: { all: [{ seen: 'ava.hi' }, { since: 'ava.hi', gte: 1 }] },
    body: [{ text: 'Good to meet you yesterday! Coffee’s on me next time 🙂' }],
    replies: [
      { id: 'yes', label: 'Deal!', effects: [{ stat: 'friendship', by: 5, of: cast.character('ava') }] },
      { id: 'later', label: 'Maybe later in the week' },
    ],
  },
  { id: 'ava.text.ps', channel: 'texts', from: 'ava', when: messages.arrived('ava.text'), after: { ms: 2000 }, body: [{ text: 'The café, not the one by the bus stop.' }] },
]
```

A message has no picture field of its own. A picture or a video goes in its body, as [markup](/docs/0.1.0/reference/prose#videos) or a `{ media }` block, and the view's `beats` keep it in order with the words.

### ReplyDef

A reply the player can send to a message, an entry of its `replies`. Every field is in [`ReplyDef`](/docs/0.1.0/api/plugin-messages#replydef).

The player sends one reply to each arrival, once. `label` is the reply's words, with tokens filled, and its id if left out. A translation rewords it under `messages/messages.<message>.replies.<reply>.label` in its [words table](/docs/0.1.0/reference/words). A reply is on offer only while its `when` holds. Its `effects` run after the plugin records the reply, and they can be plain effects or a [macro](/docs/0.1.0/reference/custom#macros).

## Conditions

Each condition is a [plugin call](/docs/0.1.0/reference/custom#plugincall), written by the helper beside it, and asks about the message's latest arrival. A message that hasn't arrived, or that the game doesn't have, is false.

### messages/arrived

Holds once the message has arrived, at least once.

```ts fragment
{ 'messages/arrived': { message: 'ava.text' } } // messages.arrived('ava.text')
```

### messages/since

Holds while the whole days since the message last arrived fall in the [range](/docs/0.1.0/reference/common#range). `{ not: messages.since(id, { lt: 3 }) }` keeps a message out of a draw for three days after it comes, and holds for a message that has never come.

```ts fragment
{ 'messages/since': { message: 'ava.text', gte: 2 } } // messages.since('ava.text', { gte: 2 })
```

### messages/replied

Holds once the player has replied to the message, with the reply `reply` if given. With a range, the whole days since the reply was sent must fall in it too, so `{ gte: 2 }` holds two days or more after the reply.

```ts fragment
{ 'messages/replied': { message: 'ava.text', reply: 'yes' } } // messages.replied('ava.text', 'yes')
```

### messages/read

Holds once the player has read the message, by opening its thread or by replying. Its helper is `messages.messageRead`, because `messages.read` writes the [command](#messagesread-1).

```ts fragment
{ 'messages/read': { message: 'ava.text' } } // messages.messageRead('ava.text')
```

## Effects

### messages/draw

Draws one message from the pool, among those whose `when` holds, by `weight`, and delivers it as a new arrival with its notice. Nothing arrives when none can be drawn. The draw is seeded by the save, the turn and the number of arrivals so far, so a replay or an undo draws the same message.

```ts fragment
{ 'messages/draw': { pool: 'ava.chat' } } // messages.draw('ava.chat')
```

Something has to run the draw, such as a [trigger](/docs/0.1.0/reference/triggers) with `once: { per: 'turn' }`, as the showcase's `ava.chat` trigger does once Ava has a reply:

```ts
import type { TriggerDef } from '@ifloom/engine'
import { messages } from '@ifloom/plugin-messages'

export const chat: TriggerDef = { id: 'ava.chat', once: { per: 'turn' }, when: messages.replied('ava.text'), effects: [messages.draw('ava.chat')] }
```

### messages/due

Delivers the message that's waiting, if one is. The plugin's `messages.due` timer runs it when the wait is over, so content never needs to, and it has no helper.

```ts fragment
{ 'messages/due': {} }
```

## Commands

Both commands go through [locks](/docs/0.1.0/reference/locks), which name them `messages/reply` and `messages/read`, or both as `messages/*`. Triggers and every plugin's `onCommand` hook run after them, so a reply whose effects make another message's `when` hold brings that message in the same command.

### messages/reply

Sends the reply `reply` to the arrival `message`, which marks the arrival replied and read and then runs the reply's effects. `message` is the [arrival's key](#arrival), which is the message's id for its first arrival. The view gives each reply its command with the right key.

```ts fragment
{ 'messages/reply': { message: 'ava.text', reply: 'yes' } } // messages.reply('ava.text', 'yes')
```

The plugin refuses it, in this order:

1. With `There is no such message.` (`messages/noSuchMessage`) when no arrival has that key.
2. With `You have already replied.` (`messages/alreadyReplied`) once a reply was sent.
3. With `That is not a reply on offer.` (`messages/notOnOffer`) when the message has no such reply, or the reply's `when` doesn't hold.

### messages/read

Marks every arrival in the thread `id` read, or with `channel` every arrival in that channel, or with neither every arrival. The plugin never refuses it. A UI sends it when the player opens a thread, and the view's `read` buttons send it.

```ts fragment
{ 'messages/read': { channel: 'letters' } } // messages.read({ channel: 'letters' })
```

## Values

Prose prints this as a token.

| Key | Meaning |
|---|---|
| `{{messages/unread}}` | The number of unread messages in every channel. |
| `{{messages/unread channel=texts}}` | The number of unread messages in that channel, and 0 for a channel the game doesn't have. |

The value works as a badge too, with the channel as its argument, as a [devices](/docs/0.1.0/reference/plugins/devices) app's `badge: { value: 'messages/unread', with: { channel: 'texts' } }` does. Code reads it with [`amountOf`](/docs/0.1.0/reference/amounts#amountof).

## State

### MessagesState

The messages a save keeps at `state.plugins.messages`: the arrivals, the reply sent to each and the day it was sent, the arrivals read, and the message waiting. Every field is in [`MessagesState`](/docs/0.1.0/api/plugin-messages#messagesstate).

The save keeps no message's words or replies, which the plugin reads from content. `replied`, `repliedOn` and `read` are by the arrival's key. `due` is the message waiting with its key, its thread and whether the thread shows typing, or `null`. A UI reads [`MessagesView`](#messagesview) instead.

### Arrival

One arrival of a message, an entry of `arrived`, oldest first. Every field is in [`Arrival`](/docs/0.1.0/api/plugin-messages#arrival).

`key` is the message's id for its first arrival, then `<id>~2`, `<id>~3` and on, so a message drawn again has its own reply and read mark each time. `turn` is the [turn](/docs/0.1.0/reference/state#turn) it arrived on, and `day` the calendar's day, or the turn in a game without the calendar.

## View

The plugin adds nothing to the room or the screen. A UI shows a channel where the game wants it, such as in a [devices](/docs/0.1.0/reference/plugins/devices) app or as letters on the mat.

Each arrival raises a [notice](/docs/0.1.0/reference/notices) with the id `messages.<key>`, the sender's name as its `title`, the message's first line as its `text` (cut to 80 characters) and the channel as its `tag`. An arrival in a thread whose last notice is still unseen replaces that notice, so a burst of texts is one notice with the newest line, and `view.notices.byTag.texts` counts threads with news. Reading a message doesn't dismiss its notice, and dismissing a notice doesn't read the message.

### MessagesView

The messages as the player sees them, in `view.plugins.messages`. Every field is in [`MessagesView`](/docs/0.1.0/api/plugin-messages#messagesview).

`channels` lists every channel, in the order the game declares them, empty ones included. `unread` counts the unread messages in every channel, and `waiting` is `true` while a message with `after` is on its way.

```ts fragment
{ channels: [{ id: 'texts', name: 'Messages', unread: 1, read: { … }, threads: [ … ] }], unread: 1, waiting: false }
```

### ChannelView

One channel as the player sees it, an entry of `channels`. Every field is in [`ChannelView`](/docs/0.1.0/api/plugin-messages#channelview).

`threads` lists the threads with an arrival, the one with the newest first. A thread whose first message is still on its way comes first, with no messages and `typing` on. `read` is a [`RenderedChoice`](/docs/0.1.0/reference/view#renderedchoice) labelled with the `messages/allRead` string that marks the channel read, or `null` while nothing in it is unread.

### ThreadView

One thread as the player sees it, an entry of a channel's `threads`. Every field is in [`ThreadView`](/docs/0.1.0/api/plugin-messages#threadview).

`id` is the messages' `thread`, or their sender. The plugin asks the cast's `cast/sender` [query](/docs/0.1.0/reference/plugins/cast#queries) for `name`, `image` and `portrait`, a person's face for an avatar. Without the cast it reads an entity's name and picture with [`speakerOf`](/docs/0.1.0/reference/plugin-views#speakerof), and anything else is shown as written with no picture. `messages` lists the arrivals, oldest first. `read` is a button labelled with the `messages/markRead` string that marks the thread read, or `null` while nothing in it is unread. `typing` is `true` while a message with `after` waits to arrive in this thread and its `typing` isn't `false`.

### MessageView

One arrival as the player sees it, an entry of a thread's `messages`. Every field is in [`MessageView`](/docs/0.1.0/api/plugin-messages#messageview).

`key` is the arrival's key, the one to use as a list key, and a message drawn twice is in its thread twice with one `id`. `beats` is the body rendered as a scene's is, with [`context.beats`](/docs/0.1.0/reference/plugin-views#beats), so pictures and videos sit in order with the words. `text` joins the beats' words for a UI that renders no beats. `replies` lists the replies on offer as `RenderedChoice` buttons until one is sent, and `replied` is then the sent reply's label.

[Render messages](/docs/0.1.0/how-to/render/phone-plugins#render-messages) renders this view in Plain JS, React and Vue.

## React UI

The React UI is optional: the `@ifloom/plugin-messages/react` subpath renders a channel for a game that uses [`@ifloom/react`](/docs/0.1.0/reference/react), and a game rendered another way never loads it. [Show plugins in the React UI](/docs/0.1.0/how-to/react/show-plugin-uis) adds it to a game.

### messagesUi

The plugin's [`PluginUi`](/docs/0.1.0/reference/react/kit#pluginui), listed in `mountGame`'s `plugins`. It renders a [`MessagesSection`](#messagessection) wherever a [devices](/docs/0.1.0/reference/plugins/devices) app has a `messages` section. Its type is in [`messagesUi`](/docs/0.1.0/api/plugin-messages#messagesui).

### MESSAGES_WORDS

The words the messages UI uses, by key, which a game rewords as `ui.<key>` in its strings as it does the React UI's own. Its value is in [`MESSAGES_WORDS`](/docs/0.1.0/api/plugin-messages#messages_words). The back button is the React UI's own `ui.back`, and the read buttons use the plugin's [strings](#strings).

| Key | Meaning |
|---|---|
| `ui.noMessages` | `No messages yet.`, the line of a channel with nothing in it. |
| `ui.typing` | `{name} is typing`, the typing bubble's label for screen readers. |
| `ui.typingShort` | `typing…`, a thread's last line in the list while the sender is typing. |

### MessagesSection

Renders the channel an app section's `with.channel` names, from `view.plugins.messages`, as a phone renders one. Its props are in [`MessagesSection`](/docs/0.1.0/api/plugin-messages#messagessection).

It opens on the list of threads, newest first, each with the sender's portrait, name, last line and a dot while it has unread messages, under the channel's **Mark all read** button. Choosing a thread opens it, with a back arrow, its messages as bubbles, and under each the reply sent or the replies on offer. A message's beats render with [`Beat`](/docs/0.1.0/reference/react/components#beat), so a picture or a clip shows in the bubble. A typing bubble follows the last message while the thread's `typing` is on. Opening a thread sends its `read` command, and an arrival in an open thread is marked read as it comes.

It renders nothing when the channel isn't in the view. A game replaces it as `MessagesSection` in [`components`](/docs/0.1.0/reference/react/components#components). Its parts are `channel` (with `data-channel`), `conversations`, `conversation` (with `data-thread`, and `data-unread` while unread), `conversation-portrait`, `conversation-name`, `conversation-last`, `conversation-unread`, `messages-empty`, `thread`, `thread-back`, `thread-title`, `thread-portrait`, `message` (with `data-message`, the arrival's key), `bubble` (with `data-from`, and `data-typing` on the typing bubble), `typing` and `button`.

### useMessages

Returns the messages' view from the running game with a `read` that marks a channel read, or `null` in a game without the plugin. It re-renders when the view changes. Its signature is in [`useMessages`](/docs/0.1.0/api/plugin-messages#usemessages).

### MessagesControls

The value `useMessages` returns, a [`MessagesView`](#messagesview) with `read(channel)`, which sends `messages/read` for the channel and returns the runner's [`Result`](/docs/0.1.0/reference/common#result). Every field is in [`MessagesControls`](/docs/0.1.0/api/plugin-messages#messagescontrols). A reply has its own `command`, which a component sends with [`useGame`](/docs/0.1.0/reference/react/components#usegame)'s `send`.

## Functions

The helpers are properties of `messages` and write its calls, typed:

- **`messages.arrived(message)`**, **`messages.since(message, range)`**, **`messages.replied(message, reply?, range?)`** and **`messages.messageRead(message)`** return the [conditions](#conditions).
- **`messages.draw(pool)`** returns the [`messages/draw`](#messagesdraw) effect.
- **`messages.reply(message, reply)`** returns the [`messages/reply`](#messagesreply) command, and **`messages.read(thread?)`** or **`messages.read({ channel })`** the [`messages/read`](#messagesread-1) command, as a [`CommandRef`](/docs/0.1.0/reference/custom#commandref).

A café line shows once the player said yes to Ava:

```ts
import type { Block } from '@ifloom/engine'
import { messages } from '@ifloom/plugin-messages'

export const coffee: Block = { text: 'Ava has a cup waiting for you.', when: messages.replied('ava.text', 'yes') }
```

### messagesOf

Returns the game's messages from `data.messages.messages`, merged from its content and packs, in order. Its signature is in [`messagesOf`](/docs/0.1.0/api/plugin-messages#messagesof).

### channelsOf

Returns the game's channels from `data.messages.channels`, merged from its content and packs, in order. Its signature is in [`channelsOf`](/docs/0.1.0/api/plugin-messages#channelsof).

```ts given
import { channelsOf, messagesOf } from '@ifloom/plugin-messages'

channelsOf(game) // [{ id: 'texts', name: 'Messages' }]
messagesOf(game).filter((message) => message.drawnFrom?.includes('ava.chat')).length // 4
```

## Checks

When the game loads, the plugin reports problems with each message against the content or pack it came from, with `where` as `messages <id>`:

| Problem | Cause |
|---|---|
| `unknown channel "fax"` | `channel` names a channel the game doesn't have. |
| `unknown storyline "ghost"` | `when` names something the game doesn't have. |
| `no prose for "ava.none"` | A body block names something the game doesn't have, or its `when` does. |
| `arrival: unknown storyline "ghost"` | The message's `effects` name something the game doesn't have. |
| `reply yes: unknown storyline "ghost"` | A reply's `when` or `effects` name something the game doesn't have. |
| `two replies are called "yes"` | Two replies of the message share an id. |
| `weight must be 0 or more` | `weight` is negative. |
| `after needs ms above 0` | `after` has no `ms` above 0. |
| `a message drawn from a pool arrives when drawn, so it can’t wait with after` | A message has both `drawnFrom` and `after`. |

A condition or `messages/reply` that names a message the game doesn't have gives `unknown message "ava.txt"` where it's written. A `messages/draw` that names a pool no message is in gives `draws from "nobody", but no message is drawn from it`, and a `messages/read` with an unknown channel gives `unknown channel "fax"`.

## Strings

A game, a pack or a translation rewords these by their full key in its [strings](/docs/0.1.0/reference/strings#stringkey-and-strings).

| Key | Meaning |
|---|---|
| `messages/noSuchMessage` | `There is no such message.` |
| `messages/alreadyReplied` | `You have already replied.` |
| `messages/notOnOffer` | `That is not a reply on offer.` |
| `messages/markRead` | `Mark read`, the label of a thread's `read` button. |
| `messages/allRead` | `Mark all read`, the label of a channel's `read` button. |

## Caveats

- The plugin tests `when` at the end of each command, so a message whose `when` held only partway through a command waits for a later command that ends while it holds. A `when` on something that stays true, such as a kv key, a day or a scene seen, arrives on time.
- The engine runs [triggers](/docs/0.1.0/reference/triggers) before the plugins' hooks, so a trigger on `messages.arrived(id)` fires on the command after the message came. The message's own `effects` run in the same command.
- A message with `after` arrives only when `tick` commands run its timer out, so a test or a UI that sends no ticks sends `{ type: 'tick', ms }` itself.
- A `from` that names no entity shows as written, and the loader doesn't report it, so a typo in a sender's id shows the typo.
