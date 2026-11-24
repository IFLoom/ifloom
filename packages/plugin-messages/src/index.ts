/**
 * The messages plugin, which delivers messages in threads when the story allows, with replies that are choices.
 *
 * A message has a sender, a body of blocks and replies that carry effects. It arrives the first time its condition
 * holds after a command, and raises a notice tagged with its channel. A message in a pool arrives only when
 * `messages/draw` draws it, as often as it is drawn.
 *
 * The game declares its channels, such as texts, email or letters on the mat. The plugin has no phone of its own, and
 * the devices plugin can show a channel as an app.
 */
import {
  applyEffects,
  buildEffects,
  commandOf,
  fillTokens,
  holds,
  inRange,
  notify,
  pluginQuery,
  stringOf,
  weighted,
  type Block,
  type CommandRef,
  type Condition,
  type EffectRef,
  type Game,
  type GameState,
  type Range,
  type RenderedChoice,
  type SceneBeat,
} from '@ifloom/engine'
import {
  arg,
  defineCalls,
  defineData,
  definePlugin,
  list,
  renderAction,
  speakerOf,
  type CommandsOf,
  type ConditionsOf,
  type DefinedPlugin,
  type EffectsOf,
  type PluginContext,
  type PluginProblem,
  type Reference,
  type SenderView,
} from '@ifloom/engine/plugin'
import { CONTENT_VERSION, contentMigrations, COMMAND_VERSION, commandMigrations } from './upgrade.ts'

/** A channel the game declares in `data.messages.channels`, such as texts, email or the doormat. */
export type Channel = {
  /** The channel's id, which a message's `channel` names. */
  id: string
  /** The channel's name. */
  name: string
}

/** A reply the game declares in a {@link MessageDef}'s `replies`. The player can send one reply to each arrival. */
export type ReplyDef = {
  /** The reply's id, unique within its message. */
  id: string
  /** The reply's label, such as "On my way", with tokens filled. The reply's id if left out. */
  label?: string
  /** The condition that must hold for the reply to be on offer. */
  when?: Condition
  /** The effects of sending the reply, after the plugin records it. */
  effects?: EffectRef[]
}

/** A message the game declares in `data.messages.messages`. It arrives once by its `when`, or each time `messages/draw` draws it from a pool. */
export type MessageDef = {
  /** The message's id. */
  id: string
  /** The id of the channel the message arrives in. */
  channel: string
  /** The message's sender, a character id or any name the game's prose uses. */
  from: string
  /** The id of the thread the message belongs in. The sender if left out. */
  thread?: string
  /**
   * The condition for the message to arrive, the first time it holds after a command. Left out, the message arrives
   * after the first command.
   *
   * For a message in a pool, `messages/draw` can draw it only while this holds, and any time if left out.
   */
  when?: Condition
  /**
   * The pools `messages/draw` can draw the message from. A message with pools arrives only when drawn, never by
   * `when` alone, and arrives again each time it is drawn.
   */
  drawnFrom?: string[]
  /** The message's weight in a draw, against the others that can be drawn. 1 if left out. */
  weight?: number
  /** The message's words, a body of blocks like a scene's. */
  body: Block[]
  /** The replies the player can choose from, one per arrival. None if left out. */
  replies?: ReplyDef[]
  /**
   * The effects that run each time the message arrives, in the same command, after the plugin records the arrival.
   *
   * A trigger on `messages/arrived` runs a command later, since triggers run before the plugins deliver.
   */
  effects?: EffectRef[]
  /**
   * The message's wait of `ms` milliseconds after the thread's previous arrival, once its `when` holds. The message
   * arrives at once if left out.
   *
   * The engine's `tick` runs it down as it does a timer. One message waits at a time, and while it waits, every other
   * message with `after` and every later message in its thread wait until it has arrived.
   */
  after?: { ms: number }
  /** True when the thread shows the other side typing while the message waits. True if left out. */
  typing?: boolean
}

/**
 * The record a save keeps of one arrival of a message, in {@link MessagesState}'s `arrived`. A message drawn from a
 * pool can arrive again, and each arrival has its own reply and read mark.
 */
export type Arrival = {
  /**
   * The arrival's key, the message's id the first time it arrives and then `<id>~2`, `<id>~3` and so on. The plugin
   * keeps replies and reads by this key, and the reply command names it.
   */
  key: string
  /** The message's id. */
  message: string
  /** The turn the message arrived on. */
  turn: number
  /** The day the message arrived, the calendar's day or the turn in a game without the calendar. */
  day: number
}

/** The messages a save keeps for the player, their arrivals, replies and reads. The plugin reads the messages from content. */
export type MessagesState = {
  /** The arrivals so far, oldest first. */
  arrived: Arrival[]
  /** The id of the reply sent to each arrival, by the arrival's key. */
  replied: Record<string, string>
  /** The day each reply was sent, by the arrival's key, the calendar's day or the turn without the calendar. */
  repliedOn: Record<string, number>
  /** The arrivals the player has read, by key. */
  read: Record<string, true>
  /**
   * The message waiting to arrive, with its id, its thread and whether the thread shows typing, or null. The plugin's
   * timer `messages.due` runs while it waits and delivers it when it runs out.
   */
  due: { key: string; thread: string; typing: boolean } | null
}

/** One arrival of a message as the player sees it, in a {@link ThreadView}'s `messages`. */
export type MessageView = {
  /** The message's id. A message that arrives twice shows twice, with one id and two keys. */
  id: string
  /** The arrival's key, which a UI can use as a list key (see {@link Arrival}). */
  key: string
  /** The message's sender as the message's `from` gives it, a character id or a name. */
  from: string
  /** The sender's name if the sender is a character, else `from` as given. */
  name: string
  /** The message's words with tokens filled, including any picture and video markup. */
  text: string
  /**
   * The message's body rendered as beats, as a scene's is. The beats are its paragraphs and its pictures and videos,
   * from markup or `{ media }` blocks, in the order written.
   */
  beats: SceneBeat[]
  /** The turn the message arrived on. */
  turn: number
  /** True once the player has read the message. */
  read: boolean
  /** The replies on offer until one is sent, each a button that sends its `command`. */
  replies: RenderedChoice[]
  /** The label of the reply sent, or null before one is sent. */
  replied: string | null
}

/** A thread of messages as the player sees it, in a {@link ChannelView}'s `threads`. */
export type ThreadView = {
  /** The thread's id, its `thread` or its sender. */
  id: string
  /** The thread's name, the sender's name for a character or the id as given. */
  name: string
  /** The path of the sender's picture, their entity's `image` through `artSrc`, or null for a sender who is only a name. */
  image: string | null
  /** The path of the sender's face for an avatar, a character's `portrait` with the cast plugin, else their `image`. */
  portrait: string | null
  /** The thread's messages, oldest first. */
  messages: MessageView[]
  /** The number of the thread's messages the player hasn't read. */
  unread: number
  /** The button that marks the thread read, labelled with the `messages/markRead` string (`Mark read`), or null while nothing in it is unread. */
  read: RenderedChoice | null
  /** True while a message with `after` waits to arrive in this thread and its `typing` isn't false. */
  typing: boolean
}

/** A channel as the player sees it, in `view.plugins.messages.channels`. */
export type ChannelView = {
  /** The channel's id. */
  id: string
  /** The channel's name. */
  name: string
  /** The channel's threads, the one with the latest arrival first. */
  threads: ThreadView[]
  /** The number of the channel's messages the player hasn't read. */
  unread: number
  /** The button that marks the whole channel read, labelled with the `messages/allRead` string (`Mark all read`), or null while nothing in it is unread. */
  read: RenderedChoice | null
}

/** The messages as the player sees them, in `view.plugins.messages`. */
export type MessagesView = {
  /** The game's channels in the order it declares them, each with its threads. */
  channels: ChannelView[]
  /** The number of unread messages in all channels. */
  unread: number
  /** True while a message with `after` waits to arrive in any thread. */
  waiting: boolean
}

/**
 * What content writes for each of the plugin's calls (from `CALLS`), its
 * queries' answers and its view, so a call with a misspelled argument fails
 * to compile.
 */
declare module '@ifloom/engine' {
  interface ConditionRegistry extends ConditionsOf<typeof CALLS> {}
  interface EffectRegistry extends EffectsOf<typeof CALLS> {}
  interface CommandRegistry extends CommandsOf<typeof CALLS> {}
  interface ViewRegistry {
    messages: MessagesView
  }
}

const ID = 'messages'
/** The plugin's one timer: it runs while a message with `after` waits, and delivers it when it runs out. */
const DUE = 'messages.due'
/** How long a notice's line can be, in characters, before it is cut. */
const NOTICE_LENGTH = 80

/**
 * The plugin's two lists, as content writes them in `data.messages.channels` and `data.messages.messages` (a plugin's
 * `data` holds its lists by name), with the words a player reads in each, for a translation's `words` table.
 */
const DATA = defineData(ID, {
  channels: list<Channel>({ noun: 'channel', words: { name: true } }),
  messages: list<MessageDef>({ noun: 'message', words: { body: 'blocks', effects: 'effects', replies: [{ label: true, effects: 'effects' }] } }),
})

/** A message by id, or one of its arrivals by key (`'hello~2'`): the message is named to the checker. */
const message = () => arg.string().naming((key): Reference[] => [DATA.messages.ref(messageOfKey(key))])

/** The plugin's calls, and what each takes. */
const CALLS = defineCalls(ID, {
  conditions: {
    /** The message has arrived. */
    arrived: { message: message() },
    /** Days since it last arrived, in a range. */
    since: { message: message(), ...arg.bounds },
    /** The player has replied to it, with `reply` if given; with a range, that many days ago. */
    replied: { message: message(), reply: arg.string().optional(), ...arg.bounds },
    /** The player has read it. */
    read: { message: message() },
  },
  effects: {
    /** Deliver one message drawn from `pool`. */
    draw: {
      pool: arg
        .string()
        .naming((pool, game): Reference[] =>
          messagesOf(game).some((entry) => entry.drawnFrom?.includes(pool)) ? [] : [{ problem: `draws from "${pool}", but no message is drawn from it` }],
        ),
    },
    /** The waiting message arrives: what the plugin's timer runs. */
    due: {},
  },
  commands: {
    /** Send the reply `reply` to the arrival `message`. */
    reply: { message: message(), reply: arg.string() },
    /** Mark messages read: a thread's (`id`), a channel's, or all of them. */
    read: { id: arg.string().optional(), channel: arg.entry(DATA.channels).optional() },
  },
})

/** Returns the game's messages, from `data.messages.messages` in its content and packs. */
export function messagesOf(game: Game): MessageDef[] {
  return DATA.messages.all(game)
}

function threadOf(message: MessageDef): string {
  return message.thread ?? message.from
}

/** Who a message is from: the cast's answer when the game has the cast, else their entity's name and picture, or the name as written. */
function senderOf(state: GameState, game: Game, from: string): SenderView {
  const asked = pluginQuery(game, 'cast/sender')?.(state, { from })
  if (asked) return asked
  const known = from ? speakerOf(state, game, from) : null
  return known ? { name: known.name, image: known.image, portrait: known.image } : { name: from, image: null, portrait: null }
}

/** The day: the calendar's, asked by name, or the turn without one. */
function dayOf(state: GameState, game: Game): number {
  return pluginQuery(game, 'calendar/now')?.(state).day ?? state.turn
}

/** The replies on offer for an arrival now: none once one is sent. */
function offered(state: GameState, game: Game, record: MessagesState, message: MessageDef, key: string): ReplyDef[] {
  if (record.replied[key] !== undefined) return []
  return (message.replies ?? []).filter((reply) => holds(state, game, reply.when))
}

/** The latest arrival of a message, if it has come. */
function latest(record: MessagesState, message: string): Arrival | undefined {
  return record.arrived.findLast((arrival) => arrival.message === message)
}

/** The message an arrival key or a message id names: the key without its `~n`. */
function messageOfKey(key: string): string {
  return key.replace(/~\d+$/, '')
}

/** A message's first line, as the player reads it, cut to a notice's length. */
function firstLine(message: MessageDef, context: PluginContext<MessagesState>, key: string): string {
  const words = context.beats(message.body, message.id).flatMap((beat) => ('text' in beat ? [beat.text] : []))
  const line = (words[0] ?? '').split('\n')[0]!.trim()
  return line.length > NOTICE_LENGTH ? `${line.slice(0, NOTICE_LENGTH - 1).trimEnd()}…` : line || key
}

/** The notice ids of arrivals in a thread, by the message each names. */
function threadNotices(game: Game, slice: MessagesState, thread: string): Set<string> {
  const defs = new Map(messagesOf(game).map((message) => [message.id, message]))
  return new Set(
    slice.arrived.flatMap((arrival) => {
      const message = defs.get(arrival.message)
      return message && threadOf(message) === thread ? [`messages.${arrival.key}`] : []
    }),
  )
}

/**
 * Deliver a message as a new arrival, with its notice: the sender's name, and
 * the message's first line. An unseen notice for an earlier message in the
 * same thread is replaced, so a burst raises one notice, not a stack.
 */
function deliver(state: GameState, message: MessageDef, context: PluginContext<MessagesState>, slice: MessagesState): GameState {
  const count = slice.arrived.filter((arrival) => arrival.message === message.id).length
  const key = count === 0 ? message.id : `${message.id}~${count + 1}`
  const arrival: Arrival = { key, message: message.id, turn: state.turn, day: dayOf(state, context.game) }
  const earlier = threadNotices(context.game, slice, threadOf(message))
  const kept: GameState = { ...state, notices: (state.notices ?? []).filter((notice) => notice.seen || !earlier.has(notice.id)) }
  const next = notify(kept, {
    id: `messages.${key}`,
    title: senderOf(state, context.game, message.from).name,
    text: firstLine(message, context, key),
    tag: message.channel,
  })
  const arrived = context.set({ ...slice, arrived: [...slice.arrived, arrival] }, next)
  return message.effects?.length ? applyRefs(arrived, context.game, message.effects) : arrived
}

/** A save's slice before anything has happened. */
const empty = (): MessagesState => ({ arrived: [], replied: {}, repliedOn: {}, read: {}, due: null })

/** Whether a condition's arguments give any bound of a range. */
const ranged = (args: Range) => args.gte !== undefined || args.gt !== undefined || args.lte !== undefined || args.lt !== undefined

/** Returns the game's channels in order, from `data.messages.channels` in its content and packs. */
export function channelsOf(game: Game): Channel[] {
  return DATA.channels.all(game)
}

/**
 * Returns the messages plugin for the game's `plugins`. The game declares its channels in `data.messages.channels`
 * and its messages in `data.messages.messages`, so a mod can add either.
 */
function messagesPlugin(): DefinedPlugin<MessagesState, MessagesView> {
  function unreadIn(record: MessagesState, game: Game, channel?: string): number {
    const channelOf = new Map(messagesOf(game).map((message) => [message.id, message.channel]))
    return record.arrived.filter(
      (arrival) => channelOf.has(arrival.message) && (channel === undefined || channelOf.get(arrival.message) === channel) && !record.read[arrival.key],
    ).length
  }

  const plugin = definePlugin<MessagesState, MessagesView, typeof CALLS>({
    id: ID,
    version: 4,
    calls: CALLS,
    data: DATA,
    contentVersion: CONTENT_VERSION,
    contentMigrations,
    commandVersion: COMMAND_VERSION,
    commandMigrations,
    // Senders are the cast's characters when the game has the cast: a name and a face.
    // An arrival's day is the calendar's when the game has it.
    cooperates: ['cast', 'calendar'],
    migrations: {
      // 1 → 2: arrivals became a list, so a message drawn from a pool can come again.
      // Replies and reads were by message id, which is each one's first arrival's key.
      // An old arrival's day is its turn: the save didn't keep the day.
      1: (state) => {
        const old = state as { arrived?: Record<string, number>; replied?: Record<string, string>; read?: Record<string, true> }
        const arrived = Object.entries(old.arrived ?? {})
          .sort(([, a], [, b]) => a - b)
          .map(([message, turn]): Arrival => ({ key: message, message, turn, day: turn }))
        return { arrived, replied: old.replied ?? {}, read: old.read ?? {} }
      },
      // 2 → 3: a message can wait to arrive (`after`); nothing waits in an old save.
      2: (state) => ({ ...(state as object), due: null }),
      // 3 → 4: the day of each reply is kept, for `messages/replied` with a range. An old reply's
      // day is its arrival's: the save didn't keep when it was sent.
      3: (state) => {
        const old = state as Omit<MessagesState, 'repliedOn'>
        const dayOfKey = new Map(old.arrived.map((arrival) => [arrival.key, arrival.day]))
        const repliedOn = Object.fromEntries(Object.keys(old.replied).map((key) => [key, dayOfKey.get(key) ?? 0]))
        return { ...old, repliedOn }
      },
    },
    // The timer a waiting message runs down. Its length is set each time it starts, from the message's `after`.
    content: { timers: [{ id: DUE, ms: 1000, effects: [CALLS.effects.due()] }] },
    strings: {
      noSuchMessage: 'There is no such message.',
      alreadyReplied: 'You have already replied.',
      notOnOffer: 'That is not a reply on offer.',
      // The view's buttons.
      markRead: 'Mark read',
      allRead: 'Mark all read',
    },
    start: empty,
    conditions: {
      /** `{ 'messages/arrived': { message } }`: it has arrived at least once. */
      arrived: (_state, { message }, { slice }) => latest(slice, message) !== undefined,
      /**
       * `{ 'messages/since': { message, gte… } }`: whole days since it last
       * arrived, in a range. Days are the calendar's, or turns without it.
       * False if it never has, so `{ not: … lt: 3 }` is "not in the last 3 days".
       */
      since: (state, range, { slice, game }) => {
        const last = latest(slice, range.message)
        return last !== undefined && inRange(state, game, dayOf(state, game) - last.day, range)
      },
      /**
       * `{ 'messages/replied': { message, reply?, gte… } }`: its latest arrival
       * got any reply, or that one. With a range, the whole days since the
       * reply was sent are in it too, counted as `messages/since` counts.
       */
      replied: (state, args, { slice, game }) => {
        const last = latest(slice, args.message)
        const sent = last && slice.replied[last.key]
        if (sent === undefined || (args.reply !== undefined && sent !== args.reply)) return false
        if (!ranged(args)) return true
        const on = slice.repliedOn[last!.key] ?? last!.day
        return inRange(state, game, dayOf(state, game) - on, args)
      },
      /** `{ 'messages/read': { message } }`: its latest arrival has been read. */
      read: (_state, { message }, { slice }) => {
        const last = latest(slice, message)
        return Boolean(last && slice.read[last.key])
      },
    },
    effects: {
      /**
       * `{ 'messages/draw': { pool } }`: one message drawn from the pool,
       * from those whose `when` holds, by weight, delivered as a new arrival.
       * Seeded by the save, the turn and how many arrivals there have been,
       * so a replay draws the same. Nothing when none can be drawn.
       */
      draw: (state, { pool }, context) => {
        const slice = context.slice
        const eligible = messagesOf(context.game).filter((message) => message.drawnFrom?.includes(pool) && holds(state, context.game, message.when))
        const drawn = weighted(eligible, (message) => message.weight, 'messages/draw', pool, state.seed, state.turn, slice.arrived.length)
        return drawn ? deliver(state, drawn, context, slice) : state
      },
      /**
       * `{ 'messages/due': {} }`: the waiting message arrives. The plugin's
       * timer runs it when the wait is over; content has no need to.
       * Nothing when no message waits.
       */
      due: (state, _args, context) => {
        const slice = context.slice
        const message = slice.due && DATA.messages.get(context.game, slice.due.key)
        if (!message) return slice.due ? context.set({ ...slice, due: null }, state) : state
        return deliver(state, message, context, { ...slice, due: null })
      },
    },
    commands: {
      /**
       * `{ 'messages/reply': { message, reply } }`: `message` is the arrival's
       * key, which is the message's id for its first arrival.
       */
      reply: {
        whyNot: (state, args, { slice, game }) => {
          const arrival = slice.arrived.find((entry) => entry.key === args.message)
          const message = arrival && DATA.messages.get(game, arrival.message)
          if (!arrival || !message) return stringOf(game, 'messages/noSuchMessage')
          if (slice.replied[arrival.key] !== undefined) return stringOf(game, 'messages/alreadyReplied')
          return offered(state, game, slice, message, arrival.key).some((reply) => reply.id === args.reply) ? undefined : stringOf(game, 'messages/notOnOffer')
        },
        run: (state, args, { slice, set, game }) => {
          const arrival = slice.arrived.find((entry) => entry.key === args.message)!
          const message = DATA.messages.get(game, arrival.message)!
          const reply = message.replies!.find((entry) => entry.id === args.reply)!
          const next = set({
            ...slice,
            replied: { ...slice.replied, [arrival.key]: reply.id },
            repliedOn: { ...slice.repliedOn, [arrival.key]: dayOf(state, game) },
            read: { ...slice.read, [arrival.key]: true },
          })
          return applyRefs(next, game, reply.effects ?? [])
        },
      },
      /** `{ 'messages/read': { id?, channel? } }`: mark the thread `id` read; leave both out for everything. */
      read: {
        run: (_state, { id, channel }, { slice, set, game }) => {
          const read = { ...slice.read }
          const defs = new Map(messagesOf(game).map((message) => [message.id, message]))
          for (const arrival of slice.arrived) {
            const message = defs.get(arrival.message)
            if (!message) continue
            if (id !== undefined && threadOf(message) !== id) continue
            if (channel !== undefined && message.channel !== channel) continue
            read[arrival.key] = true
          }
          return set({ ...slice, read })
        },
      },
    },
    values: {
      /**
       * Unread messages: in every channel, or in one with `{ channel }`.
       * `{{messages/unread channel=texts}}`, or a badge's
       * `{ value: 'messages/unread', with: { channel: 'texts' } }`.
       */
      unread: (_state, args, { slice, game }) => unreadIn(slice, game, args.channel === undefined ? undefined : String(args.channel)),
    },
    // Deliver what the story has brought due, once each, and say so. Pool messages wait to be drawn.
    // A message with `after` waits instead: it's queued in `due` and the timer started. While one waits,
    // the rest of its thread waits behind it, and so does any other message with `after`.
    onCommand: (_before, after, context) => {
      let next = after
      for (const message of messagesOf(context.game)) {
        if (message.drawnFrom?.length) continue
        const slice = context.get(next)
        // A message with `after` is asked of the state as it now is, so one can wait on an arrival in this same command.
        if (latest(slice, message.id) !== undefined || slice.due?.key === message.id || !holds(message.after ? next : after, context.game, message.when))
          continue
        if (slice.due && (slice.due.thread === threadOf(message) || message.after)) continue
        if (message.after) {
          const due = { key: message.id, thread: threadOf(message), typing: message.typing !== false }
          next = context.apply([{ timer: DUE, to: Math.max(message.after.ms, 1) }], context.set({ ...slice, due }, next))
          continue
        }
        next = deliver(next, message, context, slice)
      }
      return next
    },
    view: (state, { slice, game, beats }): MessagesView => {
      const channels = channelsOf(game).map((channel): ChannelView => {
        const threads = new Map<string, MessageView[]>()
        const latest = new Map<string, number>()
        const defs = new Map(
          messagesOf(game)
            .filter((message) => message.channel === channel.id)
            .map((message) => [message.id, message]),
        )
        slice.arrived
          .flatMap((arrival) => {
            const message = defs.get(arrival.message)
            return message ? [{ arrival, message }] : []
          })
          .forEach(({ arrival, message }, order) => {
            const thread = threadOf(message)
            const sent = slice.replied[arrival.key]
            const label = (reply: string) => {
              const written = message.replies?.find((entry) => entry.id === reply)?.label
              return written === undefined ? reply : fillTokens(state, game, written)
            }
            const words = beats(message.body, message.id)
            const shown: MessageView = {
              id: message.id,
              key: arrival.key,
              from: message.from,
              name: senderOf(state, game, message.from).name,
              text: words.flatMap((beat) => ('text' in beat ? [beat.text] : [])).join('\n\n'),
              beats: words,
              turn: arrival.turn,
              read: Boolean(slice.read[arrival.key]),
              replies: offered(state, game, slice, message, arrival.key).map((reply) => ({
                id: reply.id,
                label: label(reply.id),
                command: commandOf(replyTo(arrival.key, reply.id)),
              })),
              replied: sent === undefined ? null : label(sent),
            }
            threads.set(thread, [...(threads.get(thread) ?? []), shown])
            latest.set(thread, order)
          })
        const list = [...threads].map(([id, shown]): ThreadView => {
          const sender = senderOf(state, game, id)
          const unread = shown.filter((message) => !message.read).length
          return {
            id,
            name: sender.name,
            image: sender.image,
            portrait: sender.portrait,
            messages: shown,
            unread,
            read: unread ? renderAction(state, game, { id: `read.${id}`, label: stringOf(game, `${ID}/markRead`), command: readThread(id) }) : null,
            typing: slice.due?.thread === id && slice.due.typing,
          }
        })
        list.sort((a, b) => (latest.get(b.id) ?? 0) - (latest.get(a.id) ?? 0))
        // A thread whose first message is still on its way shows only that someone is typing, at the top.
        const waiting = slice.due && defs.get(slice.due.key)
        if (slice.due && waiting && !threads.has(slice.due.thread)) {
          const sender = senderOf(state, game, slice.due.thread)
          list.unshift({
            id: slice.due.thread,
            name: sender.name,
            image: sender.image,
            portrait: sender.portrait,
            messages: [],
            unread: 0,
            read: null,
            typing: slice.due.typing,
          })
        }
        const unread = unreadIn(slice, game, channel.id)
        const read = unread
          ? renderAction(state, game, {
              id: `read.${channel.id}`,
              label: stringOf(game, `${ID}/allRead`),
              command: CALLS.commands.read({ channel: channel.id }),
            })
          : null
        return { id: channel.id, name: channel.name, threads: list, unread, read }
      })
      return { channels, unread: unreadIn(slice, game), waiting: slice.due !== null }
    },
    references: {
      content: (game) =>
        DATA.messages.content(game, (message) => [
          DATA.channels.ref(message.channel),
          { when: message.when },
          { blocks: message.body },
          { within: 'arrival', refs: [{ effects: message.effects }] },
          ...(message.replies ?? []).flatMap((reply): Reference[] => [
            { words: reply.label, field: 'label', ...(reply.label === undefined ? { oldKey: `${message.id}#${reply.id}` } : {}) },
            { within: `reply ${reply.id}`, refs: [{ when: reply.when }, { effects: reply.effects }] },
          ]),
        ]),
    },
    check: (game) => {
      const problems: PluginProblem[] = []
      for (const message of messagesOf(game)) {
        const say = (what: string) => problems.push(DATA.messages.problem(message.id, what))
        if (message.weight !== undefined && !(message.weight >= 0)) say('weight must be 0 or more')
        if (message.after !== undefined && !(typeof message.after.ms === 'number' && message.after.ms > 0)) say('after needs ms above 0')
        if (message.after !== undefined && message.drawnFrom?.length) say('a message drawn from a pool arrives when drawn, so it can’t wait with after')
        const ids = new Set<string>()
        for (const reply of message.replies ?? []) {
          if (ids.has(reply.id)) say(`two replies are called "${reply.id}"`)
          ids.add(reply.id)
        }
      }
      return problems
    },
  })
  return plugin
}

/** Apply effect refs the way the engine does: each in its turn. */
function applyRefs(state: GameState, game: Game, refs: readonly EffectRef[]): GameState {
  return applyEffects(state, game, buildEffects(game, refs))
}

/** Returns the `messages/reply` command, which sends the reply to an arrival, named by the message's id for its first arrival or by the arrival's key. */
const replyTo = (message: string, reply: string): CommandRef => CALLS.commands.reply({ message, reply })
/** Returns the `messages/draw` effect, which draws one message from the pool and delivers it as a new arrival. */
const drawMessage = (pool: string): EffectRef => CALLS.effects.draw({ pool })
/**
 * Returns the `messages/since` condition, which holds while the whole days since the message last arrived fall in the
 * range. It never holds before the message arrives.
 */
const messageSince = (message: string, range: Range): Condition => CALLS.conditions.since({ message, ...range })
/** Returns the `messages/read` command, which marks a thread read by its id, a channel with `{ channel }`, or every message with neither. */
const readThread = (thread?: string | { channel: string }): CommandRef =>
  CALLS.commands.read(thread === undefined ? undefined : typeof thread === 'string' ? { id: thread } : { channel: thread.channel })
/** Returns the `messages/arrived` condition, which holds once the message has arrived. */
const messageArrived = (message: string): Condition => CALLS.conditions.arrived({ message })
/**
 * Returns the `messages/replied` condition, which holds once the player has replied to the message's latest arrival,
 * with `reply` if given. With a range, the whole days since the reply must fall in it too.
 *
 * @example
 * messages.replied('ava.hi', undefined, { gte: 2 })
 */
const messageReplied = (message: string, reply?: string, range?: Range): Condition =>
  CALLS.conditions.replied({ message, ...(reply === undefined ? {} : { reply }), ...range })
/**
 * Returns the `messages/read` condition, which holds once the player has read the message's latest arrival. The
 * `messages.read` helper returns the command instead.
 */
const messageRead = (message: string): Condition => CALLS.conditions.read({ message })

/**
 * The messages plugin's factory, with its helpers as properties. `messages()` returns the plugin for the game's
 * `plugins`, and content calls helpers such as `messages.reply('hi', 'wave')`.
 */
export const messages = Object.assign(messagesPlugin, {
  /** Returns the `messages/reply` command, which sends the reply to an arrival, by the message's id or the arrival's key. */
  reply: replyTo,
  /** Returns the `messages/draw` effect, which draws one message from the pool and delivers it as a new arrival. */
  draw: drawMessage,
  /** Returns the `messages/since` condition, which holds while the whole days since the message last arrived fall in the range. */
  since: messageSince,
  /** Returns the `messages/read` command, which marks a thread, a channel (`{ channel }`) or every message read. */
  read: readThread,
  /** Returns the `messages/arrived` condition, which holds once the message has arrived. */
  arrived: messageArrived,
  /** Returns the `messages/replied` condition, which holds once the player has replied to the message, with `reply` and in the range if given. */
  replied: messageReplied,
  /** Returns the `messages/read` condition, which holds once the player has read the message's latest arrival. */
  messageRead,
})
