import { describe, expect, it } from 'vitest'
import { definePlugin } from '../../src/plugin.ts'
import { loadGame, type Content } from '../../src/loader.ts'
import { startingState } from '../../src/intake.ts'
import { view } from '../../src/view.ts'

/**
 * A market stall: it fills the screen when no scene is open, offers a button
 * of its own, checks the goods content names, and checks its own content.
 */
const stall = definePlugin<{ open: boolean }>({
  id: 'stall',
  version: 1,
  start: () => ({ open: true }),
  conditions: { sells: (_state, args) => ['bread', 'eggs'].includes(String(args.item)) },
  commands: { haggle: { run: (state) => state } },
  scene: (_state, { slice }) =>
    slice.open ? { id: 'market', title: 'The market stall', body: [{ prose: 'stall.open' }, { variants: 'stall.cries' }] } : undefined,
  actions: () => [{ id: 'haggle', label: 'Haggle', command: { type: 'custom', name: 'stall/haggle' } }],
  references: {
    calls: (kind, name, args) =>
      kind === 'conditions' && name === 'sells' && !['bread', 'eggs', 'cheese'].includes(String(args.item))
        ? [{ problem: `nobody sells "${String(args.item)}"` }]
        : [],
  },
  check: (game, { problems }) =>
    problems([{ blocks: [{ prose: 'stall.sign' }] }, { command: { type: 'scene', id: 'stall.closing' } }]).map((what) => ({
      list: 'stall',
      id: game.id,
      what,
    })),
})

const market: Content = {
  name: 'market',
  prose: { 'stall.open': 'Crates of eggs and a heap of loaves.', 'stall.cries/1': '“Fresh bread!”', 'stall.cries/2': '“Eggs, a dozen!”' },
  variants: { 'stall.cries': ['stall.cries/1', 'stall.cries/2'] },
  actions: [
    { id: 'buy', label: 'Buy bread', blocked: [{ when: { not: { 'stall/sells': { item: 'bread' } } }, reason: 'Sold out.' }] },
    { id: 'ask', blocked: [{ when: { not: { 'stall/sells': { item: 'fish' } } }, reason: 'No.' }] },
  ],
}

function game(locks: Content['locks'] = []) {
  return loadGame([{ name: 'base', locks }, market], {
    id: 'market',
    title: 'Market Day',
    plugins: [stall],
  })
}

describe('a plugin’s room scene', () => {
  it('fills the screen while no scene is open, its blocks drawn under its own id', () => {
    const { game: g } = game()
    const shown = view(startingState(g), g)
    expect(shown.scene).toMatchObject({ id: null, title: 'The market stall', key: 'room:market' })
    expect(shown.scene.body).toMatch(/^Crates of eggs and a heap of loaves\.\n\n“(Fresh bread|Eggs, a dozen)!”$/)
  })

  it('leaves the game’s title and an empty page when no plugin answers', () => {
    const { game: g } = game()
    const closed = stall.write(startingState(g), { open: false })
    expect(view(closed, g).scene).toMatchObject({ title: 'Market Day', body: '' })
  })
})

describe('a plugin’s buttons', () => {
  it('come before the game’s own, drawn the same way', () => {
    const { game: g } = game()
    expect(view(startingState(g), g).actions.map((action) => action.id)).toEqual(['haggle', 'buy'])
  })

  it('are left off the screen, like any button, by a lock that hides', () => {
    const { game: g } = game([{ when: { kv: 'rain' }, deny: ['stall/*'], hide: true, reason: 'Packed up.' }])
    const raining = { ...startingState(g), kv: { rain: true } }
    expect(view(raining, g).actions.map((action) => action.id)).toEqual(['buy'])
  })
})

describe('checking content that calls a plugin', () => {
  it('asks the plugin about what each call passes, and lends its check the loader’s words', () => {
    const { problems } = game()
    expect(problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
      'action ask: nobody sells "fish"',
      'stall market: no prose for "stall.sign"',
      'stall market: opens unknown scene "stall.closing"',
    ])
  })
})
