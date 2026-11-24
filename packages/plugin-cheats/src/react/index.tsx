/**
 * @ifloom/plugin-cheats/react: the cheats plugin's React UI, for a game drawn
 * with `@ifloom/react`. List `cheatsUi` in the game's
 * `plugins` to have a Cheats button in the side column, or draw them
 * yourself from `useCheats`.
 */
import type { GameState, Result } from '@ifloom/engine'
import type { CheatView, CheatsView } from '../index.ts'
import { useState, type ComponentProps } from 'react'
import { ChoiceButton, overridable, type Override, PartDialog, type PluginUi, useGame, useKitPart, usePart, useWords } from '@ifloom/react'

/** The cheats plugin's words, in English. A game rewords any with `ui.<key>` in its strings. */
export const CHEATS_WORDS = {
  cheatUsedOnce: 'Used once',
  cheatUsedTimes: 'Used {n} times',
  cheats: 'Cheats',
} as const

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

/** A heading of the cheat panel and the cheats under it. `name` is null for the cheats with no group, which come first. */
export type CheatGroup = { name: string | null; cheats: CheatView[] }

/** What `useCheats` returns: the cheats plugin's view, the cheats by group, and the command. */
export type CheatsControls = CheatsView & {
  /** The cheats by their `group`, in the order each group first appears; the ungrouped ones first. */
  groups: CheatGroup[]
  /** Use a cheat: sends `cheats/use`, refused with the reason its button gives. */
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

/** The cheats plugin's view with its command, or null in a game without the plugin. `CheatPanel` is drawn from it. */
export function useCheats(): CheatsControls | null {
  const { view, send } = useGame()
  const cheats = view.plugins.cheats as CheatsView | undefined
  if (!cheats) return null
  return {
    ...cheats,
    groups: grouped(cheats.cheats),
    use: (cheat) => send({ type: 'custom', name: 'cheats/use', with: { id: cheat } }),
  }
}

function CheatPanelImpl({ className }: { className?: string }) {
  const words = useWords(CHEATS_WORDS)
  const panel = useKitPart('commands', 'cheats', 'gap-4', className)
  const section = usePart('cheats-group', 'flex flex-col gap-2')
  const heading = useKitPart('heading', 'cheats-group-title')
  const card = useKitPart('card', 'cheat', 'gap-1')
  const text = useKitPart('note', 'cheat-text')
  const used = useKitPart('badge', 'cheat-used')
  const cheats = useCheats()
  if (!cheats?.cheats.length) return null
  return (
    <div {...panel} data-cheats>
      {cheats.groups.map((group) => (
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
 * The cheats the player can see, under their groups' headings: each a button
 * greyed out with its reason while it's refused (a supporter cheat before the
 * unlock, a once cheat after its use), its description, and how many times
 * this save has used it. A thin default on `useCheats`.
 */
export const CheatPanel = overridable('CheatPanel', CheatPanelImpl)

function CheatsButtonImpl({ className }: { className?: string }) {
  const words = useWords(CHEATS_WORDS)
  const cheats = useCheats()
  const [open, setOpen] = useState(false)
  const button = useKitPart('opener', 'cheats-button', '', className)
  // Nothing to open in a game without the plugin, or while every cheat is hidden.
  if (!cheats?.cheats.length) return null
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
 * The button that opens the `CheatPanel` in a dialog: the `'cheats'` part.
 * Nothing in a game without the plugin, or while it has no cheat the player
 * can see.
 */
export const CheatsButton = overridable('CheatsButton', CheatsButtonImpl)

/**
 * The cheats plugin's React UI, for `plugins` on `mountGame` or
 * `GameProvider`: the `CheatsButton` in the side column, which opens the
 * `CheatPanel`, and the cheats' words.
 */
export const cheatsUi: PluginUi = {
  id: 'cheats',
  words: CHEATS_WORDS,
  layout: { sidebar: [() => <CheatsButton />] },
}
