// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createRunner, loadGame, ownedCount, startingState, type Game, type Runner } from '@ifloom/engine'
import { achievements } from '@ifloom/plugin-achievements'
import { jobs } from '@ifloom/plugin-jobs'
import { shop, type ShopView } from '@ifloom/plugin-shop'
import { statuses } from '@ifloom/plugin-statuses'
import { inventory } from '@ifloom/plugin-inventory'
import { GameProvider, GameShell, PanelHost, RoomActions, Scene, type Components, Game as GamePage, Story } from '@ifloom/react'
import { AchievementList, useAchievements } from '@ifloom/plugin-achievements/react'
import { InventoryCard, useInventory } from '@ifloom/plugin-inventory/react'
import { JobBoard, useJobs } from '@ifloom/plugin-jobs/react'
import { ShopCounter, useShop } from '@ifloom/plugin-shop/react'
import { StatusList, useStatuses } from '@ifloom/plugin-statuses/react'
import { achievementsUi } from '@ifloom/plugin-achievements/react'
import { inventoryUi } from '@ifloom/plugin-inventory/react'
import { jobsUi } from '@ifloom/plugin-jobs/react'
import { shopUi } from '@ifloom/plugin-shop/react'
import { statusesUi } from '@ifloom/plugin-statuses/react'

/** The plugin UIs every game here is drawn with. */
const UIS = [achievementsUi, inventoryUi, jobsUi, shopUi, statusesUi]

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

/** A street with a counter, two jobs on a board and one in the paper, three achievements and a coffee that gives a buzz. */
function game(withPlugins = true): Game {
  return loadGame(
    [
      {
        name: 'street',
        stats: [
          { id: 'coins', label: 'Coins', start: 5, max: 999, spendable: true, format: '{n} coins', lacking: 'You need {n} coins.' },
          { id: 'energy', label: 'Energy', start: 50, max: 100, spendable: true },
        ],
        kinds: [{ id: 'food', label: 'Food', listed: false }],
        entities: [
          {
            id: 'sandwich',
            of: 'food',
            name: 'Sandwich',
            description: 'Cheese and pickle.',
            traits: { ...inventory.usable('Eat the sandwich', [{ stat: 'energy', by: 20 }]) },
          },
          { id: 'flapjack', of: 'food', name: 'Flapjack' },
          { id: 'cake', of: 'food', name: 'Cake' },
          // The counter is the shop's: a vendor only when the game has the plugin.
          ...(withPlugins
            ? [
                shop.vendor({
                  id: 'counter',
                  name: 'The counter',
                  buysBack: 0.5,
                  goods: [
                    { entity: 'food:sandwich', price: { coins: 4 } },
                    { entity: 'food:flapjack', price: { coins: 2 }, stock: 1 },
                    { entity: 'food:cake', price: { coins: 10 } },
                  ],
                }),
              ]
            : []),
        ],
        actions: [
          { id: 'coffee', label: 'Have a coffee', effects: [statuses.apply('buzz')] },
          { id: 'sleep', label: 'Sleep', effects: [{ turn: true }] },
          // The counter and the jobs are buttons only when the game has their plugins.
          { id: 'counter', ...(withPlugins ? { label: 'Go to the counter' } : {}), effects: [shop.open('counter')] },
          { id: 'board', ...(withPlugins ? { label: 'Read the job board' } : {}), effects: [jobs.open()] },
          { id: 'paper', ...(withPlugins ? { label: 'Read the paper' } : {}), effects: [jobs.open(['weekend'])] },
          { id: 'pockets', label: 'Check your pockets', effects: [{ panel: 'pockets', with: { title: 'Your pockets' } }] },
        ],
        data: {
          jobs: {
            jobs: [
              {
                id: 'weekend',
                name: 'Weekend help',
                description: 'Mornings behind the counter.',
                shift: { cost: { energy: 25 } },
                ranks: [
                  { id: 'help', name: 'Help', pay: { coins: 12 } },
                  { id: 'barista', name: 'Barista', pay: { coins: 16 }, requires: { shifts: 2 } },
                ],
              },
              {
                id: 'office',
                name: 'Office junior',
                blocked: [{ when: { not: { kv: 'interview' } }, reason: 'Nobody has interviewed you.' }],
                shift: {},
                ranks: [{ id: 'junior', name: 'Junior', pay: { coins: 20 } }],
              },
            ],
          },
          achievements: {
            achievements: [
              { id: 'rich', name: 'Nest egg', description: 'Have 20 coins.', progress: { value: 'coins', target: 20 } },
              { id: 'river', name: 'Dusk by the river', description: 'Sit by the river.', secret: true, when: { kv: 'river' } },
              { id: 'shopper', name: 'Shopper', description: 'Buy a sandwich.', when: { owned: 'food:sandwich' } },
            ],
          },
          statuses: {
            statuses: [{ id: 'buzz', name: 'Buzzing', description: 'A coffee’s worth.', turns: 2, modifiers: [{ stat: 'energy', add: 10 }] }],
          },
        },
      },
    ],
    {
      id: 'plugin-ui',
      title: 'High Street',
      plugins: withPlugins ? [statuses(), achievements(), shop(), jobs(), inventory()] : [],
    },
  ).game
}

function play(props: Partial<Parameters<typeof GameShell>[0]> = {}, g = game()): Runner {
  const runner = createRunner(g, startingState(g))
  render(<GameShell plugins={UIS} runner={runner} {...props} />)
  return runner
}

const part = (name: string) => document.querySelector(`[data-part="${name}"]`)
const press = (name: RegExp | string) => act(() => void fireEvent.click(screen.getByRole('button', { name })))

describe('the shop', () => {
  it("opens the vendor in a panel from a room's action, with prices, stock and greyed-out reasons", () => {
    play()
    press('Go to the counter')
    const dialog = screen.getByRole('dialog', { name: 'The counter' })
    const cake = within(dialog.querySelector('[data-good="food:cake"]') as HTMLElement)
    const buyCake = cake.getByRole('button', { name: /Buy/ }) as HTMLButtonElement
    expect(buyCake.disabled).toBe(true)
    // The reason is written on the button, as on every greyed-out choice.
    expect(buyCake.textContent).toContain('You need 10 coins.')
    expect(buyCake.textContent).toContain('10 coins')
    expect(within(dialog.querySelector('[data-good="food:flapjack"]') as HTMLElement).getByText('1 left')).toBeTruthy()
  })

  it('has no button of its own: a vendor opens only from content', () => {
    play()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.querySelector('[data-vendor]')).toBeNull()
  })

  it('stays open while the player buys, and closing it sends closePanel', () => {
    const runner = play()
    press('Go to the counter')
    const dialog = screen.getByRole('dialog', { name: 'The counter' })
    const flapjack = () => within(dialog.querySelector('[data-good="food:flapjack"]') as HTMLElement)
    act(() => void fireEvent.click(flapjack().getByRole('button', { name: /Buy/ })))
    act(() => void fireEvent.click(flapjack().getByRole('button', { name: /Sell/ })))
    expect(runner.state.stats.coins).toBe(4)
    expect(screen.getByRole('dialog', { name: 'The counter' })).toBeTruthy()
    press('Close')
    expect(runner.state.panel).toBeNull()
    expect(runner.log().commands.at(-1)).toEqual({ type: 'closePanel' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('buys, then sells back, and the counter follows the state', () => {
    const runner = play()
    press('Go to the counter')
    const dialog = screen.getByRole('dialog', { name: 'The counter' })
    const sandwich = () => within(dialog.querySelector('[data-good="food:sandwich"]') as HTMLElement)
    expect(sandwich().queryByRole('button', { name: /Sell/ })).toBeNull()
    act(() => void fireEvent.click(sandwich().getByRole('button', { name: /Buy/ })))
    expect(ownedCount(runner.state, runner.game, 'food:sandwich')).toBe(1)
    expect(runner.state.stats.coins).toBe(1)
    expect(sandwich().getByText('You have 1')).toBeTruthy()
    act(() => void fireEvent.click(sandwich().getByRole('button', { name: /Sell for 2 coins/ })))
    expect(ownedCount(runner.state, runner.game, 'food:sandwich')).toBe(0)
    expect(runner.state.stats.coins).toBe(3)
  })

  it('says sold out on the button once the stock is gone', () => {
    const runner = play()
    act(() => void runner.apply({ type: 'custom', name: 'shop/buy', with: { vendor: 'counter', entity: 'food:flapjack' } }))
    press('Go to the counter')
    const flapjack = document.querySelector('[data-good="food:flapjack"]') as HTMLElement
    const button = within(flapjack).getByRole('button', { name: /Buy/ }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(button.textContent).toContain('Sold out.')
  })
})

describe('the inventory', () => {
  it('lists what you hold, with the plugin’s use button, and drops one with drop on', () => {
    const g = game()
    const start = startingState(g)
    const runner = createRunner(g, { ...start, stats: { ...start.stats, coins: 20 } })
    act(() => void runner.apply({ type: 'custom', name: 'shop/buy', with: { vendor: 'counter', entity: 'food:sandwich' } }))
    render(
      <GameProvider plugins={UIS} runner={runner}>
        <InventoryCard drop />
      </GameProvider>,
    )
    const sandwich = within(document.querySelector('[data-thing="food:sandwich"]') as HTMLElement)
    expect(sandwich.getByText('Sandwich')).toBeTruthy()
    expect(sandwich.getByText('Cheese and pickle.')).toBeTruthy()
    act(() => void fireEvent.click(sandwich.getByRole('button', { name: /Eat the sandwich/ })))
    expect(runner.state.stats.energy).toBe(70)
    expect(document.querySelector('[data-thing="food:sandwich"]')).toBeNull()
    act(() => void runner.apply({ type: 'custom', name: 'shop/buy', with: { vendor: 'counter', entity: 'food:flapjack' } }))
    act(() => void fireEvent.click(within(document.querySelector('[data-thing="food:flapjack"]') as HTMLElement).getByRole('button', { name: 'Drop' })))
    expect(ownedCount(runner.state, runner.game, 'food:flapjack')).toBe(0)
  })

  it('draws nothing without the plugin: what a game keeps in kv keys is its own scenes’ to show', () => {
    const g = game(false)
    const runner = createRunner(g, { ...startingState(g), kv: { cakes: 2 } })
    render(
      <GameProvider plugins={UIS} runner={runner}>
        <InventoryCard drop />
      </GameProvider>,
    )
    expect(document.querySelector('[data-inventory]')).toBeNull()
    expect(document.querySelector('[data-thing]')).toBeNull()
  })
})

describe('the job board', () => {
  it('lists every job, with Apply greyed out by its reason', () => {
    play()
    press('Read the job board')
    expect(screen.getByRole('dialog', { name: 'Jobs' })).toBeTruthy()
    const office = within(document.querySelector('[data-job="office"]') as HTMLElement)
    const apply = office.getByRole('button', { name: /Apply/ }) as HTMLButtonElement
    expect(apply.disabled).toBe(true)
    expect(apply.textContent).toContain('Nobody has interviewed you.')
    expect(office.getByText('Pays 20 coins a shift')).toBeTruthy()
  })

  it('shows only the jobs the panel was opened with', () => {
    play()
    press('Read the paper')
    const dialog = screen.getByRole('dialog', { name: 'Jobs' })
    expect([...dialog.querySelectorAll('[data-job]')].map((job) => job.getAttribute('data-job'))).toEqual(['weekend'])
    // The dialog's title is the heading: the board's own is left off.
    expect(within(dialog).queryByRole('heading', { level: 3 })).toBeNull()
  })

  it('applies, works a shift for its pay, shows the rank and the way up, and quits', () => {
    const runner = play()
    press('Read the job board')
    const weekend = () => within(document.querySelector('[data-job="weekend"]') as HTMLElement)
    act(() => void fireEvent.click(weekend().getByRole('button', { name: /Apply/ })))
    expect(document.querySelector('[data-job="weekend"]')!.hasAttribute('data-hired')).toBe(true)
    expect(weekend().getByText('Help')).toBeTruthy()
    expect(weekend().getByText('Next: Barista, after 2 more shifts')).toBeTruthy()
    act(() => void fireEvent.click(weekend().getByRole('button', { name: /Work a shift/ })))
    // Without a calendar a shift takes no time, so the board stays open.
    expect(runner.state.panel).toEqual({ panel: 'jobs', with: {} })
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
    act(() => void runner.apply({ type: 'custom', name: 'shop/buy', with: { vendor: 'counter', entity: 'food:sandwich' } }))
    expect(screen.getByRole('button', { name: /Achievements/ }).textContent).toContain('1 of 3')
    act(() => void fireEvent.click(screen.getByRole('button', { name: /Achievements/ })))
    const shopper = document.querySelector('[data-achievement="shopper"]') as HTMLElement
    expect(shopper.hasAttribute('data-earned')).toBe(true)
    expect(within(shopper).getByText('Earned')).toBeTruthy()
  })

  it('is a page with pages on, with a button on the title screen, unless turned off', () => {
    play({ pages: { splash: false } })
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'Achievements' })))
    expect(document.querySelector('[data-page="achievements"]')).not.toBeNull()
    expect(screen.getByText('Nest egg')).toBeTruthy()
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'Back' })))
    expect(document.querySelector('[data-page="title"]')).not.toBeNull()
    cleanup()
    play({ pages: { splash: false }, plugins: [...UIS.filter((ui) => ui !== achievementsUi), { ...achievementsUi, pages: undefined }] })
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
    act(() => void runner.apply({ type: 'action', id: 'sleep' }))
    expect(buzz.getByText('1 turn left')).toBeTruthy()
  })
})

describe('the defaults, wired', () => {
  it('draw nothing in a game without their plugins', () => {
    play({}, game(false))
    for (const name of ['shop', 'jobs', 'achievements-button', 'statuses']) expect(part(name), name).toBeNull()
  })

  it('go when their part is left out of the layout', () => {
    play({
      layout: storyOf(
        <>
          <Scene />
          <RoomActions />
        </>,
      ),
    })
    expect(part('achievements-button')).toBeNull()
    press('Go to the counter')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('are replaced by name in components, which get the built-in one as Default', () => {
    const components: Components = {
      JobBoard: () => <p>Our own board</p>,
      ShopCounter: ({ Default, ...props }) => (
        <div data-testid="wrapped">
          <Default {...props} />
        </div>
      ),
    }
    play({ components })
    press('Read the job board')
    expect(screen.getByText('Our own board')).toBeTruthy()
    expect(part('jobs')).toBeNull()
    press('Close')
    press('Go to the counter')
    expect(within(screen.getByTestId('wrapped')).getByText('Sandwich')).toBeTruthy()
  })

  it('take classes, and keep their parts when unstyled', () => {
    play({ classes: { job: 'bg-job' }, unstyled: true })
    press('Read the job board')
    const job = part('job') as HTMLElement
    expect(job.className).toBe('bg-job')
    for (const name of ['jobs', 'job-title', 'job-actions', 'achievements-button']) expect(part(name), name).not.toBeNull()
  })

  it('say what the game says, through ui. strings', () => {
    const g = game()
    const runner = createRunner({ ...g, strings: { ...g.strings, 'ui.jobs': 'Work', 'ui.buy': 'Take' } }, startingState(g))
    render(<GameShell plugins={UIS} runner={runner} />)
    press('Read the job board')
    expect(screen.getByRole('dialog', { name: 'Work' })).toBeTruthy()
    press('Close')
    press('Go to the counter')
    expect(screen.getAllByRole('button', { name: /Take/ }).length).toBe(3)
  })
})

describe('the panels', () => {
  it("draw the built-in ones by name, and a game's own over them, with what they were opened with", () => {
    const Pockets = ({ data }: { data: unknown }) => <p>Lint and {JSON.stringify(data)}</p>
    const Board = () => <p>The café's own board</p>
    const runner = play({ panels: { pockets: Pockets, jobs: Board } })
    press('Check your pockets')
    expect(screen.getByRole('dialog', { name: 'Your pockets' }).textContent).toContain('Lint and {"title":"Your pockets"}')
    press('Close')
    press('Read the job board')
    expect(screen.getByRole('dialog', { name: 'Jobs' }).textContent).toContain("The café's own board")
    act(() => void runner.apply({ type: 'closePanel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('show nothing for a name nothing draws', () => {
    play()
    press('Check your pockets')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('are drawn by a PanelHost in a layout of your own', () => {
    const g = game()
    const runner = createRunner(g, startingState(g))
    render(
      <GameProvider plugins={UIS} runner={runner}>
        <PanelHost />
      </GameProvider>,
    )
    act(() => void runner.apply({ type: 'action', id: 'counter' }))
    expect(screen.getByRole('dialog', { name: 'The counter' })).toBeTruthy()
  })
})

describe('the hooks', () => {
  function wrapper(runner: Runner) {
    return ({ children }: { children: ReactNode }) => (
      <GameProvider plugins={UIS} runner={runner}>
        {children}
      </GameProvider>
    )
  }

  it('give the data and the actions with no markup', () => {
    const g = game()
    const runner = createRunner(g, startingState(g))
    const { result } = renderHook(() => ({ shop: useShop(), jobs: useJobs(), achievements: useAchievements(), statuses: useStatuses() }), {
      wrapper: wrapper(runner),
    })
    expect(result.current.shop!.here.map((vendor) => vendor.id)).toEqual(['counter'])
    act(() => void result.current.shop!.buy('counter', 'food:sandwich'))
    expect(ownedCount(runner.state, runner.game, 'food:sandwich')).toBe(1)
    expect(result.current.shop!.sell('counter', 'food:cake').ok).toBe(false)
    expect(result.current.jobs!.apply('office')).toMatchObject({ ok: false, reason: 'Nobody has interviewed you.' })
    act(() => void result.current.jobs!.apply('weekend'))
    expect(result.current.jobs!.held.map((job) => job.id)).toEqual(['weekend'])
    expect(result.current.achievements!.earned).toBe(1)
    expect(result.current.statuses!.active).toEqual([])
  })

  it('give what you hold and its commands from useInventory', () => {
    const g = game()
    const runner = createRunner(g, startingState(g))
    const { result } = renderHook(() => ({ shop: useShop(), inventory: useInventory() }), { wrapper: wrapper(runner) })
    act(() => void result.current.shop!.buy('counter', 'food:sandwich'))
    expect(result.current.inventory!.things.map((thing) => [thing.ref, thing.use?.label])).toEqual([['food:sandwich', 'Eat the sandwich']])
    expect(result.current.inventory!.use('food:cake').ok).toBe(false)
    act(() => void result.current.inventory!.use('food:sandwich'))
    expect(result.current.inventory!.things).toEqual([])
  })

  it('give null in a game without the plugin', () => {
    const g = game(false)
    const runner = createRunner(g, startingState(g))
    const { result } = renderHook(() => [useShop(), useJobs(), useAchievements(), useStatuses(), useInventory()], { wrapper: wrapper(runner) })
    expect(result.current).toEqual([null, null, null, null, null])
  })

  it('drive a component of your own', () => {
    function Purse() {
      const shop = useShop()
      return shop ? <button onClick={() => shop.buy('counter', 'food:flapjack')}>Grab a flapjack</button> : null
    }
    const g = game()
    const runner = createRunner(g, startingState(g))
    render(
      <GameProvider plugins={UIS} runner={runner}>
        <Purse />
        <ShopCounter vendor={(runner.view().plugins.shop as ShopView).vendors[0]} />
        <JobBoard />
        <AchievementList />
        <StatusList />
      </GameProvider>,
    )
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'Grab a flapjack' })))
    expect(ownedCount(runner.state, runner.game, 'food:flapjack')).toBe(1)
  })
})
