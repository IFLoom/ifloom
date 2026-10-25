// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, screen } from '@testing-library/react'
import { loadGame, memoryDriver, saves, type Runner } from '@ifloom/engine'
import { mountGame } from '../src/index.ts'

const loaded = () =>
  loadGame(
    [
      { name: 'base', introScene: 'mat' },
      {
        name: 'letter',
        scenes: [{ id: 'mat', title: 'The mat', body: [{ prose: 'mat' }], choices: [{ id: 'open', label: 'Open it', effects: [{ scene: null }] }] }],
        prose: { mat: 'A letter on the mat.' },
      },
    ],
    { id: 'letter', title: 'The Letter' },
  )

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

function page(): HTMLElement {
  const root = document.createElement('div')
  root.id = 'root'
  document.body.append(root)
  return root
}

describe('mountGame', () => {
  it('draws the game into #root and returns a runner that plays it', async () => {
    page()
    let runner!: Runner
    await act(async () => {
      runner = await mountGame(loaded())
    })
    expect(screen.getByText('A letter on the mat.')).toBeTruthy()
    await act(async () => void runner.apply({ type: 'choose', id: 'open' }))
    expect(runner.state.sceneId).toBeNull()
  })

  it('warns about the problems the loader found', async () => {
    page()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const broken = loaded()
    await act(async () => void mountGame({ game: broken.game, problems: [{ pack: 'letter', where: 'scene mat', what: 'no prose for "x"' }] }))
    expect(warn).toHaveBeenCalledWith('letter · scene mat · no prose for "x"')
  })

  it('takes its own root and runner options', async () => {
    const root = page()
    root.id = 'elsewhere'
    let runner!: Runner
    const store = saves(loaded().game, memoryDriver())
    await act(async () => {
      runner = await mountGame(loaded(), { root, runner: { saves: store, history: false } })
    })
    expect(runner.saves).toBe(store)
    expect(runner.offers.undo).toBe(false)
  })

  it('says when there is nowhere to draw', async () => {
    await expect(mountGame(loaded())).rejects.toThrow(/#root/)
  })
})
