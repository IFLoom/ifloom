/**
 * The phone: a device on the sidebar, and the apps on it. The devices,
 * messages and feed plugins each do their part, and this content puts them
 * together: an app for the texts and one for the social feed, each with an
 * unread badge and a section the plugin draws; Contacts, from the cast; a
 * Gallery of the photos you hold, a kind declared here; and the town's own
 * camera and notes. It's all content, so a mod can add an app or replace one
 * by id.
 */
import type { Content } from '@ifloom/engine'
import type { AppDef, DeviceDef } from '@ifloom/plugin-devices'
import type { Channel } from '@ifloom/plugin-messages'
import type { FeedDef } from '@ifloom/plugin-feed'
import { cast } from '@ifloom/plugin-cast'

const device: DeviceDef = { id: 'phone', name: 'Phone', frame: 'phone', sidebar: true }

/** Where texts arrive, and the town's social feed. */
const channels: Channel[] = [{ id: 'texts', name: 'Messages' }]
const feeds: FeedDef[] = [{ id: 'social', name: 'Social' }]

/** The camera: one photo of each person, if they're here to take, and a post a day. A photo is a thing the camera makes, kept by the player. */
const camera: AppDef = {
  id: 'camera',
  name: 'Camera',
  icon: 'camera',
  on: 'phone',
  sections: [
    {
      actions: [
        ...(['ava', 'sam'] as const).map((who) => ({
          id: `photo-${who}`,
          label: who === 'ava' ? 'Photograph Ava' : 'Photograph Sam',
          blocked: [{ when: { not: cast.here(who) }, reason: 'They aren’t here.' }],
          effects: [{ create: 'photo', with: { id: who, name: who === 'ava' ? 'Ava at work' : 'Sam and the dog', image: `photo/${who}.svg` }, at: 'player' }],
        })),
        {
          id: 'post',
          label: 'Post your latest photo',
          cost: { stats: { energy: 5 } },
          blocked: [
            { when: { not: { count: { of: 'photo', at: 'player' } } }, reason: 'Take a photo first.' },
            { when: { kv: 'postedToday' }, reason: 'You have posted today.' },
          ],
          effects: [{ 'game/postLatest': true }, { kv: 'postedToday', to: true }],
        },
      ],
    },
  ],
}

const apps: AppDef[] = [
  // An app for each channel and each feed, with a count of what's unread and the plugin's own view as its section.
  ...channels.map((channel): AppDef => ({
    id: channel.id,
    name: channel.name,
    icon: 'messages',
    on: 'phone',
    badge: { value: 'messages/unread', with: { channel: channel.id } },
    sections: [{ plugin: 'messages', with: { channel: channel.id } }],
  })),
  ...feeds.map((entry): AppDef => ({
    id: entry.id,
    name: entry.name,
    icon: 'feed',
    on: 'phone',
    badge: { value: 'feed/unread', with: { feed: entry.id } },
    sections: [{ plugin: 'feed', with: { feed: entry.id } }],
  })),
  // The people you've met who can be called, each with a Call button.
  { id: 'contacts', name: 'Contacts', icon: 'contacts', on: 'phone', sections: [{ contacts: true }] },
  // The photos you hold, newest first.
  { id: 'gallery', name: 'Gallery', icon: 'gallery', on: 'phone', sections: [{ things: { of: 'photo' } }] },
  camera,
  // The notes you keep, such as Sam's welcome note.
  { id: 'notes', name: 'Notes', icon: 'notes', on: 'phone', sections: [{ things: { of: 'note' } }] },
]

export const phone: Content = {
  name: 'phone',
  // Photos are things you hold, kept off the town's lists: the Gallery shows them.
  kinds: [{ id: 'photo', label: 'Photo', plural: 'Photos', listed: false }],
  data: {
    devices: { devices: [device], apps },
    messages: { channels },
    feed: { feeds },
  },
}
