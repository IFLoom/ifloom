/**
 * @ifloom/plugin-messages/react: the messages plugin's React UI, for a game drawn
 * with `@ifloom/react`. List `messagesUi` in the game's
 * `plugins` to have a channel drawn where an app shows one, or draw it
 * yourself from `useMessages`.
 */
import { useEffect, useState, type ComponentProps } from 'react'
import type { GameState, Result, SceneBeat } from '@ifloom/engine'
import { messages, type MessagesView, type ThreadView } from '../index.ts'
import { Beat, buttonVariants, ChoiceList, cn, Icon, overridable, type Override, Picture, pluginKit, type PluginUi, usePart, usePlugin } from '@ifloom/react'

/** The messages plugin's words, in English. A game rewords any with `ui.<key>` in its strings. */
export const MESSAGES_WORDS = {
  noMessages: 'No messages yet.',
  typing: '{name} is typing',
  typingShort: 'typing…',
} as const

/** The messages plugin's UI, declared once: its id and its words, for `usePlugin` and `messagesUi`. */
const MESSAGES = pluginKit('messages', MESSAGES_WORDS)

declare module '@ifloom/react' {
  interface OverridableComponents {
    MessagesSection: Override<ComponentProps<typeof MessagesSection>>
  }
  interface PartNames {
    'bubble': true
    'channel': true
    'conversation': true
    'conversation-last': true
    'conversation-name': true
    'conversation-portrait': true
    'conversation-unread': true
    'conversations': true
    'message': true
    'messages-empty': true
    'thread': true
    'thread-back': true
    'thread-portrait': true
    'thread-title': true
    'typing': true
  }
}

type SectionProps = { data: unknown; with: Record<string, unknown> }

/** What `useMessages` returns: the messages plugin's view, and its command. A reply is a `RenderedChoice`-shaped button: send its `command`. */
export type MessagesControls = MessagesView & {
  /** Mark a channel's messages read: sends `messages/read`. */
  read: (channel: string) => Result<GameState>
}

/** The messages plugin's view with its command, or null in a game without the plugin. `MessagesSection` is drawn from it. */
export function useMessages(): MessagesControls | null {
  const { view, send } = usePlugin(MESSAGES)
  if (!view) return null
  return { ...view, read: (channel) => send(messages.read({ channel })) }
}

/** A message's or a post's words: its beats, as a scene's are drawn, or its text when the plugin gives none. */
function Words({ beats, text }: { beats?: SceneBeat[]; text: string }) {
  if (!beats) return <>{text}</>
  return (
    <>
      {beats.map((beat, index) => (
        <Beat key={index} beat={beat} />
      ))}
    </>
  )
}

/** A thread's last line, for the conversation list: the newest message's first line, the reply sent to it, or that someone is typing. */
function lastLine(thread: ThreadView, typing: string): string {
  if (thread.typing) return typing
  const last = thread.messages.at(-1)
  if (!last) return ''
  return (last.replied ?? last.text).split('\n')[0] ?? ''
}

/** The other side typing: a `bubble` with `data-typing`, holding three dots in a `typing` part. */
function Typing({ name }: { name: string }) {
  const { words } = usePlugin(MESSAGES)
  const bubble = usePart('bubble', 'flex self-start rounded-xl bg-secondary px-3 py-2 text-sm')
  const dots = usePart('typing', 'flex items-center gap-1')
  // Each dot fades in and out on the theme's own fade, a little after the one before.
  const pulse = (delay: number) => ({ animation: `ifloom-fade-in 600ms ease-in-out ${delay}ms infinite alternate` })
  return (
    <div {...bubble} data-from="them" data-typing="" role="status" aria-label={words('typing', { name })}>
      <span {...dots} aria-hidden="true">
        {[0, 200, 400].map((delay) => (
          <span key={delay} className="size-2.5 rounded-full bg-primary" style={pulse(delay)} />
        ))}
      </span>
    </div>
  )
}

/** One thread, opened: who it's with under a back button, the messages, and a typing bubble while the next is on its way. Marks itself read. */
function Thread({ thread, onBack }: { thread: ThreadView; onBack: () => void }) {
  const { words, send } = usePlugin(MESSAGES)
  const threadBox = usePart('thread', 'flex flex-col gap-2')
  const back = usePart('thread-back', buttonVariants({ size: 'icon', variant: 'ghost' }))
  const title = usePart('thread-title', 'flex items-center gap-2 font-medium')
  const portrait = usePart('thread-portrait', 'size-6 rounded-full object-cover')
  const message = usePart('message', 'flex flex-col gap-1')
  const theirs = usePart('bubble', 'flex max-w-xs flex-col gap-2 self-start rounded-xl bg-secondary px-3 py-2 text-sm')
  const mine = usePart('bubble', 'max-w-xs self-end rounded-xl bg-primary px-3 py-2 text-sm text-primary-foreground')
  // An open thread is read: what arrives while it's open is read as it comes.
  const read = thread.read?.disabled ? null : thread.read?.command
  useEffect(() => {
    if (read) send(read)
  }, [read, send])
  return (
    <section {...threadBox} data-thread={thread.id}>
      <h4 {...title}>
        <button type="button" {...back} aria-label={words('back')} onClick={onBack}>
          <Icon name="back" />
        </button>
        {thread.portrait ? <Picture {...portrait} src={thread.portrait} alt="" /> : null}
        {thread.name}
      </h4>
      {thread.messages.map((entry) => (
        <div key={entry.key} {...message} data-message={entry.key}>
          <div {...theirs} data-from="them">
            <Words beats={entry.beats} text={entry.text} />
          </div>
          {entry.replied ? (
            <p {...mine} data-from="player">
              {entry.replied}
            </p>
          ) : (
            <ChoiceList choices={entry.replies.map((reply) => ({ id: reply.id, label: reply.label, command: reply.command }))} />
          )}
        </div>
      ))}
      {thread.typing ? <Typing name={thread.name} /> : null}
    </section>
  )
}

function MessagesSectionImpl({ with: options }: SectionProps) {
  const { view: shown, words, send } = usePlugin(MESSAGES)
  const [open, setOpen] = useState<string | null>(null)
  const box = usePart('channel', 'flex min-w-0 flex-col gap-4')
  const readAll = usePart('button', buttonVariants({ size: 'sm', variant: 'ghost' }))
  const empty = usePart('messages-empty', 'text-sm text-muted-foreground')
  const list = usePart('conversations', 'flex min-w-0 flex-col gap-1')
  const row = usePart('conversation', 'flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-accent')
  const portrait = usePart('conversation-portrait', 'size-10 shrink-0 rounded-full object-cover')
  const name = usePart('conversation-name', 'font-medium')
  const last = usePart('conversation-last', 'truncate text-sm text-muted-foreground')
  const dot = usePart('conversation-unread', 'size-2.5 shrink-0 rounded-full bg-primary')
  const channel = shown?.channels.find((entry) => entry.id === options.channel)
  if (!channel) return null
  const thread = open === null ? undefined : channel.threads.find((entry) => entry.id === open)
  if (thread) {
    return (
      <div {...box} data-channel={channel.id}>
        <Thread thread={thread} onBack={() => setOpen(null)} />
      </div>
    )
  }
  return (
    <div {...box} data-channel={channel.id}>
      {channel.read ? (
        <button type="button" {...readAll} className={cn(readAll.className, 'self-end')} onClick={() => send(channel.read!.command)}>
          {channel.read.label}
        </button>
      ) : null}
      {channel.threads.length ? (
        <ul {...list}>
          {channel.threads.map((entry) => (
            <li key={entry.id} className="min-w-0">
              <button type="button" {...row} data-thread={entry.id} data-unread={entry.unread || undefined} onClick={() => setOpen(entry.id)}>
                {entry.portrait ? <Picture {...portrait} src={entry.portrait} alt="" /> : null}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span {...name}>{entry.name}</span>
                  <span {...last}>{lastLine(entry, words('typingShort'))}</span>
                </span>
                {entry.unread ? <span {...dot} aria-label={String(entry.unread)} /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p {...empty}>{words('noMessages')}</p>
      )}
    </div>
  )
}

/**
 * A messages channel in an app, drawn as a phone draws one. First the
 * conversation list (`conversations`), newest first: each thread a
 * `conversation` button with the sender's portrait, their name, the last
 * line (or that they're typing) and an unread dot, with a button to mark the
 * channel read. With nothing in it yet, the `messages-empty` line. A tap opens
 * the thread, with a back button (`thread-back`): its messages, the reply
 * sent and the replies on offer, and a typing bubble while a message with
 * `after` is on its way. An open thread is marked read. Each bubble is a
 * `'bubble'` part, `data-from="them"` or `data-from="player"`; the typing one
 * also has `data-typing`. A message's words are drawn as beats through
 * `Beat`, so pictures and clips in it show as they do in a scene. A thin
 * default on `useMessages`.
 */
export const MessagesSection = overridable('MessagesSection', MessagesSectionImpl)

/**
 * The messages plugin's React UI, for `plugins` on `mountGame` or
 * `GameProvider`: a `MessagesSection` wherever a device's app shows a
 * messages channel, and the messages' words.
 */
export const messagesUi: PluginUi = {
  ...MESSAGES,
  sections: { messages: MessagesSection },
}
