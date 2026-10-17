// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { SCHEMA, createRunner, loadGame, startingState, type Game, type Runner } from '@ifloom/engine'
import { achievements } from '@ifloom/plugin-achievements'
import { jobs } from '@ifloom/plugin-jobs'
import { shop, type ShopView } from '@ifloom/plugin-shop'
import { applyStatus, statuses } from '@ifloom/plugin-statuses'
import {
  AchievementList,
  DEFAULT_LAYOUT,
  GameProvider,
  GameShell,
  JobBoard,
  ShopCounter,
  StatusList,
  useAchievements,
  useJobs,
  useShop,
  useStatuses,
  type Components,
} from '../src/index.ts'

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

/** A street with a counter, two jobs, three achievements and a coffee that gives a buzz. */
function game(withPlugins = true): Game {
  return loadGame(
    [
      {
        id: 'street',
        schema: SCHEMA,
        stats: [
          { id: 'coins', label: 'Coins', start: 5, max: 999, spendable: true, format: '{n} coins', lacking: 'You need {n} coins.' },
          { id: 'energy', label: 'Energy', start: 50, max: 100, spendable: true },
        ],
        items: [
          { id: 'sandwich', name: 'Sandwich', desc: '' },
          { id: 'flapjack', name: 'Flapjack', desc: '' },
          { id: 'cake', name: 'Cake', desc: '' },
        ],
        activities: [{ id: 'coffee', effects: [applyStatus('buzz')] }, { id: 'sleep', effects: [{ kind: 'turn' }] }],
        data: {
          shop: {
            vendors: [
              {
                id: 'counter',
                name: 'The counter',
                buysBack: 0.5,
                goods: [
                  { item: 'sandwich', price: { coins: 4 } },
                  { item: 'flapjack', price: { coins: 2 }, stock: 1 },
                  { item: 'cake', price: { coins: 10 } },
                ],
              },
            ],
          },
          jobs: {
            jobs: [
              {
                id: 'weekend',
                title: 'Weekend help',
                description: 'Mornings behind the counter.',
                shift: { cost: { energy: 25 } },
                ranks: [
                  { id: 'help', title: 'Help', pay: { coins: 12 } },
                  { id: 'barista', title: 'Barista', pay: { coins: 16 }, requires: { shifts: 2 } },
                ],
              },
              {
                id: 'office',
                title: 'Office junior',
                blocked: [{ when: { not: { kv: 'interview' } }, reason: 'Nobody has interviewed you.' }],
                shift: {},
                ranks: [{ id: 'junior', title: 'Junior', pay: { coins: 20 } }],
              },
            ],
          },
          achievements: {
            achievements: [
              { id: 'rich', title: 'Nest egg', description: 'Have 20 coins.', progress: { value: 'coins', target: 20 } },
              { id: 'river', title: 'Dusk by the river', description: 'Sit by the river.', secret: true, when: { kv: 'river' } },
              { id: 'shopper', title: 'Shopper', description: 'Buy a sandwich.', when: { item: 'sandwich', gte: 1 } },
            ],
          },
          statuses: {
            statuses: [{ id: 'buzz', label: 'Buzzing', summary: 'A coffee’s worth.', turns: 2, modifiers: [{ stat: 'energy', add: 10 }] }],
          },
        },
      },
    ],
    {
      id: 'plugin-ui',
      title: 'High Street',
      plugins: withPlugins ? [statuses(), achievements(), shop(), jobs()] : [],
      actions: [
        { id: 'coffee', label: 'Have a coffee', command: { type: 'activity', id: 'coffee' } },
        { id: 'sleep', label: 'Sleep', command: { type: 'activity', id: 'sleep' } },
      ],
    },
  ).game
}

function play(props: Partial<Parameters<typeof GameShell>[0]> = {}, g = game()): Runner {
  const runner = createRunner(g, startingState(g))
  render(<GameShell runner={runner} {...props} />)
  return runner
}

const part = (name: string) => document.querySelector(`[data-part="${name}"]`)

describe('the shop', () => {
  it('opens the vendor from the sidebar, with prices, stock and greyed-out reasons', () => {
    play()
    act(() => void fireEvent.click(screen.getByRole('button', { name: /Shop at The counter/ })))
    const dialog = screen.getByRole('dialog', { name: 'The counter' })
    const cake = within(dialog.querySelector('[data-good="cake"]') as HTMLElement)
    const buyCake = cake.getByRole('button', { name: /Buy/ }) as HTMLButtonElement
    expect(buyCake.disabled).toBe(true)
    // The reason is written on the button, as on every greyed-out choice.
    expect(buyCake.textContent).toContain('You need 10 coins.')
    expect(buyCake.textContent).toContain('10 coins')
    expect(within(dialog.querySelector('[data-good="flapjack"]') as HTMLElement).getByText('1 left')).toBeTruthy()
  })

  it('buys, then sells back, and the counter follows the state', () => {
    const runner = play()
    act(() => void fireEvent.click(screen.getByRole('button', { name: /Shop at The counter/ })))
    const dialog = screen.getByRole('dialog', { name: 'The counter' })
    const sandwich = () => within(dialog.querySelector('[data-good="sandwich"]') as HTMLElement)
    expect(sandwich().queryByRole('button', { name: /Sell/ })).toBeNull()
    act(() => void fireEvent.click(sandwich().getByRole('button', { name: /Buy/ })))
    expect(runner.state.items.sandwich).toBe(1)
    expect(runner.state.stats.coins).toBe(1)
    expect(sandwich().getByText('You have 1')).toBeTruthy()
    act(() => void fireEvent.click(sandwich().getByRole('button', { name: /Sell for 2 coins/ })))
    expect(runner.state.items.sandwich ?? 0).toBe(0)
    expect(runner.state.stats.coins).toBe(3)
  })

  it('says sold out on the button once the stock is gone', () => {
    const runner = play()
    act(() => void runner.apply({ type: 'custom', name: 'shop/buy', with: { vendor: 'counter', item: 'flapjack' } }))
    act(() => void fireEvent.click(screen.getByRole('button', { name: /Shop at The counter/ })))
    const flapjack = document.querySelector('[data-good="flapjack"]') as HTMLElement
    const button = within(flapjack).getByRole('button', { name: /Buy/ }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(button.textContent).toContain('Sold out.')
  })
})

describe('the job board', () => {
  it('lists every job, with Apply greyed out by its reason', () => {
    play()
    const office = within(document.querySelector('[data-job="office"]') as HTMLElement)
    const apply = office.getByRole('button', { name: /Apply/ }) as HTMLButtonElement
    expect(apply.disabled).toBe(true)
    expect(apply.textContent).toContain('Nobody has interviewed you.')
    expect(office.getByText('Pays 20 coins a shift')).toBeTruthy()
  })

  it('applies, works a shift for its pay, shows the rank and the way up, and quits', () => {
    const runner = play()
    const weekend = () => within(document.querySelector('[data-job="weekend"]') as HTMLElement)
    act(() => void fireEvent.click(weekend().getByRole('button', { name: /Apply/ })))
    expect(document.querySelector('[data-job="weekend"]')!.hasAttribute('data-hired')).toBe(true)
    expect(weekend().getByText('Help')).toBeTruthy()
    expect(weekend().getByText('Next: Barista, after 2 more shifts')).toBeTruthy()
    act(() => void fireEvent.click(weekend().getByRole('button', { name: /Work a shift/ })))
    expect(runner.state.stats.coins).toBe(17)
    expect(runner.state.stats.energy).toBe(25)
    // Once a turn, without a calendar: the button now says why not.
    const work = weekend().getByRole('button', { name: /Work a shift/ }) as HTMLButtonElement
    expect(work.disabled).toBe(true)
    expect(weekend().getByText('Shifts worked: 1')).toBeTruthy()
    act(() => void fireEvent.click(weekend().getByRole('button', { name: 'Quit' })))
    expect(document.querySelector('[data-job="weekend"]')!.hasAttribute('data-hired')).toBe(false)
  })
})

describe('the achievements', () => {
  it('opens from the sidebar with the count, secret ones as ???, and progress bars', () => {
    play()
    const button = screen.getByRole('button', { name: /Achievements/ })
    expect(button.textContent).toContain('0 of 3')
    act(() => void fireEvent.click(button))
    const dialog = screen.getByRole('dialog', { name: 'Achievements' })
    const secret = dialog.querySelector('[data-achievement="river"]') as HTMLElement
    expect(secret.hasAttribute('data-secret')).toBe(true)
    expect(secret.textContent).toContain('???')
    expect(secret.textContent).not.toContain('Dusk')
    const bar = within(dialog.querySelector('[data-achievement="rich"]') as HTMLElement).getByRole('progressbar')
    expect(bar.getAttribute('aria-valuenow')).toBe('5')
    expect(bar.getAttribute('aria-valuemax')).toBe('20')
    expect(dialog.textContent).toContain('5 of 20')
  })

  it('marks one earned when it is', () => {
    const runner = play()
    act(() => void runner.apply({ type: 'custom', name: 'shop/buy', with: { vendor: 'counter', item: 'sandwich' } }))
    expect(screen.getByRole('button', { name: /Achievements/ }).textContent).toContain('1 of 3')
    act(() => void fireEvent.click(screen.getByRole('button', { name: /Achievements/ })))
    const shopper = document.querySelector('[data-achievement="shopper"]') as HTMLElement
    expect(shopper.hasAttribute('data-earned')).toBe(true)
    expect(within(shopper).getByText('Earned')).toBeTruthy()
  })

  it('is a page with pages on, with a button on the title screen, unless turned off', () => {
    play({ pages: true })
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'Achievements' })))
    expect(document.querySelector('[data-page="achievements"]')).not.toBeNull()
    expect(screen.getByText('Nest egg')).toBeTruthy()
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'Back' })))
    expect(document.querySelector('[data-page="title"]')).not.toBeNull()
    cleanup()
    play({ pages: { achievements: false } })
    expect(screen.queryByRole('button', { name: 'Achievements' })).toBeNull()
  })
})

describe('the statuses', () => {
  it('lists what is active, with turns left and what it does to the stats', () => {
    const runner = play()
    expect(part('statuses')).toBeNull()
    act(() => void fireEvent.click(screen.getByRole('button', { name: /Have a coffee/ })))
    const buzz = within(document.querySelector('[data-status="buzz"]') as HTMLElement)
    expect(buzz.getByText('Buzzing')).toBeTruthy()
    expect(buzz.getByText('2 turns left')).toBeTruthy()
    expect(buzz.getByText('+10 Energy')).toBeTruthy()
    act(() => void runner.apply({ type: 'activity', id: 'sleep' }))
    expect(buzz.getByText('1 turn left')).toBeTruthy()
  })
})

describe('the defaults, wired', () => {
  it('draw nothing in a game without their plugins', () => {
    play({}, game(false))
    for (const name of ['vendors', 'jobs', 'achievements-button', 'statuses']) expect(part(name), name).toBeNull()
  })

  it('go when their part is left out of the layout', () => {
    const drop = new Set(['shop', 'jobs', 'achievements'])
    play({ layout: { ...DEFAULT_LAYOUT, sidebar: DEFAULT_LAYOUT.sidebar.filter((name) => !drop.has(name)), stage: DEFAULT_LAYOUT.stage.filter((name) => !drop.has(name)) } })
    for (const name of ['vendors', 'jobs', 'achievements-button']) expect(part(name), name).toBeNull()
  })

  it('are replaced by name in components, which get the built-in one as Default', () => {
    const components: Components = {
      JobBoard: () => <p>Our own board</p>,
      ShopButtons: ({ Default }) => (
        <div data-testid="wrapped">
          <Default />
        </div>
      ),
    }
    play({ components })
    expect(screen.getByText('Our own board')).toBeTruthy()
    expect(part('jobs')).toBeNull()
    expect(within(screen.getByTestId('wrapped')).getByRole('button', { name: /Shop at The counter/ })).toBeTruthy()
  })

  it('take classes, and keep their parts when unstyled', () => {
    play({ classes: { job: 'bg-job' }, unstyled: true })
    const job = part('job') as HTMLElement
    expect(job.className).toBe('bg-job')
    for (const name of ['jobs', 'job-title', 'job-actions', 'vendors', 'vendor-button', 'achievements-button']) expect(part(name), name).not.toBeNull()
  })

  it('say what the game says, through ui. strings', () => {
    const g = game()
    const runner = createRunner({ ...g, strings: { ...g.strings, 'ui.jobs': 'Work', 'ui.shopAt': 'Visit {vendor}' } }, startingState(g))
    render(<GameShell runner={runner} />)
    expect(screen.getByRole('heading', { name: 'Work' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Visit The counter/ })).toBeTruthy()
  })
})

describe('the hooks', () => {
  function wrapper(runner: Runner) {
    return ({ children }: { children: ReactNode }) => <GameProvider runner={runner}>{children}</GameProvider>
  }

  it('give the data and the actions with no markup', () => {
    const g = game()
    const runner = createRunner(g, startingState(g))
    const { result } = renderHook(() => ({ shop: useShop(), jobs: useJobs(), achievements: useAchievements(), statuses: useStatuses() }), { wrapper: wrapper(runner) })
    expect(result.current.shop!.here.map((vendor) => vendor.id)).toEqual(['counter'])
    act(() => void result.current.shop!.buy('counter', 'sandwich'))
    expect(runner.state.items.sandwich).toBe(1)
    expect(result.current.shop!.sell('counter', 'cake').ok).toBe(false)
    expect(result.current.jobs!.apply('office')).toMatchObject({ ok: false, reason: 'Nobody has interviewed you.' })
    act(() => void result.current.jobs!.apply('weekend'))
    expect(result.current.jobs!.held.map((job) => job.id)).toEqual(['weekend'])
    expect(result.current.achievements!.earned).toBe(1)
    expect(result.current.statuses!.active).toEqual([])
  })

  it('give null in a game without the plugin', () => {
    const g = game(false)
    const runner = createRunner(g, startingState(g))
    const { result } = renderHook(() => [useShop(), useJobs(), useAchievements(), useStatuses()], { wrapper: wrapper(runner) })
    expect(result.current).toEqual([null, null, null, null])
  })

  it('drive a component of your own', () => {
    function Purse() {
      const shop = useShop()
      return shop ? <button onClick={() => shop.buy('counter', 'flapjack')}>Grab a flapjack</button> : null
    }
    const g = game()
    const runner = createRunner(g, startingState(g))
    render(
      <GameProvider runner={runner}>
        <Purse />
        <ShopCounter vendor={(runner.view().plugins.shop as ShopView).vendors[0]} />
        <JobBoard />
        <AchievementList />
        <StatusList />
      </GameProvider>,
    )
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'Grab a flapjack' })))
    expect(runner.state.items.flapjack).toBe(1)
  })
})

describe('the presets', async () => {
  // Read as text from disk: a stylesheet imported in a test comes back empty. The package has no Node types, hence the loose import.
  const fs = (await import(/* @vite-ignore */ `node:${'fs'}`)) as { readFileSync: (path: string, encoding: string) => string }
  const cwd = (globalThis as unknown as { process: { cwd: () => string } }).process.cwd()
  const read = (name: string) => {
    // Under jsdom the test's URL can be from the project root rather than a file URL.
    const path = ['..', 'src', 'themes', `${name}.css`].join('/')
    const url = new URL(path, import.meta.url)
    return fs.readFileSync(decodeURIComponent(url.protocol === 'file:' ? url.pathname : cwd + url.pathname), 'utf8')
  }
  it.each(['paper', 'storybook', 'studio', 'terminal'])('%s styles each new default', (name) => {
    const css = read(name)
    for (const part of ['achievement', 'good', 'job', 'status']) expect(css, part).toContain(`[data-part="${part}"]`)
  })
})
