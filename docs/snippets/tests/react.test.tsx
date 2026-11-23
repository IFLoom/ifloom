// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createRunner, startingState, type Runner } from '@ifloom/engine'
import { GameProvider, type PluginUi } from '@ifloom/react'
import module from '../react/game.ts'
import { RingingPhone } from '../react/timers.tsx'
import { QuickSandwich } from '../react/use-shop.tsx'
import { inTheCafe, phoneRinging } from './play.ts'

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

/** A new game of Small Town. */
function newRunner(): Runner {
  const { game } = module.build()
  return createRunner(game, startingState(game))
}

/** Draws a snippet's component under the React UI's provider, as a layout would place it. */
function drawn(runner: Runner, children: ReactNode, plugins: PluginUi[] = []) {
  return render(
    <GameProvider runner={runner} plugins={plugins}>
      {children}
    </GameProvider>,
  )
}

describe('the React snippets', () => {
  it('a mount: draws the game into #root with the plugin UIs it lists', async () => {
    const root = document.body.appendChild(document.createElement('div'))
    root.id = 'root'
    await act(async () => {
      await import('../react/mount-shop.tsx')
    })
    expect(root.querySelector('[data-part="story"]')).toBeTruthy()
  })

  it('useShop: a button of your own that buys from the counter where you are', () => {
    const runner = newRunner()
    inTheCafe(runner)
    drawn(runner, <QuickSandwich />)
    const coins = runner.state.stats.coins
    act(() => screen.getByRole('button', { name: 'A sandwich to go' }).click())
    expect(runner.state.stats.coins).toBeLessThan(coins)
  })

  it('useTimer: the ringing phone, gone once it is answered', () => {
    const runner = newRunner()
    phoneRinging(runner)
    drawn(runner, <RingingPhone />)
    expect(screen.queryByText('☎')).toBeTruthy()
    act(() => void runner.apply({ type: 'choose', id: 'answer' }))
    expect(screen.queryByText('☎')).toBeNull()
  })
})
