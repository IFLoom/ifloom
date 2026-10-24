// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createContext, useContext, type ReactNode } from 'react'
import { createRunner, definePlugin, loadGame, startingState, type Game } from '@ifloom/engine'
import {
  Clock,
  GameShell,
  NoticeStrip,
  Plugins,
  SceneStage,
  Story,
  Game as Page,
  useGame,
  usePage,
  usePluginUis,
  useWords,
  type PluginUi,
} from '../src/index.ts'

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

/** Two test plugins with a view each, as a plugin package's engine side would be. */
const garden = definePlugin<null, { flowers: number }>({ id: 'garden', version: 1, view: (state) => ({ flowers: state.stats.coins }) })
const weather = definePlugin<null, { sky: string }>({ id: 'weather', version: 1, label: () => 'Sunny', view: () => ({ sky: 'clear' }) })

const GARDEN_WORDS = { garden: 'Garden', flowers: '{n} flowers' } as const

function Flowers() {
  const words = useWords(GARDEN_WORDS)
  const flowers = (useGame().view.plugins.garden as { flowers: number } | undefined)?.flowers ?? 0
  return <p data-flowers>{words('flowers', { n: flowers })}</p>
}

const Shed = createContext('nobody')
function GardenProvider({ children }: { children: ReactNode }) {
  return <Shed.Provider value="the gardener">{children}</Shed.Provider>
}
function WhoIsIn() {
  return <p data-shed>{useContext(Shed)}</p>
}

/** What a plugin's `/react` would export as `gardenUi`. */
const gardenUi: PluginUi = {
  id: 'garden',
  words: GARDEN_WORDS,
  layout: { sidebar: [Flowers], story: [WhoIsIn], strip: [() => <button type="button">Bees</button>] },
  panels: { beds: { component: ({ data }) => <p>Beds: {JSON.stringify(data)}</p>, title: 'garden' } },
  pages: { garden: { label: 'garden', component: () => <p data-page="garden">The garden page</p> } },
  settings: { label: 'garden', component: () => <p data-garden-settings>Garden settings</p> },
  provider: GardenProvider,
}

const weatherUi: PluginUi = {
  id: 'weather',
  layout: { sidebar: [() => <p data-weather>Weather</p>] },
  components: { Clock: () => <p data-part="clock">Bright and sunny</p> },
}

function game(plugins = [garden, weather]): Game {
  return loadGame(
    [
      {
        stats: [{ id: 'coins', label: 'Coins', start: 3 }],
        activities: [{ id: 'beds', effects: [{ kind: 'panel', panel: 'beds', with: { rows: 2 } }] }],
      },
    ],
    { id: 'plugins-test', title: 'Allotment', plugins, actions: [{ id: 'beds', label: 'Look at the beds', command: { type: 'activity', id: 'beds' } }] },
  ).game
}

function play(props: Partial<Parameters<typeof GameShell>[0]> = {}, g = game()) {
  const runner = createRunner(g, startingState(g))
  render(<GameShell runner={runner} plugins={[gardenUi, weatherUi]} {...props} />)
  return runner
}

const press = (name: RegExp | string) => act(() => void fireEvent.click(screen.getByRole('button', { name })))

describe('plugin UIs', () => {
  it('place what they bring in the default layout, in the order of the list', () => {
    play()
    const sidebar = document.querySelector('[data-part="sidebar"]') as HTMLElement
    expect(within(sidebar).getByText('3 flowers')).toBeTruthy()
    const order = [...sidebar.querySelectorAll('[data-flowers], [data-weather]')].map((node) => (node.hasAttribute('data-flowers') ? 'garden' : 'weather'))
    expect(order).toEqual(['garden', 'weather'])
    cleanup()
    play({ plugins: [weatherUi, gardenUi] })
    const again = document.querySelector('[data-part="sidebar"]') as HTMLElement
    expect([...again.querySelectorAll('[data-flowers], [data-weather]')].map((node) => (node.hasAttribute('data-flowers') ? 'garden' : 'weather'))).toEqual([
      'weather',
      'garden',
    ])
  })

  it('do nothing for a plugin the game does not have, and nothing is drawn for a plugin left out', () => {
    play({}, game([weather]))
    expect(document.querySelector('[data-flowers]')).toBeNull()
    expect(document.querySelector('[data-weather]')).not.toBeNull()
    cleanup()
    play({ plugins: [] })
    expect(document.querySelector('[data-weather]')).toBeNull()
    // The core clock still says what the plugins' labels write.
    expect(document.querySelector('[data-part="clock"]')?.textContent).toBe('Sunny')
  })

  it('wrap the game in their providers', () => {
    play()
    expect(document.querySelector('[data-shed]')?.textContent).toBe('the gardener')
  })

  it('draw their panels by name, titled with their words, under the game’s own of the same name', () => {
    play()
    press('Look at the beds')
    expect(screen.getByRole('dialog', { name: 'Garden' }).textContent).toContain('Beds: {"rows":2}')
    cleanup()
    play({ panels: { beds: () => <p>Our own beds</p> } })
    press('Look at the beds')
    expect(within(screen.getByRole('dialog', { name: 'Garden' })).getByText('Our own beds')).toBeTruthy()
  })

  it('say their words, which the game rewords with ui. strings', () => {
    const g = game()
    play({}, { ...g, strings: { ...g.strings, 'ui.flowers': '{n} blooms' } })
    expect(screen.getByText('3 blooms')).toBeTruthy()
  })

  it('replace built-in components by name, and the game’s own go over them', () => {
    play()
    expect(document.querySelector('[data-part="clock"]')?.textContent).toBe('Bright and sunny')
    cleanup()
    play({ components: { Clock: () => <p data-part="clock">Our own sky</p> } })
    expect(document.querySelector('[data-part="clock"]')?.textContent).toBe('Our own sky')
  })

  it('add pages, with a title-screen button, and settings on the settings page', () => {
    play({ pages: {} })
    press('Garden')
    expect(screen.getByText('The garden page')).toBeTruthy()
    cleanup()
    play({ pages: {} })
    press('Settings')
    expect(document.querySelector('[data-garden-settings]')).not.toBeNull()
  })

  it('put their settings behind a menu button without pages', () => {
    play()
    press('Garden')
    expect(within(screen.getByRole('dialog', { name: 'Garden' })).getByText('Garden settings')).toBeTruthy()
  })

  it('leave out what the game leaves out of a module, such as its pages', () => {
    play({ pages: {} })
    expect(screen.getByRole('button', { name: 'Garden' })).toBeTruthy()
    cleanup()
    play({ pages: {}, plugins: [{ ...gardenUi, pages: undefined }] })
    expect(screen.queryByRole('button', { name: 'Garden' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Settings' })).toBeTruthy()
  })

  it('tell a page of their own which pages there are', () => {
    let added: string[] = []
    function Added() {
      added = Object.keys(usePage().added)
      return null
    }
    play({ pages: { pages: { almanac: { label: 'Almanac', component: Added } } } })
    press('Almanac')
    expect(added.sort()).toEqual(['almanac', 'garden'])
  })

  it('add to the notice strip, and a layout of your own places them with Plugins', () => {
    let seen: string[] = []
    function Seen() {
      seen = usePluginUis().map((ui) => ui.id)
      return null
    }
    play({
      layout: () => (
        <Page>
          <Story>
            <NoticeStrip />
            <SceneStage />
            <Plugins at="story" />
            <Clock />
            <Seen />
          </Story>
        </Page>
      ),
    })
    expect(within(document.querySelector('[data-part="notice-strip"]') as HTMLElement).getByRole('button', { name: 'Bees' })).toBeTruthy()
    expect(document.querySelector('[data-shed]')).not.toBeNull()
    expect(document.querySelector('[data-flowers]')).toBeNull()
    expect(seen).toEqual(['garden', 'weather'])
  })
})
