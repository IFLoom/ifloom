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
  defaultRuntime,
  commandOf,
  definePlugin,
  holds,
  inRange,
  notify,
  parseBeats,
  styledBeats,
  pluginQuery,
  renderScene,
  say,
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
  type RenderedChoice,
  type SceneBeat,
  weighted,
} from '@ifloom/engine'
import { CONTENT_VERSION, contentMigrations, COMMAND_VERSION, commandMigrations } from './upgrade.ts'

/** Where messages go: texts, email, the doormat. */
export type Channel = { id: string; name: string }

/** A reply the player can send. Its label is the prose key `<message id>#<reply id>`. */
export type ReplyDef = {
  id: string
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
  /** Arrivals the player has opened, by key. */
  read: Record<string, true>
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
  portrait: string | null
  /** Oldest first. */
  messages: MessageView[]
  unread: number
}

export type ChannelView = {
  id: string
  name: string
  /** Newest activity first. */
  threads: ThreadView[]
  unread: number
}

export type MessagesView = { channels: ChannelView[]; unread: number }

const ID = 'messages'

/** The game's messages: `data.messages.messages`, from its packs. */
export function messageDefs(game: Game): MessageDef[] {
  return (game.data?.[ID]?.messages ?? []) as MessageDef[]
}

function threadOf(message: MessageDef): string {
  return message.thread ?? message.from
}

/** Who a message is from, as the cast plugin knows them, asked by name: a name and a face, or the name as written. */
function personOf(game: Game, state: GameState, from: string): { name: string; portrait: string | null } {
  const known = pluginQuery(game, 'cast/person')?.(state, { character: from }) as { name: string; portrait: string | null } | undefined
  return known ?? { name: from, portrait: null }
}

/** The replies on offer for an arrival now: none once one is sent. */
function offered(state: GameState, game: Game, record: MessagesState, message: MessageDef, key: string): ReplyDef[] {
  if (record.replied[key] !== undefined) return []
  return (message.replies ?? []).filter((reply) => holds(state, reply.when, game))
}

/** The day: the calendar's, or the turn without one. */
function dayOf(state: GameState, game: Game): number {
  return (pluginQuery(game, 'calendar/now')?.(state) as { day: number } | undefined)?.day ?? state.turn
}

/** The latest arrival of a message, if it has come. */
function latest(record: MessagesState, message: string): Arrival | undefined {
  return record.arrived.findLast((arrival) => arrival.message === message)
}

/** The message an arrival key or a message id names: the key without its `~n`. */
function messageOfKey(key: string): string {
  return key.replace(/~\d+$/, '')
}

/** Deliver a message as a new arrival, with its notice. */
function deliver(state: GameState, message: MessageDef, context: PluginContext<MessagesState>, slice: MessagesState): GameState {
  const count = slice.arrived.filter((arrival) => arrival.message === message.id).length
  const key = count === 0 ? message.id : `${message.id}~${count + 1}`
  const arrival: Arrival = { key, message: message.id, turn: state.turn, day: dayOf(state, context.game) }
  const next = notify(state, { id: `messages.${key}`, title: personOf(context.game, state, message.from).name, tag: message.channel })
  return context.set({ ...slice, arrived: [...slice.arrived, arrival] }, next)
}

/** The slice of a state, or an empty one. */
function sliceOf(state: GameState): MessagesState {
  return (state.plugins?.[ID]?.state as MessagesState | undefined) ?? { arrived: [], replied: {}, read: {} }
}

/** The game's channels, in order: `data.messages.channels`, from its packs. */
export function channelsOf(game: Game): Channel[] {
  return (game.data?.[ID]?.channels ?? []) as Channel[]
}

/**
 * The plugin. Add it to the game's `plugins`, and put the channels and the
 * messages in a pack's `data.messages.channels` and `data.messages.messages`,
 * so a mod can add either.
 */
export function messages(): DefinedPlugin<MessagesState, MessagesView> {
  function unreadIn(record: MessagesState, game: Game, channel?: string): number {
    const channelOf = new Map(messageDefs(game).map((message) => [message.id, message.channel]))
    return record.arrived.filter(
      (arrival) => channelOf.has(arrival.message) && (channel === undefined || channelOf.get(arrival.message) === channel) && !record.read[arrival.key],
    ).length
  }

  const plugin = definePlugin<MessagesState, MessagesView>({
    id: ID,
    version: 2,
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
    },
    strings: {
      noSuchMessage: 'There is no such message.',
      alreadyReplied: 'You have already replied.',
      notOnOffer: 'That is not a reply on offer.',
    },
    start: () => ({ arrived: [], replied: {}, read: {} }),
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
        return last !== undefined && inRange(dayOf(state, game) - last.day, args as Range)
      },
      /** `{ 'messages/replied': { message, reply? } }`: its latest arrival got any reply, or that one. */
      replied: (_state, args, { slice }) => {
        const last = latest(slice, String(args.message))
        const sent = last && slice.replied[last.key]
        return args.reply === undefined ? sent !== undefined : sent === args.reply
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
        const slice = sliceOf(state)
        const eligible = messageDefs(context.game).filter((message) => message.drawnFrom?.includes(pool) && holds(state, message.when, context.game))
        const drawn = weighted(eligible, (message) => message.weight, 'messages/draw', pool, state.seed, state.turn, slice.arrived.length)
        return drawn ? deliver(state, drawn, context, slice) : state
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
          const message = arrival && messageDefs(game).find((entry) => entry.id === arrival.message)
          if (!arrival || !message) return say(game, 'messages/noSuchMessage')
          if (slice.replied[arrival.key] !== undefined) return say(game, 'messages/alreadyReplied')
          return offered(state, game, slice, message, arrival.key).some((reply) => reply.id === args.reply) ? undefined : say(game, 'messages/notOnOffer')
        },
        run: (_state, args, { slice, set, game }) => {
          const arrival = slice.arrived.find((entry) => entry.key === args.message)!
          const message = messageDefs(game).find((entry) => entry.id === arrival.message)!
          const reply = message.replies!.find((entry) => entry.id === args.reply)!
          const next = set({
            ...slice,
            replied: { ...slice.replied, [arrival.key]: reply.id },
            read: { ...slice.read, [arrival.key]: true },
          })
          return applyRefs(next, game, reply.effects ?? [])
        },
      },
      /** `{ 'messages/read': { id?, channel? } }`: mark the thread `id` read; leave both out for everything. */
      read: {
        run: (_state, args, { slice, set, game }) => {
          const read = { ...slice.read }
          const defs = new Map(messageDefs(game).map((message) => [message.id, message]))
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
       * <code v-pre>{{v:messages/unread channel=texts}}</code>, or a badge's
       * `{ value: 'messages/unread', with: { channel: 'texts' } }`.
       */
      unread: (_state, args, { slice, game }) => unreadIn(slice, game, args.channel === undefined ? undefined : String(args.channel)),
    },
    // Deliver what the story has brought due, once each, and say so. Pool messages wait to be drawn.
    onCommand: (_before, after, context) => {
      let next = after
      for (const message of messageDefs(context.game)) {
        if (message.drawnFrom?.length) continue
        const slice = sliceOf(next)
        if (latest(slice, message.id) !== undefined || !holds(after, message.when, context.game)) continue
        next = deliver(next, message, context, slice)
      }
      return next
    },
    view: (state, { slice, game, picks }): MessagesView => {
      const runtime = defaultRuntime(game)
      const channels = channelsOf(game).map((channel): ChannelView => {
        const threads = new Map<string, MessageView[]>()
        const latest = new Map<string, number>()
        const defs = new Map(
          messageDefs(game)
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
            const label = (reply: string) => game.prose?.line(`${message.id}#${reply}`, state) ?? reply
            const text = renderScene({ id: message.id, body: message.body, choices: [] }, state, runtime, picks).body ?? ''
            const shown: MessageView = {
              id: message.id,
              key: arrival.key,
              from: message.from,
              name: personOf(game, state, message.from).name,
              text,
              beats: styledBeats(parseBeats(text)),
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
          const sender = personOf(game, state, id)
          return {
            id,
            name: sender.name,
            portrait: sender.portrait,
            messages: shown,
            unread: shown.filter((message) => !message.read).length,
          }
        })
        list.sort((a, b) => (latest.get(b.id) ?? 0) - (latest.get(a.id) ?? 0))
        return { id: channel.id, name: channel.name, threads: list, unread: unreadIn(slice, game, channel.id) }
      })
      return { channels, unread: unreadIn(slice, game) }
    },
    references: {
      // The message a condition or a reply names; a reply may name a later arrival's key.
      calls: (_kind, _name, args) =>
        args.message === undefined ? [] : [{ entry: messageOfKey(String(args.message)), plugin: 'messages', list: 'messages', noun: 'message' }],
      content: (game) =>
        messageDefs(game).map((message) => ({
          list: 'messages',
          id: message.id,
          refs: [
            { entry: message.channel, plugin: ID, list: 'channels', noun: 'channel' },
            { when: message.when },
            { blocks: message.body },
            ...(message.replies ?? []).flatMap((reply) => [
              { prose: `${message.id}#${reply.id}` },
              { within: `reply ${reply.id}`, refs: [{ when: reply.when }, { effects: reply.effects }] },
            ]),
          ],
        })),
    },
    check: (game) => {
      const problems: PluginProblem[] = []
      for (const message of messageDefs(game)) {
        const say = (what: string) => problems.push({ list: 'messages', id: message.id, what })
        if (message.weight !== undefined && !(message.weight >= 0)) say('weight must be 0 or more')
        const ids = new Set<string>()
        for (const reply of message.replies ?? []) {
          if (ids.has(reply.id)) say(`two replies are called "${reply.id}"`)
          ids.add(reply.id)
        }
      }
      return problems
    },
    // A draw names a pool some message is drawn from.
    argProblems: (table, name, args, game) => {
      if (table !== 'effects' || name !== 'draw') return []
      const pool = String(args.pool ?? '')
      return messageDefs(game).some((message) => message.drawnFrom?.includes(pool)) ? [] : [`draws from "${pool}", but no message is drawn from it`]
    },
  })
  return plugin
}

/** Apply effect refs the way the engine does: each in its turn. */
function applyRefs(state: GameState, game: Game, refs: readonly EffectRef[]): GameState {
  return applyEffects(state, game, buildEffects(state, game, refs))
}

/** A command: send this reply to this message: its id for its first arrival, or an arrival's key. */
export const replyTo = (message: string, reply: string): CommandRef => ({ [`${ID}/reply`]: { message, reply } })
/** An effect: deliver one message drawn from the pool, as a new arrival. */
export const drawMessage = (pool: string): EffectRef => ({ [`${ID}/draw`]: { pool } })
/** A condition: whole days since the message last arrived, in this range; false if it never has. */
export const messageSince = (message: string, range: Range): Condition => ({ [`${ID}/since`]: { message, ...range } })
/** A command: mark a thread read, or every message with no thread given. */
export const readThread = (thread?: string): CommandRef => ({ [`${ID}/read`]: thread === undefined ? {} : { id: thread } })
/** A condition: the message has arrived. */
export const messageArrived = (message: string): Condition => ({ [`${ID}/arrived`]: { message } })
/** A condition: the player replied to the message, or with that reply. */
export const messageReplied = (message: string, reply?: string): Condition => ({ [`${ID}/replied`]: reply === undefined ? { message } : { message, reply } })
