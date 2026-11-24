/**
 * The story tutorial (tutorial/story/), step by step. Each step's files are
 * loaded with `loadChecked` and its checkpoint is played with `play`, as the
 * page says the reader should see it. Steps 1 and 2 have their own copy of
 * `story/opening.ts` (`steps/<n>/`), step 1 keeps the template's stat, and
 * steps 3 and 4 are the finished files. Then the finished game's playtest runs
 * as `npm run playtest` runs it, and plays to an ending with nothing refused.
 */
import { describe, expect, it } from 'vitest'
import { checkGame, startingState, statValue, view, type Content, type View } from '@ifloom/engine'
import { loadChecked, play } from '@ifloom/engine/testing'
import { metricsText, playtest } from '@ifloom/cli'
import module from '../tutorial/story/game.ts'
import { stats } from '../tutorial/story/world/stats.ts'
import { opening } from '../tutorial/story/story/opening.ts'
import { opening as opening1 } from '../tutorial/story/steps/1/opening.ts'
import { opening as opening2 } from '../tutorial/story/steps/2/opening.ts'

/** The template's `src/world/stats.ts`, which step 1 keeps. */
const templateStats: Content = { stats: [{ id: 'courage', label: 'Courage', start: 1, max: 5 }] }
const base = { id: 'last-bus', title: 'The Last Bus' }

const choose = (id: string) => ({ type: 'choose', id }) as const
const named = (to: string) => ({ type: 'input', id: 'playerName', to }) as const
const labels = (shown: View) => shown.scene.choices.map((choice) => choice.label)

describe('the story tutorial, step by step', () => {
  it('1: goes from the stop to the bus to home, where the story stops', () => {
    const game = loadChecked([templateStats, opening1], base)
    let state = startingState(game)
    expect(view(state, game).scene.title).toBe('Chapter one: the stop')
    expect(labels(view(state, game))).toEqual(['Hold the umbrella over both of you', 'Keep the umbrella to yourself'])
    state = play(state, game, choose('keep'))
    expect(view(state, game).scene.title).toBe('Chapter two: the bus')
    state = play(state, game, choose('excuse'))
    expect(view(state, game).scene.title).toBe('Chapter three: home')
    expect(labels(view(state, game))).toEqual([])
  })

  it('2: the name shows in a line, and sharing the umbrella raises warmth', () => {
    const game = loadChecked([stats, opening2], base)
    let state = startingState(game)
    let shown = view(state, game)
    expect(shown.statsById.warmth.text).toBe('0')
    expect(shown.inputs.map((input) => input.label)).toEqual(['Your name'])
    expect(shown.scene.body).not.toContain('He nods at you')
    state = play(state, game, named('Sam'))
    shown = view(state, game)
    expect(shown.scene.body).toContain('He nods at you, Sam, as if he knows you from somewhere.')
    expect(shown.inputs[0].value).toBe('Sam')
    state = play(state, game, choose('share'))
    expect(statValue(state, game, 'warmth')).toBe(1)
    expect(view(state, game).inputs).toEqual([])
    state = play(state, game, choose('pay'))
    expect(statValue(state, game, 'warmth')).toBe(2)
  })

  it('3: the bus remembers the umbrella, and two ways home end the story', () => {
    const game = loadChecked([stats, opening], base)
    // Keep the umbrella: the man is wet, and there's no blaming him.
    let state = play(startingState(game), game, choose('keep'))
    let shown = view(state, game)
    expect(shown.scene.body).toContain('wringing out his sleeves')
    expect(labels(shown)).toEqual(['Count out the fare in coins', '"It worked this morning."'])
    state = play(state, game, choose('pay'))
    expect(labels(view(state, game))).toEqual(['Let yourself in'])
    state = play(state, game, choose('door'))
    expect(view(state, game).scene.body).toContain('You sleep well enough.')

    // Share it and pay: the warm ending.
    state = play(startingState(game), game, choose('share'))
    shown = view(state, game)
    expect(shown.scene.body).toContain('drying his glasses')
    expect(labels(shown)).toContain('"He is paying for me."')
    state = play(state, game, choose('pay'))
    shown = view(state, game)
    expect(shown.scene.body).toContain('The driver calls goodnight after you both.')
    expect(labels(shown)).toEqual(['Wave him in for a cup of tea', 'Let yourself in'])
    state = play(state, game, choose('wave'))
    expect(view(state, game).scene.title).toBe('The end')
    expect(labels(view(state, game))).toEqual(['Start again'])
  })

  it('4: has no problems, and reports a misspelt scene', () => {
    expect(module.build({ unlocked: [] }).problems).toEqual([])
    const misspelt: Content = {
      ...opening,
      scenes: opening.scenes!.map((scene) =>
        scene.id === 'ch1.stop' ? { ...scene, choices: [{ id: 'keep', label: 'Keep the umbrella to yourself', effects: [{ scene: 'ch2.buss' }] }] } : scene,
      ),
    }
    expect(() => loadChecked([stats, misspelt], base)).toThrow(/ch2\.buss/)
  })

  it('4: the playtest plays to an ending, refuses nothing, and stops at Start again', () => {
    const { game } = module.build({ unlocked: [] })
    const run = playtest(game, startingState(game), undefined, { turns: 5 })
    expect(run.refusals).toEqual([])
    expect(metricsText(run.turns)).toBe('turn\twarmth\tscenes\trefused\n1\t2\t3\t0')
    expect(run.transcript).toContain('a new game: the playtest stops here')
    expect(checkGame(game)).toMatchObject({ problems: [], warnings: [] })
  })
})
