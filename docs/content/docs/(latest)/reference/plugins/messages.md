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

The plugin knows nothing about phones. Your game decides what the channels are and where they're shown, such as a pile of post in the hall. With the [devices plugin](/docs/reference/plugins/devices) a channel can be an app instead, as in [A phone](/docs/recipes/phone).

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

Then add `messages()` to the game's `plugins`. [Adding one](/docs/reference/plugins#adding-one) has the details.

## messages

```ts shape
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

```ts fragment
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

The plugin lists `cooperates: ['cast']` (see [`cooperates`](/docs/reference/plugins#cooperates)). A sender who is an [entity](/docs/reference/entities), such as one of the [cast](/docs/reference/plugins/cast)'s characters, is shown with their name and picture, which the plugin reads with [`speakerOf`](/docs/reference/plugins#speakerof), and with the game's cast their face for avatars, the person's [`portrait`](/docs/reference/plugins/cast#person), which it asks with the `cast/portrait` query. Anyone else is shown as written.

### Channel

```ts shape
type Channel = { id: string; name: string }
```

| Field | What it is |
|---|---|
| `id` | What messages name the channel by, and the `tag` on the notices they raise. It's also what the [value](#values) `messages/unread` takes as `channel`. |
| `name` | What the player reads. |

Channels are content. List them in your content's `data.messages.channels`, in the order the view lists them. They're merged by id, so a mod can add a channel or rename one.

### channelsOf

```ts shape
function channelsOf(game: Game): Channel[]
```

The game's channels, merged from its content and packs, in order.

## Writing messages

Messages are content. List them in your content's [`data`](/docs/reference/content#content) under `messages.messages`. They're merged by id as scenes are, so a mod can add a message or rewrite one.

### MessageDef

```ts shape
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
| `effects` | [Effects](/docs/reference/effects) run as it arrives, each time it does, in the same command: a counter bumped, a timer started, a kv key set. Use them rather than a [trigger](/docs/reference/triggers) on `messages/arrived`, which runs a command later (see [Gotchas](#gotchas)). |
| `after` | How long it takes to arrive once its `when` holds, in milliseconds: `{ ms: 1500 }`. Leave it out and it arrives at once. See [Messages that take a moment](#messages-that-take-a-moment). |
| `typing` | Whether its thread shows the sender typing while it waits. `true` if you leave it out. Only a message with `after` waits. |

### ReplyDef

```ts shape
type ReplyDef = {
  id: string
  label?: string
  when?: Condition
  effects?: EffectRef[]
}
```

| Field | What it is |
|---|---|
| `id` | Unique within the message. |
| `label` | Its words, as written, with tokens filled in, as a [data scene choice](/docs/reference/scenes#choice)'s are. Its id if left out. A translation gives it other words under `messages/messages.<message>.replies.<reply>.label`. |
| `when` | The reply is only on offer while this holds. |
| `effects` | What sending it does, in order. These can be plain effects, one of the game's own [macros](/docs/reference/custom#macros) or a plugin's. |

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

Something has to run the draw. A [trigger](/docs/reference/triggers) with `once: { per: 'turn' }` draws once a turn, which in the showcase is once a day:

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
const chat: TriggerDef = { id: 'ava.chat', once: { per: 'turn' }, when: messages.replied('ava.text'), effects: [messages.draw('ava.chat')] }
```

`messages.since(id, { lt: 3 })` holds while fewer than three days have passed since that message last arrived, so `{ not: … }` keeps it out of the draw for three days. Days are the [calendar](/docs/reference/plugins/calendar)'s days, or turns in a game without the calendar. It's false for a message that has never come, so a fresh one is always in the draw.

The draw is seeded by the save, the turn and how many messages have arrived, so a replay or an undo draws the same message. When no message in the pool can be drawn, nothing arrives.

Each arrival has a key. The first is the message's id, and later ones are `<id>~2`, `<id>~3` and on. The view gives each arrival's replies with the right key in their command, so a UI doesn't build it.

### Messages that take a moment

A text that arrives with the one before it reads like a letter. Give a message `after` and it waits that long once its `when` holds, with the thread showing the sender typing, then arrives. A burst is a chain of them, each waiting on the one before:

```ts
import { messages, type MessageDef } from '@ifloom/plugin-messages'

const burst: MessageDef[] = [
  { id: 'sam.up', channel: 'texts', from: 'sam', when: { kv: 'phase', is: ['evening'] }, body: [{ text: 'Are you up?' }] },
  { id: 'sam.radiator', channel: 'texts', from: 'sam', when: messages.arrived('sam.up'), after: { ms: 1500 }, body: [{ text: 'The radiator is knocking again.' }] },
  { id: 'sam.never', channel: 'texts', from: 'sam', when: messages.arrived('sam.radiator'), after: { ms: 2500 }, body: [{ text: 'Never mind, it stopped.' }] },
]
```

The first arrives at the end of the command that sets the phase. The second's `when` holds straight away, so it starts waiting in the same command. After 1.5 seconds it arrives, and the third starts its 2.5 seconds.

The wait runs on the engine's [timers](/docs/reference/timers). The plugin brings one timer of its own, `messages.due`. A message that waits is kept in the save as `due`, and the timer is started for its `ms`. When the timer runs out, its effect `messages/due` delivers it. So time passes only by the logged `tick` command, which the UI's clock sends while a timer runs ([`startClock`](/docs/browser#startclock), or the React UI's own). A replay delivers every message at the same point, and a save made while one waits keeps waiting when it loads.

One message waits at a time. While one does, the rest of its thread waits behind it, and so does any other message with `after`, in any thread. Each starts once the one before has come. A message without `after` in another thread still arrives at once.

The time is counted from when the message starts waiting, which is when the one before it arrived, if that's what its `when` waits on. Use `typing: false` for a message that shouldn't show anyone typing, such as a delivery update.

## A worked example

A cut-down Small Town. The player meets Ava at the café, and she texts the next morning. Saying yes brings a second text. A letter from the town council lands on the mat on the second afternoon. There's no phone here. The texts and the letters are two channels, and the flat has a button to pick up the post.

The time of day comes from the [calendar](/docs/reference/plugins/calendar), the map from [places](/docs/reference/plugins/places) and Ava from the [cast](/docs/reference/plugins/cast). The calendar goes first in `plugins`, so the messages plugin sees the new day when one begins.

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
    'ui.inbox': 'Inbox ({{messages/unread}})',
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

```ts given
import { apply, startingState, view, whyNot, type GameState } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'
import { messages, type MessagesView } from '@ifloom/plugin-messages'

const inbox = (state: GameState) => view(state, game).plugins.messages!
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
// [{ id: 'ava', name: 'Ava', image: 'art/character/ava.svg', portrait: 'art/character/ava.svg', unread: 1, messages: [
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
// { id: 'letters', name: 'Letters', unread: 1, threads: [{ id: 'Town council', name: 'Town council', image: null, portrait: null, ... }] }

// The flat's button picks up the post
state = apply(state, game, messages.read({ channel: 'letters' })).state
inbox(state).unread     // 0
```

## Conditions

| Content writes | Helper | Holds when |
|---|---|---|
| `{ 'messages/arrived': { message } }` | `messages.arrived(message)` | The message has arrived, at least once. |
| `{ 'messages/since': { message, gte… } }` | `messages.since(message, range)` | The whole days since the message last arrived are in the [range](/docs/reference/common#range). Days are the calendar's, or turns without it. False if it has never arrived. |
| `{ 'messages/replied': { message, reply?, gte… } }` | `messages.replied(message, reply?, range?)` | The player replied to the message's latest arrival. With `reply`, they sent that reply. With a [range](/docs/reference/common#range), the whole days since the reply was sent are in it too, counted as `messages/since` counts, so `{ gte: 2 }` is "two days or more after you replied". |
| `{ 'messages/read': { message } }` | `messages.messageRead(message)` | The player has read the message's latest arrival. The helper isn't `messages.read`, which writes the [command](#commands) that marks a thread read. |

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
| `{ 'messages/due': {} }` | | Delivers the message that's waiting, if one is. The plugin's `messages.due` timer runs it when the wait is over, so content never needs to. See [Messages that take a moment](#messages-that-take-a-moment). |

## Commands

| Command | Helper | Does |
|---|---|---|
| `{ 'messages/reply': { message, reply } }` | `messages.reply(message, reply)` | Sends the reply: marks the arrival replied and read, then runs the reply's effects. `message` is the [arrival's key](#arrival), which for a message that arrives once is its id. |
| `{ 'messages/read': { id?, channel? } }` | `messages.read(thread?)`, `messages.read({ channel })` | Marks every message that has arrived in the thread `id` read. With `channel`, only that channel's. Leave both out to mark everything read. |

`messages/reply` is refused, in this order, with:

- `There is no such message.` when no arrival has that key, or the message hasn't arrived.
- `You have already replied.` once a reply has been sent.
- `That is not a reply on offer.` when the message has no such reply, or the reply's `when` doesn't hold.

You can reword each line (see [Strings](#strings)).

Only a [lock](/docs/reference/locks) can refuse `messages/read`. A UI usually sends `messages.read(thread)` when the player opens a thread. To mark a whole channel read, write `messages.read({ channel: 'letters' })`, as the flat's button does above.

Both are commands like any other, so triggers run after them, and so does every plugin's `onCommand` hook. If a reply's effects make another message's `when` true, that message arrives in the same command.

## Values

| Prose writes | Prints |
|---|---|
| `{{messages/unread}}` | Unread messages in every channel. |
| `{{messages/unread channel=texts}}` | Unread messages in that channel. |

The value works as a badge too, with the channel as its argument: a devices app's `badge: { value: 'messages/unread', with: { channel: 'texts' } }`. Code can read it with [`amountOf`](/docs/reference/amounts#amountof)`(state, game, { value: 'messages/unread', with: { channel: 'texts' } })`, or the game's own code with its context's `value('messages/unread', { channel: 'texts' })`.

## Strings

The plugin's lines go in the [strings table](/docs/reference/strings#plugins-strings). A game, a pack or a translation rewords them by their full key.

| Key | English |
|---|---|
| `messages/noSuchMessage` | `There is no such message.` |
| `messages/alreadyReplied` | `You have already replied.` |
| `messages/notOnOffer` | `That is not a reply on offer.` |
| `messages/markRead` | `Mark read`, a thread's [`read`](#threadview) button. |
| `messages/allRead` | `Mark all read`, a channel's [`read`](#channelview) button. |

To reword one in your game, put it in your content's `strings`:

```ts
import type { Content } from '@ifloom/engine'

export const words: Content = {
  strings: { 'messages/alreadyReplied': 'You have said your piece.' },
}
```

## The view

`view(state, game).plugins.messages` is a `MessagesView`.

Its [React UI](#drawing-it) draws a channel with [`MessagesSection`](#messagessection) in an app, and [`useMessages`](#usemessages) gives this view and the read command with no markup.

### MessagesView

```ts shape
type MessagesView = { channels: ChannelView[]; unread: number; waiting: boolean }
```

| Field | What it is |
|---|---|
| `channels` | Every channel, in the order `data.messages.channels` lists them, including empty ones. |
| `unread` | Unread messages in every channel. |
| `waiting` | Whether a message with `after` is on its way, in any thread. |

### ChannelView

```ts shape
type ChannelView = {
  id: string
  name: string
  threads: ThreadView[]
  unread: number
  read: RenderedChoice | null
}
```

| Field | What it is |
|---|---|
| `threads` | The threads with at least one message that has arrived, the one with the newest message first. A thread whose first message is still on its way is listed too, first, with no messages and `typing` on. |
| `unread` | Unread messages in the channel. |
| `read` | The button that marks the whole channel read, a [`RenderedChoice`](/docs/reference/view#renderedchoice) labelled with the `messages/allRead` string, or `null` while nothing in it is unread. |

### ThreadView

```ts shape
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

| Field | What it is |
|---|---|
| `id` | The messages' `thread`, or their sender. |
| `name` | The [cast](/docs/reference/plugins/cast) character's name if `id` is one, or `id` as written. |
| `image` | The sender's entity's `image`, through `artSrc`. It's `null` if `id` names no entity, or one with no picture. |
| `portrait` | The sender's face for an avatar: with the [cast](/docs/reference/plugins/cast), a person's [`portrait`](/docs/reference/plugins/cast#person), else `image`. The React UI draws this one. |
| `messages` | Oldest first. |
| `unread` | Unread messages in the thread. |
| `read` | The button that marks the thread read, labelled with the `messages/markRead` string, or `null` while nothing in it is unread. |
| `typing` | Whether the sender is typing: a message with [`after`](#messages-that-take-a-moment) is waiting to arrive in this thread, and its `typing` isn't `false`. Draw a typing bubble after the messages while it's on. |

### MessageView

```ts shape
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
| `name` | The sender's name if they're a [cast](/docs/reference/plugins/cast) character, or `from` as written. |
| `text` | The words of its beats, joined, for a UI that draws no beats. |
| `beats` | The body drawn as [beats](/docs/reference/prose#scenebeat) for the current state with [`context.beats`](/docs/reference/plugins#beats), as a scene's body is: the blocks whose `when` holds, tokens filled in, spoken lines with their speakers, and [bold and italics](/docs/reference/prose#bold-and-italics) as spans. Draw these when the message can hold pictures or videos: Ava's photo of the ducks is an `image` beat, and a clip of them a `video` beat, in the order she wrote them. |
| `turn` | The [turn](/docs/reference/state#turn) it arrived on. With the [calendar](/docs/reference/plugins/calendar#what-a-turn-is)'s default, a turn is a day. |
| `read` | Opened with `messages/read`, or replied to. |
| `replies` | The replies on offer now, each a button like a scene's choices ([`RenderedChoice`](/docs/reference/view#renderedchoice)) with its `label` and the `command` that sends it. Empty once one is sent. |
| `replied` | The label of the reply sent, or `null`. |

A message has no picture field of its own. Put pictures and videos in its body, where they sit in order with the words:

```ts fragment
// prose 'ava.ducks': 'Look who turned up at the pond!\n\n[[video:clips/ducks|Two ducks on the pond]]'
{ id: 'ava.ducks', channel: 'texts', from: 'ava', when: { kv: 'parkVisit' }, body: [{ prose: 'ava.ducks' }] }
```

The React UI's [`MessagesSection`](#messagessection) draws each message's beats with [`Beat`](/docs/react/components#beat), videos included, so a picture in a message can be clicked to see it large.

## Drawing it

`view.plugins.messages` is a [`MessagesView`](#messagesview): each channel's threads and their messages, with how many are unread. A message's `replies` are ready-made buttons, and `replied` is the reply once it's sent. A thread's `read` and a channel's `read` are ready buttons that mark them read, and a thread's `typing` says whether to draw the sender typing. Messages usually show inside an app on a [device](/docs/reference/plugins/devices), as a list of conversations that each open into a thread.

`@ifloom/plugin-messages/react` draws a channel inside an app, for a game drawn with [`@ifloom/react`](/docs/react). List `messagesUi` in the game's [`plugins`](/docs/react/kit#the-plugins-option) and a [`MessagesSection`](#messagessection) is drawn wherever a [device](/docs/reference/plugins/devices)'s app shows a messages channel. The Plain JS tab uses `runner`, `add` and `drawChoices` from the vanilla template's `src/main.ts`, whose `draw` hands each part the runner's [snapshot](/docs/reference/runner#runnersnapshot), and the Vue tab reads `view`, `snapshot` and `runner` from the vue template's `src/runner.ts` (see [Start the runner](/docs/guide/frameworks#start-the-runner)).

::include[../../../../../snippets/plain/messages.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/mount-messages.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Messages.vue]{meta='tab="Vue" tab-group="framework"'}

The React UI is yours to leave out. Draw the plugin yourself from `view.plugins.messages`, or from [`useMessages`](#usemessages) with your own markup, and nothing of ours is drawn: that's as much a way to use the plugin as ours. React and `@ifloom/react` are optional peers of the plugin, and a game drawn with another UI never loads this subpath.

### messagesUi

```ts shape
const messagesUi: PluginUi
```

The plugin's [`PluginUi`](/docs/react/kit#pluginui): a [`MessagesSection`](#messagessection) is drawn wherever a [device](/docs/reference/plugins/devices)'s app shows a messages channel.

Its words are in `MESSAGES_WORDS`. A game rewords any of them with `ui.<key>` in its strings, as it does the React UI's own: `{ 'ui.noMessages': 'Nothing yet.' }`. The back button is the React UI's own `ui.back`.

| Key | English |
|---|---|
| `ui.noMessages` | `No messages yet.`, what a channel with nothing in it says. |
| `ui.typing` | `{name} is typing`, the typing bubble's label for screen readers. |
| `ui.typingShort` | `typing…`, a thread's last line in the list while the sender is typing. |

The other buttons say what the view's buttons say, the plugin's [strings](#strings).

### MessagesSection

```tsx shape
const MessagesSection: PluginSectionComponent
```

A [messages](/docs/reference/plugins/messages) channel, the one named by the section's `with.channel` (`data-channel`), drawn the way a phone draws one.

It opens on the conversation list. Each thread is a row with the sender's portrait, their name, the last line (the newest message's first line, the reply the player sent to it, or `typing…` while they're typing) and a dot while anything in it is unread. The thread with the newest message is at the top. While the channel has unread messages, the channel's **Mark all read** button from the view is above the list. A channel with nothing in it yet shows `ui.noMessages` instead.

A tap on a row opens that thread. Its heading has a back arrow to the list (labelled `ui.back`), then the sender's portrait and name. Its messages follow as bubbles. A message's [`beats`](/docs/reference/plugins/messages#messageview) are drawn with [`Beat`](/docs/react/components#beat), so a picture or a clip in it shows in the bubble and opens in the viewer. Under each message is the reply the player sent, or the replies on offer as buttons. While the thread's `typing` is on, a typing bubble with three dots comes after the last message. A message from a [pool](/docs/reference/plugins/messages#messages-that-come-again) that arrives again is a new bubble each time, and each `message` carries its arrival's key as `data-message`.

An open thread is read: opening it sends the thread's `read` command, and anything that arrives while it's open is marked read as it comes. Its notices stay until they're dismissed. It draws nothing if the channel isn't in the view.

Replaceable as `MessagesSection` in [`components`](/docs/react/components#components). Parts: `channel`, `conversations`, `conversation` (with `data-thread`, and `data-unread` while any is unread), `conversation-portrait`, `conversation-name`, `conversation-last`, `conversation-unread`, `messages-empty`, `thread`, `thread-back`, `thread-title`, `thread-portrait`, `message` (with `data-message`), `bubble` (with `data-from`, and `data-typing` on the typing bubble), `typing` and `button`.

### useMessages

```ts shape
function useMessages(): MessagesControls | null

type MessagesControls = MessagesView & { read: (channel: string) => Result<GameState> }
```

The [messages](/docs/reference/plugins/messages) plugin's view (its channels, each with threads and an unread count, and the unread count over all) with its command, or `null` in a game without the plugin. `read(channel)` sends `messages/read`. A reply on offer has its own `command`. Send it with [`useGame`](/docs/react/components#usegame)'s `send`. [`MessagesSection`](#messagessection) is drawn from it.

## The state

### MessagesState

```ts shape
type MessagesState = {
  arrived: Arrival[]
  replied: Record<string, string>
  repliedOn: Record<string, number>
  read: Record<string, true>
  due: { key: string; thread: string; typing: boolean } | null
}
```

What the plugin keeps in a save, at `state.plugins.messages`. A UI reads the view, not this.

| Field | What it is |
|---|---|
| `arrived` | Every [arrival](#arrival), oldest first. |
| `replied` | The reply sent to each arrival, by the arrival's key. |
| `repliedOn` | The day each reply was sent, by the arrival's key: the calendar's day, or the turn without it. |
| `read` | The arrivals the player has opened, by key. |
| `due` | The message waiting to arrive, if one is: its key, its thread and whether the thread shows typing. `null` when none waits. |

A save from before `repliedOn` loads with each reply's day taken to be its arrival's day, because the old save didn't keep when it was sent.

A save from before `after` loads with nothing waiting.

A save from before pools kept one arrival per message by id. It loads with each of those as an arrival keyed by the message's id, so its replies and reads carry over. Its day is taken to be its turn, because the old save didn't keep the day.

### Arrival

```ts shape
type Arrival = {
  key: string
  message: string
  turn: number
  day: number
}
```

One arrival of a message.

| Field | What it is |
|---|---|
| `key` | The message's id for its first arrival, then `<id>~2`, `<id>~3` and on. |
| `message` | The message's id. |
| `turn` | The turn it arrived on. |
| `day` | The calendar's day it arrived on, or the turn in a game without the calendar. |

## For code

The helpers write the content objects for you, typed. `messages.arrived`, `messages.replied`, `messages.messageRead` and `messages.since` return a `Condition`, `messages.draw` an `Effect`, and `messages.reply` and `messages.read` a [`CommandRef`](/docs/reference/custom#commandref).

### Helpers

```ts shape
const messages: {
  (): DefinedPlugin<MessagesState, MessagesView>
  reply(message: string, reply: string): CommandRef
  read(thread?: string): CommandRef
  arrived(message: string): Condition
  replied(message: string, reply?: string, range?: Range): Condition
  messageRead(message: string): Condition
  since(message: string, range: Range): Condition
  draw(pool: string): EffectRef
}
```

### messagesOf

```ts shape
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
- Anything the message's `effects` name, such as `arrival: unknown storyline "…"`.
- Anything a reply's `when` or `effects` name, such as `reply <id>: unknown storyline "…"`.
- A `weight` below 0 (`weight must be 0 or more`).
- An `after` with no `ms` above 0 (`after needs ms above 0`), or on a message in a pool, which arrives when it's drawn (`a message drawn from a pool arrives when drawn, so it can’t wait with after`).

```text
mod:summer-fete · messages fete.invite · no prose for "fete.invite#maybe"
```

A `messages/arrived`, `messages/since`, `messages/replied` or `messages/read` condition, or a `messages/reply` command, naming a message the game doesn't have gives `unknown message "…"` where it's written. A `messages/draw` naming a pool no message is in gives `draws from "…", but no message is drawn from it`.

## Gotchas

- **Messages arrive only after a command.** The plugin delivers them in its `onCommand` [hook](/docs/reference/plugins#hooks-and-providers), which runs after every command that went through, never on `start`. A message whose `when` already holds when the game starts arrives after the player's first command. To open the game with one, have the first command bring it, or put the words in the intro scene.
- **`when` is tested at the end of each command.** A message whose `when` held only partway through a command, or only before it, waits for a later command that ends while it holds. A message with the [calendar](/docs/reference/plugins/calendar#conditions)'s `calendar.period('morning')` as its `when` doesn't arrive if the player's first command of the day ends in the afternoon. It arrives at the end of the next command that ends in a morning, which may be days later. If it matters when a message comes, write `when` for something that stays true, such as a kv key, a day (`calendar.day({ gte: 2 })`) or a scene seen.
- **A trigger on an arrival runs a command late.** The engine tests [triggers](/docs/reference/triggers#when-triggers-fire) before the plugins' hooks, and the plugin delivers messages in its hook, so a trigger whose `when` is `messages.arrived('ava.hi')` fires on the command after the one the message came in. To do something as a message comes, such as start a timer, put it in the message's `effects`, or in the effect that brings the message.
- **A message arrives once, unless it's in a pool.** After that it stays, whatever `when` does. A message with `drawnFrom` never arrives by `when` alone; only a draw brings it, as often as it's drawn. See [Messages that come again](#messages-that-come-again).
- **A reply's label is its words.** In older content it was the prose line `<message>#<reply>`. An older pack gets those words as the reply's `label` when it loads, and the checker reports a reply in your own content with no label whose old prose has words.
- **One reply, once.** After the player sends one, the others are gone and `messages/reply` refuses. To let the player say more, send a new message with replies of its own.
- **A channel the game doesn't have counts nothing.** `messages/unread` with `{ channel: 'post' }` is 0 when there's no `post` channel, so a badge that names a renamed channel stops counting. A [devices](/docs/reference/plugins/devices) app badge that names a value nobody has is reported when the game loads.
- **The notice is the engine's.** Each arrival raises a [notice](/docs/reference/notices) with the id `messages.<key>`, the [arrival's key](#arrival), the sender's name as its `title`, the message's first line as its `text` (cut to 80 characters) and the channel as its `tag`. A message that arrives in a thread whose last notice is still unseen replaces that notice, so a burst of five texts is one notice showing the newest line, not five. So `view.notices.byTag.texts` counts threads with news the player hasn't dismissed, rather than every message. Reading a message doesn't dismiss its notice, and dismissing doesn't read the message. If your UI wants them to go together, send both commands.
- **The sender is matched by id.** A `from` that names an entity shows its name and picture. A typo shows the typo, and the loader doesn't report it, because any name is allowed. In a game with no `ava` entity, `from: 'ava'` shows `ava`.
- **A waiting message needs the clock.** A message with `after` arrives only when `tick` commands run its timer out. In a test, or with a UI of your own that sends no ticks, send `{ type: 'tick', ms }` yourself. `ifloom playtest`'s explorer waits for a running timer when it has nothing new to do, so a burst arrives there too.
- **A message doesn't need a device.** You can show `view.plugins.messages` anywhere, such as letters on the mat or a pigeonhole at work. The [devices](/docs/reference/plugins/devices) plugin is one way to show a channel, not a requirement.

## See it in an example

Small Town: `ava.text` in [`examples/showcase/src/story/ava.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/ava.ts) arrives the day after you meet Ava, with two replies. Once you've answered it, the trigger `ava.chat` draws a line of her small talk from the pool `ava.chat` each day, never the same one twice within three days. Their labels are in [`examples/showcase/src/story/ava.prose.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/ava.prose.ts).
