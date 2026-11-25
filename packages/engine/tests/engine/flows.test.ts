import { describe, expect, it } from 'vitest'
import { apply } from '../../src/reduce.ts'
import { view } from '../../src/view.ts'
import { loadGame, type Content } from '../../src/loader.ts'
import { loadState, startingState } from '../../src/intake.ts'
import { createRunner, replay } from '../../src/runner.ts'
import { describeProblem } from '../../src/check.ts'
import { choice, decide, fold, jump, minigame, panel, point, say, text, when } from '../../src/flow.ts'
import type { Command, GameState } from '../../src/types.ts'
import type { SceneBeat } from '../../src/sceneBody.ts'
import type { DataScene } from '../../src/scene.ts'
import { OLD_SAVES } from '../fixtures/old-saves.ts'

/**
 * Ava at the counter, a flowing scene: she greets you, you ask about the
 * beans or the cake as often as you like (each once), a stamp card game,
 * a panel to look at the menu, then you leave.
 */
const counter: DataScene = {
  id: 'cafe.counter',
  speaker: 'ava',
  body: [
    text(`
      Ava looks up from the till.

      @ava: "Morning! What can I get you?"
    `),
    decide('order', [
      choice('tea', 'A pot of tea', { then: [say('ava', 'Good choice.')], effects: [{ kv: 'tea', to: true }] }),
      choice('coffee', 'A coffee', { then: [text(`She grinds the beans.`)] }),
    ]),
    text(`She sets your cup on the counter.`),
    point('questions'),
    decide('ask', [
      choice('beans', 'Ask about the beans', {
        blocked: [{ when: { chose: 'cafe.counter#beans' }, reason: 'Asked.', hide: true }],
        then: [say('ava', 'From a farm up the valley.')],
        effects: [jump('questions')],
      }),
      choice('cake', 'Ask about the cake', {
        blocked: [{ when: { chose: 'cafe.counter#cake' }, reason: 'Asked.', hide: true }],
        then: [when({ kv: 'tea' }, [say('ava', 'It goes with tea.')]), say('ava', 'Lemon, today.')],
        effects: [jump('questions')],
      }),
      choice('done', 'Thank her'),
    ]),
    fold('The menu', [text(`Tea 2, coffee 3, cake 4.`)]),
    text(`You sit by the window.`),
  ],
  choices: [{ id: 'leave', label: 'Leave', effects: [{ scene: null }] }],
}

/** A stall with a game of hoops and the price list, each played where it stands. */
const stall: DataScene = {
  id: 'market.stall',
  body: [text(`The hoop stall.`), minigame('hoops'), text(`You put the hoops back.`), panel('prices', { stall: 'hoops' }), text(`Done.`)],
  choices: [{ id: 'leave', label: 'Leave', effects: [{ scene: null }] }],
}

const cafe: Content = {
  name: 'cafe',
  kinds: [{ id: 'character', label: 'Character', unique: true }],
  entities: [{ id: 'ava', of: 'character', name: 'Ava' }],
  scenes: [counter, stall],
  minigames: [{ id: 'hoops', start: 'throw', states: { throw: { on: [{ input: 'throw', go: 'done' }] }, done: { final: {} } } }],
}

const load = () => loadGame([cafe], { id: 'cafe', title: 'Café' })

/** What the beats read as, one line each: `> label` for a past pick. */
const read = (beats: readonly SceneBeat[]) =>
  beats.map((beat) => (beat.type === 'chose' ? `> ${beat.label}` : beat.type === 'say' || beat.type === 'text' ? beat.text : beat.type))

const choose = (id: string): Command => ({ type: 'choose', id })

function play(state: GameState, game: ReturnType<typeof load>['game'], ...commands: Command[]): GameState {
  return commands.reduce((at, command) => {
    const result = apply(at, game, command)
    if (!result.ok) throw new Error(`${command.type} ${'id' in command ? command.id : ''}: ${result.reason}`)
    return result.state
  }, state)
}

describe('flowing scenes', () => {
  it('stop at a decision, then carry on with the pick’s then and the blocks after it', () => {
    const { game, problems } = load()
    expect(problems.map(describeProblem)).toEqual([])
    const at = play(startingState(game), game, { type: 'scene', id: 'cafe.counter' })
    const first = view(at, game).scene
    expect(read(first.beats)).toEqual(['Ava looks up from the till.', 'Morning! What can I get you?'])
    expect(first.choices.map((entry) => entry.label)).toEqual(['A pot of tea', 'A coffee'])
    expect(first.fresh).toBe(0)

    const tea = play(at, game, choose('tea'))
    const second = view(tea, game).scene
    expect(read(second.beats)).toEqual([
      'Ava looks up from the till.',
      'Morning! What can I get you?',
      '> A pot of tea',
      'Good choice.',
      'She sets your cup on the counter.',
    ])
    // The pick's own beat on is what the command brought.
    expect(second.fresh).toBe(2)
    expect(second.beats[3]).toMatchObject({ type: 'say', who: 'character', speaker: 'character:ava' })
    expect(second.choices.map((entry) => entry.id)).toEqual(['beans', 'cake', 'done'])
    expect(tea.flow).toEqual({ scene: 'cafe.counter', path: [{ chose: 'tea' }], waiting: null })
    expect(tea.chosen['cafe.counter#tea']?.n).toBe(1)
  })

  it('loop back to a point only through a pick, each question hidden once asked, until one moves on', () => {
    const { game } = load()
    const at = play(startingState(game), game, { type: 'scene', id: 'cafe.counter' }, choose('tea'), choose('beans'))
    const asked = view(at, game).scene
    expect(read(asked.beats).slice(4)).toEqual(['She sets your cup on the counter.', '> Ask about the beans', 'From a farm up the valley.'])
    expect(asked.choices.map((entry) => entry.id)).toEqual(['cake', 'done'])
    const cake = play(at, game, choose('cake'))
    expect(read(view(cake, game).scene.beats).slice(-3)).toEqual(['> Ask about the cake', 'It goes with tea.', 'Lemon, today.'])
    expect(view(cake, game).scene.choices.map((entry) => entry.id)).toEqual(['done'])
    expect(cake.flow?.path).toEqual([{ chose: 'tea' }, { chose: 'beans' }, { point: 'questions' }, { chose: 'cake' }, { point: 'questions' }])

    const done = play(cake, game, choose('done'))
    const last = view(done, game).scene
    expect(read(last.beats).slice(-3)).toEqual(['> Thank her', 'Tea 2, coffee 3, cake 4.', 'You sit by the window.'])
    // The fold's words carry its hint on each of its beats, for a UI to draw as one.
    expect(last.beats.at(-2)).toMatchObject({ section: { fold: 'The menu' } })
    expect(last.beats.at(-1)).not.toHaveProperty('section')
    // The flow is done: the ending choices.
    expect(last.choices.map((entry) => entry.id)).toEqual(['leave'])
    expect(play(done, game, choose('leave')).flow).toBeNull()
  })

  it('jump to a point in a section or in a choice’s then, and read on from there to the end of the scene', () => {
    // A walk home: the bridge is a point inside a section, and the bench one inside a pick's then.
    const walk: DataScene = {
      id: 'walk.home',
      body: [
        text(`You leave the café.`),
        decide('way', [
          choice('river', 'By the river', {
            then: [text(`The river is high.`), point('bench'), text(`You sit on the bench.`), decide('rest', [choice('up', 'Get up')])],
          }),
          choice('road', 'By the road', { then: [text(`Cars hiss past.`)], effects: [jump('bridge')] }),
          choice('rest', 'Rest first', { then: [text(`You need a sit.`)], effects: [jump('bench')] }),
        ]),
        text(`Not seen on the road.`),
        fold('The bridge', [text(`Not seen either.`), point('bridge'), text(`The bridge creaks.`)]),
        text(`You are home.`),
      ],
      choices: [{ id: 'in', label: 'Go in', effects: [{ scene: null }] }],
    }
    const { game, problems } = loadGame([{ ...cafe, scenes: [walk] }], { id: 'cafe', title: 'Café' })
    expect(problems.map(describeProblem)).toEqual([])
    const start = play(startingState(game), game, { type: 'scene', id: 'walk.home' })

    // Into a section: what comes before the point is skipped, the rest of the section is read with its hint, then what follows it.
    const road = play(start, game, choose('road'))
    const shown = view(road, game).scene
    expect(read(shown.beats)).toEqual(['You leave the café.', '> By the road', 'Cars hiss past.', 'The bridge creaks.', 'You are home.'])
    expect(shown.beats[3]).toMatchObject({ section: { fold: 'The bridge' } })
    expect(shown.choices.map((entry) => entry.id)).toEqual(['in'])
    expect(road.flow?.path).toEqual([{ chose: 'road' }, { point: 'bridge' }])

    // Into another pick's then: on to the decision there, then after the decision that holds it.
    const rest = play(start, game, choose('rest'))
    expect(read(view(rest, game).scene.beats)).toEqual(['You leave the café.', '> Rest first', 'You need a sit.', 'You sit on the bench.'])
    expect(view(rest, game).scene.choices.map((entry) => entry.id)).toEqual(['up'])
    const up = play(rest, game, choose('up'))
    expect(read(view(up, game).scene.beats).slice(-5)).toEqual(['> Get up', 'Not seen on the road.', 'Not seen either.', 'The bridge creaks.', 'You are home.'])
    expect(view(up, game).scene.choices.map((entry) => entry.id)).toEqual(['in'])
  })

  it('refuse a choice of a decision that is past, and an ending choice before the flow is done', () => {
    const { game } = load()
    const at = play(startingState(game), game, { type: 'scene', id: 'cafe.counter' })
    expect(apply(at, game, choose('leave'))).toMatchObject({ ok: false, reason: 'That is not on offer.' })
    expect(apply(play(at, game, choose('coffee')), game, choose('tea'))).toMatchObject({ ok: false })
  })

  it('start a minigame where the flow stands, wait for it, then open a panel there and wait until it closes', () => {
    const { game } = load()
    const at = play(startingState(game), game, { type: 'scene', id: 'market.stall' })
    expect(at.minigame?.id).toBe('hoops')
    expect(at.flow).toEqual({ scene: 'market.stall', path: [], waiting: { minigame: 'hoops' } })
    expect(view(at, game).scene.choices).toEqual([])
    const thrown = play(at, game, { type: 'minigame', input: 'throw' })
    expect(thrown.minigame).toBeNull()
    expect(thrown.panel).toEqual({ panel: 'prices', with: { stall: 'hoops' } })
    expect(thrown.flow).toEqual({ scene: 'market.stall', path: [{ minigame: 'hoops' }], waiting: { panel: 'prices' } })
    expect(read(view(thrown, game).scene.beats)).toEqual(['The hoop stall.', 'You put the hoops back.'])
    expect(view(thrown, game).scene.fresh).toBe(1)
    const closed = play(thrown, game, { type: 'closePanel' })
    expect(read(view(closed, game).scene.beats)).toEqual(['The hoop stall.', 'You put the hoops back.', 'Done.'])
    expect(view(closed, game).scene.choices.map((entry) => entry.id)).toEqual(['leave'])
  })

  it('start afresh each time the scene is entered, the same one included', () => {
    const { game } = load()
    const at = play(startingState(game), game, { type: 'scene', id: 'cafe.counter' }, choose('tea'))
    const again = { ...at, sceneId: null }
    const back = play(again, game, { type: 'scene', id: 'cafe.counter' })
    expect(back.flow).toBeNull()
    expect(view(back, game).scene.choices.map((entry) => entry.id)).toEqual(['tea', 'coffee'])
  })

  it('replay and undo exactly across picks, since every pick is a logged choose', () => {
    const { game } = load()
    const runner = createRunner(game, startingState(game), { history: true })
    for (const command of [{ type: 'scene', id: 'cafe.counter' }, choose('tea'), choose('beans'), choose('cake')] as Command[])
      expect(runner.apply(command).ok).toBe(true)
    const after = runner.state
    expect(replay(game, runner.log())).toEqual({ ok: true, value: after })
    expect(runner.undo()).toBe(true)
    expect(runner.state.flow?.path).toEqual([{ chose: 'tea' }, { chose: 'beans' }, { point: 'questions' }])
    expect(view(runner.state, game).scene.choices.map((entry) => entry.id)).toEqual(['cake', 'done'])
    expect(runner.redo()).toBe(true)
    expect(runner.state).toEqual(after)
  })

  it('keep one backlog entry for a visit, growing with each pick, and closed by the ending choice', () => {
    const { game } = load()
    const runner = createRunner(game, startingState(game), { backlog: true })
    for (const command of [{ type: 'scene', id: 'cafe.counter' }, choose('coffee'), choose('done'), choose('leave')] as Command[])
      expect(runner.apply(command).ok).toBe(true)
    const entries = runner.snapshot().backlog
    expect(entries.map((entry) => [entry.sceneId, entry.chose])).toEqual([['cafe.counter', 'Leave']])
    expect(read(entries[0].beats)).toEqual([
      'Ava looks up from the till.',
      'Morning! What can I get you?',
      '> A coffee',
      'She grinds the beans.',
      'She sets your cup on the counter.',
      '> Thank her',
      'Tea 2, coffee 3, cake 4.',
      'You sit by the window.',
    ])
  })

  it('load an old save with no flow: an open scene starts at the top', () => {
    const { game } = load()
    const old = OLD_SAVES[19]
    const loaded = loadState({ ...old, sceneId: 'cafe.counter' }, game)
    expect(loaded.ok && loaded.value.flow).toBeNull()
    if (loaded.ok) expect(view(loaded.value, game).scene.choices.map((entry) => entry.id)).toEqual(['tea', 'coffee'])
  })
})

describe('the flow checks', () => {
  it('report duplicate ids, a jump to nowhere, a variants block, an unknown minigame, a stuck decision and what can’t be reached', () => {
    const broken: DataScene = {
      id: 'broken',
      body: [
        point('top'),
        point('top'),
        { variants: 'broken.lines' },
        decide('d', [choice('a', 'A', { effects: [jump('nowhere')] }), choice('a', 'Again')]),
        decide('d', [choice('x', 'X', { then: [text('Never.')], effects: [{ scene: null }] }), choice('y', 'Y', { effects: [{ scene: null }] })]),
        decide('stuck', [choice('s', 'S', { blocked: [{ when: { chose: 'broken#s' }, reason: 'Done.', hide: true }] })]),
        minigame('darts'),
      ],
      choices: [{ id: 'end', label: 'End', then: [text('Nope.')] } as DataScene['choices'][number]],
    }
    const { problems } = loadGame([{ name: 'broken', scenes: [broken], variants: { 'broken.lines': ['broken.a'] }, prose: { 'broken.a': 'A line.' } }], {
      id: 'broken',
      title: 'Broken',
    })
    expect(problems.map((problem) => problem.what)).toEqual(
      expect.arrayContaining([
        'two choices share the id "a"',
        'two decisions share the id "d"',
        'two points share the id "top"',
        "block 2: variants aren't drawn in a scene that flows, since a pick would draw again what the player read; use a when",
        'decision d choice a: jumps to point "nowhere", which the scene doesn\'t have',
        'decision d choice x: its then is never shown, because the choice leaves the scene',
        'decision d: every choice leaves or jumps, so what comes after it is never reached',
        'decision stuck: every choice hides once picked, so the flow stops once all are taken; add one that moves on',
        "choice end: an ending choice's then is never shown; put the choice in a decide",
        'unknown minigame "darts"',
      ]),
    )
  })

  it('say where a jump goes when one is written in a choice’s then, where it reads as a second point', () => {
    // jump('ask') and point('ask') are the same object, so in a then it's a point, and the loop never happens.
    const loop: DataScene = {
      id: 'loop',
      body: [point('ask'), decide('d', [choice('again', 'Ask again', { then: [text('Once more.'), jump('ask')] }), choice('done', 'Done')])],
      choices: [],
    }
    const { problems } = loadGame([{ name: 'loop', scenes: [loop] }], { id: 'loop', title: 'Loop' })
    expect(problems.map((problem) => problem.what)).toContain(
      `two points share the id "ask": the one in choice again's then is a point, not a jump. To go back to the point, put jump('ask') in the choice's effects`,
    )
    expect(problems.map((problem) => problem.what)).not.toContain('two points share the id "ask"')
  })

  it('let a decision at the end of a pick’s then jump back, since the other picks carry on', () => {
    const hub: DataScene = {
      id: 'hub',
      body: [
        point('top'),
        decide('ask', [
          choice('a', 'Ask about the flat', {
            then: [
              text('Which part?'),
              decide('inner', [choice('x', 'The rent', { effects: [jump('top')] }), choice('y', 'The garden', { effects: [jump('top')] })]),
            ],
          }),
          choice('b', 'Never mind'),
        ]),
        text('After.'),
      ],
      choices: [],
    }
    const { game, problems } = loadGame([{ name: 'hub', scenes: [hub] }], { id: 'hub', title: 'Hub' })
    expect(problems.map(describeProblem)).toEqual([])
    const open = play(startingState(game), game, { type: 'scene', id: 'hub' })
    const looped = play(open, game, choose('a'), choose('x'))
    expect(view(looped, game).scene.choices.map((entry) => entry.label)).toEqual(['Ask about the flat', 'Never mind'])
    const done = play(looped, game, choose('b'))
    expect(read(view(done, game).scene.beats).at(-1)).toBe('After.')
  })

  it('still report a decision nested in a section whose every choice jumps, with blocks after the section', () => {
    const stuck: DataScene = {
      id: 'stuck',
      body: [point('top'), { blocks: [decide('inner', [choice('x', 'X', { effects: [jump('top')] })])] }, text('Never reached.')],
      choices: [],
    }
    const { problems } = loadGame([{ name: 'stuck', scenes: [stuck] }], { id: 'stuck', title: 'Stuck' })
    expect(problems.map((problem) => problem.what)).toContain('decision inner: every choice leaves or jumps, so what comes after it is never reached')
  })

  it('report a jump anywhere but a choice of the scene that has the point', () => {
    const { problems } = loadGame([{ name: 'odd', actions: [{ id: 'wait', label: 'Wait', effects: [jump('top')] }] }], { id: 'odd', title: 'Odd' })
    expect(problems.map((problem) => problem.what)).toContain(
      'jumps to point "top", but a jump only works as a choice\'s effect in the scene that has that point',
    )
  })
})
