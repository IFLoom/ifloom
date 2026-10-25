import { describe, expect, it } from 'vitest'
import { loadGame, type Content } from '../../src/loader.ts'
import { checkGame, describeProblem } from '../../src/check.ts'
import { apply } from '../../src/reduce.ts'
import { startingState } from '../../src/intake.ts'
import { definePlugin } from '../../src/plugin.ts'
import { createRunner, replay } from '../../src/runner.ts'
import { inlineMarkup, parseBeats, styledBeats } from '../../src/sceneBody.ts'
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
    { id: 'answer', command: { type: 'custom', name: 'phone/open' }, effects: [{ kv: 'answered', to: true }] },
    { id: 'knock', effects: [{ stat: 'coins', by: -2 }], blocked: [{ when: { kv: 'shy' }, reason: 'You feel too shy.' }] },
    { id: 'hidden', blocked: [{ when: { not: { kv: 'never' } }, reason: 'No.', hide: true }], effects: [] },
    { id: 'leave', effects: [{ scene: null }] },
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

function make(extra: Partial<Content> = {}, base: Partial<Game> = {}) {
  const pack: Content = { name: 'house', prose, scenes: [hall], stats: [{ id: 'coins', label: 'Coins', start: 5, spendable: true }], ...extra }
  // The scene it opens on, unless `base` says none.
  const { introScene, ...rest } = 'introScene' in base ? base : { ...base, introScene: 'hall' }
  return loadGame([{ name: 'base', ...(introScene ? { introScene } : {}) }, pack], {
    id: 'house',
    title: 'The House',
    plugins: [phone],
    ...rest,
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
      { type: 'text', text: 'Ring. ' },
      { type: 'act', id: 'answer', text: 'Pick up', markup: '[[act:answer|Pick up]]' },
      { type: 'text', text: ' or ' },
      { type: 'act', id: 'wait', markup: '[[act:wait]]' },
      { type: 'text', text: '. A ' },
      { type: 'tip', key: 'who', text: 'caller', markup: '[[tip:who|caller]]' },
      { type: 'text', text: '.' },
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
      type: 'text',
      text: 'Your phone is ringing. Pick it up, or let it ring. The caller waits.',
      spans: [
        { type: 'text', text: 'Your phone is ringing. ' },
        {
          type: 'action',
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
        { type: 'text', text: ', or let it ring. The ' },
        { type: 'tip', text: 'caller', tip: 'An old friend, Ava.' },
        { type: 'text', text: ' waits.' },
      ],
    })
    // The choice's own label when the markup gives none; a hidden one is just its words.
    expect(door.type === 'text' && door.spans?.map((span) => [span.type, span.text])).toEqual([
      ['text', 'Somebody is at the door. '],
      ['action', 'Knock'],
      ['text', ' back? A secret.'],
    ])
    expect(inlineChoices(shown.scene.beats).map((choice) => choice.id)).toEqual(['answer', 'knock'])
  })

  it("carry the reason a choice is greyed out, its own or its command's", () => {
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
    expect(applied.state.chosen['hall#answer']?.n).toBe(1)
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
    expect(ring.type === 'text' && ring.spans?.map((span) => span.type)).toEqual(['text', 'tip', 'text'])
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
        expect.stringContaining("choice loop: a choice's command can't be another choice"),
        expect.stringContaining('choice call: no plugin command named "phone/dial"'),
      ]),
    )
  })
})

describe('bold and italics', () => {
  it('cut a line at its stars, read \\* as a star, and leave stray stars as written', () => {
    expect(inlineMarkup('A **loud** knock and a *soft* one.')).toEqual([
      { type: 'text', text: 'A ' },
      { type: 'bold', text: 'loud', markup: '**loud**' },
      { type: 'text', text: ' knock and a ' },
      { type: 'italic', text: 'soft', markup: '*soft*' },
      { type: 'text', text: ' one.' },
    ])
    expect(inlineMarkup('Five * three, and a \\*star\\*.')).toEqual([{ type: 'text', text: 'Five * three, and a *star*.' }])
    expect(inlineMarkup('Five * three.')).toBeNull()
    expect(inlineMarkup('An *open line.')).toBeNull()
    expect(inlineMarkup('**Ring** [[act:answer|Pick up]] *now*')).toEqual([
      { type: 'bold', text: 'Ring', markup: '**Ring**' },
      { type: 'text', text: ' ' },
      { type: 'act', id: 'answer', text: 'Pick up', markup: '[[act:answer|Pick up]]' },
      { type: 'text', text: ' ' },
      { type: 'italic', text: 'now', markup: '*now*' },
    ])
  })

  it('become spans, with the words alone in text, and stay in the backlog', () => {
    const lines = { ...prose, 'hall.ring': 'Your phone is **ringing**. [[act:answer|Pick it up]], *quickly*.', 'hall.door': 'A \\*star\\* on the door.' }
    const { game, problems } = make({ prose: lines })
    expect(problems).toEqual([])
    const [ring, door] = view(start(game), game).scene.beats
    expect(ring).toMatchObject({
      type: 'text',
      text: 'Your phone is ringing. Pick it up, quickly.',
      spans: [
        { type: 'text', text: 'Your phone is ' },
        { type: 'bold', text: 'ringing' },
        { type: 'text', text: '. ' },
        { type: 'action', text: 'Pick it up' },
        { type: 'text', text: ', ' },
        { type: 'italic', text: 'quickly' },
        { type: 'text', text: '.' },
      ],
    })
    expect(door).toEqual({ type: 'text', text: 'A *star* on the door.' })
    const runner = createRunner(game, start(game), { backlog: { limit: 5 } })
    expect(runner.apply({ type: 'choose', id: 'leave' }).ok).toBe(true)
    const past = runner.backlog()[0].beats[0]
    expect(past.type === 'text' && past.spans?.map((span) => span.type)).toEqual(['text', 'bold', 'text', 'italic', 'text'])
  })

  it('are drawn by styledBeats in beats that skip the view, leaving inline actions as written', () => {
    expect(styledBeats(parseBeats('The sign says **Closed**. [[act:x|Knock]]\n\nAva: "*Again?*"\n\nPlain.'))).toEqual([
      {
        type: 'text',
        text: 'The sign says Closed. [[act:x|Knock]]',
        spans: [
          { type: 'text', text: 'The sign says ' },
          { type: 'bold', text: 'Closed' },
          { type: 'text', text: '. [[act:x|Knock]]' },
        ],
      },
      { type: 'say', who: 'character', name: 'Ava', text: 'Again?', spans: [{ type: 'italic', text: 'Again?' }] },
      { type: 'text', text: 'Plain.' },
    ])
  })

  it('are checked: stars that never close, three in a row, one inside another, next to an action', () => {
    const lines = {
      ...prose,
      'hall.ring': 'An *open line, and ***too many***.',
      'hall.door': '*A **nested** one* and **[[act:knock]]**. Five * three is fine.',
      'hall.post': '[[ui:mono|A *mono line is shown as written.]]',
    }
    const { game } = make({ prose: lines, scenes: [{ ...hall, body: [...(hall.body as { text: string }[]), { text: 'hall.post' }] }] })
    const problems = checkGame(game).problems.map(describeProblem)
    expect(problems).toEqual(
      expect.arrayContaining([
        expect.stringContaining('"*" is not closed'),
        expect.stringContaining('"***" is shown as written'),
        expect.stringContaining("bold and italics don't go inside each other"),
        expect.stringContaining('stars next to [[act]], [[tip]] or [[ui]]'),
      ]),
    )
    expect(problems.filter((problem) => problem.includes('hall.post'))).toEqual([])
  })
})

describe('UI pieces', () => {
  it('cut a line at [[ui:name|words|arg|…]], and leave malformed markup as written', () => {
    expect(inlineMarkup('Read [[ui:modal|the note|notice.welcome]] and [[ui:shop/card|this]].')).toEqual([
      { type: 'text', text: 'Read ' },
      { type: 'ui', name: 'modal', text: 'the note', args: ['notice.welcome'], markup: '[[ui:modal|the note|notice.welcome]]' },
      { type: 'text', text: ' and ' },
      { type: 'ui', name: 'shop/card', text: 'this', args: [], markup: '[[ui:shop/card|this]]' },
      { type: 'text', text: '.' },
    ])
    expect(inlineMarkup('[[ui:image| her photo | photo/ava.svg | Ava ]]')).toEqual([
      { type: 'ui', name: 'image', text: 'her photo', args: ['photo/ava.svg', 'Ava'], markup: '[[ui:image| her photo | photo/ava.svg | Ava ]]' },
    ])
    expect(inlineMarkup('A [[ui:modal]], [[ui:|x]], [[ui:no good|x]] and [[ui:modal|x||y]].')).toBeNull()
  })

  it('come through the view as written, in narration and spoken lines, and stay in the backlog', () => {
    const lines = {
      ...prose,
      'hall.ring': 'Your phone is ringing. [[ui:modal|The screen|hall.tip|Caller]] says {{friend}}.',
      'hall.door': 'Ava: "Look at [[ui:image|this|photo/ava.svg]]!"',
    }
    const { game, problems } = make({ prose: lines })
    expect(problems).toEqual([])
    const [ring, door] = view(start(game), game).scene.beats
    expect(ring).toEqual({
      type: 'text',
      text: 'Your phone is ringing. The screen says Ava.',
      spans: [
        { type: 'text', text: 'Your phone is ringing. ' },
        { type: 'ui', name: 'modal', text: 'The screen', args: ['hall.tip', 'Caller'] },
        { type: 'text', text: ' says Ava.' },
      ],
    })
    expect(door).toMatchObject({
      type: 'say',
      text: 'Look at this!',
      spans: [{ type: 'text' }, { type: 'ui', name: 'image', args: ['photo/ava.svg'] }, { type: 'text' }],
    })
    const runner = createRunner(game, start(game), { backlog: { limit: 5 } })
    expect(runner.apply({ type: 'choose', id: 'leave' }).ok).toBe(true)
    const past = runner.backlog()[0].beats[0]
    expect(past.type === 'text' && past.spans?.map((span) => span.type)).toEqual(['text', 'ui', 'text'])
  })

  it('are drawn by styledBeats in beats that skip the view', () => {
    expect(styledBeats(parseBeats('See [[ui:image|the map|map.png]].'))).toEqual([
      {
        type: 'text',
        text: 'See the map.',
        spans: [
          { type: 'text', text: 'See ' },
          { type: 'ui', name: 'image', text: 'the map', args: ['map.png'] },
          { type: 'text', text: '.' },
        ],
      },
    ])
  })

  it('are checked: no name, a name that is not an id, no words, an empty argument, not closed, in a "> " line', () => {
    const lines = {
      ...prose,
      'hall.ring': 'A [[ui:|x]] [[ui:no good|x]] [[ui:modal]] [[ui:modal|x||y]] [[ui:modal|open',
      'hall.door': '> A [[ui:modal|mono|hall.tip]] line.',
    }
    const { game } = make({ prose: lines })
    const problems = checkGame(game).problems.map(describeProblem)
    expect(problems).toEqual(
      expect.arrayContaining([
        expect.stringContaining('[[ui]] needs a name'),
        expect.stringContaining('[[ui:no good]]: a name is letters'),
        expect.stringContaining('[[ui:modal]] needs the words to show'),
        expect.stringContaining('has an empty argument'),
        expect.stringContaining('[[ui:…]] is not closed'),
        expect.stringContaining('[[ui]] is shown as written in a "> " line'),
      ]),
    )
    // A name no UI knows is the UI's to report, not the engine's.
    const fine = make({ prose: { ...prose, 'hall.ring': 'A [[ui:anything|piece|a|b]].' } })
    expect(checkGame(fine.game).problems).toEqual([])
  })
})
