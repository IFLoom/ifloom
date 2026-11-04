import { describe, expect, it } from 'vitest'
import { loadGame, type Content, type Pack } from '../../src/loader.ts'
import { startingState } from '../../src/intake.ts'
import { fillTokens } from '../../src/prose.ts'
import { amountOf } from '../../src/amount.ts'
import { translatableFields } from '../../src/words.ts'
import { upgradePack } from '../../src/upgrade.ts'
import { checkGame } from '../../src/check.ts'
import { definePlugin } from '../../src/plugin.ts'
import type { GameRules } from '../../src/game.ts'

const wearingSuit = { kv: 'outfit', is: 'suit' }

const flat: Content = {
  name: 'flat',
  kv: { outfit: 'jeans', mood: 'fine' },
  phrases: {
    outfit: {
      verdict: [{ when: wearingSuit, text: 'sharp' }, { text: 'fine, probably' }],
      colour: [{ when: wearingSuit, text: 'navy' }],
    },
    weather: 'grey and close',
    greeting: 'Morning, {{name}}. It is {{weather}}.',
  },
  scenes: [{ id: 'mirror', body: [{ text: 'The mirror says you look {{outfit.verdict}}.' }], choices: [] }],
}

const rules: GameRules = {
  values: { name: () => 'Robin', price: () => 4, mood: () => 'from rules' },
}

const messages = definePlugin({ id: 'messages', version: 1, values: { unread: (_state, args) => (args.channel === 'texts' ? 2 : 5) } })

const load = (content: Content[] = [flat], packs: Pack[] = []) => loadGame(content, { id: 'flat', title: 'Flat', rules, plugins: [messages] }, { packs })

describe('phrases and bare tokens', () => {
  it('print the first row that holds, or nothing when none does', () => {
    const { game, problems } = load()
    expect(problems).toEqual([])
    const jeans = startingState(game)
    const suit = startingState(game, { kv: { outfit: 'suit' } })
    expect(fillTokens(jeans, game, 'You look {{outfit.verdict}}.')).toBe('You look fine, probably.')
    expect(fillTokens(suit, game, 'You look {{outfit.verdict}}.')).toBe('You look sharp.')
    expect(fillTokens(jeans, game, '[{{outfit.colour}}]')).toBe('[]')
    expect(fillTokens(suit, game, '{{outfit.colour}}')).toBe('navy')
  })

  it('look a bare name up as a phrase, then a value of the game’s, then a kv key', () => {
    const { game } = load()
    const state = startingState(game, { kv: { typed: 'Sam', on: true } })
    expect(fillTokens(state, game, '{{weather}} / {{price}} / {{typed}} / {{mood}}')).toBe('grey and close / 4 / Sam / from rules')
    // Tokens in a phrase are filled; a bare name that is unset, or no text or number, prints nothing.
    expect(fillTokens(state, game, '{{greeting}}')).toBe('Morning, Robin. It is grey and close.')
    expect(fillTokens(state, game, '[{{on}}][{{nobody}}][{{outfit.nothing}}]')).toBe('[][][]')
  })

  it('show the words after a "|" while the token is unset, in every form, as written', () => {
    const { game } = load()
    const state = startingState(game, { kv: { typed: 'Sam' } })
    expect(fillTokens(state, game, '{{flatmate|Your flatmate}} / {{typed|Someone}} / {{outfit.colour|grey}}')).toBe('Your flatmate / Sam / grey')
    expect(fillTokens(state, game, '{{kv:visits of=storyline:ava|no}} / {{kv:outfit|none}}')).toBe('no / jeans')
    expect(fillTokens(state, game, '{{nobody/thing x=1|nothing}} / {{v:game/missing|gone}} / {{messages/unread channel=texts|0}}')).toBe('nothing / gone / 2')
    // The fallback is plain words: a token in it is not read.
    expect(fillTokens(state, game, '{{flatmate|{{typed}}}}')).not.toBe('Sam')
    // Without a fallback, a plugin's or a kv: token naming nothing stays as written, so it shows.
    expect(fillTokens(state, game, '{{nobody/thing}} {{kv:visits of=storyline:ava}}')).toBe('{{nobody/thing}} {{kv:visits of=storyline:ava}}')
  })

  it('warn about no token in a line that shows only once its key is set', () => {
    const body = [
      { text: 'Hello, {{flatmate}}.', when: { kv: 'flatmate' } },
      { text: '{{ducks}} ducks.', when: { all: [{ roll: 'ducks' }, { kv: 'park' }] } },
      { text: 'Not {{lone}}.', when: { not: { kv: 'lone' } } },
    ]
    const { warnings } = checkGame(load([{ ...flat, scenes: [{ id: 'hall', body, choices: [] }] }]).game)
    expect(warnings.map((warning) => warning.what)).toEqual(['{{lone}} may be unset, and then prints nothing; give it words to show until then, as {{lone|…}}'])
  })

  it('warn, without failing, about a bare token that may print nothing', () => {
    const { problems, warnings } = checkGame(
      load([
        {
          ...flat,
          scenes: [{ id: 'hall', body: [{ text: '{{flatmate}} {{flatmate|Someone}} {{outfit.colour}} {{weather}} {{mood}} {{price}}' }], choices: [] }],
        },
      ]).game,
    )
    expect(problems).toEqual([])
    expect(warnings.map((warning) => warning.what)).toEqual([
      '{{flatmate}} may be unset, and then prints nothing; give it words to show until then, as {{flatmate|…}}',
      '{{outfit.colour}} may be unset, and then prints nothing; give it words to show until then, as {{outfit.colour|…}}',
    ])
  })

  it('print a plugin’s value with a "/", with arguments, and still read the older {{v:…}}', () => {
    const { game } = load()
    const state = startingState(game)
    expect(fillTokens(state, game, '{{messages/unread}} and {{messages/unread channel=texts}}')).toBe('5 and 2')
    expect(fillTokens(state, game, '{{v:messages/unread channel=texts}}, {{v:game/price}}, {{v:game/weather}}')).toBe('2, 4, grey and close')
    expect(fillTokens(state, game, '{{kv:outfit}}')).toBe('jeans')
  })

  it('never read what a token printed as another token', () => {
    const { game } = load()
    expect(fillTokens(startingState(game, { kv: { typed: '{{weather}}' } }), game, '{{typed}}')).toBe('{{weather}}')
  })

  it('stop a phrase that prints itself', () => {
    const { game } = load([{ name: 'loop', phrases: { again: 'and {{again}}' } }])
    expect(fillTokens(startingState(game), game, '{{again}}')).toMatch(/^and and /)
  })

  it('answer as a value, so an amount or a value reference can name one', () => {
    const { game } = load([{ ...flat, phrases: { ...flat.phrases, dozen: '12' } }])
    expect(amountOf(startingState(game), game, { value: 'game/dozen' })).toBe(12)
  })

  it('are replaced whole by a later pack, which can add to a group', () => {
    const pack: Pack = { id: 'mod', schema: 30, phrases: { outfit: { verdict: 'smashing', hat: 'a cap' } } }
    const { game, problems } = load([flat], [pack])
    expect(problems).toEqual([])
    const state = startingState(game, { kv: { outfit: 'suit' } })
    expect(fillTokens(state, game, '{{outfit.verdict}}, {{outfit.colour}}, {{outfit.hat}}')).toBe('smashing, navy, a cap')
    expect(game.phrases?.['outfit.verdict']).toEqual([{ text: 'smashing' }])
  })

  it('name each row’s words for a translation, and take a translation’s', () => {
    const { game } = load()
    const fields = translatableFields(game).filter((field) => field.key.startsWith('phrase.'))
    expect(fields.map((field) => field.key)).toEqual([
      'phrase.outfit.verdict.0',
      'phrase.outfit.verdict.1',
      'phrase.outfit.colour.0',
      'phrase.weather.0',
      'phrase.greeting.0',
    ])
    const { game: french } = load([flat], [{ id: 'fr', schema: 30, words: { 'phrase.outfit.verdict.1': 'bien, sans doute' } }])
    expect(fillTokens(startingState(french), french, '{{outfit.verdict}}')).toBe('bien, sans doute')
  })

  it('are checked: a value of the same name, an empty list, a row after the otherwise, a bad when, a group that is a phrase', () => {
    const { problems } = load([
      {
        name: 'a',
        phrases: { price: 'four', empty: [], late: [{ text: 'always' }, { when: { kv: 'x' }, text: 'never' }], odd: [{ when: { stat: 'nope' }, text: 'x' }] },
      },
      { name: 'b', phrases: { outfit: 'plain' } },
      { name: 'c', phrases: { outfit: { verdict: 'fine' } } },
    ])
    expect(problems.map((problem) => `${problem.where}: ${problem.what}`)).toEqual([
      'phrase price: rules.values has a value "price" too; {{price}} prints the phrase, so rename one',
      'phrase empty: a phrase needs at least one row',
      'phrase late: row 1 has no when, so the rows after it are never shown',
      'phrase odd row 1: unknown stat "nope"',
      'phrase outfit.verdict: "outfit.verdict" is in a group that is also a phrase; a name is either a phrase or a group',
    ])
  })

  it('report a token with groups that names nothing, a plugin value nobody has, and the older {{v:…}} in the game’s own content', () => {
    const { problems } = load([
      {
        ...flat,
        scenes: [
          {
            id: 'hall',
            body: [{ text: '{{outfit.verdit}} {{messages/nothing}} {{v:game/price}} {{v:messages/unread channel=texts}} {{typed}}' }],
            choices: [],
          },
        ],
      },
    ])
    expect(problems.map((problem) => problem.what)).toEqual([
      "{{outfit.verdit}} names no phrase, no value in rules.values and no kv key the content starts or sets; is the phrase's name right?",
      '{{messages/nothing}} names no value "messages/nothing"',
      '{{v:game/price}} is written {{price}} now: a bare name is the game\'s own, and a plugin\'s has its id and a "/"',
      '{{v:messages/unread channel=texts}} is written {{messages/unread channel=texts}} now: a bare name is the game\'s own, and a plugin\'s has its id and a "/"',
    ])
  })

  it('know a key with groups that content sets', () => {
    const { problems } = load([
      {
        ...flat,
        actions: [{ id: 'win', effects: [{ kv: 'darts.best', to: 3 }] }],
        scenes: [{ id: 'hall', body: [{ text: 'Best {{darts.best}}.' }], choices: [] }],
      },
    ])
    expect(problems).toEqual([])
  })
})

describe('schema 30', () => {
  it('writes {{v:…}} as a bare token in every string of a pack', () => {
    const pack = {
      id: 'old',
      schema: 29,
      prose: { due: 'Rent: {{v:game/rentDue}}, {{v:messages/unread channel=texts}} texts, {{v:game/9lives}}.' },
      scenes: [{ id: 'hall', body: [{ text: 'Hi {{v:game/name}}.' }], choices: [{ id: 'go', label: '{{v:game/name weeks=2}}' }] }],
      words: { 'scene.hall.title': '{{v:places/name}}' },
    }
    const up = upgradePack(pack, [])
    expect(up.ok && up.value).toEqual({
      id: 'old',
      schema: 30,
      prose: { due: 'Rent: {{rentDue}}, {{messages/unread channel=texts}} texts, {{v:game/9lives}}.' },
      scenes: [{ id: 'hall', body: [{ text: 'Hi {{name}}.' }], choices: [{ id: 'go', label: '{{name weeks=2}}' }] }],
      words: { 'scene.hall.title': '{{places/name}}' },
    })
  })
})
