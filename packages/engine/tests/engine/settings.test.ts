import { describe, expect, it } from 'vitest'
import { holds } from '../../src/condition.ts'
import { explain } from '../../src/explain.ts'
import type { Game, SettingDef } from '../../src/game.ts'
import { SCHEMA, type Content } from '../../src/loader.ts'
import { describeProblem } from '../../src/check.ts'
import { apply } from '../../src/reduce.ts'
import { startingState } from '../../src/intake.ts'
import { createRunner, replay } from '../../src/runner.ts'
import { problemsOf } from '../fixtures/checked.ts'
import { settingValue } from '../../src/features/settings.ts'
import { view } from '../../src/view.ts'
import { begin, fixture, loadWhole } from '../fixtures/town.ts'
import { unwrap } from '../fixtures/result.ts'

const SETTINGS: SettingDef[] = [
  { id: 'hints', label: 'Hints', kind: 'toggle', default: true },
  {
    id: 'difficulty',
    label: 'Difficulty',
    kind: 'choice',
    options: [
      { value: 'gentle', label: 'Gentle' },
      { value: 'usual', label: 'Usual' },
      { value: 'hard', label: 'Hard' },
    ],
    default: 'usual',
  },
  { id: 'patience', label: 'Patience', kind: 'range', min: 0, max: 10, step: 2, default: 4 },
  {
    id: 'textSize',
    label: 'Text size',
    kind: 'choice',
    affects: 'ui',
    options: [
      { value: 'small', label: 'Small' },
      { value: 'large', label: 'Large' },
    ],
    default: 'small',
  },
]

function game(patch: Partial<Game> = {}): Game {
  return { ...fixture(), settings: SETTINGS, ...patch }
}

/** A game loaded from a pack with a scene whose choices read settings. */
function loaded(scene?: Content['scenes']) {
  const { scenes: _s, introScene: _in, storylines: _t, actions: _a, stats: _st, actions: _ac, ...base } = fixture()
  const pack: Content = {
    name: 'core',
    settings: SETTINGS,
    prose: { 'bakery#hint': 'Ask about the rye.', 'bakery#leave': 'Leave.' },
    scenes: scene ?? [
      {
        id: 'bakery',
        body: [],
        choices: [
          { id: 'hint', label: 'bakery#hint', when: { setting: 'hints' }, effects: [] },
          { id: 'leave', label: 'bakery#leave', when: { setting: 'difficulty', is: 'hard' }, effects: [{ kind: 'scene', scene: null }] },
        ],
      },
    ],
  }
  return loadWhole([pack], base)
}

describe('settings at the start', () => {
  it('take their defaults, and only play settings enter the state', () => {
    expect(startingState(game()).settings).toEqual({ hints: true, difficulty: 'usual', patience: 4 })
  })

  it('take the values given, and ignore unknown ids, ui settings and values that do not fit', () => {
    const state = startingState(game(), {
      settings: { hints: false, difficulty: 'hard', patience: 5, textSize: 'large', volume: 3 },
    })
    expect(state.settings).toEqual({ hints: false, difficulty: 'hard', patience: 4 })
    expect(startingState(game(), { settings: { difficulty: 'impossible', hints: 'yes' } }).settings).toMatchObject({
      hints: true,
      difficulty: 'usual',
    })
  })

  it('is an empty record in a game with none', () => {
    expect(startingState(fixture()).settings).toEqual({})
  })
})

describe('the setting command', () => {
  it('sets a play setting', () => {
    const g = game()
    const result = apply(startingState(g), g, { type: 'setting', id: 'difficulty', to: 'hard' })
    expect(result.ok).toBe(true)
    expect(result.state.settings.difficulty).toBe('hard')
  })

  it('is refused for an unknown id, a ui setting, or a value that does not fit', () => {
    const g = game()
    const start = startingState(g)
    const refused = (id: string, value: boolean | number | string) => apply(start, g, { type: 'setting', id, to: value }).reason
    expect(refused('volume', 3)).toBe('There is no such setting.')
    expect(refused('textSize', 'large')).toBe('That setting does not change the game.')
    expect(refused('hints', 'yes')).toBe('Choose on or off.')
    expect(refused('difficulty', 'impossible')).toBe('That is not one of the options.')
    expect(refused('patience', 'lots')).toBe('Enter a number.')
    expect(refused('patience', 12)).toBe('Between 0 and 10.')
    expect(refused('patience', 3)).toBe('In steps of 2.')
  })

  it('uses the game’s strings for its refusals', () => {
    const g = game({ strings: { noSuchSetting: 'No.' } })
    expect(apply(startingState(g), g, { type: 'setting', id: 'volume', to: 1 }).reason).toBe('No.')
  })

  it('ignores locks', () => {
    const g = game({ locks: [{ when: { turn: { gte: 0 } }, deny: ['*'], reason: 'Not now.' }] })
    expect(apply(startingState(g), g, { type: 'action', id: 'wait' }).reason).toBe('Not now.')
    expect(apply(startingState(g), g, { type: 'setting', id: 'hints', to: false }).ok).toBe(true)
  })

  it('is logged by the runner and replays exactly', () => {
    const g = game()
    const runner = createRunner(g, begin(g))
    runner.apply({ type: 'setting', id: 'hints', to: false })
    runner.apply({ type: 'action', id: 'read' })
    runner.apply({ type: 'setting', id: 'patience', to: 10 })
    expect(runner.log().commands.map((command) => command.type)).toEqual(['setting', 'action', 'setting'])
    expect(unwrap(replay(g, runner.log()))).toEqual(runner.state)
    expect(unwrap(replay(g, runner.log())).settings).toEqual({ hints: false, difficulty: 'usual', patience: 10 })
  })
})

describe('the setting condition', () => {
  it('reads a play setting bare, with is, or with a range', () => {
    const g = game()
    const state = startingState(g, { settings: { patience: 6 } })
    expect(holds(state, { setting: 'hints' }, g)).toBe(true)
    expect(holds(state, { setting: 'difficulty', is: 'usual' }, g)).toBe(true)
    expect(holds(state, { setting: 'difficulty', is: 'hard' }, g)).toBe(false)
    expect(holds(state, { setting: 'patience', gte: 6 }, g)).toBe(true)
    expect(explain(state, { setting: 'difficulty', is: 'hard' }, g).why).toBe('setting difficulty is "usual"; wants = "hard"')
  })

  it('works in a choice’s when', () => {
    const { game: g, problems } = loaded()
    expect(problems).toEqual([])
    const open = { ...startingState(g), sceneId: 'bakery' }
    expect(view(open, g).scene.choices.map((choice) => choice.id)).toEqual(['hint'])
    const changed = apply(open, g, { type: 'setting', id: 'difficulty', to: 'hard' }).state
    const off = apply(changed, g, { type: 'setting', id: 'hints', to: false }).state
    expect(view(off, g).scene.choices.map((choice) => choice.id)).toEqual(['leave'])
  })
})

describe('ui settings', () => {
  it('never enter the state, and show in the view with a null value', () => {
    const g = game()
    const state = startingState(g, { settings: { textSize: 'large' } })
    expect(state.settings).not.toHaveProperty('textSize')
    const shown = view(state, g).settings
    expect(shown.map((setting) => setting.id)).toEqual(['hints', 'difficulty', 'patience', 'textSize'])
    expect(shown.find((setting) => setting.id === 'textSize')).toEqual({
      id: 'textSize',
      label: 'Text size',
      kind: 'choice',
      affects: 'ui',
      options: [
        { value: 'small', label: 'Small' },
        { value: 'large', label: 'Large' },
      ],
      default: 'small',
      value: null,
    })
    expect(shown.find((setting) => setting.id === 'patience')).toEqual({
      id: 'patience',
      label: 'Patience',
      kind: 'range',
      affects: 'play',
      min: 0,
      max: 10,
      step: 2,
      default: 4,
      value: 4,
    })
  })
})

describe('the loader’s settings checks', () => {
  const problemsOf = (pack: Partial<Content>, base: Partial<Game> = {}) => {
    const { scenes: _s, introScene: _in, storylines: _t, actions: _a, stats: _st, actions: _ac, ...rest } = fixture()
    return loadWhole([{ name: 'core', ...pack }], { ...rest, ...base }).problems.map(describeProblem)
  }

  it('finds two settings with one id in one list, but lets a later pack redeclare one', () => {
    const toggle: SettingDef = { id: 'hints', label: 'Hints', kind: 'toggle', default: true }
    expect(problemsOf({ settings: [toggle, toggle] })).toEqual(['core · setting hints · two settings share this id'])
    const { scenes: _s, introScene: _in, storylines: _t, actions: _a, stats: _st, actions: _ac, ...rest } = fixture()
    const twice = loadWhole([{ name: 'core', settings: [toggle] }], rest, {
      packs: [{ id: 'mod:hints', schema: SCHEMA, settings: [{ ...toggle, default: false }] }],
    })
    expect(twice.problems).toEqual([])
    expect(twice.game.settings).toEqual([{ ...toggle, default: false }])
  })

  it('finds a default that does not fit, a choice with no options, and min above max', () => {
    expect(
      problemsOf({
        settings: [
          { id: 'hints', label: 'Hints', kind: 'toggle', default: 'yes' as never },
          { id: 'mood', label: 'Mood', kind: 'choice', options: [{ value: 'calm', label: 'Calm' }], default: 'wild' },
          { id: 'empty', label: 'Empty', kind: 'choice', options: [], default: 'x' },
          { id: 'speed', label: 'Speed', kind: 'range', min: 0, max: 5, default: 9 },
          { id: 'odd', label: 'Odd', kind: 'range', min: 0, max: 10, step: 4, default: 5 },
          { id: 'upside', label: 'Upside', kind: 'range', min: 5, max: 1, default: 3 },
        ],
      }),
    ).toEqual([
      'core · setting hints · default "yes" is not true or false',
      'core · setting mood · default "wild" is not one of the options',
      'core · setting empty · a choice with no options',
      'core · setting speed · default 9 is not between 0 and 5',
      'core · setting odd · default 5 is not in steps of 4',
      'core · setting upside · min is above max',
    ])
  })

  it('finds a setting condition naming an unknown setting, a ui setting, or a value it cannot have', () => {
    const { problems } = loaded([
      {
        id: 'bakery',
        body: [{ text: 'bakery#hint', when: { setting: 'volume' } }],
        choices: [
          { id: 'hint', label: 'bakery#hint', when: { setting: 'textSize', is: 'large' }, effects: [] },
          { id: 'leave', label: 'bakery#leave', when: { setting: 'difficulty', is: 'impossible' }, effects: [] },
        ],
      },
    ])
    expect(problems.map(describeProblem)).toEqual([
      'core · scene bakery · unknown setting "volume"',
      'core · scene bakery · setting "textSize" is a ui setting; conditions read only play settings',
      'core · scene bakery · "impossible" for setting "difficulty" is not one of the options',
    ])
  })

  it('checks the game’s finished condition', () => {
    expect(problemsOf({ settings: SETTINGS }, { finished: { setting: 'textSize' } })).toEqual([
      'base · finished · setting "textSize" is a ui setting; conditions read only play settings',
    ])
  })
})

describe('settings checks in a hand-built game', () => {
  it('are the loader’s', () => {
    const g = game({
      introScene: undefined,
      settings: [
        ...SETTINGS,
        { id: 'hints', label: 'Hints again', kind: 'toggle', default: false },
        { id: 'upside', label: 'Upside', kind: 'range', min: 5, max: 1, default: 3 },
      ],
      finished: { any: [{ setting: 'volume' }, { setting: 'textSize' }, { setting: 'patience', is: 3 }] },
      carryOver: { stats: ['charm'], held: ['umbrella', 'thing:umbrella'] },
    })
    expect(problemsOf(g)).toEqual([
      'setting hints: two settings share this id',
      'setting upside: min is above max',
      'finished: unknown setting "volume"',
      'finished: setting "textSize" is a ui setting; conditions read only play settings',
      'finished: 3 for setting "patience" is not in steps of 2',
      'carryOver: unknown stat "charm"',
      'carryOver: unknown entity "umbrella": name one as "kind:id"',
      'carryOver: unknown kind "thing"',
    ])
  })
})

describe('settingValue', () => {
  it('gives the stored value when the setting can take it', () => {
    const stored = { hints: false, difficulty: 'hard', patience: 8, textSize: 'large' }
    expect(settingValue(game(), stored, 'hints')).toBe(false)
    expect(settingValue(game(), stored, 'difficulty')).toBe('hard')
    expect(settingValue(game(), stored, 'patience')).toBe(8)
    expect(settingValue(game(), stored, 'textSize')).toBe('large')
  })

  it('falls back to the default for a missing or unsuitable value', () => {
    expect(settingValue(game(), undefined, 'hints')).toBe(true)
    expect(settingValue(game(), {}, 'difficulty')).toBe('usual')
    expect(settingValue(game(), { hints: 'yes' }, 'hints')).toBe(true)
    expect(settingValue(game(), { difficulty: 'brutal' }, 'difficulty')).toBe('usual')
    expect(settingValue(game(), { patience: 12 }, 'patience')).toBe(4)
    expect(settingValue(game(), { patience: 3 }, 'patience')).toBe(4)
    expect(settingValue(game(), { patience: '6' }, 'patience')).toBe(4)
  })

  it('is undefined for a setting the game does not declare', () => {
    expect(settingValue(game(), { volume: 5 }, 'volume')).toBeUndefined()
  })
})
