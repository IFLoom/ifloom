// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createRunner, loadGame, memoryDriver, profile, startingState } from '@ifloom/engine'
import { GameShell, poweredByIFLoom, type PagesOptions, type SplashCard } from '../src/index.ts'
import { Reading } from './layouts.tsx'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

/** The player's system asking for reduced motion, or not. */
function reducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

function play(pages: boolean | PagesOptions = true, driver = memoryDriver()) {
  const game = loadGame(
    [
      {
        name: 'letter',
        introScene: 'mat',
        scenes: [{ id: 'mat', title: 'The mat', body: [{ prose: 'mat' }], choices: [] }],
        prose: { mat: 'A letter on the mat.' },
      },
    ],
    {
      id: 'letter',
      title: 'The Letter',
    },
  ).game
  const runner = createRunner(game, startingState(game), { profile: profile(game, driver) })
  return render(<GameShell runner={runner} layout={Reading} pages={pages} />)
}

const card = () => document.querySelector('[data-splash-card]')
const page = () => document.querySelector('[data-page]')?.getAttribute('data-page')
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms))

const studio: SplashCard = { id: 'studio', title: 'Harbour Games', text: 'presents', ms: 1000, transition: { in: 'fade', out: 'zoom', ms: 200 } }
const logo: SplashCard = { id: 'logo', title: 'The Letter', ms: 500, transition: 'slide-up' }

describe('splash cards', () => {
  it('show the Powered by IFLoom card first by default, then the title screen', async () => {
    vi.useFakeTimers()
    reducedMotion(false)
    play()
    expect(page()).toBe('splash')
    expect(card()?.getAttribute('data-splash-card')).toBe('ifloom')
    expect(screen.getByText('Powered by')).toBeTruthy()
    expect(screen.getByText('IFLoom')).toBeTruthy()
    // 600 ms in, 3000 ms held, then it goes out over 600 ms.
    await wait(3600)
    expect(card()?.hasAttribute('data-leaving')).toBe(true)
    expect(card()?.getAttribute('data-transition-out')).toBe('fade')
    await wait(600)
    expect(page()).toBe('title')
  })

  it('show none with splash: false, and none without pages', () => {
    play({ splash: false })
    expect(page()).toBe('title')
    cleanup()
    play(false)
    expect(screen.getByText('A letter on the mat.')).toBeTruthy()
    expect(card()).toBeNull()
  })

  it('show the game’s cards in their order, each for its own time and with its own transitions', async () => {
    vi.useFakeTimers()
    reducedMotion(false)
    play({ splash: { cards: [studio, poweredByIFLoom({ ms: 800 }), logo] } })
    expect(card()?.getAttribute('data-splash-card')).toBe('studio')
    expect(card()?.getAttribute('data-transition-in')).toBe('fade')
    expect(screen.getByText('Harbour Games')).toBeTruthy()
    await wait(1200)
    expect(card()?.getAttribute('data-transition-out')).toBe('zoom')
    await wait(200)
    expect(card()?.getAttribute('data-splash-card')).toBe('ifloom')
    // Each step waits for its own timer, which starts when the step before ends.
    await wait(600 + 800)
    await wait(600)
    expect(card()?.getAttribute('data-splash-card')).toBe('logo')
    expect(card()?.getAttribute('data-transition-in')).toBe('slide-up')
    await wait(600 + 500)
    await wait(600)
    expect(page()).toBe('title')
  })

  it('link to ifloom.dev from the IFLoom card, without skipping it', () => {
    reducedMotion(false)
    play()
    const link = screen.getByRole('link', { name: /Visit ifloom\.dev/ })
    expect(link.getAttribute('href')).toBe('https://ifloom.dev/?utm_source=ifloom-game&utm_medium=splash&utm_campaign=powered-by-ifloom&utm_content=letter')
    expect(link.getAttribute('target')).toBe('_blank')
    link.addEventListener('click', (event) => event.preventDefault())
    fireEvent.click(link)
    fireEvent.keyDown(link, { key: 'Enter' })
    expect(card()?.getAttribute('data-splash-card')).toBe('ifloom')
  })

  it('skip a card on a click, Enter or Space, and all of them on Escape or the Skip button', async () => {
    reducedMotion(false)
    play({ splash: { cards: [studio, logo, poweredByIFLoom()] } })
    fireEvent.click(page() ? document.querySelector('[data-page="splash"]')! : document.body)
    expect(card()?.getAttribute('data-splash-card')).toBe('logo')
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(card()?.getAttribute('data-splash-card')).toBe('ifloom')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(page()).toBe('title')
    cleanup()
    play({ splash: { cards: [studio, logo] } })
    fireEvent.keyDown(window, { key: ' ' })
    expect(card()?.getAttribute('data-splash-card')).toBe('logo')
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(page()).toBe('title')
  })

  it('can’t be skipped when skippable is false', async () => {
    vi.useFakeTimers()
    reducedMotion(false)
    play({ splash: { cards: [studio], skippable: false } })
    fireEvent.click(document.querySelector('[data-page="splash"]')!)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(card()?.getAttribute('data-splash-card')).toBe('studio')
    expect(screen.queryByRole('button', { name: 'Skip' })).toBeNull()
    await wait(200 + 1000)
    await wait(200)
    expect(page()).toBe('title')
  })

  it('hold each card for its time without transitions when the player asks for reduced motion', async () => {
    vi.useFakeTimers()
    reducedMotion(true)
    play({ splash: { cards: [studio, logo] } })
    expect(card()?.hasAttribute('data-transition-in')).toBe(false)
    await wait(1000)
    expect(card()?.getAttribute('data-splash-card')).toBe('logo')
    await wait(500)
    expect(page()).toBe('title')
  })

  it('come before the gate', async () => {
    reducedMotion(false)
    play({ splash: { cards: [studio] }, gate: { title: 'Before you play', text: 'A note.', confirm: 'Go on' } })
    expect(page()).toBe('splash')
    await act(async () => fireEvent.keyDown(window, { key: 'Escape' }))
    expect(page()).toBe('gate')
  })
})
