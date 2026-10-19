/**
 * @ifloom/phone — a smartphone in one line.
 *
 * `phone()` wires the devices, messages and feed plugins together and puts the
 * usual apps on the phone: one for each message channel and each feed, with
 * badges; contacts, from the people the player can call; and a gallery of the
 * `photo` things you hold, a kind it declares. Spread what it returns into the
 * game:
 *
 * ```ts
 * const kit = phone({ sidebar: true })
 * loadGame(content, { ...base, plugins: [...kit.plugins, quests()], kinds: kit.kinds, data: kit.data })
 * ```
 *
 * A photo is made in play with `create`:
 * `{ kind: 'create', of: 'photo', entity: { id: 'ava', name: 'Ava at work', image: 'photo/ava.svg' }, at: 'player' }`.
 *
 * The phone, its apps, channels and feeds are content (`data`), so the game's
 * content or a mod can add an app, a channel or a feed beside them.
 *
 * Anything more — a camera, a creator app, a bank — is an app the game adds
 * with `apps`, built from the same sections.
 */
import type { KindDef, Plugin, PluginEntry } from '@ifloom/engine'
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
  /** A Gallery app listing the `photo` things you hold, newest first. Yes, if left out. */
  gallery?: boolean
  /** More apps for the phone, after the stock ones. */
  apps?: Omit<AppDef, 'on'>[]
}

export type PhoneKit = {
  /** The devices, messages and feed plugins, ready for `game.plugins`. */
  plugins: Plugin[]
  /** The `photo` kind, unlisted, ready for the base game's `kinds`; empty without a gallery. */
  kinds: KindDef[]
  /**
   * The phone, its apps, the channels and the feeds, as plugin content, ready
   * for the base game's `data` (`loadGame`'s second argument). A pack's
   * `data.devices.apps` adds apps beside them, and replaces one by id.
   */
  data: Record<string, Record<string, readonly PluginEntry[]>>
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
      badge: { value: 'messages/unread', with: { channel: channel.id } },
      sections: [{ plugin: 'messages', with: { channel: channel.id } }],
    })),
    ...feeds.map((entry): AppDef => ({
      id: entry.id,
      name: entry.name,
      icon: 'feed',
      on,
      badge: { value: 'feed/unread', with: { feed: entry.id } },
      sections: [{ plugin: 'feed', with: { feed: entry.id } }],
    })),
    ...(options.contacts === false ? [] : [{ id: 'contacts', name: 'Contacts', icon: 'contacts', on, sections: [{ contacts: true as const }] }]),
    ...(options.gallery === false ? [] : [{ id: 'gallery', name: 'Gallery', icon: 'gallery', on, sections: [{ things: { of: 'photo' } }] }]),
    ...(options.apps ?? []).map((app) => ({ ...app, on })),
  ]
  const device = {
    id: on,
    name: options.name ?? 'Phone',
    frame: 'phone',
    sidebar: options.sidebar ?? true,
    ...(options.wallpaper !== undefined ? { wallpaper: options.wallpaper } : {}),
  }
  return {
    plugins: [devices(), messages(), ...(feeds.length ? [feed()] : [])],
    kinds: options.gallery === false ? [] : [{ id: 'photo', label: 'Photo', plural: 'Photos', listed: false }],
    data: {
      devices: { devices: [device], apps },
      messages: { channels },
      ...(feeds.length ? { feed: { feeds } } : {}),
    },
  }
}
