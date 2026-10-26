/**
 * @ifloom/plugin-messages/react: the messages plugin's React UI, for a game drawn
 * with `@ifloom/react`. List `messagesUi` in the game's
 * `plugins` to have a channel drawn where an app shows one, or draw it
 * yourself from `useMessages`.
 */
import type { ComponentProps } from 'react'
import type { GameState, Result, SceneBeat } from '@ifloom/engine'
import type { MessagesView } from '../index.ts'
import { Beat, buttonVariants, ChoiceList, overridable, type Override, Picture, type PluginUi, useGame, usePart } from '@ifloom/react'

declare module '@ifloom/react' {
  interface OverridableComponents {
    MessagesSection: Override<ComponentProps<typeof MessagesSection>>
  }
  interface PartNames {
    'bubble': true
    'channel': true
    'message': true
    'thread': true
    'thread-portrait': true
    'thread-title': true
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
  const { view, send } = useGame()
  const data = view.plugins.messages as MessagesView | undefined
  if (!data) return null
  return { ...data, read: (channel) => send({ type: 'custom', name: 'messages/read', with: { channel } }) }
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

function MessagesSectionImpl({ data, with: options }: SectionProps) {
  const { send } = useGame()
  const messages = useMessages()
  const box = usePart('channel', 'flex flex-col gap-4')
  const readAll = usePart('button', buttonVariants({ size: 'sm', variant: 'ghost' }))
  const threadBox = usePart('thread', 'flex flex-col gap-2')
  const title = usePart('thread-title', 'flex items-center gap-2 font-medium')
  const portrait = usePart('thread-portrait', 'size-6 rounded-full object-cover')
  const message = usePart('message', 'flex flex-col gap-1')
  const theirs = usePart('bubble', 'flex max-w-xs flex-col gap-2 self-start rounded-xl bg-secondary px-3 py-2 text-sm')
  const mine = usePart('bubble', 'max-w-xs self-end rounded-xl bg-primary px-3 py-2 text-sm text-primary-foreground')
  const channel = ((data as MessagesView | undefined) ?? messages)?.channels.find((entry) => entry.id === options.channel)
  if (!channel || !messages) return null
  return (
    <div {...box} data-channel={channel.id}>
      {channel.read ? (
        <button type="button" {...readAll} onClick={() => send(channel.read!.command)}>
          {channel.read.label}
        </button>
      ) : null}
      {channel.threads.map((thread) => (
        <section key={thread.id} {...threadBox} data-thread={thread.id}>
          <h4 {...title}>
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
        </section>
      ))}
    </div>
  )
}

/**
 * A messages channel in an app: its threads, newest first, each with its
 * messages, the reply sent, and the replies on offer, with a button to mark
 * the channel read. Each bubble is a `'bubble'` part, `data-from="them"` or
 * `data-from="player"`. A message's words are drawn as beats through `Beat`,
 * so pictures and clips in it show as they do in a scene. A thin default on
 * `useMessages`.
 */
export const MessagesSection = overridable('MessagesSection', MessagesSectionImpl)

/**
 * The messages plugin's React UI, for `plugins` on `mountGame` or
 * `GameProvider`: a `MessagesSection` wherever a device's app shows a
 * messages channel, and the messages' words.
 */
export const messagesUi: PluginUi = {
  id: 'messages',
  sections: { messages: MessagesSection },
}
