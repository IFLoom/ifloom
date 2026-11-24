/**
 * Notices: what the game tells the player outside scenes, raised by the
 * `notify` effect and marked seen with the `dismiss` command. The helpers are
 * in `notices.ts`.
 */
import { dismiss, notify, type Notice } from '../notices.ts'
import { artSrc } from '../sceneBody.ts'
import { defineFeature } from './feature.ts'

/** A notice as the player sees it, in `view.notices.unseen`. */
export type NoticeView = {
  /** The notice's id, which the `dismiss` command takes. */
  id: string
  /** The notice's short line, kept as written. */
  title: string
  /** The notice's longer words, with their tokens filled in. Empty if it has none. */
  text: string
  /** The notice's picture, as a path through `artSrc`. Null if it has none. */
  image: string | null
  /** The notice's subject, for grouping badges, such as `'messages'`. Null if it has none. */
  tag: string | null
  /** The turn the notice was raised on. */
  turn: number
}

/** The notices as the player sees them, in `view.notices`. Only notices the player hasn't dismissed are listed. */
export type NoticesView = {
  /** The notices the player hasn't dismissed, newest first. */
  unseen: NoticeView[]
  /** The number of unseen notices for each tag, for badges. Untagged notices count under `''`. */
  byTag: Record<string, number>
}

/** The notices feature's state, calls and view, as types. */
export type NoticesShape = {
  state: {
    /** The notices the game has raised, oldest first. The state keeps the last 50. */
    notices: Notice[]
  }
  effects: {
    /**
     * An effect that raises a notice outside a scene, such as
     * `{ notify: 'A note under your door', text: 'It says the bins go out on Tuesday.' }`. The view fills the tokens in
     * `text`, and an `id` already used replaces that notice.
     */
    notify: { notify: string; text?: string; image?: string; tag?: string; id?: string }
  }
  commands: {
    /** A command that marks the notice `id` seen, or every notice when `id` is left out. */
    dismiss: { type: 'dismiss'; id?: string }
  }
  view: {
    /** The notices the player hasn't dismissed, with a count for each tag. */
    notices: NoticesView
  }
}

/** The notices feature, which raises and dismisses notices. */
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
      references: (effect) => [{ words: effect.text, field: 'notice text' }, ...(effect.image !== undefined ? [{ picture: effect.image }] : [])],
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
          image: notice.image === undefined ? null : artSrc(notice.image),
          tag: notice.tag ?? null,
          turn: notice.turn,
        })),
        byTag,
      },
    }
  },
})
