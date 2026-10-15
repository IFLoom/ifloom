/**
 * @ifloom/phone — a smartphone in one line.
 *
 * `phone()` wires the devices, messages and feed plugins together and puts the
 * usual apps on the phone: one for each message channel and each feed, with
 * badges; contacts, from the people the player can call; and a gallery, over a
 * `gallery` collection it declares. Spread what it returns into the game:
 *
 * ```ts
 * const kit = phone({ sidebar: true })
 * loadGame(packs, { ...base, plugins: [...kit.plugins, quests()], collections: [...kit.collections] })
 * ```
 *
 * Anything more — a camera, a creator app, a bank — is an app the game adds
 * with `apps`, built from the same sections.
 */
import type { CollectionDef, Plugin } from '@ifloom/engine'
import { devices, type AppDef } from '@ifloom/plugin-devices'
import { feed, type FeedDef } from '@ifloom/plugin-feed'
import { messages, type Channel } from '@ifloom/plugin-messages'

export type PhoneOptions = {
  /** The device's id. `'phone'` if left out. */
  id?: string
  name?: string
  /** Offer it from the sidebar. Yes, if left out. */
  sidebar?: boolean
  wallpaper?: string
  /** Message channels, each an app. One called "Messages" if left out. */
  channels?: Channel[]
  /** Feeds, each an app. One called "Social" if left out; `[]` for none. */
  feeds?: FeedDef[]
  /** A Contacts app. Yes, if left out. */
  contacts?: boolean
  /** A Gallery app over a `gallery` collection. Yes, if left out. */
  gallery?: boolean
  /** More apps for the phone, after the stock ones. */
  apps?: Omit<AppDef, 'on'>[]
}

export type PhoneKit = {
  /** The devices, messages and feed plugins, ready for `game.plugins`. */
  plugins: Plugin[]
  /** The `gallery` collection, ready for `game.collections`; empty without a gallery. */
  collections: CollectionDef[]
}

export function phone(options: PhoneOptions = {}): PhoneKit {
  const on = options.id ?? 'phone'
  const channels = options.channels ?? [{ id: 'texts', name: 'Messages' }]
  const feeds = options.feeds ?? [{ id: 'social', name: 'Social' }]
  const apps: AppDef[] = [
    ...channels.map((channel): AppDef => ({
      id: channel.id,
      name: channel.name,
      icon: 'messages',
      on,
      badge: { count: `messages/unread-${channel.id}` },
      sections: [{ plugin: 'messages', with: { channel: channel.id } }],
    })),
    ...feeds.map((entry): AppDef => ({
      id: entry.id,
      name: entry.name,
      icon: 'feed',
      on,
      badge: { count: `feed/unseen-${entry.id}` },
      sections: [{ plugin: 'feed', with: { feed: entry.id } }],
    })),
    ...(options.contacts === false ? [] : [{ id: 'contacts', name: 'Contacts', icon: 'contacts', on, sections: [{ contacts: true as const }] }]),
    ...(options.gallery === false ? [] : [{ id: 'gallery', name: 'Gallery', icon: 'gallery', on, sections: [{ collection: 'gallery' }] }]),
    ...(options.apps ?? []).map((app) => ({ ...app, on })),
  ]
  return {
    plugins: [
      devices({
        devices: [{ id: on, name: options.name ?? 'Phone', frame: 'phone', sidebar: options.sidebar ?? true, wallpaper: options.wallpaper }],
        apps,
      }),
      messages({ channels }),
      ...(feeds.length ? [feed({ feeds })] : []),
    ],
    collections: options.gallery === false ? [] : [{ id: 'gallery', name: 'Photos' }],
  }
}
