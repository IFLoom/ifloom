/**
 * @ifloom/plugin-messages — messages that arrive when the story allows, in
 * threads, with replies that are choices.
 *
 * A message is a scene that arrives instead of one you walk into: prose blocks
 * for its words, a sender, and replies that carry effects. It arrives the first
 * time its condition holds after a command, and raises a notice tagged with
 * its channel. A message drawn from a pool arrives only when `messages/draw`
 * draws it, as often as it is drawn. Channels are the game's: texts, email, letters on the mat, notes
 * pushed under a door. Nothing here knows about phones; a device shows a
 * channel as an app.
 */
import {
  applyEffects,
  buildEffects,
  commandOf,
  definePlugin,
  type SenderView,
  speakerOf,
  pluginQuery,
  fillTokens,
  holds,
  inRange,
  notify,
  renderAction,
  stringOf,
  type Block,
  type CommandRef,
  type DefinedPlugin,
  type Condition,
  type EffectRef,
  type Game,
  type GameState,
  type PluginContext,
  type PluginProblem,
  type Range,
  type Reference,
  type RenderedChoice,
  type SceneBeat,
  weighted,
} from '@ifloom/engine'
import { CONTENT_VERSION, contentMigrations, COMMAND_VERSION, commandMigrations } from './upgrade.ts'

/** Where messages go: texts, email, the doormat. */
export type Channel = { id: string; name: string }

/** A reply the player can send. */
export type ReplyDef = {
  id: string
  /** Its words, as written, with tokens filled: "On my way". Its id if left out. */
  label?: string
  /** Only on offer while this holds. */
  when?: Condition
  effects?: EffectRef[]
}

export type MessageDef = {
  id: string
  channel: string
  /** Who sent it: a character id, or any name the game's prose uses. */
  from: string
  /** The thread it belongs in. The sender if left out. */
  thread?: string
  /**
   * It arrives the first time this holds after a command; left out, after
   * the first command. For a message drawn from a pool, it can be drawn only
   * while this holds; left out, any time.
   */
  when?: Condition
  /**
   * The pools it can be drawn from by `messages/draw`. A message with pools
   * arrives only when drawn, never by `when` alone, and can arrive again
   * each time it is drawn.
   */
  drawnFrom?: string[]
  /** How likely a draw picks it, against the others that can be drawn: 1 if left out. */
  weight?: number
  /** Its words, as a scene's body: prose blocks. */
  body: Block[]
  /** What the player can send back; one, once. None if left out. */
  replies?: ReplyDef[]
  /**
   * What happens as it arrives, each time it does: in the same command, after
   * the arrival is recorded. A trigger on `messages/arrived` would run a
   * command later, since triggers run before the plugins deliver.
   */
  effects?: EffectRef[]
  /**
   * How long it takes to arrive once its `when` holds: `ms` milliseconds after
   * the thread's previous arrival, run down by the engine's `tick` as a timer
   * is. Left out, it arrives straight away. One message waits at a time, so
   * the next waits until this one has come.
   */
  after?: { ms: number }
  /** Whether its thread shows the other side typing while it waits. True if left out. */
  typing?: boolean
}

/**
 * One arrival of a message. A message the story sends arrives once; one
 * drawn from a pool can arrive again, each time a new arrival with its own
 * reply and its own read mark.
 */
export type Arrival = {
  /**
   * This arrival's key: the message's id the first time it arrives, then
   * `<id>~2`, `<id>~3` and on. Replies and reads are kept by it, and the
   * reply command names it.
   */
  key: string
  /** The message's id. */
  message: string
  /** The turn it arrived. */
  turn: number
  /** The day it arrived: the calendar's, or the turn in a game without it. */
  day: number
}

/** What the plugin keeps in a save. */
export type MessagesState = {
  /** Every arrival, oldest first. */
  arrived: Arrival[]
  /** The reply sent to each arrival, by its key. */
  replied: Record<string, string>
  /** The day each reply was sent, by the arrival's key: the calendar's, or the turn without it. */
  repliedOn: Record<string, number>
  /** Arrivals the player has opened, by key. */
  read: Record<string, true>
  /**
   * The message waiting to arrive, if one is: its id, its thread, and whether
   * the thread shows typing. The plugin's timer `messages.due` runs while it
   * waits, and delivers it when it runs out.
   */
  due: { key: string; thread: string; typing: boolean } | null
}

export type MessageView = {
  /** The message's id. A message drawn twice shows twice, with one id and two keys. */
  id: string
  /** This arrival's key, for a UI's list key: see `Arrival`. */
  key: string
  from: string
  /** The sender's name if they are a character, else `from` as written. */
  name: string
  /** The words, filled in, with any picture and video markup in them. */
  text: string
  /**
   * The words as beats, as a scene's are: paragraphs, and the pictures and
   * videos in them in the order written, from markup or `{ media }` blocks.
   */
  beats: SceneBeat[]
  /** The turn it arrived. */
  turn: number
  read: boolean
  /** Replies on offer, until one is sent: buttons like any other, each sending its `command`. */
  replies: RenderedChoice[]
  /** The label of the reply sent, if one was. */
  replied: string | null
}

export type ThreadView = {
  id: string
  name: string
  /** The sender's picture: their entity's `image`, through `artSrc`; null for a name as written. */
  image: string | null
  /** The sender's face, for an avatar: a person's `portrait` with the cast, else their `image`. */
  portrait: string | null
  /** Oldest first. */
  messages: MessageView[]
  unread: number
  /** The button that marks the thread read (the `messages/markRead` string, `Mark read`), or null while nothing in it is unread. */
  read: RenderedChoice | null
  /** Whether the other side is typing: a message with `after` is waiting to arrive in this thread, and its `typing` isn't false. */
  typing: boolean
}

export type ChannelView = {
  id: string
  name: string
  /** Newest activity first. */
  threads: ThreadView[]
  unread: number
  /** The button that marks the whole channel read (the `messages/allRead` string, `Mark all read`), or null while nothing in it is unread. */
  read: RenderedChoice | null
}

export type MessagesView = {
  channels: ChannelView[]
  unread: number
  /** Whether a message with `after` is waiting to arrive, in any thread. */
  waiting: boolean
}

/**
 * What content writes for each of the plugin's calls, its queries' answers
 * and its view, so a call with a misspelled argument fails to compile.
 */
declare module '@ifloom/engine' {
  interface ConditionRegistry {
    'messages/arrived': { message: string }
    'messages/since': { message: string } & Range
    'messages/replied': { message: string; reply?: string } & Range
    'messages/read': { message: string }
  }
  interface EffectRegistry {
    'messages/draw': { pool: string }
    'messages/due': Record<string, never>
  }
  interface CommandRegistry {
    'messages/reply': { message: string; reply: string }
    'messages/read': { id?: string; channel?: string } | true
  }
  interface ViewRegistry {
    messages: MessagesView
  }
}

const ID = 'messages'
/** The plugin's one timer: it runs while a message with `after` waits, and delivers it when it runs out. */
const DUE = 'messages.due'
/** How long a notice's line can be, in characters, before it is cut. */
const NOTICE_LENGTH = 80

/** The game's messages: `data.messages.messages`, from its packs. */
export function messagesOf(game: Game): MessageDef[] {
  return (game.data?.[ID]?.messages ?? []) as MessageDef[]
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

/** The game's channels, in order: `data.messages.channels`, from its packs. */
export function channelsOf(game: Game): Channel[] {
  return (game.data?.[ID]?.channels ?? []) as Channel[]
}

/**
 * The plugin. Add it to the game's `plugins`, and put the channels and the
 * messages in a pack's `data.messages.channels` and `data.messages.messages`,
 * so a mod can add either.
 */
function messagesPlugin(): DefinedPlugin<MessagesState, MessagesView> {
  function unreadIn(record: MessagesState, game: Game, channel?: string): number {
    const channelOf = new Map(messagesOf(game).map((message) => [message.id, message.channel]))
    return record.arrived.filter(
      (arrival) => channelOf.has(arrival.message) && (channel === undefined || channelOf.get(arrival.message) === channel) && !record.read[arrival.key],
    ).length
  }

  const plugin = definePlugin<MessagesState, MessagesView>({
    id: ID,
    version: 4,
    contentVersion: CONTENT_VERSION,
    contentMigrations,
    // The words a player reads in each list of the plugin's content, for a translation's `words` table.
    words: { channels: { name: true }, messages: { body: 'blocks', effects: 'effects', replies: [{ label: true, effects: 'effects' }] } },
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
    content: { timers: [{ id: DUE, ms: 1000, effects: [{ [`${ID}/due`]: {} }] }] },
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
      arrived: (_state, args, { slice }) => latest(slice, String(args.message)) !== undefined,
      /**
       * `{ 'messages/since': { message, gte… } }`: whole days since it last
       * arrived, in a range. Days are the calendar's, or turns without it.
       * False if it never has, so `{ not: … lt: 3 }` is "not in the last 3 days".
       */
      since: (state, args, { slice, game }) => {
        const last = latest(slice, String(args.message))
        return last !== undefined && inRange(state, game, dayOf(state, game) - last.day, args as Range)
      },
      /**
       * `{ 'messages/replied': { message, reply?, gte… } }`: its latest arrival
       * got any reply, or that one. With a range, the whole days since the
       * reply was sent are in it too, counted as `messages/since` counts.
       */
      replied: (state, args, { slice, game }) => {
        const last = latest(slice, String(args.message))
        const sent = last && slice.replied[last.key]
        if (sent === undefined || (args.reply !== undefined && sent !== args.reply)) return false
        if (!ranged(args as Range)) return true
        const on = slice.repliedOn[last!.key] ?? last!.day
        return inRange(state, game, dayOf(state, game) - on, args as Range)
      },
      /** `{ 'messages/read': { message } }`: its latest arrival has been read. */
      read: (_state, args, { slice }) => {
        const last = latest(slice, String(args.message))
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
      draw: (state, args, context) => {
        const pool = String(args.pool ?? '')
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
        const message = slice.due && messagesOf(context.game).find((entry) => entry.id === slice.due!.key)
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
          const message = arrival && messagesOf(game).find((entry) => entry.id === arrival.message)
          if (!arrival || !message) return stringOf(game, 'messages/noSuchMessage')
          if (slice.replied[arrival.key] !== undefined) return stringOf(game, 'messages/alreadyReplied')
          return offered(state, game, slice, message, arrival.key).some((reply) => reply.id === args.reply) ? undefined : stringOf(game, 'messages/notOnOffer')
        },
        run: (state, args, { slice, set, game }) => {
          const arrival = slice.arrived.find((entry) => entry.key === args.message)!
          const message = messagesOf(game).find((entry) => entry.id === arrival.message)!
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
        run: (_state, args, { slice, set, game }) => {
          const read = { ...slice.read }
          const defs = new Map(messagesOf(game).map((message) => [message.id, message]))
          for (const arrival of slice.arrived) {
            const message = defs.get(arrival.message)
            if (!message) continue
            if (args.id !== undefined && threadOf(message) !== args.id) continue
            if (args.channel !== undefined && message.channel !== args.channel) continue
            read[arrival.key] = true
          }
          return set({ ...slice, read })
        },
      },
    },
    values: {
      /**
       * Unread messages: in every channel, or in one with `{ channel }`.
       * <code v-pre>{{messages/unread channel=texts}}</code>, or a badge's
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
              command: { [`${ID}/read`]: { channel: channel.id } },
            })
          : null
        return { id: channel.id, name: channel.name, threads: list, unread, read }
      })
      return { channels, unread: unreadIn(slice, game), waiting: slice.due !== null }
    },
    references: {
      // The message a condition or a reply names; a reply may name a later arrival's key.
      calls: (table, name, args, game): Reference[] => [
        ...(args.message === undefined ? [] : [{ entry: messageOfKey(String(args.message)), plugin: 'messages', list: 'messages', noun: 'message' }]),
        // A draw names a pool some message is drawn from.
        ...(table === 'effects' && name === 'draw' && !messagesOf(game).some((message) => message.drawnFrom?.includes(String(args.pool ?? '')))
          ? [{ problem: `draws from "${String(args.pool ?? '')}", but no message is drawn from it` }]
          : []),
      ],
      content: (game) =>
        messagesOf(game).map((message) => ({
          list: 'messages',
          id: message.id,
          refs: [
            { entry: message.channel, plugin: ID, list: 'channels', noun: 'channel' },
            { when: message.when },
            { blocks: message.body },
            { within: 'arrival', refs: [{ effects: message.effects }] },
            ...(message.replies ?? []).flatMap((reply) => [
              { words: reply.label, field: 'label', ...(reply.label === undefined ? { oldKey: `${message.id}#${reply.id}` } : {}) },
              { within: `reply ${reply.id}`, refs: [{ when: reply.when }, { effects: reply.effects }] },
            ]),
          ],
        })),
    },
    check: (game) => {
      const problems: PluginProblem[] = []
      for (const message of messagesOf(game)) {
        const say = (what: string) => problems.push({ list: 'messages', id: message.id, what })
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

/** A command: send this reply to this message: its id for its first arrival, or an arrival's key. */
const replyTo = (message: string, reply: string): CommandRef => ({ [`${ID}/reply`]: { message, reply } })
/** An effect: deliver one message drawn from the pool, as a new arrival. */
const drawMessage = (pool: string): EffectRef => ({ [`${ID}/draw`]: { pool } })
/** A condition: whole days since the message last arrived, in this range; false if it never has. */
const messageSince = (message: string, range: Range): Condition => ({ [`${ID}/since`]: { message, ...range } })
/** A command: mark a thread read, or every message with no thread given. */
const readThread = (thread?: string): CommandRef => ({ [`${ID}/read`]: thread === undefined ? {} : { id: thread } })
/** A condition: the message has arrived. */
const messageArrived = (message: string): Condition => ({ [`${ID}/arrived`]: { message } })
/**
 * A condition: the player replied to the message, or with that reply; with a
 * range, as many whole days ago: `messages.replied('ava.hi', undefined, { gte: 2 })`.
 */
const messageReplied = (message: string, reply?: string, range?: Range): Condition => ({
  [`${ID}/replied`]: { message, ...(reply === undefined ? {} : { reply }), ...range },
})
/** A condition: the player has read the message's latest arrival. (`messages.read` is the command that marks a thread read.) */
const messageRead = (message: string): Condition => ({ [`${ID}/read`]: { message } })

/**
 * The plugin, with its helpers on it: `messages()` makes the plugin for the
 * game's `plugins`, and content is written with `messages.reply('hi', 'wave')`.
 */
export const messages = Object.assign(messagesPlugin, {
  reply: replyTo,
  draw: drawMessage,
  since: messageSince,
  read: readThread,
  arrived: messageArrived,
  replied: messageReplied,
  messageRead,
})
