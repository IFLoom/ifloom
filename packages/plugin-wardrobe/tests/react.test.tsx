// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createRunner, loadGame, startingState, type Game } from '@ifloom/engine'
import { GameProvider, GameShell } from '@ifloom/react'
import { wardrobe, type WardrobeView } from '../src/index.ts'
import { useWardrobe, wardrobeUi } from '../src/react/index.tsx'

afterEach(cleanup)

function game(): Game {
  return loadGame(
    [
      {
        name: 'flat',
        kinds: [{ id: 'clothing', label: 'Clothing', unique: true, listed: false }],
        entities: [
          { id: 'coat', of: 'clothing', name: 'coat', at: 'player', traits: { ...wardrobe.wearable('back') } },
          { id: 'cape', of: 'clothing', name: 'cape', at: 'player', traits: { ...wardrobe.wearable('back') } },
        ],
        data: { wardrobe: { slots: [{ id: 'back', label: 'Back', start: 'clothing:coat' }] } },
      },
    ],
    { id: 'wardrobe-ui', title: 'The Flat', plugins: [wardrobe()] },
  ).game
}

const click = (element: Element) => act(() => void fireEvent.click(element))
const slot = (runner: ReturnType<typeof createRunner>) => (runner.view().plugins.wardrobe as WardrobeView).slots[0].entity

describe('the wardrobe UI', () => {
  it('wears and takes off clothes in the side column', () => {
    const g = game()
    const runner = createRunner(g, startingState(g))
    render(<GameShell runner={runner} plugins={[wardrobeUi]} />)
    const panel = document.querySelector('[data-wardrobe]') as HTMLElement
    expect(within(panel).getByText('coat')).toBeTruthy()
    click(within(panel).getByRole('button', { name: 'Wear cape' }))
    expect(slot(runner)).toBe('clothing:cape')
    click(within(panel).getByRole('button', { name: 'Take off' }))
    expect(slot(runner)).toBeNull()
  })

  it('draws nothing in the layout when the game leaves it out of plugins', () => {
    const g = game()
    render(<GameShell runner={createRunner(g, startingState(g))} />)
    expect(document.querySelector('[data-wardrobe]')).toBeNull()
  })

  it('gives the slots and their buttons from useWardrobe, with no markup', () => {
    const g = game()
    const runner = createRunner(g, startingState(g))
    const { result } = renderHook(() => useWardrobe(), {
      wrapper: ({ children }: { children: ReactNode }) => <GameProvider runner={runner}>{children}</GameProvider>,
    })
    expect(result.current!.slots[0].wear.map((choice) => choice.label)).toEqual(['cape'])
    act(() => void result.current!.wear('clothing:cape'))
    expect(slot(runner)).toBe('clothing:cape')
  })
})
