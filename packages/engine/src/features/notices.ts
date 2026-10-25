/**
 * Notices: what the game tells the player outside scenes, raised by the
 * `notify` effect and marked seen with the `dismiss` command. The helpers are
 * in `notices.ts`.
 */
import { dismiss, notify, type Notice } from '../notices.ts'
import { defineFeature } from './feature.ts'

export type NoticeView = {
  id: string
  title: string
  /** The notice's words, tokens filled in; empty if it has none. */
  text: string
  image: string | null
  tag: string | null
  /** The turn it was raised. */
  turn: number
}

export type NoticesView = {
  /** Not yet dismissed, newest first. */
  unseen: NoticeView[]
  /** How many unseen notices each tag has: badges. Untagged ones count under `''`. */
  byTag: Record<string, number>
}

/** What the notices feature adds, as types. */
export type NoticesShape = {
  state: {
    /** What the game has told the player outside scenes, oldest first. */
    notices: Notice[]
  }
  effects: {
    /** Tell the player something outside a scene: `{ notify: 'A note under your door', text: 'It says the bins go out on Tuesday.' }`. Tokens in `text` are filled as it is shown. */
    notify: { notify: string; text?: string; image?: string; tag?: string; id?: string }
  }
  commands: {
    /** Mark one notice seen, or every one. */
    dismiss: { type: 'dismiss'; id?: string }
  }
  view: {
    notices: NoticesView
  }
}

export const notices = defineFeature<NoticesShape>({
  name: 'notices',
  state: {
    notices: { start: () => [], load: () => [] },
  },
  effects: {
    notify: {
      apply: (state, effect) => {
        const { notify: title, ...notice } = effect
        return notify(state, { ...notice, title })
      },
      references: (effect) => [
        { words: effect.text, field: 'notice text' },
        ...(effect.image !== undefined ? [{ picture: effect.image, asWritten: true }] : []),
      ],
    },
  },
  commands: {
    dismiss: {
      whyNot: () => undefined,
      run: (state, command) => dismiss(state, command.id),
      references: () => [],
    },
  },
  view: (state, game, _shown, cx) => {
    const unseen = (state.notices ?? []).filter((notice) => !notice.seen).reverse()
    const byTag: Record<string, number> = {}
    for (const notice of unseen) byTag[notice.tag ?? ''] = (byTag[notice.tag ?? ''] ?? 0) + 1
    return {
      notices: {
        unseen: unseen.map((notice) => ({
          id: notice.id,
          title: notice.title,
          text: notice.text ? cx.fillTokens(state, game, notice.text) : '',
          image: notice.image ?? null,
          tag: notice.tag ?? null,
          turn: notice.turn,
        })),
        byTag,
      },
    }
  },
})
