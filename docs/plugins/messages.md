# Messages

`@ifloom/plugin-messages` delivers messages that arrive when the story allows. They are kept in threads, and the player answers with replies that work like choices.

A message is a scene that arrives instead of one the player walks into. It has [prose blocks](/reference/scenes#block) for its words, a sender, and replies that carry [effects](/reference/effects). It arrives the first time its condition holds after a command, and it raises a [notice](/reference/notices) tagged with its channel, so the UI can show a toast or a badge.

```ts
import {
  messages, messageDefs, replyTo, readThread, messageArrived, messageReplied,
  type Channel, type MessageDef, type ReplyDef, type MessagesOptions, type MessagesState,
  type MessagesView, type ChannelView, type ThreadView, type MessageView,
} from '@ifloom/plugin-messages'
```

**Channels belong to the game.** Texts, email, letters on the mat, notes pushed under a door: the plugin knows nothing about phones. A game with no device shows a channel wherever it likes, such as the hall or a pigeonhole. With the [devices plugin](/plugins/devices) a channel can be an app instead, and the [phone bundle](/plugins/phone) does that for you.

## Install

Add the package beside the engine, and add `messages(...)` to the game's `plugins`. See [Adding one](/plugins/#adding-one).

```json
{
  "dependencies": {
    "@ifloom/engine": "file:../ifloom/packages/engine",
    "@ifloom/plugin-messages": "file:../ifloom/packages/plugin-messages"
  }
}
```

## messages

```ts
function messages(options: MessagesOptions): DefinedPlugin<MessagesState>
```

The plugin, with the id `messages`. Call it once, when the game is built, with the channels the game has.

It lists `cooperates: ['cast']` (see [`cooperates`](/reference/plugins#cooperates)): when the game has the [cast](/plugins/cast), a sender who is one of its characters is shown with their name and portrait, asked by name through its [`cast/person`](/plugins/cast#queries) query. Without the cast, every sender is shown as written.

```ts
const { game } = loadGame(packs, {
  id: 'small-town',
  title: 'Small Town',
  introScene: 'intro.wake',
  plugins: [
    calendar(),
    places({ start: 'house' }),
    messages({
      channels: [
        { id: 'texts', name: 'Texts' },
        { id: 'letters', name: 'Letters' },
      ],
    }),
  ],
})
```

### MessagesOptions

```ts
type MessagesOptions = { channels: Channel[] }
```

| Field | What it is |
|---|---|
| `channels` | Every channel, in the order the view lists them. |

### Channel

```ts
type Channel = { id: string; name: string }
```

| Field | What it is |
|---|---|
| `id` | What messages name the channel by, and the `tag` on the notices they raise. It also names the channel's [value](#values), `messages/unread-<id>`. |
| `name` | What the player reads. |

The channels are code, not content: a mod cannot add one.

## Writing messages

Messages are content. List them in a pack's [`data`](/reference/loader#pack) under `messages.messages`. They are merged by id as scenes are, so a mod can add a message or rewrite one.

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
| `from` | Who sent it: a [cast](/plugins/cast) character's id, or any name as it should be shown (`'Town council'`). A character's name and portrait are looked up; anything else is shown as written. |
| `thread` | The thread it belongs in. Left out, it is the sender: every message from `rosa` in a channel goes in one thread. |
| `when` | It arrives the first time this [condition](/reference/conditions) holds after a command. |
| `body` | Its words, as [prose blocks](/reference/scenes#block): the same blocks as a scene's body, with tokens and `when`s. |
| `replies` | What the player can send back. The player sends one, once. No replies if left out. |

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
| `id` | Unique within the message. The reply's label is the prose key `<message id>#<reply id>`, as a [data scene choice](/reference/scenes#choice)'s is. |
| `when` | The reply is only on offer while this holds. |
| `effects` | What sending it does: plain effects, a game's [custom effect](/reference/custom), or a plugin's, in order. |

```ts
{
  id: 'rosa.thanks',
  channel: 'texts',
  from: 'rosa',
  when: { flag: 'boughtBread' },
  body: [{ text: 'rosa.thanks' }],
  replies: [
    { id: 'yes', effects: [{ kind: 'flag', key: 'regular', value: true }] },
    { id: 'no' },
  ],
}
// prose: 'rosa.thanks', 'rosa.thanks#yes', 'rosa.thanks#no'
```

## A worked example

The player buys a loaf at Rosa's bakery, and Rosa texts to say thanks. Saying yes brings a second text. A letter from the council lands on the mat in the afternoon. There is no phone here: the texts and the letters are just two channels, and the hall has a button to pick up the post. The afternoon is the [calendar](/plugins/calendar)'s, listed before the messages in `plugins`, and Rosa is the [cast](/plugins/cast)'s: `plugins: [calendar(), places({ start: 'house' }), cast(), messages({ /* ... */ })]`.

```ts
import { SCHEMA, type Pack } from '@ifloom/engine'
import { messageReplied } from '@ifloom/plugin-messages'
import { pass, period } from '@ifloom/plugin-calendar'
import { onlyAt } from '@ifloom/plugin-places'

const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  items: [{ id: 'loaf', name: 'Loaf', desc: 'Still warm.', kind: 'stuff' }],
  activities: [
    { id: 'buyLoaf', requires: [onlyAt(['bakery'])], effects: [{ kind: 'item', id: 'loaf', by: 1 }, { kind: 'flag', key: 'boughtBread', value: true }] },
    { id: 'wait', effects: [pass(1)] },
  ],
  prose: {
    'rosa.thanks': 'Thanks for coming in, {{playerName}}. Same time tomorrow?',
    'rosa.thanks#yes': 'Wouldn’t miss it.',
    'rosa.thanks#no': 'Not tomorrow, sorry.',
    'rosa.keep': 'I’ll keep a seeded loaf back for you.',
    'council.bins': 'Bins go out on Thursdays from now on.',
    'ui.inbox': 'Inbox ({{v:messages/unread}})',
    // place.house ...
  },
  data: {
    cast: { characters: [{ id: 'rosa', name: 'Rosa', role: 'Baker', home: 'bakery' }] },
    places: {
      locations: [
        {
          id: 'house', name: 'House', tag: 'Home', kind: 'room', exits: ['high-street'], art: '',
          body: [{ text: 'place.house' }],
          actions: [
            { id: 'mat', label: 'Pick up the post', command: { type: 'custom', name: 'messages/read', with: { channel: 'letters' } } },
          ],
        },
        // high-street, bakery ...
      ],
    },
    messages: {
      messages: [
        {
          id: 'rosa.thanks', channel: 'texts', from: 'rosa',
          when: { flag: 'boughtBread' },
          body: [{ text: 'rosa.thanks' }],
          replies: [{ id: 'yes', effects: [{ kind: 'flag', key: 'regular', value: true }] }, { id: 'no' }],
        },
        {
          id: 'rosa.keep', channel: 'texts', from: 'rosa',
          when: messageReplied('rosa.thanks', 'yes'),
          body: [{ text: 'rosa.keep' }],
        },
        {
          id: 'council.bins', channel: 'letters', from: 'Town council',
          when: period('afternoon'),
          body: [{ text: 'council.bins' }],
        },
      ],
    },
  },
}
```

How it plays, for a player called Sam, starting at home on the second morning (turn 1):

```ts
const inbox = (state: GameState) => view(state, game).plugins.messages as MessagesView

inbox(state).unread     // 0

// ...to the bakery, and buy a loaf
state = apply(state, game, { type: 'activity', id: 'buyLoaf' }).state
inbox(state).channels[0].threads
// [{ id: 'rosa', name: 'Rosa', portrait: 'art/character/rosa.jpg', unread: 1, messages: [
//   { id: 'rosa.thanks', from: 'rosa', name: 'Rosa', text: 'Thanks for coming in, Sam. Same time tomorrow?',
//     turn: 1, read: false, replied: null,
//     replies: [{ id: 'yes', label: 'Wouldn’t miss it.', command: replyTo('rosa.thanks', 'yes') }, { id: 'no', ... }] } ] }]
view(state, game).notices.byTag    // { texts: 1 }
// 'ui.inbox' reads "Inbox (1)"

whyNot(state, game, replyTo('rosa.thanks', 'maybe'))   // 'That is not a reply on offer.'
state = apply(state, game, replyTo('rosa.thanks', 'yes')).state
whyNot(state, game, replyTo('rosa.thanks', 'no'))      // 'You have already replied.'
inbox(state).channels[0].threads[0].messages
// [{ id: 'rosa.thanks', read: true, replied: 'Wouldn’t miss it.', replies: [], ... },
//  { id: 'rosa.keep', read: false, replied: null, ... }]   // the reply brought the next text

state = apply(state, game, readThread('rosa')).state       // the player read the thread
state = apply(state, game, { type: 'activity', id: 'wait' }).state   // afternoon: the letter comes
inbox(state).channels[1]
// { id: 'letters', name: 'Letters', unread: 1, threads: [{ id: 'Town council', name: 'Town council', portrait: null, ... }] }

// ...home, and pick up the post
state = apply(state, game, { type: 'custom', name: 'messages/read', with: { channel: 'letters' } }).state
inbox(state).unread     // 0
```

## Conditions

| Content writes | Helper | Holds when |
|---|---|---|
| `{ custom: 'messages/arrived', with: { message } }` | `messageArrived(message)` | The message has arrived. |
| `{ custom: 'messages/replied', with: { message, reply? } }` | `messageReplied(message, reply?)` | The player replied to the message. With `reply`, they sent that reply. |
| `{ custom: 'messages/read', with: { message } }` | | The player has read the message. |

Use them anywhere a condition goes: another message's `when`, a scene block, a lock, a quest stage. Each can also be written short, with the full name as the only key: `{ 'messages/arrived': { message: 'rosa.thanks' } }` is `{ custom: 'messages/arrived', with: { message: 'rosa.thanks' } }` (see [plugin calls](/reference/custom)).

```ts
{ text: 'bakery/rosa-saved-one', when: messageReplied('rosa.thanks', 'yes') }
```

An unknown message is false.

## Commands

| Command | Helper | Does |
|---|---|---|
| `{ type: 'custom', name: 'messages/reply', with: { message, reply } }` | `replyTo(message, reply)` | Sends the reply: marks the message replied and read, then runs the reply's effects. |
| `{ type: 'custom', name: 'messages/read', with: { thread?, channel? } }` | `readThread(thread?)` | Marks every message that has arrived in the thread read. With `channel`, only that channel's. Leave both out to mark everything read. |

`messages/reply` is refused with:
- `There is no such message.` for a message that does not exist or has not arrived;
- `You have already replied.` once a reply has been sent;
- `That is not a reply on offer.` for a reply the message does not have, or one whose `when` does not hold.

Each line can be reworded; see [Strings](#strings).

`messages/read` is never refused apart from [locks](/reference/locks). A UI usually sends `readThread(thread)` when the player opens a thread. `readThread` only names a thread; to mark a whole channel read, write the long form with `channel`, as the hall's button does above.

Both are commands like any other, so triggers run and every plugin's `after` hook runs after them. A reply whose effects make another message's `when` true brings that message in the same command.

## Values

| Prose writes | Prints |
|---|---|
| <code v-pre>{{v:messages/unread}}</code> | Unread messages in every channel. |
| <code v-pre>{{v:messages/unread-&lt;channel&gt;}}</code> | Unread messages in that channel, one value for each channel you configure: <code v-pre>{{v:messages/unread-texts}}</code>, <code v-pre>{{v:messages/unread-letters}}</code>. |

The per-channel values also serve badges, such as a devices app's `badge: { count: 'messages/unread-texts' }`, and code through [`customValue`](/reference/custom). A value name may contain `-`, so they print in prose like any other.

## Strings

The plugin's lines in the [strings table](/reference/strings#plugins-strings). A game, a pack or a translation rewords them by their full key.

| Key | English |
|---|---|
| `messages/noSuchMessage` | `There is no such message.` |
| `messages/alreadyReplied` | `You have already replied.` |
| `messages/notOnOffer` | `That is not a reply on offer.` |

```ts
strings: { 'messages/alreadyReplied': 'You have said your piece.' }
```

## The view

`view(state, game).plugins.messages` is a `MessagesView`.

### MessagesView

```ts
type MessagesView = { channels: ChannelView[]; unread: number }
```

| Field | What it is |
|---|---|
| `channels` | Every channel, in the order `messages(...)` was given them, including empty ones. |
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
| `name` | The [cast](/plugins/cast) character's name if `id` is one, or `id` as written. |
| `portrait` | The cast character's portrait (their `portrait`, or `art/character/<id>.jpg`); `null` if `id` is not one, or the game has no cast. |
| `messages` | Oldest first. |
| `unread` | Unread messages in the thread. |

### MessageView

```ts
type MessageView = {
  id: string
  from: string
  name: string
  text: string
  turn: number
  read: boolean
  replies: { id: string; label: string; command: Command }[]
  replied: string | null
}
```

| Field | What it is |
|---|---|
| `from` | The sender, as written. |
| `name` | The sender's name if they are a [cast](/plugins/cast) character, or `from` as written. |
| `text` | The body, rendered for the current state: blocks whose `when` holds, with tokens filled in. |
| `turn` | The [turn](/reference/state#turn) it arrived. With the [calendar](/plugins/calendar#what-a-turn-is)'s default, a turn is a day. |
| `read` | Opened with `messages/read`, or replied to. |
| `replies` | The replies on offer now, each with its label and the command that sends it. Empty once one is sent. |
| `replied` | The label of the reply sent, or `null`. |

## The state

### MessagesState

```ts
type MessagesState = {
  arrived: Record<string, number>
  replied: Record<string, string>
  read: Record<string, true>
}
```

What the plugin keeps in a save, at `state.plugins.messages`: the turn each message arrived, the reply sent to each, and which have been read, all by message id. A UI reads the view, not this.

## For code

The helpers write the content objects for you, typed. `messageArrived` and `messageReplied` return a `Condition`, while `replyTo` and `readThread` return a `Command`.

### Helpers

```ts
const replyTo: (message: string, reply: string) => Command
const readThread: (thread?: string) => Command
const messageArrived: (message: string) => Condition
const messageReplied: (message: string, reply?: string) => Condition
```

### messageDefs

```ts
function messageDefs(game: Game): MessageDef[]
```

The game's messages, merged from its packs: `game.data.messages.messages`.

## Checks

When the game loads, the plugin reports, against the pack each message came from, with `where` as `messages <id>`:

- a channel the game was not given (`no channel called "…"`);
- anything `when` names that the game does not have (`unknown storyline "…"`);
- a body block with no prose (`no prose for "…"`), and anything its `when` names;
- two replies with the same id (`two replies are called "…"`);
- a reply with no label (`no prose for "<message id>#<reply id>"`);
- anything a reply's `when` names (`reply <id>: unknown storyline "…"`).

```text
mod:summer-fete · messages fete.invite · no prose for "fete.invite#maybe"
```

Effects on a reply are not checked by the plugin.

## Gotchas

- **Messages arrive only after a command.** The plugin delivers in its `after` [hook](/reference/plugins#hooks), which runs after every command that took, never on `start`. A message whose `when` already holds on the first frame arrives after the player's first command. To open the game with one, make the first command bring it, or put the words in the intro scene.
- **`when` is tested once the command has finished.** A message whose `when` held only partway through a command, or only before it (a `period('morning')` message, from the [calendar](/plugins/calendar#conditions), when the first command ends in the afternoon), never arrives. Write `when` for something that stays true, such as a flag, a day (`day({ gte: 2 })`), a scene seen.
- **A message arrives once.** Once arrived it stays, whatever `when` does afterwards. For a message that repeats, write one message per time it comes.
- **Reply labels are prose keys.** The label of reply `yes` on message `rosa.thanks` is the prose line `rosa.thanks#yes`. The loader reports a missing one, and the view falls back to the reply's id.
- **One reply, once.** After the player sends one, the others are gone, and `messages/reply` refuses. To let the player say more, send a new message that has its own replies.
- **`messages/unread-<channel>` names come from the channels you configure.** A channel called `texts` gives `messages/unread-texts`. Rename the channel and every badge that names the old value stops counting; a [devices](/plugins/devices) app's badge that names a value nobody has is reported when the game loads.
- **The notice is the engine's.** Each arrival raises a [notice](/reference/notices) with the id `messages.<message id>`, the sender's name as its `title` and the channel as its `tag`, so `view.notices.byTag.texts` counts arrivals the player has not dismissed. Reading a message does not dismiss its notice, and dismissing does not read the message: send both if the UI wants them to go together.
- **The sender is matched by id.** A `from` that is a [cast](/plugins/cast) character's id shows the character's name and portrait. A typo shows the typo, and the loader does not report it, because any name is allowed. Without the cast, `from: 'rosa'` shows `rosa`.
- **A message does not need a device.** Show `view.plugins.messages` anywhere: letters on the mat, a pigeonhole at work, a board of notes. The [devices](/plugins/devices) plugin is one way to show a channel, not a requirement.
