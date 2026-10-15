import { Button } from '../components/ui/button.tsx'
import { ChoiceList } from './choices.tsx'
import { useGame, type PluginSectionComponent } from './context.tsx'
import { useWords } from './words.ts'
import { Picture } from './picture.tsx'

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
      messages: { id: string; text: string; read: boolean; replies: { id: string; label: string; command: import('@ifloom/engine').Command }[]; replied: string | null }[]
    }[]
  }[]
}

/** The feed plugin's view, as the UI reads it. */
type FeedData = {
  feeds: {
    id: string
    name: string
    unseen: number
    posts: { id: string; name: string; portrait: string | null; text: string; image: string | null; likes: number; comments: { name: string; text: string }[]; mine: boolean }[]
  }[]
}

/**
 * A messages channel in an app: its threads, newest first, each with its
 * messages, the reply sent, and the replies on offer, with a button to mark
 * the channel read.
 */
export const MessagesSection: PluginSectionComponent = ({ data, with: options }) => {
  const { send } = useGame()
  const words = useWords()
  const channel = (data as MessagesData | undefined)?.channels.find((entry) => entry.id === options.channel)
  if (!channel) return null
  return (
    <div className="flex flex-col gap-4" data-channel={channel.id}>
      {channel.unread ? (
        <Button size="sm" variant="ghost" onClick={() => send({ type: 'custom', name: 'messages/read', with: { channel: channel.id } })}>
          {words('allRead')}
        </Button>
      ) : null}
      {channel.threads.map((thread) => (
        <section key={thread.id} className="flex flex-col gap-2" data-thread={thread.id}>
          <h4 className="flex items-center gap-2 font-medium">
            {thread.portrait ? <Picture src={thread.portrait} alt="" className="size-6 rounded-full object-cover" /> : null}
            {thread.name}
          </h4>
          {thread.messages.map((message) => (
            <div key={message.id} className="flex flex-col gap-1">
              <p className="max-w-[85%] rounded-2xl rounded-tl-sm bg-secondary px-3 py-2 text-sm">{message.text}</p>
              {message.replied ? (
                <p className="max-w-[85%] self-end rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-sm text-primary-foreground">{message.replied}</p>
              ) : (
                <ChoiceList
                  choices={message.replies.map((reply) => ({ id: reply.id, label: reply.label, command: reply.command }))}
                />
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}

/** A feed in an app: posts newest first, with likes and comments, and a button to mark the feed seen. */
export const FeedSection: PluginSectionComponent = ({ data, with: options }) => {
  const { send } = useGame()
  const words = useWords()
  const feed = (data as FeedData | undefined)?.feeds.find((entry) => entry.id === options.feed)
  if (!feed) return null
  return (
    <div className="flex flex-col gap-3" data-feed={feed.id}>
      {feed.unseen ? (
        <Button size="sm" variant="ghost" onClick={() => send({ type: 'custom', name: 'feed/seen', with: { feed: feed.id } })}>
          {words('allSeen')}
        </Button>
      ) : null}
      {feed.posts.map((post) => (
        <article key={post.id} className="flex flex-col gap-2 rounded-lg border p-3" data-post={post.id}>
          <p className="flex items-center gap-2 text-sm font-medium">
            {post.portrait ? <Picture src={post.portrait} alt="" className="size-6 rounded-full object-cover" /> : null}
            {post.name}
          </p>
          {post.image ? <Picture src={post.image} alt="" className="w-full rounded" /> : null}
          {post.text ? <p className="text-sm">{post.text}</p> : null}
          <p className="text-xs text-muted-foreground">{words('likes', { n: post.likes })}</p>
          {post.comments.map((comment, index) => (
            <p key={index} className="text-xs">
              <span className="font-medium">{comment.name}</span> {comment.text}
            </p>
          ))}
        </article>
      ))}
    </div>
  )
}
