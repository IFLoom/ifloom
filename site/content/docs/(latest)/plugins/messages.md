---
title: "Messages"
description: "Texts, emails and letters that arrive when a condition holds, kept in channels and threads, with replies that work like choices."
---
`@ifloom/plugin-messages` delivers messages to the player when the story allows: texts, emails, letters on the mat. Messages are kept in threads, and the player answers with replies that work like choices.

You'd want it when people get in touch with the player rather than the player going to them. In the showcase, Ava texts you the day after you meet her. If everything the player reads happens where they're standing, scenes are enough.

A message is like a scene that arrives instead of one the player walks into. It has [prose blocks](/docs/reference/scenes#block) for its words, a sender, and replies that carry [effects](/docs/reference/effects). It arrives the first time its condition holds at the end of a command, and it raises a [notice](/docs/reference/notices) tagged with its channel, so the UI can show a toast or a badge.

```ts
import {
  messages, messageDefs, channelsOf, replyTo, readThread, messageArrived, messageReplied,
  type Channel, type MessageDef, type ReplyDef, type MessagesState,
  type MessagesView, type ChannelView, type ThreadView, type MessageView,
} from '@ifloom/plugin-messages'
```

The plugin knows nothing about phones. Your game decides what the channels are and where they're shown, such as a pile of post in the hall. With the [devices plugin](/docs/plugins/devices) a channel can be an app instead, and the [phone bundle](/docs/plugins/phone) sets that up for you.

## Install

List the package in your game's `package.json`, beside the engine:

```json
{
  "dependencies": {
    "@ifloom/engine": "0.0.0",
    "@ifloom/plugin-messages": "0.0.0"
  }
}
```

Then add `messages()` to the game's `plugins`. [Adding one](/docs/plugins#adding-one) has the details.

## messages

```ts
function messages(): DefinedPlugin<MessagesState>
```

Builds the plugin, with the id `messages`. Call it once, when you build the game. It takes no options: the channels and the messages are content, in a pack's `data.messages`, so a mod can add either.

```ts
import { loadGame, type Pack } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'
import { messages } from '@ifloom/plugin-messages'

declare const town: Pack // your content

const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  introScene: 'intro',
  plugins: [
    calendar(),
    places({ start: 'flat' }),
    cast(),
    messages(),
  ],
})
```

The channels go in the pack beside the messages:

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

The plugin lists `cooperates: ['cast']` (see [`cooperates`](/docs/reference/plugins#cooperates)). When the game has the [cast](/docs/plugins/cast), a sender who is one of its characters is shown with their name and portrait, which the plugin gets from the cast's [`cast/person`](/docs/plugins/cast#queries) query. Without the cast, every sender is shown as written.

### Channel

```ts
type Channel = { id: string; name: string }
```

| Field | What it is |
|---|---|
| `id` | What messages name the channel by, and the `tag` on the notices they raise. It's also what the [value](#values) `messages/unread` takes as `channel`. |
| `name` | What the player reads. |

Channels are content. List them in a pack's `data.messages.channels`, in the order the view lists them. They're merged by id, so a mod can add a channel or rename one.

### channelsOf

```ts
function channelsOf(game: Game): Channel[]
```

The game's channels, merged from its packs, in order.

## Writing messages

Messages are content. List them in a pack's [`data`](/docs/reference/loader#pack) under `messages.messages`. They're merged by id as scenes are, so a mod can add a message or rewrite one.

### MessageDef

```ts
type MessageDef = {
  id: string
  channel: string
  from: string
  thread?: string
  when: Condition
  body: Block[]
  replies?: ReplyDef[]
}
```

| Field | What it is |
|---|---|
| `id` | Unique among messages. Its replies' labels are prose keys built from it. |
| `channel` | The [channel](#channel) it arrives in. |
| `from` | Who sent it. Either a [cast](/docs/plugins/cast) character's id, or any name as it should be shown (`'Town council'`). A character's name and portrait are looked up, and anything else is shown as written. |
| `thread` | The thread it goes in. If you leave it out, the thread is the sender, so every message from `ava` in a channel goes in one thread. |
| `when` | It arrives the first time this [condition](/docs/reference/conditions) holds at the end of a command. |
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
| `id` | Unique within the message. The reply's label is the prose key `<message id>#<reply id>`, as a [data scene choice](/docs/reference/scenes#choice)'s is. |
| `when` | The reply is only on offer while this holds. |
| `effects` | What sending it does, in order. These can be plain effects, a game's [custom effect](/docs/reference/custom) or a plugin's. |

This is the showcase's text from Ava. It arrives once a day has passed since the player first talked to her:

```ts
import { type MessageDef } from '@ifloom/plugin-messages'
import { person } from '@ifloom/plugin-cast'

const text: MessageDef = {
  id: 'ava.text',
  channel: 'texts',
  from: 'ava',
  when: { all: [{ seen: 'ava.hi' }, { since: 'ava.hi', gte: 1 }] },
  body: [{ text: 'ava.text' }],
  replies: [
    { id: 'yes', effects: [{ kind: 'stat', stat: 'friendship', by: 5, of: person('ava') }] },
    { id: 'later' },
  ],
}
// prose: 'ava.text', 'ava.text#yes', 'ava.text#later'
```

### Messages that come again

Each message arrives once. For a text that keeps coming, such as Sam checking in now and then, write a numbered run of messages and let a counter in the kv store release them one at a time. Something else raises the counter, such as a roll in [`rules.onTurn`](/docs/reference/rules#onturn):

```ts
import type { GameRules } from '@ifloom/engine'
import type { MessageDef } from '@ifloom/plugin-messages'

// Twelve check-ins, each arriving once the counter reaches its number.
const checkIns: MessageDef[] = Array.from({ length: 12 }, (_, n) => ({
  id: `sam.checkin.${n + 1}`,
  channel: 'texts',
  from: 'sam',
  when: { kv: 'samTexts', gte: n + 1 },
  body: [{ variants: 'sam.checkin' }],
  replies: [{ id: 'reply' }],
}))

const rules: GameRules = {
  // Two mornings in five, Sam texts.
  onTurn: (state, { apply, roll }) => (roll(5, 'sam.checkin') < 2 ? apply([{ kind: 'kv', key: 'samTexts', by: 1 }]) : state),
}
```

The body is a [variants](/docs/reference/prose#variantmember) block, so the words rotate rather than repeating the last text. Each message needs its reply label too (`sam.checkin.1#reply` and so on), which a loop over `checkIns` can write into `prose`. Once the run is used up, nothing more arrives, so make it long enough for the game.

## A worked example

A cut-down Small Town. The player meets Ava at the café, and she texts the next morning. Saying yes brings a second text. A letter from the town council lands on the mat on the second afternoon. There's no phone here. The texts and the letters are just two channels, and the flat has a button to pick up the post.

The time of day comes from the [calendar](/docs/plugins/calendar), the map from [places](/docs/plugins/places) and Ava from the [cast](/docs/plugins/cast). The calendar goes first in `plugins`, so the messages plugin sees the new day when one begins.

```ts
import { SCHEMA, loadGame, type Pack } from '@ifloom/engine'
import { calendar, day, pass, period, sleep } from '@ifloom/plugin-calendar'
import { places, type LocationDef } from '@ifloom/plugin-places'
import { cast, person, type CharacterDef } from '@ifloom/plugin-cast'
import { messageReplied, messages } from '@ifloom/plugin-messages'

const place = (id: string, name: string, exits: string[]): LocationDef =>
  ({ id, name, tag: 'Small Town', kind: 'street', art: '', exits, body: [{ text: `place.${id}` }] })

const ava: CharacterDef = {
  id: 'ava',
  name: 'Ava',
  role: 'Runs the café',
  portrait: 'art/character/ava.svg',
  home: 'park',
  schedule: [{ location: 'cafe', when: period('morning', 'afternoon') }],
  talk: 'ava.hi',
}

const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  stats: [{ id: 'friendship', label: 'Friendship', of: 'character' }],
  activities: [{ id: 'wait', effects: [pass(1)] }],
  scenes: [
    { id: 'ava.hi', title: 'Ava', speaker: 'ava', body: [{ text: 'ava.hi' }], choices: [{ id: 'bye', effects: [{ kind: 'scene', scene: null }] }] },
  ],
  prose: {
    'place.flat': 'Boxes, mostly.',
    'place.high-street': 'A bakery, a launderette, a bus stop.',
    'place.cafe': 'Six tables, one of them wobbly.',
    'place.park': 'The river is slow and brown.',
    'ava.hi': 'Ava looks up from the till and grins.',
    'ava.hi#bye': 'Leave her to it',
    'ava.text': 'Good to meet you yesterday! Coffee’s on me next time 🙂',
    'ava.text#yes': 'Deal!',
    'ava.text#later': 'Maybe later in the week',
    'ava.beans': 'New beans in. Tell me if they’re awful.',
    'council.bins': 'Bins go out on Thursdays from now on.',
    'ui.inbox': 'Inbox ({{v:messages/unread}})',
  },
  data: {
    places: {
      locations: [
        {
          ...place('flat', 'Your flat', ['high-street']),
          actions: [
            { id: 'bed', label: 'Go to bed', command: sleep() },
            { id: 'mat', label: 'Pick up the post', command: { 'messages/read': { channel: 'letters' } } },
          ],
        },
        place('high-street', 'High Street', ['flat', 'cafe', 'park']),
        place('cafe', 'The Corner Café', ['high-street']),
        place('park', 'Riverside Park', ['high-street']),
      ],
    },
    cast: { characters: [ava] },
    messages: {
      channels: [{ id: 'texts', name: 'Texts' }, { id: 'letters', name: 'Letters' }],
      messages: [
        {
          id: 'ava.text',
          channel: 'texts',
          from: 'ava',
          when: { all: [{ seen: 'ava.hi' }, { since: 'ava.hi', gte: 1 }] },
          body: [{ text: 'ava.text' }],
          replies: [{ id: 'yes', effects: [{ kind: 'stat', stat: 'friendship', by: 5, of: person('ava') }] }, { id: 'later' }],
        },
        {
          id: 'ava.beans',
          channel: 'texts',
          from: 'ava',
          when: messageReplied('ava.text', 'yes'),
          body: [{ text: 'ava.beans' }],
        },
        {
          id: 'council.bins',
          channel: 'letters',
          from: 'Town council',
          when: { all: [day({ gte: 1 }), period('afternoon')] },
          body: [{ text: 'council.bins' }],
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

Here's how it plays. A new game starts in the flat on Monday morning:

```ts
import { apply, startingState, view, whyNot, type GameState } from '@ifloom/engine'
import { sleep } from '@ifloom/plugin-calendar'
import { go } from '@ifloom/plugin-places'
import { talk } from '@ifloom/plugin-cast'
import { readThread, replyTo, type MessagesView } from '@ifloom/plugin-messages'

const inbox = (state: GameState) => view(state, game).plugins.messages as MessagesView
const wait = { type: 'activity', id: 'wait' } as const
let state = startingState(game)

// To the café, and say hello to Ava
state = apply(state, game, go('high-street')).state
state = apply(state, game, go('cafe')).state
state = apply(state, game, talk('ava')).state
state = apply(state, game, { type: 'choose', id: 'bye' }).state
inbox(state).unread     // 0: a day has to pass first

// Home, wait until the evening, and go to bed
state = apply(state, game, go('high-street')).state
state = apply(state, game, go('flat')).state
state = apply(state, game, wait).state
state = apply(state, game, wait).state
state = apply(state, game, sleep()).state    // Day 2 · Tuesday morning, turn 1
inbox(state).channels[0].threads
// [{ id: 'ava', name: 'Ava', portrait: 'art/character/ava.svg', unread: 1, messages: [
//   { id: 'ava.text', from: 'ava', name: 'Ava', text: 'Good to meet you yesterday! Coffee’s on me next time 🙂',
//     turn: 1, read: false, replied: null,
//     replies: [{ id: 'yes', label: 'Deal!', command: replyTo('ava.text', 'yes') }, { id: 'later', ... }] } ] }]
view(state, game).notices.byTag    // { texts: 1 }
// 'ui.inbox' reads "Inbox (1)"

whyNot(state, game, replyTo('ava.text', 'maybe'))   // 'That is not a reply on offer.'
state = apply(state, game, replyTo('ava.text', 'yes')).state
whyNot(state, game, replyTo('ava.text', 'later'))   // 'You have already replied.'
inbox(state).channels[0].threads[0].messages
// [{ id: 'ava.text', read: true, replied: 'Deal!', replies: [], ... },
//  { id: 'ava.beans', read: false, replied: null, ... }]   the reply brought the next text

state = apply(state, game, readThread('ava')).state   // the player read the thread
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
| `{ 'messages/arrived': { message } }` | `messageArrived(message)` | The message has arrived. |
| `{ 'messages/replied': { message, reply? } }` | `messageReplied(message, reply?)` | The player replied to the message. With `reply`, they sent that reply. |
| `{ 'messages/read': { message } }` | | The player has read the message. |

You can use them anywhere a condition goes, such as another message's `when`, a scene block, a lock or a quest stage. Each can also be written short, with the full name as the only key. `{ 'messages/arrived': { message: 'ava.text' } }` is the same as `{ custom: 'messages/arrived', with: { message: 'ava.text' } }` (see [plugin calls](/docs/reference/custom#plugincall)).

```ts
import { messageReplied } from '@ifloom/plugin-messages'

const block = { text: 'place.cafe/ava-coffee', when: messageReplied('ava.text', 'yes') }
```

An unknown message is false.

## Commands

| Command | Helper | Does |
|---|---|---|
| `{ 'messages/reply': { message, reply } }` | `replyTo(message, reply)` | Sends the reply: marks the message replied and read, then runs the reply's effects. |
| `{ 'messages/read': { id?, channel? } }` | `readThread(thread?)` | Marks every message that has arrived in the thread `id` read. With `channel`, only that channel's. Leave both out to mark everything read. |

`messages/reply` is refused, in this order, with:

- `There is no such message.` when no message has that id, or it hasn't arrived.
- `You have already replied.` once a reply has been sent.
- `That is not a reply on offer.` when the message has no such reply, or the reply's `when` doesn't hold.

You can reword each line (see [Strings](#strings)).

Only a [lock](/docs/reference/locks) can refuse `messages/read`. A UI usually sends `readThread(thread)` when the player opens a thread. `readThread` only takes a thread, so to mark a whole channel read you write the command yourself with `channel`, as the flat's button does above.

Both are commands like any other, so triggers run after them, and so does every plugin's `onCommand` hook. If a reply's effects make another message's `when` true, that message arrives in the same command.

## Values

| Prose writes | Prints |
|---|---|
| `{{v:messages/unread}}` | Unread messages in every channel. |
| `{{v:messages/unread channel=texts}}` | Unread messages in that channel. |

The value works as a badge too, with the channel as its argument: a devices app's `badge: { value: 'messages/unread', with: { channel: 'texts' } }`. Code can read it with [`customValue`](/docs/reference/custom#looking-them-up), or a custom function with its context's `value('messages/unread', { channel: 'texts' })`.

## Strings

The plugin's lines go in the [strings table](/docs/reference/strings#plugins-strings). A game, a pack or a translation rewords them by their full key.

| Key | English |
|---|---|
| `messages/noSuchMessage` | `There is no such message.` |
| `messages/alreadyReplied` | `You have already replied.` |
| `messages/notOnOffer` | `That is not a reply on offer.` |

To reword one in your game, put it in the base's `strings`:

```ts
import { loadGame } from '@ifloom/engine'
import { messages } from '@ifloom/plugin-messages'
import { town } from './town.ts'

const { game } = loadGame([town], {
  id: 'small-town',
  title: 'Small Town',
  plugins: [messages()],
  strings: { 'messages/alreadyReplied': 'You have said your piece.' },
})
```

## The view

`view(state, game).plugins.messages` is a `MessagesView`.

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
| `portrait` | The cast character's portrait (their `portrait`, or `art/character/<id>.jpg`). It's `null` if `id` isn't a character or the game has no cast. |
| `messages` | Oldest first. |
| `unread` | Unread messages in the thread. |

### MessageView

```ts
type MessageView = {
  id: string
  from: string
  name: string
  text: string
  beats: SceneBeat[]
  turn: number
  read: boolean
  replies: { id: string; label: string; command: Command }[]
  replied: string | null
}
```

| Field | What it is |
|---|---|
| `from` | The sender, as written. |
| `name` | The sender's name if they're a [cast](/docs/plugins/cast) character, or `from` as written. |
| `text` | The body, rendered for the current state. It has the blocks whose `when` holds, with tokens filled in. Any picture or video is in it as markup. |
| `beats` | `text` parsed into [beats](/docs/reference/prose#scenebeat), as a scene's body is. Draw these when the message can hold pictures or videos: Ava's photo of the ducks is an `image` beat, and a clip of them a `video` beat, in the order she wrote them. |
| `turn` | The [turn](/docs/reference/state#turn) it arrived on. With the [calendar](/docs/plugins/calendar#what-a-turn-is)'s default, a turn is a day. |
| `read` | Opened with `messages/read`, or replied to. |
| `replies` | The replies on offer now, each with its label and the command that sends it. Empty once one is sent. |
| `replied` | The label of the reply sent, or `null`. |

A message has no picture field of its own. Put pictures and videos in its body, where they sit in order with the words:

```ts
// prose 'ava.ducks': 'Look who turned up at the pond!\n\n[[video:clips/ducks|Two ducks on the pond]]'
{ id: 'ava.ducks', channel: 'texts', from: 'ava', when: { kv: 'parkVisit' }, body: [{ text: 'ava.ducks' }] }
```

The React UI's [`MessagesSection`](/docs/react/components#messagessection) draws each message's beats with [`Beat`](/docs/react/components#beat), videos included, so a picture in a message can be clicked to see it large.

## The state

### MessagesState

```ts
type MessagesState = {
  arrived: Record<string, number>
  replied: Record<string, string>
  read: Record<string, true>
}
```

What the plugin keeps in a save, at `state.plugins.messages`. It holds the turn each message arrived on, the reply sent to each, and which have been read, all by message id. A UI reads the view, not this.

## For code

The helpers write the content objects for you, typed. `messageArrived` and `messageReplied` return a `Condition`, and `replyTo` and `readThread` return a [`CommandRef`](/docs/reference/custom#commandref), in the short form.

### Helpers

```ts
const replyTo: (message: string, reply: string) => CommandRef
const readThread: (thread?: string) => CommandRef
const messageArrived: (message: string) => Condition
const messageReplied: (message: string, reply?: string) => Condition
```

### messageDefs

```ts
function messageDefs(game: Game): MessageDef[]
```

The game's messages, merged from its packs: `game.data.messages.messages`.

## Checks

When the game loads, the plugin reports these problems against the pack each message came from, with `where` as `messages <id>`:

- A channel the game doesn't have (`unknown channel "…"`).
- Anything `when` names that the game doesn't have, such as `unknown storyline "…"`.
- A body block with no prose (`no prose for "…"`), and anything the block's `when` names.
- Two replies with the same id (`two replies are called "…"`).
- A reply with no label (`no prose for "<message id>#<reply id>"`).
- Anything a reply's `when` or `effects` name, such as `reply <id>: unknown storyline "…"`.

```text
mod:summer-fete · messages fete.invite · no prose for "fete.invite#maybe"
```

A `messages/arrived`, `messages/replied` or `messages/read` condition, or a `messages/reply` command, naming a message the game doesn't have gives `unknown message "…"` where it's written.

## Gotchas

- **Messages arrive only after a command.** The plugin delivers them in its `onCommand` [hook](/docs/reference/plugins#hooks-and-providers), which runs after every command that went through, never on `start`. A message whose `when` already holds when the game starts arrives after the player's first command. To open the game with one, have the first command bring it, or put the words in the intro scene.
- **`when` is tested at the end of each command.** A message whose `when` held only partway through a command, or only before it, waits for a later command that ends while it holds. A message with the [calendar](/docs/plugins/calendar#conditions)'s `period('morning')` as its `when` doesn't arrive if the player's first command of the day ends in the afternoon. It arrives at the end of the next command that ends in a morning, which may be days later. If it matters when a message comes, write `when` for something that stays true, such as a kv key, a day (`day({ gte: 2 })`) or a scene seen.
- **A message arrives once.** After that it stays, whatever `when` does. For a message that comes again, write one message for each time. See [Messages that come again](#messages-that-come-again).
- **Reply labels are prose keys.** The label of reply `yes` on message `ava.text` is the prose line `ava.text#yes`. The loader reports a missing one, and the view falls back to the reply's id.
- **One reply, once.** After the player sends one, the others are gone and `messages/reply` refuses. To let the player say more, send a new message with replies of its own.
- **A channel the game doesn't have counts nothing.** `messages/unread` with `{ channel: 'post' }` is 0 when there's no `post` channel, so a badge that names a renamed channel stops counting. A [devices](/docs/plugins/devices) app badge that names a value nobody has is reported when the game loads.
- **The notice is the engine's.** Each arrival raises a [notice](/docs/reference/notices) with the id `messages.<message id>`, the sender's name as its `title` and the channel as its `tag`. So `view.notices.byTag.texts` counts arrivals the player hasn't dismissed. Reading a message doesn't dismiss its notice, and dismissing doesn't read the message. If your UI wants them to go together, send both commands.
- **The sender is matched by id.** A `from` that's a [cast](/docs/plugins/cast) character's id shows the character's name and portrait. A typo shows the typo, and the loader doesn't report it, because any name is allowed. Without the cast, `from: 'ava'` shows `ava`.
- **A message doesn't need a device.** You can show `view.plugins.messages` anywhere, such as letters on the mat or a pigeonhole at work. The [devices](/docs/plugins/devices) plugin is one way to show a channel, not a requirement.

## See it in an example

Small Town: `ava.text` in [`examples/showcase/src/content/town.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/content/town.ts) arrives the day after you meet Ava, with two replies. Their labels are in [`examples/showcase/src/content/prose.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/content/prose.ts).
