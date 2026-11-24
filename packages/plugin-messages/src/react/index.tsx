/**
 * The messages plugin's React UI, for a game rendered with `@ifloom/react`.
 *
 * List `messagesUi` in the game's `plugins` to render a channel wherever a device's app shows one. To render it
 * yourself, read `useMessages`.
 */
import { useEffect, useState, type ComponentProps } from 'react'
import type { GameState, Result, SceneBeat } from '@ifloom/engine'
import { messages, type MessagesView, type ThreadView } from '../index.ts'
import { Beat, ChoiceList, Picture, usePart } from '@ifloom/react'
import { buttonVariants, cn, Icon, overridable, type Override, pluginKit, type PluginUi, usePlugin } from '@ifloom/react/kit'

/** The messages plugin's UI words, in English. A game rewords any of them with `ui.<key>` in its strings. */
export const MESSAGES_WORDS = {
  /** The line a section shows while it has no conversations. */
  noMessages: 'No messages yet.',
  /** The label screen readers read for a typing bubble, with the sender's `{name}`. */
  typing: '{name} is typing',
  /** The last line a conversation shows while its next message is on its way. */
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

/**
 * The messages plugin's view with a function that sends its read command, as `useMessages` returns it. Each reply is a
 * `RenderedChoice` whose `command` sends it.
 */
export type MessagesControls = MessagesView & {
  /** Sends `messages/read`, which marks the channel's messages read. */
  read: (channel: string) => Result<GameState>
}

/** Returns the messages plugin's view and read command from the running game, or null in a game without the plugin. It re-renders when the view changes. */
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
 * Renders one messages channel from `view.plugins.messages.channels` as a device's app section, in the style of a
 * phone. It shows the list of threads first, and opening a thread shows its messages and marks it read.
 *
 * Each thread in the list (`conversations`) is a `conversation` button with the sender's portrait, name, last line and
 * an unread dot, under a button that marks the channel read. An empty channel shows the `messages-empty` line. An
 * open thread has a back button (`thread-back`), its messages, the reply sent, the replies on offer, and a typing
 * bubble while a message with `after` waits.
 *
 * Each message is a `bubble` part with `data-from="them"` or `data-from="player"`, and the typing bubble also has
 * `data-typing`. A message's beats render through `Beat`, so its pictures and videos show as they do in a scene.
 */
export const MessagesSection = overridable('MessagesSection', MessagesSectionImpl)

/**
 * The messages plugin's React UI, for `plugins` on `mountGame` or `GameProvider`. It renders a `MessagesSection`
 * wherever a device's app has a `messages` section, and adds the plugin's words.
 */
export const messagesUi: PluginUi = {
  ...MESSAGES,
  sections: { messages: MessagesSection },
}
