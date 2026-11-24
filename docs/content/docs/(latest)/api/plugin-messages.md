---
title: "@ifloom/plugin-messages"
description: "Every export of @ifloom/plugin-messages and its /react subpath: its signature and its fields."
---
Generated from the source of `@ifloom/plugin-messages` and `@ifloom/plugin-messages/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

## @ifloom/plugin-messages

- Functions: [`channelsOf`](#channelsof), [`messages`](#messages), [`messagesOf`](#messagesof)
- Types: [`Arrival`](#arrival), [`Channel`](#channel), [`ChannelView`](#channelview), [`MessageDef`](#messagedef), [`MessagesState`](#messagesstate), [`MessagesView`](#messagesview), [`MessageView`](#messageview), [`ReplyDef`](#replydef), [`ThreadView`](#threadview)

### Arrival

Type. Explained in [Messages](/docs/reference/plugins/messages#arrival).

The record a save keeps of one arrival of a message, in `MessagesState`'s `arrived`. A message drawn from a
pool can arrive again, and each arrival has its own reply and read mark.

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
| `key` | `string` |  |  | The arrival's key, the message's id the first time it arrives and then `<id>~2`, `<id>~3` and so on. The plugin keeps replies and reads by this key, and the reply command names it. |
| `message` | `string` |  |  | The message's id. |
| `turn` | `number` |  |  | The turn the message arrived on. |
| `day` | `number` |  |  | The day the message arrived, the calendar's day or the turn in a game without the calendar. |

### Channel

Type. Explained in [Messages](/docs/reference/plugins/messages#channel).

A channel the game declares in `data.messages.channels`, such as texts, email or the doormat.

```ts shape
import type { Channel } from '@ifloom/plugin-messages'
type Channel = {
  id: string
  name: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The channel's id, which a message's `channel` names. |
| `name` | `string` |  |  | The channel's name. |

### channelsOf

Function. Explained in [Messages](/docs/reference/plugins/messages#channelsof).

Returns the game's channels in order, from `data.messages.channels` in its content and packs.

```ts shape
import { channelsOf } from '@ifloom/plugin-messages'
function channelsOf(game: Game): Channel[]
```

Uses: [`Game`](/docs/api/engine#game), [`Channel`](#channel).

### ChannelView

Type. Explained in [Messages](/docs/reference/plugins/messages#channelview).

A channel as the player sees it, in `view.plugins.messages.channels`.

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
| `id` | `string` |  |  | The channel's id. |
| `name` | `string` |  |  | The channel's name. |
| `threads` | [`ThreadView[]`](#threadview) |  |  | The channel's threads, the one with the latest arrival first. |
| `unread` | `number` |  |  | The number of the channel's messages the player hasn't read. |
| `read` | [`RenderedChoice`](/docs/api/engine#renderedchoice) `\| null` |  |  | The button that marks the whole channel read, labelled with the `messages/allRead` string (`Mark all read`), or null while nothing in it is unread. |

### MessageDef

Type. Explained in [Messages](/docs/reference/plugins/messages#messagedef).

A message the game declares in `data.messages.messages`. It arrives once by its `when`, or each time `messages/draw` draws it from a pool.

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
| `id` | `string` |  |  | The message's id. |
| `channel` | `string` |  |  | The id of the channel the message arrives in. |
| `from` | `string` |  |  | The message's sender, a character id or any name the game's prose uses. |
| `thread` | `string` | yes |  | The id of the thread the message belongs in. The sender if left out. |
| `when` | [`Condition`](/docs/api/engine#condition) | yes |  | The condition for the message to arrive, the first time it holds after a command. Left out, the message arrives after the first command. For a message in a pool, `messages/draw` can draw it only while this holds, and any time if left out. |
| `drawnFrom` | `string[]` | yes |  | The pools `messages/draw` can draw the message from. A message with pools arrives only when drawn, never by `when` alone, and arrives again each time it is drawn. |
| `weight` | `number` | yes |  | The message's weight in a draw, against the others that can be drawn. 1 if left out. |
| `body` | [`Block[]`](/docs/api/engine#block) |  |  | The message's words, a body of blocks like a scene's. |
| `replies` | [`ReplyDef[]`](#replydef) | yes |  | The replies the player can choose from, one per arrival. None if left out. |
| `effects` | [`EffectRef[]`](/docs/api/engine#effectref) | yes |  | The effects that run each time the message arrives, in the same command, after the plugin records the arrival. A trigger on `messages/arrived` runs a command later, since triggers run before the plugins deliver. |
| `after` | `{ ms: number }` | yes |  | The message's wait of `ms` milliseconds after the thread's previous arrival, once its `when` holds. The message arrives at once if left out. The engine's `tick` runs it down as it does a timer. One message waits at a time, and while it waits, every other message with `after` and every later message in its thread wait until it has arrived. |
| `typing` | `boolean` | yes |  | True when the thread shows the other side typing while the message waits. True if left out. |

### messages

Function. Explained in [Messages](/docs/reference/plugins/messages#messages).

The messages plugin's factory, with its helpers as properties. `messages()` returns the plugin for the game's
`plugins`, and content calls helpers such as `messages.reply('hi', 'wave')`.

```ts shape
import { messages } from '@ifloom/plugin-messages'
function messages(): DefinedPlugin<MessagesState, MessagesView>
```

Uses: [`DefinedPlugin`](/docs/api/engine-plugin#definedplugin), [`MessagesState`](#messagesstate), [`MessagesView`](#messagesview).

| Helper | Signature | Description |
|---|---|---|
| `messages.reply` | `(message: string, reply: string):` [`CommandRef`](/docs/api/engine#commandref) | Returns the `messages/reply` command, which sends the reply to an arrival, by the message's id or the arrival's key. |
| `messages.draw` | `(pool: string):` [`EffectRef`](/docs/api/engine#effectref) | Returns the `messages/draw` effect, which draws one message from the pool and delivers it as a new arrival. |
| `messages.since` | `(message: string, range:` [`Range`](/docs/api/engine#range)`):` [`Condition`](/docs/api/engine#condition) | Returns the `messages/since` condition, which holds while the whole days since the message last arrived fall in the range. |
| `messages.read` | `(thread?: string \| { channel: string }):` [`CommandRef`](/docs/api/engine#commandref) | Returns the `messages/read` command, which marks a thread, a channel (`{ channel }`) or every message read. |
| `messages.arrived` | `(message: string):` [`Condition`](/docs/api/engine#condition) | Returns the `messages/arrived` condition, which holds once the message has arrived. |
| `messages.replied` | `(message: string, reply?: string, range?:` [`Range`](/docs/api/engine#range)`):` [`Condition`](/docs/api/engine#condition) | Returns the `messages/replied` condition, which holds once the player has replied to the message, with `reply` and in the range if given. |
| `messages.messageRead` | `(message: string):` [`Condition`](/docs/api/engine#condition) | Returns the `messages/read` condition, which holds once the player has read the message's latest arrival. |

### messagesOf

Function. Explained in [Messages](/docs/reference/plugins/messages#messagesof).

Returns the game's messages, from `data.messages.messages` in its content and packs.

```ts shape
import { messagesOf } from '@ifloom/plugin-messages'
function messagesOf(game: Game): MessageDef[]
```

Uses: [`Game`](/docs/api/engine#game), [`MessageDef`](#messagedef).

### MessagesState

Type. Explained in [Messages](/docs/reference/plugins/messages#messagesstate).

The messages a save keeps for the player, their arrivals, replies and reads. The plugin reads the messages from content.

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
| `arrived` | [`Arrival[]`](#arrival) |  |  | The arrivals so far, oldest first. |
| `replied` | `Record<string, string>` |  |  | The id of the reply sent to each arrival, by the arrival's key. |
| `repliedOn` | `Record<string, number>` |  |  | The day each reply was sent, by the arrival's key, the calendar's day or the turn without the calendar. |
| `read` | `Record<string, true>` |  |  | The arrivals the player has read, by key. |
| `due` | `{ key: string; thread: string; typing: boolean } \| null` |  |  | The message waiting to arrive, with its id, its thread and whether the thread shows typing, or null. The plugin's timer `messages.due` runs while it waits and delivers it when it runs out. |

### MessagesView

Type. Explained in [Messages](/docs/reference/plugins/messages#messagesview).

The messages as the player sees them, in `view.plugins.messages`.

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
| `channels` | [`ChannelView[]`](#channelview) |  |  | The game's channels in the order it declares them, each with its threads. |
| `unread` | `number` |  |  | The number of unread messages in all channels. |
| `waiting` | `boolean` |  |  | True while a message with `after` waits to arrive in any thread. |

### MessageView

Type. Explained in [Messages](/docs/reference/plugins/messages#messageview).

One arrival of a message as the player sees it, in a `ThreadView`'s `messages`.

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
| `id` | `string` |  |  | The message's id. A message that arrives twice shows twice, with one id and two keys. |
| `key` | `string` |  |  | The arrival's key, which a UI can use as a list key (see `Arrival`). |
| `from` | `string` |  |  | The message's sender as the message's `from` gives it, a character id or a name. |
| `name` | `string` |  |  | The sender's name if the sender is a character, else `from` as given. |
| `text` | `string` |  |  | The message's words with tokens filled, including any picture and video markup. |
| `beats` | [`SceneBeat[]`](/docs/api/engine#scenebeat) |  |  | The message's body rendered as beats, as a scene's is. The beats are its paragraphs and its pictures and videos, from markup or `{ media }` blocks, in the order written. |
| `turn` | `number` |  |  | The turn the message arrived on. |
| `read` | `boolean` |  |  | True once the player has read the message. |
| `replies` | [`RenderedChoice[]`](/docs/api/engine#renderedchoice) |  |  | The replies on offer until one is sent, each a button that sends its `command`. |
| `replied` | `string \| null` |  |  | The label of the reply sent, or null before one is sent. |

### ReplyDef

Type. Explained in [Messages](/docs/reference/plugins/messages#replydef).

A reply the game declares in a `MessageDef`'s `replies`. The player can send one reply to each arrival.

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
| `id` | `string` |  |  | The reply's id, unique within its message. |
| `label` | `string` | yes |  | The reply's label, such as "On my way", with tokens filled. The reply's id if left out. |
| `when` | [`Condition`](/docs/api/engine#condition) | yes |  | The condition that must hold for the reply to be on offer. |
| `effects` | [`EffectRef[]`](/docs/api/engine#effectref) | yes |  | The effects of sending the reply, after the plugin records it. |

### ThreadView

Type. Explained in [Messages](/docs/reference/plugins/messages#threadview).

A thread of messages as the player sees it, in a `ChannelView`'s `threads`.

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
| `id` | `string` |  |  | The thread's id, its `thread` or its sender. |
| `name` | `string` |  |  | The thread's name, the sender's name for a character or the id as given. |
| `image` | `string \| null` |  |  | The path of the sender's picture, their entity's `image` through `artSrc`, or null for a sender who is only a name. |
| `portrait` | `string \| null` |  |  | The path of the sender's face for an avatar, a character's `portrait` with the cast plugin, else their `image`. |
| `messages` | [`MessageView[]`](#messageview) |  |  | The thread's messages, oldest first. |
| `unread` | `number` |  |  | The number of the thread's messages the player hasn't read. |
| `read` | [`RenderedChoice`](/docs/api/engine#renderedchoice) `\| null` |  |  | The button that marks the thread read, labelled with the `messages/markRead` string (`Mark read`), or null while nothing in it is unread. |
| `typing` | `boolean` |  |  | True while a message with `after` waits to arrive in this thread and its `typing` isn't false. |

## @ifloom/plugin-messages/react

- Functions: [`useMessages`](#usemessages)
- Constants: [`MESSAGES_WORDS`](#messages_words), [`MessagesSection`](#messagessection), [`messagesUi`](#messagesui)
- Types: [`MessagesControls`](#messagescontrols)

### MESSAGES_WORDS

Const. Explained in [Messages](/docs/reference/plugins/messages#messages_words).

The messages plugin's UI words, in English. A game rewords any of them with `ui.<key>` in its strings.

```ts shape
import { MESSAGES_WORDS } from '@ifloom/plugin-messages/react'
const MESSAGES_WORDS: {
  noMessages: 'No messages yet.'
  typing: '{name} is typing'
  typingShort: 'typing…'
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `noMessages` | `'No messages yet.'` |  |  | The line a section shows while it has no conversations. |
| `typing` | `'{name} is typing'` |  |  | The label screen readers read for a typing bubble, with the sender's `{name}`. |
| `typingShort` | `'typing…'` |  |  | The last line a conversation shows while its next message is on its way. |

### MessagesControls

Type. Explained in [Messages](/docs/reference/plugins/messages#messagescontrols).

The messages plugin's view with a function that sends its read command, as `useMessages` returns it. Each reply is a
`RenderedChoice` whose `command` sends it.

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
| `channels` | [`ChannelView[]`](#channelview) |  |  | The game's channels in the order it declares them, each with its threads. |
| `unread` | `number` |  |  | The number of unread messages in all channels. |
| `waiting` | `boolean` |  |  | True while a message with `after` waits to arrive in any thread. |
| `read` | `(channel: string) =>` [`Result`](/docs/api/engine#result)`<`[`GameState`](/docs/api/engine#gamestate)`>` |  |  | Sends `messages/read`, which marks the channel's messages read. |

### MessagesSection

Const. Explained in [Messages](/docs/reference/plugins/messages#messagessection).

Renders one messages channel from `view.plugins.messages.channels` as a device's app section, in the style of a
phone. It shows the list of threads first, and opening a thread shows its messages and marks it read.

Each thread in the list (`conversations`) is a `conversation` button with the sender's portrait, name, last line and
an unread dot, under a button that marks the channel read. An empty channel shows the `messages-empty` line. An
open thread has a back button (`thread-back`), its messages, the reply sent, the replies on offer, and a typing
bubble while a message with `after` waits.

Each message is a `bubble` part with `data-from="them"` or `data-from="player"`, and the typing bubble also has
`data-typing`. A message's beats render through `Beat`, so its pictures and videos show as they do in a scene.

```ts shape
import { MessagesSection } from '@ifloom/plugin-messages/react'
const MessagesSection: ComponentType<SectionProps>
```

Uses: [`SectionProps`](/docs/api/react#sectionprops).

### messagesUi

Const. Explained in [Messages](/docs/reference/plugins/messages#messagesui).

The messages plugin's React UI, for `plugins` on `mountGame` or `GameProvider`. It renders a `MessagesSection`
wherever a device's app has a `messages` section, and adds the plugin's words.

```ts shape
import { messagesUi } from '@ifloom/plugin-messages/react'
const messagesUi: PluginUi
```

Uses: [`PluginUi`](/docs/api/react-kit#pluginui).

### useMessages

Function. Explained in [Messages](/docs/reference/plugins/messages#usemessages).

Returns the messages plugin's view and read command from the running game, or null in a game without the plugin. It re-renders when the view changes.

```ts shape
import { useMessages } from '@ifloom/plugin-messages/react'
function useMessages(): MessagesControls | null
```

Uses: [`MessagesControls`](#messagescontrols).
