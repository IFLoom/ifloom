import type { GameState, Result, SceneBeat } from '@ifloom/engine'
import type { FeedsView } from '@ifloom/plugin-feed'
import type { MessagesView } from '@ifloom/plugin-messages'
import { buttonVariants } from '../components/ui/button.tsx'
import { ChoiceList } from './choices.tsx'
import { useGame } from './context.tsx'
import { overridable, usePart } from './overrides.tsx'
import { useWords } from './words.ts'
import { Picture } from './picture.tsx'
import { Beat } from './scene.tsx'
import { Video } from './video.tsx'

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

/** What `useFeed` returns: the feed plugin's view, and its command. */
export type FeedControls = FeedsView & {
  /** Mark a feed's posts seen: sends `feed/seen`. */
  seen: (feed: string) => Result<GameState>
}

/** The feed plugin's view with its command, or null in a game without the plugin. `FeedSection` is drawn from it. */
export function useFeed(): FeedControls | null {
  const { view, send } = useGame()
  const data = view.plugins.feed as FeedsView | undefined
  if (!data) return null
  return { ...data, seen: (feed) => send({ type: 'custom', name: 'feed/seen', with: { id: feed } }) }
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
  const messages = useMessages()
  const words = useWords()
  const box = usePart('channel', 'flex flex-col gap-4')
  const readAll = usePart('button', buttonVariants({ size: 'sm', variant: 'ghost' }))
  const threadBox = usePart('thread', 'flex flex-col gap-2')
  const title = usePart('thread-title', 'flex items-center gap-2 font-medium')
  const portrait = usePart('thread-portrait', 'size-6 rounded-full object-cover')
  const message = usePart('message', 'flex flex-col gap-1')
  const theirs = usePart('bubble', 'flex max-w-[85%] flex-col gap-2 rounded-2xl rounded-tl-sm bg-secondary px-3 py-2 text-sm')
  const mine = usePart('bubble', 'max-w-[85%] self-end rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-sm text-primary-foreground')
  const channel = ((data as MessagesView | undefined) ?? messages)?.channels.find((entry) => entry.id === options.channel)
  if (!channel || !messages) return null
  return (
    <div {...box} data-channel={channel.id}>
      {channel.unread ? (
        <button type="button" {...readAll} onClick={() => messages.read(channel.id)}>
          {words('allRead')}
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

function FeedSectionImpl({ data, with: options }: SectionProps) {
  const feeds = useFeed()
  const words = useWords()
  const box = usePart('feed', 'flex flex-col gap-3')
  const seenAll = usePart('button', buttonVariants({ size: 'sm', variant: 'ghost' }))
  const card = usePart('post', 'flex flex-col gap-2 rounded-lg border p-3')
  const author = usePart('post-author', 'flex items-center gap-2 text-sm font-medium')
  const portrait = usePart('post-portrait', 'size-6 rounded-full object-cover')
  const image = usePart('post-image', 'w-full rounded')
  const text = usePart('post-text', 'flex flex-col gap-2 text-sm')
  const clip = usePart('post-image', 'w-full rounded')
  const meta = usePart('post-meta', 'text-xs text-muted-foreground')
  const comment = usePart('post-comment', 'text-xs')
  const commenter = usePart('post-comment-name', 'font-medium')
  const feed = ((data as FeedsView | undefined) ?? feeds)?.feeds.find((entry) => entry.id === options.feed)
  if (!feed || !feeds) return null
  return (
    <div {...box} data-feed={feed.id}>
      {feed.unread ? (
        <button type="button" {...seenAll} onClick={() => feeds.seen(feed.id)}>
          {words('allSeen')}
        </button>
      ) : null}
      {feed.posts.map((post) => (
        <article key={post.id} {...card} data-post={post.id}>
          <p {...author}>
            {post.portrait ? <Picture {...portrait} src={post.portrait} alt="" /> : null}
            {post.name}
          </p>
          {post.image ? <Picture {...image} src={post.image} alt="" /> : null}
          {post.video ? <Video className={clip.className} src={post.video} autoplay loop muted controls={false} /> : null}
          {post.beats?.length || (!post.beats && post.text) ? (
            <div {...text}>
              <Words beats={post.beats} text={post.text} />
            </div>
          ) : null}
          <p {...meta}>{words('likes', { n: post.likes })}</p>
          {post.comments.map((entry, index) => (
            <p key={index} {...comment}>
              <span {...commenter}>{entry.name}</span> {entry.text}
            </p>
          ))}
        </article>
      ))}
    </div>
  )
}

/**
 * A feed in an app: posts newest first, with likes and comments, and a button
 * to mark the feed seen. A post's words are drawn as beats through `Beat`, and
 * its `video` through `Video`, like a GIF. A thin default on `useFeed`.
 */
export const FeedSection = overridable('FeedSection', FeedSectionImpl)
