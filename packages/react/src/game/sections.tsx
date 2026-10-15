import type { Command, SceneBeat } from '@ifloom/engine'
import { buttonVariants } from '../components/ui/button.tsx'
import { ChoiceList } from './choices.tsx'
import { useGame } from './context.tsx'
import { overridable, usePart } from './overrides.tsx'
import { useWords } from './words.ts'
import { Picture } from './picture.tsx'
import { Beat } from './scene.tsx'
import { Video } from './video.tsx'

/** The messages plugin's view, as the UI reads it. */
type MessagesData = {
  channels: {
    id: string
    name: string
    unread: number
    threads: {
      id: string
      name: string
      portrait: string | null
      unread: number
      messages: { id: string; text: string; beats?: SceneBeat[]; read: boolean; replies: { id: string; label: string; command: Command }[]; replied: string | null }[]
    }[]
  }[]
}

/** The feed plugin's view, as the UI reads it. */
type FeedData = {
  feeds: {
    id: string
    name: string
    unseen: number
    posts: {
      id: string
      name: string
      portrait: string | null
      text: string
      beats?: SceneBeat[]
      image: string | null
      video?: string | null
      likes: number
      comments: { name: string; text: string }[]
      mine: boolean
    }[]
  }[]
}

type SectionProps = { data: unknown; with: Record<string, unknown> }

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
  const words = useWords()
  const box = usePart('channel', 'flex flex-col gap-4')
  const readAll = usePart('button', buttonVariants({ size: 'sm', variant: 'ghost' }))
  const threadBox = usePart('thread', 'flex flex-col gap-2')
  const title = usePart('thread-title', 'flex items-center gap-2 font-medium')
  const portrait = usePart('thread-portrait', 'size-6 rounded-full object-cover')
  const message = usePart('message', 'flex flex-col gap-1')
  const theirs = usePart('bubble', 'flex max-w-[85%] flex-col gap-2 rounded-2xl rounded-tl-sm bg-secondary px-3 py-2 text-sm')
  const mine = usePart('bubble', 'max-w-[85%] self-end rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-sm text-primary-foreground')
  const channel = (data as MessagesData | undefined)?.channels.find((entry) => entry.id === options.channel)
  if (!channel) return null
  return (
    <div {...box} data-channel={channel.id}>
      {channel.unread ? (
        <button type="button" {...readAll} onClick={() => send({ type: 'custom', name: 'messages/read', with: { channel: channel.id } })}>
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
            <div key={entry.id} {...message}>
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
 * so pictures and clips in it show as they do in a scene.
 */
export const MessagesSection = overridable('MessagesSection', MessagesSectionImpl)

function FeedSectionImpl({ data, with: options }: SectionProps) {
  const { send } = useGame()
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
  const feed = (data as FeedData | undefined)?.feeds.find((entry) => entry.id === options.feed)
  if (!feed) return null
  return (
    <div {...box} data-feed={feed.id}>
      {feed.unseen ? (
        <button type="button" {...seenAll} onClick={() => send({ type: 'custom', name: 'feed/seen', with: { feed: feed.id } })}>
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
 * its `video` through `Video`, like a GIF.
 */
export const FeedSection = overridable('FeedSection', FeedSectionImpl)
