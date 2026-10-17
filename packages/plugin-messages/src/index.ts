/**
 * @ifloom/plugin-messages — messages that arrive when the story allows, in
 * threads, with replies that are choices.
 *
 * A message is a scene that arrives instead of one you walk into: prose blocks
 * for its words, a sender, and replies that carry effects. It arrives the first
 * time its condition holds after a command, and raises a notice tagged with
 * its channel. Channels are the game's: texts, email, letters on the mat, notes
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
  notify,
  parseBeats,
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
  type PluginProblem,
  type RenderedChoice,
  type SceneBeat,
} from '@ifloom/engine'

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
  /** It arrives the first time this holds after a command. */
  when: Condition
  /** Its words, as a scene's body: prose blocks. */
  body: Block[]
  /** What the player can send back; one, once. None if left out. */
  replies?: ReplyDef[]
}

/** What the plugin keeps in a save. */
export type MessagesState = {
  /** The turn each message arrived, by message id. */
  arrived: Record<string, number>
  /** The reply sent to each message, by message id. */
  replied: Record<string, string>
  /** Messages the player has opened. */
  read: Record<string, true>
}

export type MessageView = {
  id: string
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

/** The replies on offer for a message now: none once one is sent. */
function offered(state: GameState, game: Game, record: MessagesState, message: MessageDef): ReplyDef[] {
  if (record.replied[message.id] !== undefined) return []
  return (message.replies ?? []).filter((reply) => holds(state, reply.when, game))
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
    return messageDefs(game).filter(
      (message) =>
        (channel === undefined || message.channel === channel) &&
        record.arrived[message.id] !== undefined &&
        !record.read[message.id],
    ).length
  }

  const plugin = definePlugin<MessagesState, MessagesView>({
    id: ID,
    version: 1,
    // Senders are the cast's characters when the game has the cast: a name and a face.
    cooperates: ['cast'],
    strings: {
      noSuchMessage: 'There is no such message.',
      alreadyReplied: 'You have already replied.',
      notOnOffer: 'That is not a reply on offer.',
    },
    start: () => ({ arrived: {}, replied: {}, read: {} }),
    conditions: {
      /** `{ 'messages/arrived': { message } }`. */
      arrived: (_state, args, { slice }) => slice.arrived[String(args.message)] !== undefined,
      /** `{ 'messages/replied': { message, reply? } }`: any reply, or that one. */
      replied: (_state, args, { slice }) => {
        const sent = slice.replied[String(args.message)]
        return args.reply === undefined ? sent !== undefined : sent === args.reply
      },
      /** `{ 'messages/read': { message } }`. */
      read: (_state, args, { slice }) => Boolean(slice.read[String(args.message)]),
    },
    commands: {
      /** `{ 'messages/reply': { message, reply } }`. */
      reply: {
        whyNot: (state, args, { slice, game }) => {
          const message = messageDefs(game).find((entry) => entry.id === args.message)
          if (!message || slice.arrived[message.id] === undefined) return say(game, 'messages/noSuchMessage')
          if (slice.replied[message.id] !== undefined) return say(game, 'messages/alreadyReplied')
          return offered(state, game, slice, message).some((reply) => reply.id === args.reply)
            ? undefined
            : say(game, 'messages/notOnOffer')
        },
        run: (_state, args, { slice, set, game }) => {
          const message = messageDefs(game).find((entry) => entry.id === args.message)!
          const reply = message.replies!.find((entry) => entry.id === args.reply)!
          const next = set({
            ...slice,
            replied: { ...slice.replied, [message.id]: reply.id },
            read: { ...slice.read, [message.id]: true },
          })
          return applyRefs(next, game, reply.effects ?? [])
        },
      },
      /** `{ 'messages/read': { id?, channel? } }`: mark the thread `id` read; leave both out for everything. */
      read: {
        run: (_state, args, { slice, set, game }) => {
          const read = { ...slice.read }
          for (const message of messageDefs(game)) {
            if (slice.arrived[message.id] === undefined) continue
            if (args.id !== undefined && threadOf(message) !== args.id) continue
            if (args.channel !== undefined && message.channel !== args.channel) continue
            read[message.id] = true
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
    // Deliver what has come due, and say so.
    onCommand: (_before, after, { slice, set, game }) => {
      let arrived = slice.arrived
      let next = after
      for (const message of messageDefs(game)) {
        if (arrived[message.id] !== undefined || !holds(after, message.when, game)) continue
        arrived = { ...arrived, [message.id]: after.turn }
        next = notify(next, {
          id: `messages.${message.id}`,
          title: personOf(game, after, message.from).name,
          tag: message.channel,
        })
      }
      return arrived === slice.arrived ? after : set({ ...slice, arrived }, next)
    },
    view: (state, { slice, game, picks }): MessagesView => {
      const runtime = defaultRuntime(game)
      const channels = channelsOf(game).map((channel): ChannelView => {
        const threads = new Map<string, MessageView[]>()
        const latest = new Map<string, number>()
        messageDefs(game)
          .filter((message) => message.channel === channel.id && slice.arrived[message.id] !== undefined)
          .sort((a, b) => slice.arrived[a.id] - slice.arrived[b.id])
          .forEach((message, order) => {
            const thread = threadOf(message)
            const sent = slice.replied[message.id]
            const label = (reply: string) => game.prose?.line(`${message.id}#${reply}`, state) ?? reply
            const text = renderScene({ id: message.id, body: message.body, choices: [] }, state, runtime, picks).body ?? ''
            const shown: MessageView = {
              id: message.id,
              from: message.from,
              name: personOf(game, state, message.from).name,
              text,
              beats: parseBeats(text),
              turn: slice.arrived[message.id],
              read: Boolean(slice.read[message.id]),
              replies: offered(state, game, slice, message).map((reply) => ({
                id: reply.id,
                label: label(reply.id),
                command: commandOf(replyTo(message.id, reply.id)),
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
      // The message a condition or a reply names.
      calls: (_kind, _name, args) => (args.message === undefined ? [] : [{ entry: String(args.message), plugin: 'messages', list: 'messages', noun: 'message' }]),
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
  return applyEffects(state, game, buildEffects(state, game, refs))
}

/** A command: send this reply to this message. */
export const replyTo = (message: string, reply: string): CommandRef => ({ [`${ID}/reply`]: { message, reply } })
/** A command: mark a thread read, or every message with no thread given. */
export const readThread = (thread?: string): CommandRef => ({ [`${ID}/read`]: thread === undefined ? {} : { id: thread } })
/** A condition: the message has arrived. */
export const messageArrived = (message: string): Condition => ({ [`${ID}/arrived`]: { message } })
/** A condition: the player replied to the message, or with that reply. */
export const messageReplied = (message: string, reply?: string): Condition => ({ [`${ID}/replied`]: reply === undefined ? { message } : { message, reply } })

