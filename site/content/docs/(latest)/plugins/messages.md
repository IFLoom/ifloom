---
title: "Messages"
description: "Texts, emails and letters that arrive when a condition holds, kept in channels and threads, with replies that work like choices."
---
`@ifloom/plugin-messages` delivers messages to the player when the story allows: texts, emails, letters on the mat. Messages are kept in threads, and the player answers with replies that work like choices.

You'd want it when people get in touch with the player rather than the player going to them. In the showcase, Ava texts you the day after you meet her. If everything the player reads happens where they're standing, scenes are enough.

A message is like a scene that arrives instead of one the player walks into. It has [prose blocks](/docs/reference/scenes#block) for its words, a sender, and replies that carry [effects](/docs/reference/effects). It arrives the first time its condition holds at the end of a command, and it raises a [notice](/docs/reference/notices) tagged with its channel, so the UI can show a toast or a badge. A message can also sit in a pool, like a [storylet](/docs/reference/storylets), and arrive each time an effect draws it.

```ts
import { messages, messagesOf, channelsOf, type Channel, type MessageDef, type ReplyDef, type MessagesState, type Arrival, type MessagesView, type ChannelView, type ThreadView, type MessageView } from '@ifloom/plugin-messages'
```

The plugin knows nothing about phones. Your game decides what the channels are and where they're shown, such as a pile of post in the hall. With the [devices plugin](/docs/plugins/devices) a channel can be an app instead, and the [phone bundle](/docs/plugins/phone) sets that up for you.

## Install

List the package in your game's `package.json`, beside the engine:

```json
{
  "dependencies": {
    "@ifloom/engine": "^0.0.0",
    "@ifloom/plugin-messages": "^0.0.0"
  }
}
```

Then add `messages()` to the game's `plugins`. [Adding one](/docs/plugins#adding-one) has the details.

## messages

```ts
function messages(): DefinedPlugin<MessagesState, MessagesView>
```

Builds the plugin, with the id `messages`. Call it once, when you build the game. It takes no options: the channels and the messages are content, in your content's `data.messages`, so a mod can add either.

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'
import { messages } from '@ifloom/plugin-messages'

declare const town: Content // your content

const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  plugins: [
    calendar(),
    places({ start: 'flat' }),
    cast(),
    messages(),
  ],
})
```

The channels go in the content beside the messages:

```ts
data: {
  messages: {
    channels: [
      { id: 'texts', name: 'Texts' },
      { id: 'letters', name: 'Letters' },
    ],
    messages: [/* … */],
  },
}
```

The plugin lists `cooperates: ['cast']` (see [`cooperates`](/docs/reference/plugins#cooperates)). A sender who is an [entity](/docs/reference/entities), such as one of the [cast](/docs/plugins/cast)'s characters, is shown with their name and portrait, which the plugin reads with [`speakerOf`](/docs/reference/plugins#speakerof). Anyone else is shown as written.

### Channel

```ts
type Channel = { id: string; name: string }
```

| Field | What it is |
|---|---|
| `id` | What messages name the channel by, and the `tag` on the notices they raise. It's also what the [value](#values) `messages/unread` takes as `channel`. |
| `name` | What the player reads. |

Channels are content. List them in your content's `data.messages.channels`, in the order the view lists them. They're merged by id, so a mod can add a channel or rename one.

### channelsOf

```ts
function channelsOf(game: Game): Channel[]
```

The game's channels, merged from its content and packs, in order.

## Writing messages

Messages are content. List them in your content's [`data`](/docs/reference/loader#content) under `messages.messages`. They're merged by id as scenes are, so a mod can add a message or rewrite one.

### MessageDef

```ts
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
}
```

| Field | What it is |
|---|---|
| `id` | Unique among messages. |
| `channel` | The [channel](#channel) it arrives in. |
| `from` | Who sent it. Either an entity, by reference or a bare id as a scene's [speaker](/docs/reference/scenes#speakers) is (`'ava'`), or any name as it should be shown (`'Town council'`). An entity's name and picture are looked up, and anything else is shown as written. |
| `thread` | The thread it goes in. If you leave it out, the thread is the sender, so every message from `ava` in a channel goes in one thread. |
| `when` | It arrives the first time this [condition](/docs/reference/conditions) holds at the end of a command. Leave it out and it arrives after the first command. For a message in a pool, it can only be drawn while `when` holds. |
| `drawnFrom` | The pools it's in. A message in a pool arrives only when [`messages/draw`](#effects) draws it, and it can arrive again each time. See [Messages that come again](#messages-that-come-again). |
| `weight` | How likely a draw is to pick it, against the others in the pool that can be drawn. 1 if you leave it out, and 0 is never. |
| `body` | Its words, as [prose blocks](/docs/reference/scenes#block). They're the same blocks as a scene's body, with tokens and `when`s. A picture or a video goes in as [markup](/docs/reference/prose#videos) in the prose or as a `{ media }` block, and comes out in the view's `beats`. |
| `replies` | What the player can send back. The player sends one, once. Leave it out for a message with no replies. |

### ReplyDef

```ts
type ReplyDef = {
  id: string
  when?: Condition
  effects?: EffectRef[]
}
```

| Field | What it is |
|---|---|
| `id` | Unique within the message. |
| `label` | Its words, as written, with tokens filled in, as a [data scene choice](/docs/reference/scenes#choice)'s are. Its id if left out. A translation gives it other words under `messages/messages.<message>.replies.<reply>.label`. |
| `when` | The reply is only on offer while this holds. |
| `effects` | What sending it does, in order. These can be plain effects, one of the [game's own](/docs/reference/custom#effects) or a plugin's. |

This is the showcase's text from Ava. It arrives once a day has passed since the player first talked to her:

```ts
import { type MessageDef } from '@ifloom/plugin-messages'
import { cast } from '@ifloom/plugin-cast'

const text: MessageDef = {
  id: 'ava.text',
  channel: 'texts',
  from: 'ava',
  when: { all: [{ seen: 'ava.hi' }, { since: 'ava.hi', gte: 1 }] },
  body: [{ prose: 'ava.text' }],
  replies: [
    { id: 'yes', effects: [{ stat: 'friendship', by: 5, of: cast.character('ava') }] },
    { id: 'later' },
  ],
}
// prose: 'ava.text', 'ava.text#yes', 'ava.text#later'
```

### Messages that come again

A message the story sends arrives once. For one that keeps coming, such as Ava's small talk, put it in a pool with `drawnFrom` and draw from the pool with the effect `messages/draw`. Each draw picks one message whose `when` holds, by `weight`, and delivers it as a new arrival, with its own replies and its own read mark. The same message can be drawn again later.

Something has to run the draw. A [trigger](/docs/reference/triggers) with `once: 'turn'` draws once a turn, which in the showcase is once a day:

```ts
import type { Condition, TriggerDef } from '@ifloom/engine'
import { messages, type MessageDef } from '@ifloom/plugin-messages'

// Not the same line twice within three days.
const rested = (id: string): Condition => ({ not: messages.since(id, { lt: 3 }) })

const smallTalk: MessageDef[] = ['rain', 'beans', 'river'].map((topic) => ({
  id: `ava.chat.${topic}`,
  channel: 'texts',
  from: 'ava',
  drawnFrom: ['ava.chat'],
  when: rested(`ava.chat.${topic}`),
  body: [{ prose: `ava.chat.${topic}` }],
}))

// Once a day, after she's had a reply to her first text.
const chat: TriggerDef = { id: 'ava.chat', once: 'turn', when: messages.replied('ava.text'), effects: [messages.draw('ava.chat')] }
```

`messages.since(id, { lt: 3 })` holds while fewer than three days have passed since that message last arrived, so `{ not: … }` keeps it out of the draw for three days. Days are the [calendar](/docs/plugins/calendar)'s days, or turns in a game without the calendar. It's false for a message that has never come, so a fresh one is always in the draw.

The draw is seeded by the save, the turn and how many messages have arrived, so a replay or an undo draws the same message. When no message in the pool can be drawn, nothing arrives.

Each arrival has a key. The first is the message's id, and later ones are `<id>~2`, `<id>~3` and on. The view gives each arrival's replies with the right key in their command, so a UI doesn't build it.

## A worked example

A cut-down Small Town. The player meets Ava at the café, and she texts the next morning. Saying yes brings a second text. A letter from the town council lands on the mat on the second afternoon. There's no phone here. The texts and the letters are two channels, and the flat has a button to pick up the post.

The time of day comes from the [calendar](/docs/plugins/calendar), the map from [places](/docs/plugins/places) and Ava from the [cast](/docs/plugins/cast). The calendar goes first in `plugins`, so the messages plugin sees the new day when one begins.

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places, type PlaceDef } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'
import { messages } from '@ifloom/plugin-messages'

const place = (id: string, name: string, exits: string[]): PlaceDef =>
  ({ id, name, description: 'Small Town', exits, body: [{ prose: `place.${id}` }] })

const ava = cast.person({
  id: 'ava',
  name: 'Ava',
  description: 'Runs the café',
  image: 'art/character/ava.svg',
  home: 'park',
  schedule: [{ location: 'cafe', when: calendar.period('morning', 'afternoon') }],
  talk: 'ava.hi',
})

const map = [
  {
    ...place('flat', 'Your flat', ['high-street']),
    actions: [
      { id: 'bed', label: 'Go to bed', command: calendar.sleep() },
      { id: 'mat', label: 'Pick up the post', command: { 'messages/read': { channel: 'letters' } } },
    ],
  },
  place('high-street', 'High Street', ['flat', 'cafe', 'park']),
  place('cafe', 'The Corner Café', ['high-street']),
  place('park', 'Riverside Park', ['high-street']),
].map(places.location)

const town: Content = {
  stats: [{ id: 'friendship', label: 'Friendship', of: 'character' }],
  actions: [{ id: 'wait', effects: [calendar.pass(1)] }],
  entities: [ava, ...map],
  scenes: [
    { id: 'ava.hi', title: 'Ava', speaker: 'ava', body: [{ prose: 'ava.hi' }], choices: [{ id: 'bye', label: 'Leave her to it', effects: [{ scene: null }] }] },
  ],
  prose: {
    'place.flat': 'Boxes, mostly.',
    'place.high-street': 'A bakery, a launderette, a bus stop.',
    'place.cafe': 'Six tables, one of them wobbly.',
    'place.park': 'The river is slow and brown.',
    'ava.hi': 'Ava looks up from the till and grins.',
    'ava.text': 'Good to meet you yesterday! Coffee’s on me next time 🙂',
    'ava.beans': 'New beans in. Tell me if they’re awful.',
    'council.bins': 'Bins go out on Thursdays from now on.',
    'ui.inbox': 'Inbox ({{v:messages/unread}})',
  },
  data: {
    messages: {
      channels: [{ id: 'texts', name: 'Texts' }, { id: 'letters', name: 'Letters' }],
      messages: [
        {
          id: 'ava.text',
          channel: 'texts',
          from: 'ava',
          when: { all: [{ seen: 'ava.hi' }, { since: 'ava.hi', gte: 1 }] },
          body: [{ prose: 'ava.text' }],
          replies: [{ id: 'yes', label: 'Deal!', effects: [{ stat: 'friendship', by: 5, of: cast.character('ava') }] }, { id: 'later', label: 'Maybe later in the week' }],
        },
        {
          id: 'ava.beans',
          channel: 'texts',
          from: 'ava',
          when: messages.replied('ava.text', 'yes'),
          body: [{ prose: 'ava.beans' }],
        },
        {
          id: 'council.bins',
          channel: 'letters',
          from: 'Town council',
          when: { all: [calendar.day({ gte: 1 }), calendar.period('afternoon')] },
          body: [{ prose: 'council.bins' }],
        },
      ],
    },
  },
}

const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  plugins: [
    calendar(),
    places({ start: 'flat' }),
    cast(),
    messages(),
  ],
})
```

A new game starts in the flat on Monday morning. Played through:

```ts
import { apply, startingState, view, whyNot, type GameState } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'
import { messages, type MessagesView } from '@ifloom/plugin-messages'

const inbox = (state: GameState) => view(state, game).plugins.messages as MessagesView
const wait = { type: 'action', id: 'wait' } as const
let state = startingState(game)

// To the café, and say hello to Ava
state = apply(state, game, places.go('high-street')).state
state = apply(state, game, places.go('cafe')).state
state = apply(state, game, cast.talk('ava')).state
state = apply(state, game, { type: 'choose', id: 'bye' }).state
inbox(state).unread     // 0: a day has to pass first

// Home, wait until the evening, and go to bed
state = apply(state, game, places.go('high-street')).state
state = apply(state, game, places.go('flat')).state
state = apply(state, game, wait).state
state = apply(state, game, wait).state
state = apply(state, game, calendar.sleep()).state    // Day 2 · Tuesday morning, turn 1
inbox(state).channels[0].threads
// [{ id: 'ava', name: 'Ava', portrait: 'art/character/ava.svg', unread: 1, messages: [
//   { id: 'ava.text', from: 'ava', name: 'Ava', text: 'Good to meet you yesterday! Coffee’s on me next time 🙂',
//     turn: 1, read: false, replied: null,
//     replies: [{ id: 'yes', label: 'Deal!', command: messages.reply('ava.text', 'yes') }, { id: 'later', ... }] } ] }]
view(state, game).notices.byTag    // { texts: 1 }
// 'ui.inbox' reads "Inbox (1)"

whyNot(state, game, messages.reply('ava.text', 'maybe'))   // 'That is not a reply on offer.'
state = apply(state, game, messages.reply('ava.text', 'yes')).state
whyNot(state, game, messages.reply('ava.text', 'later'))   // 'You have already replied.'
inbox(state).channels[0].threads[0].messages
// [{ id: 'ava.text', read: true, replied: 'Deal!', replies: [], ... },
//  { id: 'ava.beans', read: false, replied: null, ... }]   the reply brought the next text

state = apply(state, game, messages.read('ava')).state   // the player read the thread
state = apply(state, game, wait).state                // afternoon, and the letter comes
inbox(state).channels[1]
// { id: 'letters', name: 'Letters', unread: 1, threads: [{ id: 'Town council', name: 'Town council', portrait: null, ... }] }

// The flat's button picks up the post
state = apply(state, game, { type: 'custom', name: 'messages/read', with: { channel: 'letters' } }).state
inbox(state).unread     // 0
```

## Conditions

| Content writes | Helper | Holds when |
|---|---|---|
| `{ 'messages/arrived': { message } }` | `messages.arrived(message)` | The message has arrived, at least once. |
| `{ 'messages/since': { message, gte… } }` | `messages.since(message, range)` | The whole days since the message last arrived are in the [range](/docs/reference/conditions#range). Days are the calendar's, or turns without it. False if it has never arrived. |
| `{ 'messages/replied': { message, reply? } }` | `messages.replied(message, reply?)` | The player replied to the message's latest arrival. With `reply`, they sent that reply. |
| `{ 'messages/read': { message } }` | | The player has read the message's latest arrival. |

You can use them anywhere a condition goes, such as another message's `when`, a scene block, a lock or a quest stage. Each is a call with the full name as the only key, as in `{ 'messages/arrived': { message: 'ava.text' } }` (see [plugin calls](/docs/reference/custom#plugincall)).

```ts
import { messages } from '@ifloom/plugin-messages'

const block = { prose: 'place.cafe.ava-coffee', when: messages.replied('ava.text', 'yes') }
```

An unknown message is false.

## Effects

| Content writes | Helper | Does |
|---|---|---|
| `{ 'messages/draw': { pool } }` | `messages.draw(pool)` | Draws one message from the pool, from those whose `when` holds, by `weight`, and delivers it as a new arrival with its notice. Nothing arrives when none can be drawn. See [Messages that come again](#messages-that-come-again). |

## Commands

| Command | Helper | Does |
|---|---|---|
| `{ 'messages/reply': { message, reply } }` | `messages.reply(message, reply)` | Sends the reply: marks the arrival replied and read, then runs the reply's effects. `message` is the [arrival's key](#arrival), which for a message that arrives once is its id. |
| `{ 'messages/read': { id?, channel? } }` | `messages.read(thread?)` | Marks every message that has arrived in the thread `id` read. With `channel`, only that channel's. Leave both out to mark everything read. |

`messages/reply` is refused, in this order, with:

- `There is no such message.` when no arrival has that key, or the message hasn't arrived.
- `You have already replied.` once a reply has been sent.
- `That is not a reply on offer.` when the message has no such reply, or the reply's `when` doesn't hold.

You can reword each line (see [Strings](#strings)).

Only a [lock](/docs/reference/locks) can refuse `messages/read`. A UI usually sends `messages.read(thread)` when the player opens a thread. `messages.read` only takes a thread, so to mark a whole channel read you write the command yourself with `channel`, as the flat's button does above.

Both are commands like any other, so triggers run after them, and so does every plugin's `onCommand` hook. If a reply's effects make another message's `when` true, that message arrives in the same command.

## Values

| Prose writes | Prints |
|---|---|
| `{{v:messages/unread}}` | Unread messages in every channel. |
| `{{v:messages/unread channel=texts}}` | Unread messages in that channel. |

The value works as a badge too, with the channel as its argument: a devices app's `badge: { value: 'messages/unread', with: { channel: 'texts' } }`. Code can read it with [`amountOf`](/docs/reference/amounts#amountof)`(state, game, { value: 'messages/unread', with: { channel: 'texts' } })`, or the game's own code with its context's `value('messages/unread', { channel: 'texts' })`.

## Strings

The plugin's lines go in the [strings table](/docs/reference/strings#plugins-strings). A game, a pack or a translation rewords them by their full key.

| Key | English |
|---|---|
| `messages/noSuchMessage` | `There is no such message.` |
| `messages/alreadyReplied` | `You have already replied.` |
| `messages/notOnOffer` | `That is not a reply on offer.` |

To reword one in your game, put it in your content's `strings`:

```ts
import type { Content } from '@ifloom/engine'

export const words: Content = {
  strings: { 'messages/alreadyReplied': 'You have said your piece.' },
}
```

## The view

`view(state, game).plugins.messages` is a `MessagesView`.

Its [React UI](#the-react-ui) draws a channel with [`MessagesSection`](#messagessection) in an app, and [`useMessages`](#usemessages) gives this view and the read command with no markup.

### MessagesView

```ts
type MessagesView = { channels: ChannelView[]; unread: number }
```

| Field | What it is |
|---|---|
| `channels` | Every channel, in the order `data.messages.channels` lists them, including empty ones. |
| `unread` | Unread messages in every channel. |

### ChannelView

```ts
type ChannelView = {
  id: string
  name: string
  threads: ThreadView[]
  unread: number
}
```

| Field | What it is |
|---|---|
| `threads` | The threads with at least one message that has arrived, the one with the newest message first. |
| `unread` | Unread messages in the channel. |

### ThreadView

```ts
type ThreadView = {
  id: string
  name: string
  portrait: string | null
  messages: MessageView[]
  unread: number
}
```

| Field | What it is |
|---|---|
| `id` | The messages' `thread`, or their sender. |
| `name` | The [cast](/docs/plugins/cast) character's name if `id` is one, or `id` as written. |
| `portrait` | The sender's entity's `image`, through `artSrc`. It's `null` if `id` names no entity, or one with no picture. |
| `messages` | Oldest first. |
| `unread` | Unread messages in the thread. |

### MessageView

```ts
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

| Field | What it is |
|---|---|
| `id` | The message's id. A message drawn twice is in the thread twice, with the same id. |
| `key` | This arrival's [key](#arrival). Use it as the list key when you draw the thread. |
| `from` | The sender, as written. |
| `name` | The sender's name if they're a [cast](/docs/plugins/cast) character, or `from` as written. |
| `text` | The words of its beats, joined, for a UI that draws no beats. |
| `beats` | The body drawn as [beats](/docs/reference/prose#scenebeat) for the current state with [`context.beats`](/docs/reference/plugins#beats), as a scene's body is: the blocks whose `when` holds, tokens filled in, spoken lines with their speakers, and [bold and italics](/docs/reference/prose#bold-and-italics) as spans. Draw these when the message can hold pictures or videos: Ava's photo of the ducks is an `image` beat, and a clip of them a `video` beat, in the order she wrote them. |
| `turn` | The [turn](/docs/reference/state#turn) it arrived on. With the [calendar](/docs/plugins/calendar#what-a-turn-is)'s default, a turn is a day. |
| `read` | Opened with `messages/read`, or replied to. |
| `replies` | The replies on offer now, each a button like a scene's choices ([`RenderedChoice`](/docs/reference/view#renderedchoice)) with its `label` and the `command` that sends it. Empty once one is sent. |
| `replied` | The label of the reply sent, or `null`. |

A message has no picture field of its own. Put pictures and videos in its body, where they sit in order with the words:

```ts
// prose 'ava.ducks': 'Look who turned up at the pond!\n\n[[video:clips/ducks|Two ducks on the pond]]'
{ id: 'ava.ducks', channel: 'texts', from: 'ava', when: { kv: 'parkVisit' }, body: [{ prose: 'ava.ducks' }] }
```

The React UI's [`MessagesSection`](#messagessection) draws each message's beats with [`Beat`](/docs/react/components#beat), videos included, so a picture in a message can be clicked to see it large.

## The React UI

`@ifloom/plugin-messages/react` draws a channel inside an app, for a game drawn with [`@ifloom/react`](/docs/react). List `messagesUi` in the game's [`plugins`](/docs/react/kit#the-plugins-option) and a [`MessagesSection`](#messagessection) is drawn wherever a [device](/docs/plugins/devices)'s app shows a messages channel.

It's yours to leave out. Draw the plugin yourself from `view.plugins.messages`, or from [`useMessages`](#usemessages) with your own markup, and nothing of ours is drawn: that's as much a way to use the plugin as ours. React and `@ifloom/react` are optional peers of the plugin, and a game drawn with another UI never loads this subpath.

```tsx
import { mountGame } from '@ifloom/react'
import { messagesUi } from '@ifloom/plugin-messages/react'

mountGame(game, { plugins: [messagesUi] })
```

### messagesUi

```ts
const messagesUi: PluginUi
```

The plugin's [`PluginUi`](/docs/react/kit#pluginui): a [`MessagesSection`](#messagessection) is drawn wherever a [device](/docs/plugins/devices)'s app shows a messages channel.

Its words are in `MESSAGES_WORDS`. A game rewords any of them with `ui.<key>` in its strings, as it does the React UI's own: `{ 'ui.allRead': '…' }`.

| Key | English |
|---|---|
| `ui.allRead` | `Mark all read` |

### MessagesSection

```tsx
const MessagesSection: PluginSectionComponent
```

A [messages](/docs/plugins/messages) channel, the one named by the section's `with.channel` (`data-channel`). Each thread (`data-thread`) shows under its sender's name and portrait, with its messages as bubbles. A message's [`beats`](/docs/plugins/messages#messageview) are drawn with [`Beat`](/docs/react/components#beat), so a picture or a clip in it shows in the bubble and opens in the viewer. Under each message is the reply the player sent, or the replies on offer as buttons. A message from a [pool](/docs/plugins/messages#messages-that-come-again) that arrives again is a new bubble each time, and each `message` carries its arrival's key as `data-message`.

Opening the channel marks nothing read, so the unread count stays until the player clears it. While the channel has unread messages, a **Mark all read** button (`ui.allRead`) sends `messages/read` for the channel. It draws nothing if the channel isn't in the view.

Replaceable as `MessagesSection` in [`components`](/docs/react/components#components). Parts: `channel`, `thread`, `thread-title`, `thread-portrait`, `message` (with `data-message`), `bubble` (with `data-from`) and `button`.

### useMessages

```ts
function useMessages(): MessagesControls | null

type MessagesControls = MessagesView & { read: (channel: string) => Result<GameState> }
```

The [messages](/docs/plugins/messages) plugin's view (its channels, each with threads and an unread count, and the unread count over all) with its command, or `null` in a game without the plugin. `read(channel)` sends `messages/read`. A reply on offer has its own `command`. Send it with [`useGame`](/docs/react/components#usegame)'s `send`. [`MessagesSection`](#messagessection) is drawn from it.

## The state

### MessagesState

```ts
type MessagesState = {
  arrived: Arrival[]
  replied: Record<string, string>
  read: Record<string, true>
}
```

What the plugin keeps in a save, at `state.plugins.messages`. It holds every arrival, oldest first, and the reply sent to each and which have been read, by the arrival's key. A UI reads the view, not this.

A save from before pools (the plugin's state version 1) kept one arrival per message by id. It loads with each of those as an arrival keyed by the message's id, so its replies and reads carry over. Its day is taken to be its turn, because the old save didn't keep the day.

### Arrival

```ts
type Arrival = {
  key: string
  message: string
  turn: number
  day: number
}
```

One arrival of a message. `key` is the message's id for its first arrival, then `<id>~2`, `<id>~3` and on. `turn` is the turn it arrived on, and `day` the calendar's day, or the turn in a game without the calendar.

## For code

The helpers write the content objects for you, typed. `messages.arrived`, `messages.replied` and `messages.since` return a `Condition`, `messages.draw` an `Effect`, and `messages.reply` and `messages.read` a [`CommandRef`](/docs/reference/custom#commandref).

### Helpers

```ts
const messages: {
  (): DefinedPlugin<MessagesState, MessagesView>
  reply(message: string, reply: string): CommandRef
  read(thread?: string): CommandRef
  arrived(message: string): Condition
  replied(message: string, reply?: string): Condition
  since(message: string, range: Range): Condition
  draw(pool: string): EffectRef
}
```

### messagesOf

```ts
function messagesOf(game: Game): MessageDef[]
```

The game's messages, merged from its content and packs: `game.data.messages.messages`.

## Checks

When the game loads, the plugin reports these problems against the content or pack each message came from, with `where` as `messages <id>`:

- A channel the game doesn't have (`unknown channel "…"`).
- Anything `when` names that the game doesn't have, such as `unknown storyline "…"`.
- A body block with no prose (`no prose for "…"`), and anything the block's `when` names.
- Two replies with the same id (`two replies are called "…"`).
- A reply with no label (`no prose for "<message id>#<reply id>"`).
- Anything a reply's `when` or `effects` name, such as `reply <id>: unknown storyline "…"`.
- A `weight` below 0 (`weight must be 0 or more`).

```text
mod:summer-fete · messages fete.invite · no prose for "fete.invite#maybe"
```

A `messages/arrived`, `messages/since`, `messages/replied` or `messages/read` condition, or a `messages/reply` command, naming a message the game doesn't have gives `unknown message "…"` where it's written. A `messages/draw` naming a pool no message is in gives `draws from "…", but no message is drawn from it`.

## Gotchas

- **Messages arrive only after a command.** The plugin delivers them in its `onCommand` [hook](/docs/reference/plugins#hooks-and-providers), which runs after every command that went through, never on `start`. A message whose `when` already holds when the game starts arrives after the player's first command. To open the game with one, have the first command bring it, or put the words in the intro scene.
- **`when` is tested at the end of each command.** A message whose `when` held only partway through a command, or only before it, waits for a later command that ends while it holds. A message with the [calendar](/docs/plugins/calendar#conditions)'s `calendar.period('morning')` as its `when` doesn't arrive if the player's first command of the day ends in the afternoon. It arrives at the end of the next command that ends in a morning, which may be days later. If it matters when a message comes, write `when` for something that stays true, such as a kv key, a day (`calendar.day({ gte: 2 })`) or a scene seen.
- **A message arrives once, unless it's in a pool.** After that it stays, whatever `when` does. A message with `drawnFrom` never arrives by `when` alone; only a draw brings it, as often as it's drawn. See [Messages that come again](#messages-that-come-again).
- **A reply's label is its words.** Before schema 25 it was the prose line `<message>#<reply>`. A pack of an older schema gets those words as the reply's `label` when it loads, and the checker reports a reply in your own content with no label whose old prose has words.
- **One reply, once.** After the player sends one, the others are gone and `messages/reply` refuses. To let the player say more, send a new message with replies of its own.
- **A channel the game doesn't have counts nothing.** `messages/unread` with `{ channel: 'post' }` is 0 when there's no `post` channel, so a badge that names a renamed channel stops counting. A [devices](/docs/plugins/devices) app badge that names a value nobody has is reported when the game loads.
- **The notice is the engine's.** Each arrival raises a [notice](/docs/reference/notices) with the id `messages.<key>`, the [arrival's key](#arrival), the sender's name as its `title` and the channel as its `tag`. So `view.notices.byTag.texts` counts arrivals the player hasn't dismissed. Reading a message doesn't dismiss its notice, and dismissing doesn't read the message. If your UI wants them to go together, send both commands.
- **The sender is matched by id.** A `from` that names an entity shows its name and picture. A typo shows the typo, and the loader doesn't report it, because any name is allowed. In a game with no `ava` entity, `from: 'ava'` shows `ava`.
- **A message doesn't need a device.** You can show `view.plugins.messages` anywhere, such as letters on the mat or a pigeonhole at work. The [devices](/docs/plugins/devices) plugin is one way to show a channel, not a requirement.

## See it in an example

Small Town: `ava.text` in [`examples/showcase/src/story/ava.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/ava.ts) arrives the day after you meet Ava, with two replies. Once you've answered it, the trigger `ava.chat` draws a line of her small talk from the pool `ava.chat` each day, never the same one twice within three days. Their labels are in [`examples/showcase/src/story/ava.prose.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/ava.prose.ts).
