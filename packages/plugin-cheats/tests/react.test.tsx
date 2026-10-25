// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createRunner, definePlugin, loadGame, startingState, type Game, type Runner } from '@ifloom/engine'
import { cheats } from '../src/index.ts'
import { GameMenu, GameProvider, SceneStage, GameShell, type Components, Game as GamePage, Story } from '@ifloom/react'
import { CheatPanel, useCheats } from '../src/react/index.tsx'
import { cheatsUi } from '../src/react/index.tsx'

/** The plugin UIs every game here is drawn with. */
const UIS = [cheatsUi]

/** A layout of just a story with these children, and nothing over it. */
function storyOf(children: ReactNode) {
  return function StoryOnly() {
    return (
      <GamePage>
        <Story>{children}</Story>
      </GamePage>
    )
  }
}

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

const supporter = { not: { 'unlocks/has': { unlock: 'supporter' } } }

/** A stand-in for the unlocks plugin: `unlocks/has` holds while the kv key `unlock.<id>` is true. */
const unlocksStub = definePlugin<null>({
  id: 'unlocks',
  version: 1,
  conditions: { has: (state, args) => state.kv[`unlock.${String(args.unlock)}`] === true },
})

function game(options: { plugins?: boolean; hideAll?: boolean } = {}): Game {
  const hide = Boolean(options.hideAll)
  return loadGame(
    [
      {
        name: 'street',
        stats: [{ id: 'coins', label: 'Coins', start: 5, max: 9999 }],
        data: {
          cheats: {
            cheats: [
              {
                id: 'coins',
                name: '+20 coins',
                description: 'A little help.',
                effects: [{ stat: 'coins', by: 20 }],
                ...(hide ? { blocked: [{ when: supporter, reason: 'x', hide: true }] } : {}),
              },
              {
                id: 'map',
                name: 'Show the map',
                once: true,
                group: 'Story',
                effects: [{ kv: 'map', to: true }],
                ...(hide ? { blocked: [{ when: supporter, reason: 'x', hide: true }] } : {}),
              },
              {
                id: 'gold',
                name: '+500 coins',
                group: 'Supporters',
                blocked: [{ when: supporter, reason: 'For supporters.', hide }],
                effects: [{ stat: 'coins', by: 500 }],
              },
            ],
          },
        },
      },
    ],
    { id: 'cheats-ui', title: 'High Street', plugins: options.plugins === false ? [] : [cheats(), unlocksStub] },
  ).game
}

function play(props: Partial<Parameters<typeof GameShell>[0]> = {}, g = game()): Runner {
  const runner = createRunner(g, startingState(g))
  render(<GameShell plugins={UIS} runner={runner} {...props} />)
  return runner
}

const part = (name: string) => document.querySelector(`[data-part="${name}"]`)

function openPanel(): HTMLElement {
  act(() => void fireEvent.click(screen.getByRole('button', { name: 'Cheats' })))
  return screen.getByRole('dialog', { name: 'Cheats' })
}

describe('the cheat panel', () => {
  it('opens from the sidebar, with groups as sections and a supporter cheat greyed out by its reason', () => {
    play()
    const dialog = openPanel()
    const groups = [...dialog.querySelectorAll('[data-part="cheats-group"]')].map((group) => group.getAttribute('data-cheats-group'))
    expect(groups).toEqual(['', 'Story', 'Supporters'])
    expect(within(dialog).getByRole('heading', { name: 'Supporters' })).toBeTruthy()
    expect(within(dialog).getByText('A little help.')).toBeTruthy()
    const gold = within(dialog.querySelector('[data-cheat="gold"]') as HTMLElement).getByRole('button') as HTMLButtonElement
    expect(gold.disabled).toBe(true)
    expect(gold.textContent).toContain('For supporters.')
  })

  it('uses a cheat, counts it, and greys out a once cheat after its use', () => {
    const runner = play()
    const dialog = openPanel()
    const coins = () => dialog.querySelector('[data-cheat="coins"]') as HTMLElement
    act(() => void fireEvent.click(within(coins()).getByRole('button', { name: /\+20 coins/ })))
    act(() => void fireEvent.click(within(coins()).getByRole('button', { name: /\+20 coins/ })))
    expect(runner.state.stats.coins).toBe(45)
    expect(within(coins()).getByText('Used 2 times')).toBeTruthy()
    const map = () => dialog.querySelector('[data-cheat="map"]') as HTMLElement
    act(() => void fireEvent.click(within(map()).getByRole('button', { name: /Show the map/ })))
    expect(within(map()).getByText('Used once')).toBeTruthy()
    const again = within(map()).getByRole('button', { name: /Show the map/ }) as HTMLButtonElement
    expect(again.disabled).toBe(true)
    expect(again.textContent).toContain('Already used.')
  })

  it('opens the supporter cheat once the unlock holds', () => {
    const g = game()
    const start = startingState(g)
    const unlocked = createRunner(g, { ...start, kv: { ...start.kv, 'unlock.supporter': true } })
    render(<GameShell plugins={UIS} runner={unlocked} />)
    const dialog = openPanel()
    const gold = within(dialog.querySelector('[data-cheat="gold"]') as HTMLElement).getByRole('button') as HTMLButtonElement
    expect(gold.disabled).toBe(false)
    act(() => void fireEvent.click(gold))
    expect(unlocked.state.stats.coins).toBe(505)
  })

  it('has no button in a game without the plugin, or while every cheat is hidden', () => {
    play({}, game({ plugins: false }))
    expect(part('cheats-button')).toBeNull()
    cleanup()
    play({}, game({ hideAll: true }))
    expect(part('cheats-button')).toBeNull()
  })

  it('goes when its part is left out of the layout', () => {
    play({
      layout: storyOf(
        <>
          <SceneStage />
          <GameMenu />
        </>,
      ),
    })
    expect(part('cheats-button')).toBeNull()
  })

  it('is replaced by name, takes classes and says what the game says', () => {
    const components: Components = { CheatPanel: () => <p>Our own cheats</p> }
    play({ components, classes: { 'cheats-button': 'our-button' } })
    expect((part('cheats-button') as HTMLElement).className).toContain('our-button')
    openPanel()
    expect(screen.getByText('Our own cheats')).toBeTruthy()
    cleanup()
    const g = game()
    render(<GameShell plugins={UIS} runner={createRunner({ ...g, strings: { ...g.strings, 'ui.cheats': 'Helpers' } }, startingState(g))} />)
    expect(screen.getByRole('button', { name: 'Helpers' })).toBeTruthy()
  })
})

describe('useCheats', () => {
  const wrapper =
    (runner: Runner) =>
    ({ children }: { children: ReactNode }) => (
      <GameProvider plugins={UIS} runner={runner}>
        {children}
      </GameProvider>
    )

  it('gives the cheats by group, and uses one with no markup', () => {
    const g = game()
    const runner = createRunner(g, startingState(g))
    const { result } = renderHook(() => useCheats(), { wrapper: wrapper(runner) })
    expect(result.current!.groups.map((group) => [group.name, group.cheats.map((cheat) => cheat.id)])).toEqual([
      [null, ['coins']],
      ['Story', ['map']],
      ['Supporters', ['gold']],
    ])
    act(() => void result.current!.use('coins'))
    expect(runner.state.stats.coins).toBe(25)
    expect(result.current!.used).toBe(1)
    expect(result.current!.use('gold')).toMatchObject({ ok: false, reason: 'For supporters.' })
  })

  it('gives null in a game without the plugin', () => {
    const g = game({ plugins: false })
    const { result } = renderHook(() => useCheats(), { wrapper: wrapper(createRunner(g, startingState(g))) })
    expect(result.current).toBeNull()
  })

  it('draws the panel anywhere inside a provider', () => {
    const g = game()
    render(
      <GameProvider plugins={UIS} runner={createRunner(g, startingState(g))}>
        <CheatPanel />
      </GameProvider>,
    )
    expect(part('cheats')).not.toBeNull()
  })
})
