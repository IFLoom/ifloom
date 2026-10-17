// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { SCHEMA, createRunner, loadGame, memoryDriver, profile, startingState, type Game, type Profile } from '@ifloom/engine'
import { at, places } from '@ifloom/plugin-places'
import { quests } from '@ifloom/plugin-quests'
import {
  DefaultLayout,
  Game as Page,
  GameShell,
  Overlay,
  RoomActions,
  SceneStage,
  Section,
  Sidebar,
  StatList,
  Story,
  Title,
  When,
  useHolds,
  type Components,
} from '../src/index.ts'
import { storyOf } from './layouts.tsx'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

/** A house and a street, a stat, a quest, and a scene that opens a panel by name. */
function town(): Game {
  const { game, problems } = loadGame(
    [
      {
        id: 'town',
        schema: SCHEMA,
        stats: [{ id: 'coins', label: 'Coins', start: 3 }],
        activities: [{ id: 'wait', effects: [{ kind: 'stat', stat: 'coins', by: 1 }] }, { id: 'look', effects: [{ kind: 'panel', panel: 'stats' }] }],
        prose: { 'place.house': 'Quiet.', 'place.street': 'Busy.' },
        data: {
          places: {
            locations: [
              { id: 'house', name: 'House', tag: 'Home', exits: ['street'], art: '', body: [{ text: 'place.house' }] },
              { id: 'street', name: 'High Street', tag: 'Out', exits: ['house'], art: '', body: [{ text: 'place.street' }] },
            ],
          },
          quests: { quests: [{ id: 'out', title: 'Get out of the house', starts: at('house', 'street'), stages: [{ id: 'go', hint: 'Go out.', done: at('street') }] }] },
        },
      },
    ],
    {
      id: 'regions-test',
      title: 'Small Town',
      plugins: [places({ start: 'house' }), quests()],
      actions: [
        { id: 'wait', label: 'Wait a while', command: { type: 'activity', id: 'wait' } },
        { id: 'look', label: 'Check your pockets', command: { type: 'activity', id: 'look' } },
      ],
    },
  )
  expect(problems).toEqual([])
  return game
}

function play(props: Partial<Parameters<typeof GameShell>[0]> = {}, options: { profile?: Profile } = {}) {
  const g = town()
  const runner = createRunner(g, startingState(g), { profile: options.profile })
  render(<GameShell runner={runner} {...props} />)
  return runner
}

const part = (name: string) => document.querySelector<HTMLElement>(`[data-part="${name}"]`)
const section = (id: string) => document.querySelector<HTMLElement>(`[data-part="section"][data-section="${id}"]`)
const press = (name: RegExp | string) => act(() => void fireEvent.click(screen.getByRole('button', { name })))

/** Make the window narrower than `md`, or as wide. */
function windowWide(wide: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: wide,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

describe('the regions', () => {
  it('draw the page, the side column, the story and the overlay, and the page knows it has a side column', () => {
    play()
    for (const name of ['page', 'sidebar', 'story', 'overlay']) expect(part(name), name).not.toBeNull()
    expect(part('page')!.hasAttribute('data-has-sidebar')).toBe(true)
    expect(part('story')!.tagName).toBe('MAIN')
    expect(within(part('story')!).getByRole('button', { name: 'High Street' })).toBeTruthy()
    expect(within(part('story')!).getByRole('button', { name: /Wait a while/ })).toBeTruthy()
  })

  it('leave data-has-sidebar off with no Sidebar, and find one inside your own components', () => {
    play({ layout: storyOf(<SceneStage />) })
    expect(part('page')!.hasAttribute('data-has-sidebar')).toBe(false)
    cleanup()
    const Wrapped = () => (
      <Sidebar>
        <Title />
      </Sidebar>
    )
    play({
      layout: () => (
        <Page>
          <>
            <Wrapped />
          </>
          <Story>
            <SceneStage />
          </Story>
        </Page>
      ),
    })
    expect(part('page')!.hasAttribute('data-has-sidebar')).toBe(true)
  })

  it('take classes and components like every other part', () => {
    const components: Components = { Story: ({ Default, ...props }) => <div data-wrapped><Default {...props} /></div> }
    play({ components, classes: { story: 'our-story', section: 'our-section', page: 'our-page' } })
    expect(part('story')!.className).toContain('our-story')
    expect(part('story')!.parentElement!.hasAttribute('data-wrapped')).toBe(true)
    expect(part('page')!.className).toContain('our-page')
    expect(section('stats')!.className).toContain('our-section')
  })
})

describe('sections', () => {
  it('fold, and the player’s choice is remembered in the profile', async () => {
    const stored = profile({ id: 'regions-test' }, memoryDriver())
    const runner = play({}, { profile: stored })
    const toggle = within(section('stats')!).getByRole('button', { name: 'Stats' })
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(within(section('stats')!).getByText('Coins')).toBeTruthy()
    act(() => void fireEvent.click(toggle))
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(section('stats')!.querySelector('[data-part="section-body"]')!.hasAttribute('hidden')).toBe(true)
    await runner.settled()
    expect(await stored.get('ui:sections')).toEqual({ stats: false })
    cleanup()
    play({}, { profile: stored })
    await act(async () => {
      await stored.get('ui:sections')
    })
    expect(within(section('stats')!).getByRole('button', { name: 'Stats' }).getAttribute('aria-expanded')).toBe('false')
  })

  it('open in a dialog and close again', () => {
    play()
    // The quest starts after the first command.
    press(/Wait a while/)
    const button = within(section('quests')!).getByRole('button', { name: /Quests/ })
    act(() => void fireEvent.click(button))
    const dialog = screen.getByRole('dialog', { name: 'Quests' })
    expect(within(dialog).getByText('Get out of the house')).toBeTruthy()
    act(() => void fireEvent.click(within(dialog).getByRole('button', { name: 'Close' })))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('hide themselves when nothing in them draws anything', () => {
    play()
    // No cast, no inventory, no wardrobe in this town.
    for (const id of ['people', 'inventory', 'wardrobe']) expect(section(id)!.hidden, id).toBe(true)
    for (const id of ['stats', 'quests']) expect(section(id)!.hidden, id).toBe(false)
  })
})

describe('when, as the location changes', () => {
  it('shows a section only in some rooms, and `When` and `useHolds` follow it', () => {
    function Out() {
      return <p data-out={String(useHolds(at('street')))} />
    }
    const g = town()
    const runner = createRunner(g, startingState(g))
    render(
      <GameShell
        runner={runner}
        layout={() => (
          <Page>
            <Sidebar>
              <Section id="home" title="At home" when={at('house')}>
                <StatList />
              </Section>
              <When condition={at('street')}>
                <p>Out and about</p>
              </When>
              <Out />
            </Sidebar>
            <Story>
              <SceneStage />
            </Story>
          </Page>
        )}
      />,
    )
    expect(section('home')).not.toBeNull()
    expect(screen.queryByText('Out and about')).toBeNull()
    act(() => void runner.apply({ type: 'custom', name: 'places/go', with: { id: 'street' } }))
    expect(section('home')).toBeNull()
    expect(screen.getByText('Out and about')).toBeTruthy()
    expect(document.querySelector('[data-out]')!.getAttribute('data-out')).toBe('true')
    act(() => void runner.apply({ type: 'custom', name: 'places/go', with: { id: 'house' } }))
    expect(section('home')).not.toBeNull()
  })
})

describe('the side column on a phone', () => {
  it('is a drawer behind a top bar: it opens, keeps focus in it, closes on Escape and after the player picks something', () => {
    windowWide(false)
    play({
      layout: () => (
        <Page>
          <Sidebar>
            <Title />
            <RoomActions />
          </Sidebar>
          <Story>
            <SceneStage />
          </Story>
          <Overlay />
        </Page>
      ),
    })
    expect(part('top-bar')!.textContent).toContain('Small Town')
    expect(document.querySelector('[data-part="sidebar"]')).toBeNull()
    expect(part('page')!.hasAttribute('data-has-sidebar')).toBe(true)

    press('Open the side panel')
    const drawer = screen.getByRole('dialog', { name: 'Small Town' })
    expect(drawer.getAttribute('data-part')).toBe('drawer')
    expect(within(drawer).getByRole('heading', { level: 1, name: 'Small Town' })).toBeTruthy()
    expect(drawer.contains(document.activeElement)).toBe(true)

    act(() => void fireEvent.keyDown(document.activeElement!, { key: 'Escape' }))
    expect(screen.queryByRole('dialog')).toBeNull()

    press('Open the side panel')
    press(/Wait a while/)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('is the plain column from md up', () => {
    windowWide(true)
    play()
    expect(part('top-bar')).toBeNull()
    expect(part('sidebar')).not.toBeNull()
  })
})

describe('panels by name', () => {
  it('draw a built-in panel content opens, and the game’s own panel of that name instead', () => {
    play()
    press(/Check your pockets/)
    const dialog = screen.getByRole('dialog', { name: 'Stats' })
    expect(within(dialog).getByText('Coins')).toBeTruthy()
    cleanup()
    play({ panels: { stats: () => <p>Our own stats</p> } })
    press(/Check your pockets/)
    expect(within(screen.getByRole('dialog', { name: 'Stats' })).getByText('Our own stats')).toBeTruthy()
  })
})

it('DefaultLayout is what GameShell draws with no layout', () => {
  play({ layout: DefaultLayout })
  const html = () => document.body.innerHTML.replace(/_r_\w+_/g, 'id')
  const one = html()
  cleanup()
  play()
  expect(html()).toBe(one)
})
