---
title: "@ifloom/plugin-messages"
description: "Every export of @ifloom/plugin-messages and its /react subpath: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-messages` and `@ifloom/plugin-messages/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

## @ifloom/plugin-messages

- Functions: [`channelsOf`](#channelsof), [`messages`](#messages), [`messagesOf`](#messagesof)
- Types: [`Arrival`](#arrival), [`Channel`](#channel), [`ChannelView`](#channelview), [`MessageDef`](#messagedef), [`MessagesState`](#messagesstate), [`MessagesView`](#messagesview), [`MessageView`](#messageview), [`ReplyDef`](#replydef), [`ThreadView`](#threadview)

### Arrival

Type. Explained in [Messages](/docs/plugins/messages#arrival).

One arrival of a message. A message the story sends arrives once; one
drawn from a pool can arrive again, each time a new arrival with its own
reply and its own read mark.

```ts shape
import type { Arrival } from '@ifloom/plugin-messages'
type Arrival = {
  key: string
  message: string
  turn: number
  day: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `key` | `string` |  |  | This arrival's key: the message's id the first time it arrives, then `<id>~2`, `<id>~3` and on. Replies and reads are kept by it, and the reply command names it. |
| `message` | `string` |  |  | The message's id. |
| `turn` | `number` |  |  | The turn it arrived. |
| `day` | `number` |  |  | The day it arrived: the calendar's, or the turn in a game without it. |

### Channel

Type. Explained in [Messages](/docs/plugins/messages#channel).

Where messages go: texts, email, the doormat.

```ts shape
import type { Channel } from '@ifloom/plugin-messages'
type Channel = {
  id: string
  name: string
}
```

### channelsOf

Function. Explained in [Messages](/docs/plugins/messages#channelsof).

The game's channels, in order: `data.messages.channels`, from its content and packs.

```ts shape
import { channelsOf } from '@ifloom/plugin-messages'
function channelsOf(game: Game): Channel[]
```

Uses: [`Game`](/docs/api/engine#game), [`Channel`](#channel).

### ChannelView

Type. Explained in [Messages](/docs/plugins/messages#channelview).

```ts shape
import type { ChannelView } from '@ifloom/plugin-messages'
type ChannelView = {
  id: string
  name: string
  threads: ThreadView[]
  unread: number
  read: RenderedChoice | null
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `name` | `string` |  |  |  |
| `threads` | [`ThreadView[]`](#threadview) |  |  | Newest activity first. |
| `unread` | `number` |  |  | How many of its messages the player hasn't read. |
| `read` | [`RenderedChoice`](/docs/api/engine#renderedchoice) `\| null` |  |  | The button that marks the whole channel read (the `messages/allRead` string, `Mark all read`), or null while nothing in it is unread. |

### MessageDef

Type. Explained in [Messages](/docs/plugins/messages#messagedef).

```ts shape
import type { MessageDef } from '@ifloom/plugin-messages'
type MessageDef = {
  id: string
  channel: string
  from: string
  thread?: string
  when?: Condition
  drawnFrom?: string[]
  weight?: number
  body: Block[]
  replies?: ReplyDef[]
  effects?: EffectRef[]
  after?: { ms: number }
  typing?: boolean
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `channel` | `string` |  |  | The channel it arrives in, by id. |
| `from` | `string` |  |  | Who sent it: a character id, or any name the game's prose uses. |
| `thread` | `string` | yes |  | The thread it belongs in. The sender if left out. |
| `when` | [`Condition`](/docs/api/engine#condition) | yes |  | It arrives the first time this holds after a command; left out, after the first command. For a message drawn from a pool, it can be drawn only while this holds; left out, any time. |
| `drawnFrom` | `string[]` | yes |  | The pools it can be drawn from by `messages/draw`. A message with pools arrives only when drawn, never by `when` alone, and can arrive again each time it is drawn. |
| `weight` | `number` | yes |  | How likely a draw picks it, against the others that can be drawn: 1 if left out. |
| `body` | [`Block[]`](/docs/api/engine#block) |  |  | Its words, as a scene's body: prose blocks. |
| `replies` | [`ReplyDef[]`](#replydef) | yes |  | What the player can send back; one, once. None if left out. |
| `effects` | [`EffectRef[]`](/docs/api/engine#effectref) | yes |  | What happens as it arrives, each time it does: in the same command, after the arrival is recorded. A trigger on `messages/arrived` would run a command later, since triggers run before the plugins deliver. |
| `after` | `{ ms: number }` | yes |  | How long it takes to arrive once its `when` holds: `ms` milliseconds after the thread's previous arrival, run down by the engine's `tick` as a timer is. Left out, it arrives straight away. One message waits at a time, so the next waits until this one has come. |
| `typing` | `boolean` | yes |  | Whether its thread shows the other side typing while it waits. True if left out. |

### messages

Function. Explained in [Messages](/docs/plugins/messages#messages).

The plugin, with its helpers on it: `messages()` makes the plugin for the
game's `plugins`, and content is written with `messages.reply('hi', 'wave')`.

```ts shape
import { messages } from '@ifloom/plugin-messages'
function messages(): DefinedPlugin<MessagesState, MessagesView>
```

Uses: [`DefinedPlugin`](/docs/api/engine-plugin#definedplugin), [`MessagesState`](#messagesstate), [`MessagesView`](#messagesview).

| Helper | Signature | Description |
|---|---|---|
| `messages.reply` | `(message: string, reply: string):` [`CommandRef`](/docs/api/engine#commandref) |  |
| `messages.draw` | `(pool: string):` [`EffectRef`](/docs/api/engine#effectref) |  |
| `messages.since` | `(message: string, range:` [`Range`](/docs/api/engine#range)`):` [`Condition`](/docs/api/engine#condition) |  |
| `messages.read` | `(thread?: string \| { channel: string }):` [`CommandRef`](/docs/api/engine#commandref) |  |
| `messages.arrived` | `(message: string):` [`Condition`](/docs/api/engine#condition) |  |
| `messages.replied` | `(message: string, reply?: string, range?:` [`Range`](/docs/api/engine#range)`):` [`Condition`](/docs/api/engine#condition) |  |
| `messages.messageRead` | `(message: string):` [`Condition`](/docs/api/engine#condition) |  |

### messagesOf

Function. Explained in [Messages](/docs/plugins/messages#messagesof).

The game's messages: `data.messages.messages`, from its content and packs.

```ts shape
import { messagesOf } from '@ifloom/plugin-messages'
function messagesOf(game: Game): MessageDef[]
```

Uses: [`Game`](/docs/api/engine#game), [`MessageDef`](#messagedef).

### MessagesState

Type. Explained in [Messages](/docs/plugins/messages#messagesstate).

What the plugin keeps in a save.

```ts shape
import type { MessagesState, Arrival } from '@ifloom/plugin-messages'
type MessagesState = {
  arrived: Arrival[]
  replied: Record<string, string>
  repliedOn: Record<string, number>
  read: Record<string, true>
  due: { key: string; thread: string; typing: boolean } | null
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `arrived` | [`Arrival[]`](#arrival) |  |  | Every arrival, oldest first. |
| `replied` | `Record<string, string>` |  |  | The reply sent to each arrival, by its key. |
| `repliedOn` | `Record<string, number>` |  |  | The day each reply was sent, by the arrival's key: the calendar's, or the turn without it. |
| `read` | `Record<string, true>` |  |  | Arrivals the player has opened, by key. |
| `due` | `{ key: string; thread: string; typing: boolean } \| null` |  |  | The message waiting to arrive, if one is: its id, its thread, and whether the thread shows typing. The plugin's timer `messages.due` runs while it waits, and delivers it when it runs out. |

### MessagesView

Type. Explained in [Messages](/docs/plugins/messages#messagesview).

```ts shape
import type { MessagesView } from '@ifloom/plugin-messages'
type MessagesView = {
  channels: ChannelView[]
  unread: number
  waiting: boolean
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `channels` | [`ChannelView[]`](#channelview) |  |  | Every channel the game declares, in order, with its threads. |
| `unread` | `number` |  |  | How many messages are unread, in all channels. |
| `waiting` | `boolean` |  |  | Whether a message with `after` is waiting to arrive, in any thread. |

### MessageView

Type. Explained in [Messages](/docs/plugins/messages#messageview).

```ts shape
import type { MessageView } from '@ifloom/plugin-messages'
type MessageView = {
  id: string
  key: string
  from: string
  name: string
  text: string
  beats: SceneBeat[]
  turn: number
  read: boolean
  replies: RenderedChoice[]
  replied: string | null
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The message's id. A message drawn twice shows twice, with one id and two keys. |
| `key` | `string` |  |  | This arrival's key, for a UI's list key: see `Arrival`. |
| `from` | `string` |  |  | Who sent it, as written: a character id or a name. |
| `name` | `string` |  |  | The sender's name if they are a character, else `from` as written. |
| `text` | `string` |  |  | The words, filled in, with any picture and video markup in them. |
| `beats` | [`SceneBeat[]`](/docs/api/engine#scenebeat) |  |  | The words as beats, as a scene's are: paragraphs, and the pictures and videos in them in the order written, from markup or `{ media }` blocks. |
| `turn` | `number` |  |  | The turn it arrived. |
| `read` | `boolean` |  |  | Whether the player has read it. |
| `replies` | [`RenderedChoice[]`](/docs/api/engine#renderedchoice) |  |  | Replies on offer, until one is sent: buttons like any other, each sending its `command`. |
| `replied` | `string \| null` |  |  | The label of the reply sent, if one was. |

### ReplyDef

Type. Explained in [Messages](/docs/plugins/messages#replydef).

A reply the player can send.

```ts shape
import type { ReplyDef } from '@ifloom/plugin-messages'
type ReplyDef = {
  id: string
  label?: string
  when?: Condition
  effects?: EffectRef[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `label` | `string` | yes |  | Its words, as written, with tokens filled: "On my way". Its id if left out. |
| `when` | [`Condition`](/docs/api/engine#condition) | yes |  | Only on offer while this holds. |
| `effects` | [`EffectRef[]`](/docs/api/engine#effectref) | yes |  | What sending it does, besides recording the reply. |

### ThreadView

Type. Explained in [Messages](/docs/plugins/messages#threadview).

```ts shape
import type { ThreadView } from '@ifloom/plugin-messages'
type ThreadView = {
  id: string
  name: string
  image: string | null
  portrait: string | null
  messages: MessageView[]
  unread: number
  read: RenderedChoice | null
  typing: boolean
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `name` | `string` |  |  |  |
| `image` | `string \| null` |  |  | The sender's picture: their entity's `image`, through `artSrc`; null for a name as written. |
| `portrait` | `string \| null` |  |  | The sender's face, for an avatar: a person's `portrait` with the cast, else their `image`. |
| `messages` | [`MessageView[]`](#messageview) |  |  | Oldest first. |
| `unread` | `number` |  |  | How many of its messages the player hasn't read. |
| `read` | [`RenderedChoice`](/docs/api/engine#renderedchoice) `\| null` |  |  | The button that marks the thread read (the `messages/markRead` string, `Mark read`), or null while nothing in it is unread. |
| `typing` | `boolean` |  |  | Whether the other side is typing: a message with `after` is waiting to arrive in this thread, and its `typing` isn't false. |

## @ifloom/plugin-messages/react

- Functions: [`useMessages`](#usemessages)
- Constants: [`MESSAGES_WORDS`](#messages_words), [`MessagesSection`](#messagessection), [`messagesUi`](#messagesui)
- Types: [`MessagesControls`](#messagescontrols)

### MESSAGES_WORDS

Const.

The messages plugin's words, in English. A game rewords any with `ui.<key>` in its strings.

```ts shape
import { MESSAGES_WORDS } from '@ifloom/plugin-messages/react'
const MESSAGES_WORDS: {
  noMessages: 'No messages yet.'
  typing: '{name} is typing'
  typingShort: 'typing…'
}
```

### MessagesControls

Type.

What `useMessages` returns: the messages plugin's view, and its command. A reply is a `RenderedChoice`-shaped button: send its `command`.

```ts shape
import type { MessagesControls } from '@ifloom/plugin-messages/react'
type MessagesControls = {
  channels: ChannelView[]
  unread: number
  waiting: boolean
  read: (channel: string) => Result<GameState>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `channels` | [`ChannelView[]`](#channelview) |  |  | Every channel the game declares, in order, with its threads. |
| `unread` | `number` |  |  | How many messages are unread, in all channels. |
| `waiting` | `boolean` |  |  | Whether a message with `after` is waiting to arrive, in any thread. |
| `read` | `(channel: string) =>` [`Result`](/docs/api/engine#result)`<`[`GameState`](/docs/api/engine#gamestate)`>` |  |  | Mark a channel's messages read: sends `messages/read`. |

### MessagesSection

Const. Explained in [Messages](/docs/plugins/messages#messagessection).

A messages channel in an app, drawn as a phone draws one. First the
conversation list (`conversations`), newest first: each thread a
`conversation` button with the sender's portrait, their name, the last
line (or that they're typing) and an unread dot, with a button to mark the
channel read. With nothing in it yet, the `messages-empty` line. A tap opens
the thread, with a back button (`thread-back`): its messages, the reply
sent and the replies on offer, and a typing bubble while a message with
`after` is on its way. An open thread is marked read. Each bubble is a
`'bubble'` part, `data-from="them"` or `data-from="player"`; the typing one
also has `data-typing`. A message's words are drawn as beats through
`Beat`, so pictures and clips in it show as they do in a scene. A thin
default on `useMessages`.

```ts shape
import { MessagesSection } from '@ifloom/plugin-messages/react'
const MessagesSection: ComponentType<SectionProps>
```

Uses: [`SectionProps`](/docs/api/react#sectionprops).

### messagesUi

Const. Explained in [Messages](/docs/plugins/messages#messagesui).

The messages plugin's React UI, for `plugins` on `mountGame` or
`GameProvider`: a `MessagesSection` wherever a device's app shows a
messages channel, and the messages' words.

```ts shape
import { messagesUi } from '@ifloom/plugin-messages/react'
const messagesUi: PluginUi
```

Uses: [`PluginUi`](/docs/api/react-kit#pluginui).

### useMessages

Function. Explained in [Messages](/docs/plugins/messages#usemessages).

The messages plugin's view with its command, or null in a game without the plugin. `MessagesSection` is drawn from it.

```ts shape
import { useMessages } from '@ifloom/plugin-messages/react'
function useMessages(): MessagesControls | null
```

Uses: [`MessagesControls`](#messagescontrols).
