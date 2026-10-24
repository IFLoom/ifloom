/**
 * {{title}}'s React UI, for a game drawn with `@ifloom/react`: the
 * `{{name}}/react` subpath. A game lists `__camel__Ui` in its `plugins` to
 * have the entries in the side column, or draws them itself from
 * `use__Pascal__`. A game with another UI never loads this file.
 *
 * It's built only from `@ifloom/react`'s public exports, the same kit a
 * game's own UI uses, and styled by the kit's classes, parts and theme
 * tokens, so it looks right in every preset with no stylesheet of its own.
 *
 * How a plugin UI is made: https://ifloom.dev/docs/react/kit
 */
import type { GameState, Result } from '@ifloom/engine'
import type { ComponentProps } from 'react'
import { badgeVariants, overridable, Section, useGame, usePart, useWords, type Override, type PluginUi } from '@ifloom/react'
import type { __Pascal__View } from '../index.ts'

/** The plugin's words, in English. A game rewords any with `ui.<key>` in its strings: `{ 'ui.__camel__Marked': 'Done' }`. */
export const __CONSTANT___WORDS = {
  __camel__Title: '{{title}}',
  __camel__Marked: 'Marked',
} as const

// The component and its parts, for a game's `components` and `classes`.
declare module '@ifloom/react' {
  interface OverridableComponents {
    __Pascal__List: Override<ComponentProps<typeof __Pascal__List>>
  }
  interface PartNames {
    '__id__': true
    '__id__-entry': true
  }
}

/** What `use__Pascal__` returns: the plugin's view, and its command. */
export type __Pascal__Controls = __Pascal__View & {
  /** Mark an entry: sends `__id__/mark`, refused with its reason. */
  mark: (entry: string) => Result<GameState>
}

/** The plugin's view with its command, or null in a game without the plugin. `__Pascal__List` is drawn from it. */
export function use__Pascal__(): __Pascal__Controls | null {
  const { view, send } = useGame()
  const data = view.plugins['__id__'] as __Pascal__View | undefined
  if (!data) return null
  return { ...data, mark: (entry) => send({ type: 'custom', name: '__id__/mark', with: { id: entry } }) }
}

function __Pascal__ListImpl({ className }: { className?: string }) {
  const words = useWords(__CONSTANT___WORDS)
  const data = use__Pascal__()
  const list = usePart('__id__', 'flex flex-col gap-2 text-sm', className)
  const row = usePart('__id__-entry', 'flex items-center gap-2')
  const badge = usePart('badge', badgeVariants({ variant: 'secondary' }))
  if (!data?.entries.length) return null
  return (
    <ul {...list}>
      {data.entries.map((entry) => (
        <li key={entry.id} {...row} data-entry={entry.id}>
          {entry.label}
          {entry.marked ? <span {...badge}>{words('__camel__Marked')}</span> : null}
        </li>
      ))}
    </ul>
  )
}

/** The entries, each with a badge once it's marked. Replace it by name in `components`. */
export const __Pascal__List = overridable('__Pascal__List', __Pascal__ListImpl)

/** The default layout's section for it: the list, folding in place, hidden while there's nothing in it. */
export function __Pascal__Section() {
  const words = useWords(__CONSTANT___WORDS)
  return (
    <Section id="__id__" title={words('__camel__Title')} collapsible>
      <__Pascal__List />
    </Section>
  )
}

/**
 * The plugin's React UI, for `plugins` on `mountGame` or `GameProvider`: its
 * section in the side column, and its words. It can also bring panels by
 * name, pages, settings and inline pieces: see `PluginUi`.
 */
export const __camel__Ui: PluginUi = {
  id: '__id__',
  words: __CONSTANT___WORDS,
  layout: { sidebar: [__Pascal__Section] },
}
