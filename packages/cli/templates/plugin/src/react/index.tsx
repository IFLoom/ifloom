/**
 * {{title}}'s React UI, for a game drawn with `@ifloom/react`: the
 * `{{name}}/react` subpath. A game lists `__camel__Ui` in its `plugins` to
 * have the entries in the side column, or draws them itself from
 * `use__Pascal__`. A game with another UI never loads this file.
 *
 * It's built only from `@ifloom/react`'s public exports, the same kit a
 * game's own UI uses, and styled by the kit's parts (each with its own look),
 * the kit's layout classes and the theme's tokens, so it looks right in
 * every preset with no stylesheet of its own.
 *
 * How a plugin UI is made: https://ifloom.dev/docs/react/kit
 */
import type { GameState, Result } from '@ifloom/engine'
import type { ComponentProps } from 'react'
import { overridable, pluginKit, Section, useKitPart, usePart, usePlugin, type Override, type PluginUi } from '@ifloom/react'
import { __camel__, type __Pascal__View } from '../index.ts'

/** The plugin's words, in English. A game rewords any with `ui.<key>` in its strings: `{ 'ui.__camel__Marked': 'Done' }`. */
export const __CONSTANT___WORDS = {
  __camel__Title: '{{title}}',
  __camel__Marked: 'Marked',
} as const

// The UI declared once, its id and its words: `usePlugin` reads the plugin's view, typed, and says its words; `__camel__Ui` spreads it.
const __CONSTANT__ = pluginKit('__id__', __CONSTANT___WORDS)

// The component and its parts, for a game's `components` and `classes`.
declare module '@ifloom/react' {
  interface OverridableComponents {
    __Pascal__List: Override<ComponentProps<typeof __Pascal__List>>
  }
  interface PartNames {
    '__id__': true
    '__id__-entry': true
    '__id__-marked': true
  }
}

/** What `use__Pascal__` returns: the plugin's view, and its command. */
export type __Pascal__Controls = __Pascal__View & {
  /** Mark an entry: sends `__id__/mark`, refused with its reason. */
  mark: (entry: string) => Result<GameState>
}

/** The plugin's view with its command, or null in a game without the plugin. `__Pascal__List` is drawn from it. */
export function use__Pascal__(): __Pascal__Controls | null {
  const { view, send } = usePlugin(__CONSTANT__)
  if (!view) return null
  return { ...view, mark: (entry) => send(__camel__.markCommand(entry)) }
}

function __Pascal__ListImpl({ className }: { className?: string }) {
  const { words } = usePlugin(__CONSTANT__)
  const data = use__Pascal__()
  const list = usePart('__id__', 'flex flex-col gap-2 text-sm', className)
  // Kit parts bring their own look, so a preset styles them as it does every plugin's: add only layout.
  const row = useKitPart('item', '__id__-entry', 'flex-row items-center gap-2')
  const badge = useKitPart('badge', '__id__-marked')
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
  const { words } = usePlugin(__CONSTANT__)
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
  ...__CONSTANT__,
  layout: { sidebar: [__Pascal__Section] },
}
