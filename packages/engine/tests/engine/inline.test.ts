import { describe, expect, it } from 'vitest'
import { SCHEMA, loadGame, type Pack } from '../../src/loader.ts'
import { checkGame, describeProblem } from '../../src/check.ts'
import { apply } from '../../src/reduce.ts'
import { startingState } from '../../src/intake.ts'
import { definePlugin } from '../../src/plugin.ts'
import { createRunner, replay } from '../../src/runner.ts'
import { inlineMarkup } from '../../src/sceneBody.ts'
import { inlineChoices, screen } from '../../src/screen.ts'
import { view } from '../../src/view.ts'
import type { Game } from '../../src/game.ts'
import type { DataScene } from '../../src/scene.ts'
import type { GameState } from '../../src/types.ts'
import { unwrap } from '../fixtures/result.ts'

/** A phone that opens; refused while the battery is flat, and opening it costs a coin. */
const phone = definePlugin<{ open: boolean }>({
  id: 'phone',
  version: 1,
  start: () => ({ open: false }),
  commands: {
    open: {
      whyNot: (state) => (state.kv.flat ? 'The battery is flat.' : undefined),
      run: (_state, _args, { slice, set }) => set({ ...slice, open: true }),
      spends: () => ({ coins: 1 }),
    },
  },
})

const hall: DataScene = {
  id: 'hall',
  body: [{ text: 'hall.ring' }, { text: 'hall.door' }],
  choices: [
    { id: 'answer', command: { type: 'custom', name: 'phone/open' }, effects: [{ kind: 'kv', key: 'answered', to: true }] },
    { id: 'knock', effects: [{ kind: 'stat', stat: 'coins', by: -2 }], blocked: [{ when: { kv: 'shy' }, reason: 'You feel too shy.' }] },
    { id: 'hidden', blocked: [{ when: { not: { kv: 'never' } }, reason: 'No.', hide: true }], effects: [] },
    { id: 'leave', effects: [{ kind: 'scene', scene: null }] },
  ],
}

const prose = {
  'hall.ring': 'Your phone is ringing. [[act:answer|Pick it up]], or let it ring. The [[tip:hall.tip|caller]] waits.',
  'hall.door': 'Somebody is at the door. [[act:knock]] back? [[act:hidden|A secret.]]',
  'hall.tip': 'An old friend, {{friend}}.',
  'hall#answer': 'Answer',
  'hall#knock': 'Knock',
  'hall#hidden': 'Hidden',
  'hall#leave': 'Leave',
}

function make(extra: Partial<Pack> = {}, base: Partial<Game> = {}) {
  const pack: Pack = { id: 'house', schema: SCHEMA, prose, scenes: [hall], stats: [{ id: 'coins', label: 'Coins', start: 5, spendable: true }], ...extra }
  return loadGame([pack], {
    id: 'house',
    title: 'The House',
    introScene: 'hall',
    plugins: [phone],
    ...base,
  })
}

function start(game: Game, kv: GameState['kv'] = {}): GameState {
  const state = startingState(game)
  return { ...state, kv: { ...state.kv, friend: 'Ava', ...kv } }
}

describe('inline markup', () => {
  it('cuts a line at its actions and tooltips, and leaves malformed markup as written', () => {
    expect(inlineMarkup('No markup here.')).toBeNull()
    expect(inlineMarkup('Ring. [[act:answer|Pick up]] or [[act:wait]]. A [[tip:who|caller]].')).toEqual([
      { kind: 'text', text: 'Ring. ' },
      { kind: 'act', id: 'answer', text: 'Pick up', markup: '[[act:answer|Pick up]]' },
      { kind: 'text', text: ' or ' },
      { kind: 'act', id: 'wait', markup: '[[act:wait]]' },
      { kind: 'text', text: '. A ' },
      { kind: 'tip', key: 'who', text: 'caller', markup: '[[tip:who|caller]]' },
      { kind: 'text', text: '.' },
    ])
    expect(inlineMarkup('A [[tip:who]] and [[act:|x]].')).toBeNull()
  })
})

describe('inline actions and tooltips', () => {
  it('draw a choice the prose names inside it, and leave it out of the list', () => {
    const { game, problems } = make()
    expect(problems).toEqual([])
    const shown = view(start(game), game)
    expect(shown.scene.choices.map((choice) => choice.id)).toEqual(['leave'])
    const [ring, door] = shown.scene.beats
    expect(ring).toEqual({
      kind: 'text',
      text: 'Your phone is ringing. Pick it up, or let it ring. The caller waits.',
      spans: [
        { kind: 'text', text: 'Your phone is ringing. ' },
        {
          kind: 'action',
          text: 'Pick it up',
          choice: {
            id: 'answer',
            label: 'Answer',
            price: { stats: [{ id: 'coins', amount: 1, text: '1' }] },
            disabled: undefined,
            tags: undefined,
            irreversible: undefined,
            warning: undefined,
            command: { type: 'choose', id: 'answer' },
          },
        },
        { kind: 'text', text: ', or let it ring. The ' },
        { kind: 'tip', text: 'caller', tip: 'An old friend, Ava.' },
        { kind: 'text', text: ' waits.' },
      ],
    })
    // The choice's own label when the markup gives none; a hidden one is just its words.
    expect(door.kind === 'text' && door.spans?.map((span) => [span.kind, span.text])).toEqual([
      ['text', 'Somebody is at the door. '],
      ['action', 'Knock'],
      ['text', ' back? A secret.'],
    ])
    expect(inlineChoices(shown.scene.beats).map((choice) => choice.id)).toEqual(['answer', 'knock'])
  })

  it('carry the reason a choice is greyed out, its own or its command\'s', () => {
    const { game } = make()
    const shy = inlineChoices(view(start(game, { shy: true }), game).scene.beats)
    expect(shy.find((choice) => choice.id === 'knock')?.disabled).toBe('You feel too shy.')
    const flat = start(game, { flat: true })
    expect(inlineChoices(view(flat, game).scene.beats).find((choice) => choice.id === 'answer')?.disabled).toBe('The battery is flat.')
    const refused = apply(flat, game, { type: 'choose', id: 'answer' })
    expect(refused).toMatchObject({ ok: false, reason: 'The battery is flat.' })
  })

  it('run the command a choice sends, then its effects', () => {
    const { game } = make()
    const applied = apply(start(game), game, { type: 'choose', id: 'answer' })
    expect(applied.ok).toBe(true)
    expect(phone.read(applied.state, game).open).toBe(true)
    expect(applied.state.kv.answered).toBe(true)
    expect(applied.state.chosen['hall#answer']).toBe(1)
  })

  it('replay to the same state, and go in the backlog as words', () => {
    const { game } = make()
    const runner = createRunner(game, start(game), { backlog: { limit: 5 } })
    expect(runner.apply({ type: 'choose', id: 'answer' }).ok).toBe(true)
    expect(runner.apply({ type: 'choose', id: 'knock' }).ok).toBe(true)
    expect(unwrap(replay(game, runner.log()))).toEqual(runner.state)
    expect(runner.backlog().map((entry) => entry.chose)).toEqual(['Answer', 'Knock', undefined])
    const [entry] = runner.backlog()
    const ring = entry.beats[0]
    expect(ring.kind === 'text' && ring.spans?.map((span) => span.kind)).toEqual(['text', 'tip', 'text'])
  })

  it('work in a room, with its buttons', () => {
    const room = definePlugin({
      id: 'room',
      version: 1,
      stage: () => ({ id: 'kitchen', title: 'Kitchen', body: [{ text: 'kitchen.text' }] }),
      buttons: () => [{ id: 'kettle', label: 'Put the kettle on', command: { type: 'custom', name: 'phone/open' } }],
    })
    const { game } = make({ prose: { ...prose, 'kitchen.text': 'The [[act:kettle|kettle]] is cold.' } }, { plugins: [phone, room], introScene: undefined })
    const shown = screen(start(game), game)
    expect(shown.actions.map((action) => action.id)).toEqual([])
    expect(inlineChoices(shown.scene.beats)).toMatchObject([{ id: 'kettle', command: { type: 'custom', name: 'phone/open' } }])
  })

  it('are checked: unknown ids, twice, tooltips with no words, malformed markup, a choice that sends a choice', () => {
    const bad: DataScene = {
      id: 'bad',
      body: [{ text: 'bad.one' }, { text: 'bad.two' }],
      choices: [
        { id: 'go', effects: [] },
        { id: 'loop', command: { type: 'choose', id: 'go' }, effects: [] },
        { id: 'call', command: { type: 'custom', name: 'phone/dial' }, effects: [] },
      ],
    }
    const lines = {
      'bad.one': 'A [[act:nope]] and [[act:go]] then [[act:go]]. [[tip:missing|who]] [[tip:hall.tip]] [[act:go|]] [[act:broken',
      'bad.two': 'Again [[act:go]].',
      'bad#go': 'Go',
      'bad#loop': 'Loop',
      'bad#call': 'Call',
    }
    const { game } = make({ scenes: [hall, bad], prose: { ...prose, ...lines } })
    const problems = checkGame(game).problems.map(describeProblem)
    expect(problems).toEqual(
      expect.arrayContaining([
        expect.stringContaining('[[act:nope]] names no choice or action offered here'),
        expect.stringContaining('[[act:go]] is in one line twice'),
        expect.stringContaining('[[act:go]] is in two blocks that can show together'),
        expect.stringContaining('[[tip:missing]]: no prose for "missing"'),
        expect.stringContaining('[[tip:hall.tip]] needs the words to show'),
        expect.stringContaining('[[act:go|]] has no words'),
        expect.stringContaining('is not closed with "]]"'),
        expect.stringContaining('choice loop: a choice\'s command can\'t be another choice'),
        expect.stringContaining('choice call: no plugin command named "phone/dial"'),
      ]),
    )
  })
})

describe('bold and italics', () => {
  it('cut a line at its stars, read \\* as a star, and leave stray stars as written', () => {
    expect(inlineMarkup('A **loud** knock and a *soft* one.')).toEqual([
      { kind: 'text', text: 'A ' },
      { kind: 'bold', text: 'loud', markup: '**loud**' },
      { kind: 'text', text: ' knock and a ' },
      { kind: 'italic', text: 'soft', markup: '*soft*' },
      { kind: 'text', text: ' one.' },
    ])
    expect(inlineMarkup('Five * three, and a \\*star\\*.')).toEqual([{ kind: 'text', text: 'Five * three, and a *star*.' }])
    expect(inlineMarkup('Five * three.')).toBeNull()
    expect(inlineMarkup('An *open line.')).toBeNull()
    expect(inlineMarkup('**Ring** [[act:answer|Pick up]] *now*')).toEqual([
      { kind: 'bold', text: 'Ring', markup: '**Ring**' },
      { kind: 'text', text: ' ' },
      { kind: 'act', id: 'answer', text: 'Pick up', markup: '[[act:answer|Pick up]]' },
      { kind: 'text', text: ' ' },
      { kind: 'italic', text: 'now', markup: '*now*' },
    ])
  })

  it('become spans, with the words alone in text, and stay in the backlog', () => {
    const lines = { ...prose, 'hall.ring': 'Your phone is **ringing**. [[act:answer|Pick it up]], *quickly*.', 'hall.door': 'A \\*star\\* on the door.' }
    const { game, problems } = make({ prose: lines })
    expect(problems).toEqual([])
    const [ring, door] = view(start(game), game).scene.beats
    expect(ring).toMatchObject({
      kind: 'text',
      text: 'Your phone is ringing. Pick it up, quickly.',
      spans: [
        { kind: 'text', text: 'Your phone is ' },
        { kind: 'bold', text: 'ringing' },
        { kind: 'text', text: '. ' },
        { kind: 'action', text: 'Pick it up' },
        { kind: 'text', text: ', ' },
        { kind: 'italic', text: 'quickly' },
        { kind: 'text', text: '.' },
      ],
    })
    expect(door).toEqual({ kind: 'text', text: 'A *star* on the door.' })
    const runner = createRunner(game, start(game), { backlog: { limit: 5 } })
    expect(runner.apply({ type: 'choose', id: 'leave' }).ok).toBe(true)
    const past = runner.backlog()[0].beats[0]
    expect(past.kind === 'text' && past.spans?.map((span) => span.kind)).toEqual(['text', 'bold', 'text', 'italic', 'text'])
  })

  it('are checked: stars that never close, three in a row, one inside another, next to an action', () => {
    const lines = {
      ...prose,
      'hall.ring': 'An *open line, and ***too many***.',
      'hall.door': '*A **nested** one* and **[[act:knock]]**. Five * three is fine.',
      'hall.post': '> A *mono line is shown as written.',
    }
    const { game } = make({ prose: lines, scenes: [{ ...hall, body: [...(hall.body as { text: string }[]), { text: 'hall.post' }] }] })
    const problems = checkGame(game).problems.map(describeProblem)
    expect(problems).toEqual(
      expect.arrayContaining([
        expect.stringContaining('"*" is not closed'),
        expect.stringContaining('"***" is shown as written'),
        expect.stringContaining('bold and italics don\'t go inside each other'),
        expect.stringContaining('stars next to [[act]] or [[tip]]'),
      ]),
    )
    expect(problems.filter((problem) => problem.includes('hall.post'))).toEqual([])
  })
})
