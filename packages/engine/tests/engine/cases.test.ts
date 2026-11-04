import { describe, expect, it } from 'vitest'
import { apply } from '../../src/reduce.ts'
import { view } from '../../src/view.ts'
import { loadGame, type Content } from '../../src/loader.ts'
import { startingState } from '../../src/intake.ts'
import { translatableFields } from '../../src/words.ts'
import { walkFlow } from '../../src/features/flows.ts'
import { cases, choice, decide, point, say, text, when } from '../../src/flow.ts'
import type { Command, GameState } from '../../src/types.ts'
import type { SceneBeat } from '../../src/sceneBody.ts'
import type { DataScene } from '../../src/scene.ts'

/** The kitchen in the morning: what's on the table depends on who got up first. */
const kitchen: DataScene = {
  id: 'flat.kitchen',
  body: [
    text(`You come into the kitchen.`),
    cases([
      text(`Sam has made pancakes.`, { when: { kv: 'samUp' } }),
      when({ kv: 'avaUp' }, [
        say('ava', 'Toast?'),
        decide('toast', [choice('yes', 'Yes please', { then: [text(`She butters a slice.`)] }), choice('no', 'No thanks')]),
      ]),
      text(`The kitchen is empty.`),
    ]),
    cases([text(`It is raining.`)], { when: { kv: 'rain' } }),
    text(`The kettle clicks off.`),
  ],
  choices: [{ id: 'leave', label: 'Leave', effects: [{ scene: null }] }],
}

const flat: Content = {
  name: 'flat',
  kinds: [{ id: 'character', label: 'Character', unique: true }],
  entities: [{ id: 'ava', of: 'character', name: 'Ava' }],
  scenes: [kitchen],
}

const load = () => loadGame([flat], { id: 'flat', title: 'Flat' })

const read = (beats: readonly SceneBeat[]) =>
  beats.map((beat) => (beat.type === 'chose' ? `> ${beat.label}` : beat.type === 'say' || beat.type === 'text' ? beat.text : beat.type))

function play(state: GameState, game: ReturnType<typeof load>['game'], ...commands: Command[]): GameState {
  return commands.reduce((at, command) => {
    const result = apply(at, game, command)
    if (!result.ok) throw new Error(`${command.type}: ${result.reason}`)
    return result.state
  }, state)
}

const enter = (kv: Record<string, boolean>) => {
  const { game } = load()
  return { game, state: play(startingState(game, { kv }), game, { type: 'scene', id: 'flat.kitchen' }) }
}

describe('cases', () => {
  it('shows only the first block that fits', () => {
    const { game, state } = enter({ samUp: true, avaUp: true })
    expect(read(view(state, game).scene.beats)).toEqual(['You come into the kitchen.', 'Sam has made pancakes.', 'The kettle clicks off.'])
  })

  it('falls to the last block, with no when, when nothing before it fits', () => {
    const { game, state } = enter({})
    expect(read(view(state, game).scene.beats)).toEqual(['You come into the kitchen.', 'The kitchen is empty.', 'The kettle clicks off.'])
  })

  it('leaves the whole thing out while its own when fails, and shows it once it holds', () => {
    expect(read(view(enter({}).state, enter({}).game).scene.beats)).not.toContain('It is raining.')
    const { game, state } = enter({ rain: true })
    expect(read(view(state, game).scene.beats)).toContain('It is raining.')
  })

  it('waits at a decision in the block it picked, and carries on after the cases once it is made', () => {
    const { game, state } = enter({ avaUp: true })
    expect(read(view(state, game).scene.beats)).toEqual(['You come into the kitchen.', 'Toast?'])
    expect(view(state, game).scene.choices.map((entry) => entry.id)).toEqual(['yes', 'no'])
    const after = play(state, game, { type: 'choose', id: 'yes' })
    expect(read(view(after, game).scene.beats)).toEqual([
      'You come into the kitchen.',
      'Toast?',
      '> Yes please',
      'She butters a slice.',
      'The kettle clicks off.',
    ])
  })

  it('keeps each block at its own address, so a pool picked in one keeps to it', () => {
    const addresses = (kv: Record<string, boolean>) => {
      const seen: string[] = []
      walkFlow(kitchen, [], (condition) => condition === undefined || Boolean(kv[(condition as { kv: string }).kv]), {
        content: ({ address }) => seen.push(address),
      })
      return seen
    }
    expect(addresses({ samUp: true })).toEqual(['0', '1.0', '3'])
    expect(addresses({})).toEqual(['0', '1.2', '3'])
    expect(addresses({ avaUp: true })).toEqual(['0', '1.1.0'])
  })

  it('names the words in each block for a translation', () => {
    const { game } = load()
    const keys = translatableFields(game).map((field) => field.text)
    expect(keys).toContain('Sam has made pancakes.')
    expect(keys).toContain('Yes please')
    expect(keys).toContain('It is raining.')
  })

  it('are checked: empty, a block after the otherwise, and a point inside', () => {
    const broken: DataScene = {
      id: 'broken',
      body: [cases([]), cases([text(`Always.`), text(`Never.`, { when: { kv: 'x' } })]), cases([when({ kv: 'x' }, [point('mid')]), text(`Else.`)])],
      choices: [],
    }
    const { problems } = loadGame([{ name: 'broken', scenes: [broken] }], { id: 'broken', title: 'Broken' })
    expect(problems.map((problem) => problem.what)).toEqual([
      'block 0: cases lists no blocks, so it shows nothing',
      'block 1: case 1 has no when, so the cases after it are never shown',
      'block 2.0.0: point "mid" is in cases, where it may not be shown; put it outside the cases',
    ])
  })

  it('pass the checker when written well', () => {
    expect(load().problems).toEqual([])
  })

  it('writes the block with cases()', () => {
    expect(cases([text('a')], { when: { kv: 'x' } })).toEqual({ cases: [{ text: 'a' }], when: { kv: 'x' } })
  })
})
