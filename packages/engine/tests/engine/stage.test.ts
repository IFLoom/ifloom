import { describe, expect, it } from 'vitest'
import { definePlugin } from '../../src/plugin.ts'
import { SCHEMA, loadGame, type Pack } from '../../src/loader.ts'
import { startingState } from '../../src/reduce.ts'
import { view } from '../../src/view.ts'
import type { Game } from '../../src/game.ts'

/**
 * A market stall: it fills the screen when no scene is open, offers a button
 * of its own, checks the goods content names, and checks its own content.
 */
const stall = definePlugin<{ open: boolean }>({
  id: 'stall',
  version: 1,
  start: () => ({ open: true }),
  conditions: { sells: (_state, args) => ['bread', 'eggs'].includes(String(args.value)) },
  commands: { haggle: { run: (state) => state } },
  stage: (_state, { slice }) => (slice.open ? { id: 'market', title: 'The market stall', body: [{ text: 'stall.open' }, { variants: 'stall.cries' }] } : undefined),
  buttons: () => [{ id: 'haggle', label: 'Haggle', command: { type: 'custom', name: 'stall/haggle' } }],
  argProblems: (kind, name, args) =>
    kind === 'conditions' && name === 'sells' && !['bread', 'eggs', 'cheese'].includes(String(args.value)) ? [`nobody sells "${String(args.value)}"`] : [],
  check: (game, { problems }) =>
    problems([{ blocks: [{ text: 'stall.sign' }] }, { command: { type: 'scene', id: 'stall.closing' } }]).map((what) => ({ list: 'stall', id: game.id, what })),
})

const market: Pack = {
  id: 'market',
  schema: SCHEMA,
  prose: { 'stall.open': 'Crates of eggs and a heap of loaves.', 'stall.cries/1': '“Fresh bread!”', 'stall.cries/2': '“Eggs, a dozen!”' },
  variants: { 'stall.cries': ['stall.cries/1', 'stall.cries/2'] },
  activities: [{ id: 'buy', requires: [{ when: { 'stall/sells': 'bread' }, reason: 'Sold out.' }] }, { id: 'ask', requires: [{ when: { 'stall/sells': 'fish' }, reason: 'No.' }] }],
}

function game(rules: Game['rules'] = {}) {
  return loadGame([market], { id: 'market', title: 'Market Day', plugins: [stall], rules, actions: [{ id: 'buy', label: 'Buy bread', command: { type: 'activity', id: 'buy' } }] })
}

describe('a plugin’s stage', () => {
  it('fills the screen while no scene is open, its blocks drawn under its own id', () => {
    const { game: g } = game()
    const shown = view(startingState(g), g)
    expect(shown.scene).toMatchObject({ id: null, title: 'The market stall', frame: 'stage' })
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
    const { game: g } = game({ locks: [{ when: { flag: 'rain' }, deny: ['stall/*'], hide: true, reason: 'Packed up.' }] })
    const raining = { ...startingState(g), flags: { rain: true } }
    expect(view(raining, g).actions.map((action) => action.id)).toEqual(['buy'])
  })
})

describe('checking content that calls a plugin', () => {
  it('asks the plugin about what each call passes, and lends its check the loader’s words', () => {
    const { problems } = game()
    expect(problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
      'activity ask: nobody sells "fish"',
      'stall market: no prose for "stall.sign"',
      'stall market: opens unknown scene "stall.closing"',
    ])
  })
})
