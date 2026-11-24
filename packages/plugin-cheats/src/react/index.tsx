/**
 * @ifloom/plugin-cheats/react: the cheats plugin's React UI, for a game drawn
 * with `@ifloom/react`. List `cheatsUi` in the game's
 * `plugins` to have a Cheats button in the side column, or draw them
 * yourself from `useCheats`.
 */
import type { GameState, Result } from '@ifloom/engine'
import { cheats, type CheatView, type CheatsView } from '../index.ts'
import { useState, type ComponentProps } from 'react'
import { ChoiceButton, usePart } from '@ifloom/react'
import { overridable, type Override, PartDialog, pluginKit, type PluginUi, useKitPart, usePlugin } from '@ifloom/react/kit'

/** The cheats plugin's words in English, keyed by name. A game rewords any of them with `ui.<key>` in its strings. */
export const CHEATS_WORDS = {
  /** The note on a cheat the player has used once. */
  cheatUsedOnce: 'Used once',
  /** The note on a cheat the player has used more than once, with `{n}` uses. */
  cheatUsedTimes: 'Used {n} times',
  /** The label of the cheats button and the title of its dialog. */
  cheats: 'Cheats',
} as const

/** The cheats plugin's UI, declared once: its id and its words, for `usePlugin` and `cheatsUi`. */
const CHEATS = pluginKit('cheats', CHEATS_WORDS)

declare module '@ifloom/react' {
  interface OverridableComponents {
    CheatPanel: Override<ComponentProps<typeof CheatPanel>>
    CheatsButton: Override<ComponentProps<typeof CheatsButton>>
  }
  interface PartNames {
    'cheat': true
    'cheat-text': true
    'cheat-used': true
    'cheats': true
    'cheats-button': true
    'cheats-group': true
    'cheats-group-title': true
  }
}

/** A group of the cheats panel, a heading and the cheats under it. The cheats with no group form one with a null name. */
export type CheatGroup = {
  /** The group's heading, or null for the cheats with no group. */
  name: string | null
  /** The group's cheats, in the order the game declares them. */
  cheats: CheatView[]
}

/** The cheats plugin's view with its cheats grouped and a way to use one, as `useCheats` returns it. */
export type CheatsControls = CheatsView & {
  /** The cheats grouped by their `group`, the ungrouped ones first, then each group in the order it first appears. */
  groups: CheatGroup[]
  /** Sends the `cheats/use` command for the cheat. A refused use returns the reason its button gives. */
  use: (cheat: string) => Result<GameState>
}

/** The cheats as groups: the ungrouped first, then each group in the order it first appears. */
function grouped(cheats: readonly CheatView[]): CheatGroup[] {
  const groups: CheatGroup[] = []
  for (const cheat of cheats) {
    const found = groups.find((group) => group.name === cheat.group)
    if (found) found.cheats.push(cheat)
    else groups.push({ name: cheat.group, cheats: [cheat] })
  }
  return groups.sort((a, b) => Number(a.name !== null) - Number(b.name !== null))
}

/**
 * Returns the cheats plugin's view, its groups and its command from the running game, or null in a game without the
 * plugin. It re-renders when the view changes. `CheatPanel` renders from it.
 */
export function useCheats(): CheatsControls | null {
  const { view, send } = usePlugin(CHEATS)
  if (!view) return null
  return {
    ...view,
    groups: grouped(view.cheats),
    use: (cheat) => send(cheats.use(cheat)),
  }
}

function CheatPanelImpl({ className }: { className?: string }) {
  const { words } = usePlugin(CHEATS)
  const panel = useKitPart('commands', 'cheats', 'gap-4', className)
  const section = usePart('cheats-group', 'flex flex-col gap-2')
  const heading = useKitPart('heading', 'cheats-group-title')
  const card = useKitPart('card', 'cheat', 'gap-1')
  const text = useKitPart('note', 'cheat-text')
  const used = useKitPart('badge', 'cheat-used')
  const shown = useCheats()
  if (!shown?.cheats.length) return null
  return (
    <div {...panel} data-cheats>
      {shown.groups.map((group) => (
        <section key={group.name ?? ''} {...section} data-cheats-group={group.name ?? ''}>
          {group.name ? <h3 {...heading}>{group.name}</h3> : null}
          {group.cheats.map((cheat) => (
            <div key={cheat.id} {...card} data-cheat={cheat.id} data-used={cheat.used ? '' : undefined}>
              <ChoiceButton choice={cheat.button} />
              {cheat.description ? <p {...text}>{cheat.description}</p> : null}
              {cheat.used ? <span {...used}>{cheat.used === 1 ? words('cheatUsedOnce') : words('cheatUsedTimes', { n: cheat.used })}</span> : null}
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}

/**
 * Renders the cheats from `view.plugins.cheats` under their groups' headings, each with its button, its description
 * and its use count. A preset styles its `cheats`, `cheats-group`, `cheats-group-title`, `cheat`, `cheat-text` and
 * `cheat-used` parts.
 *
 * A refused cheat's button is disabled with its reason, such as a supporter cheat before the unlock or a `once`
 * cheat after its use. It renders nothing while the player can see no cheat.
 */
export const CheatPanel = overridable('CheatPanel', CheatPanelImpl)

function CheatsButtonImpl({ className }: { className?: string }) {
  const { words } = usePlugin(CHEATS)
  const shown = useCheats()
  const [open, setOpen] = useState(false)
  const button = useKitPart('opener', 'cheats-button', '', className)
  // Nothing to open in a game without the plugin, or while every cheat is hidden.
  if (!shown?.cheats.length) return null
  return (
    <>
      <button type="button" {...button} data-cheats-button onClick={() => setOpen(true)}>
        {words('cheats')}
      </button>
      <PartDialog open={open} onClose={() => setOpen(false)} title={words('cheats')}>
        <CheatPanel />
      </PartDialog>
    </>
  )
}

/**
 * Renders the button that opens the `CheatPanel` in a dialog. A preset styles its `cheats-button` part.
 *
 * It renders nothing in a game without the plugin, or while the player can see no cheat.
 */
export const CheatsButton = overridable('CheatsButton', CheatsButtonImpl)

/**
 * The cheats plugin's React UI, for `plugins` on `mountGame` or `GameProvider`. It adds the `CheatsButton` to the
 * sidebar, which opens the `CheatPanel`, and the plugin's words.
 */
export const cheatsUi: PluginUi = {
  ...CHEATS,
  layout: { sidebar: [() => <CheatsButton />] },
}
