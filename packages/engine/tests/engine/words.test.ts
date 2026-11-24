import { describe, expect, it } from 'vitest'
import { SCHEMA, loadGame, type Content, type Pack } from '../../src/loader.ts'
import { definePlugin } from '../../src/plugin.ts'
import { describeProblem } from '../../src/check.ts'
import { startingState } from '../../src/intake.ts'
import { apply } from '../../src/reduce.ts'
import { view } from '../../src/view.ts'
import { choice, decide, say, text } from '../../src/flow.ts'
import { translatableFields, wordSpots } from '../../src/words.ts'
import { contentKeys } from '../../src/features/registry.ts'

/** A plugin with a list of its own content and a trait, each saying which of its fields are words. */
const signs = definePlugin({
  id: 'signs',
  version: 1,
  words: { boards: { title: true, lines: [{ text: true }] } },
  traits: [{ id: 'signs/door', words: { sign: true, body: 'blocks' } }],
})

const cafe: Content = {
  name: 'cafe',
  kinds: [
    { id: 'character', label: 'Character', plural: 'Characters', unique: true },
    { id: 'shop', label: 'Shop', traits: { 'signs/door': { sign: 'Closed' } } },
  ],
  entities: [
    { id: 'ava', of: 'character', name: 'Ava', description: 'Runs the café' },
    { id: 'bakery', of: 'shop', name: 'The bakery' },
    { id: 'florist', of: 'shop', name: 'The florist', traits: { 'signs/door': { sign: 'Back at two', body: [text('Tulips in the window.')] } } },
  ],
  stats: [{ id: 'coins', label: 'Coins', format: { one: '{n} coin', other: '{n} coins' } }],
  storylines: [{ id: 'ava', name: 'Ava' }],
  inputs: [{ id: 'drink', label: 'Your usual', type: 'choice', options: [{ value: 'tea', label: 'Tea' }] }],
  actions: [
    { id: 'wait', label: 'Wait a while', effects: [{ notify: 'Time passes', text: 'The clock ticks.' }] },
    { id: 'sketch', label: 'Sketch the street', effects: [{ create: 'shop', with: { name: 'A sketch', description: 'Pencil on a napkin.' } }] },
    { id: 'tip', label: 'Leave a tip', blocked: [{ when: { not: { stat: 'coins', gte: 1 } }, reason: 'Your pockets are empty.' }] },
  ],
  scenes: [
    {
      id: 'cafe.counter',
      title: 'The counter',
      body: [
        text('Ava looks up from the till.', { id: 'intro' }),
        say('ava', 'What can I get you?'),
        decide('order', [choice('tea', 'A pot of tea', { then: [text('She warms the pot.')] }), choice('cake', 'A slice of cake')]),
      ],
      choices: [
        {
          id: 'leave',
          label: 'Leave',
          labels: [{ when: { kv: 'regular' }, label: 'See you tomorrow' }],
          once: { per: 'turn', reason: 'You only just came in.' },
        },
      ],
    },
  ],
  data: { signs: { boards: [{ id: 'menu', title: 'Today', lines: [{ text: 'Soup' }, { text: 'Bread' }] }] } },
}

const load = (packs: Pack[] = []) => loadGame([cafe], { id: 'cafe', title: 'Café', plugins: [signs] }, { packs })

describe('the words table', () => {
  it('lists every field a player reads, each once, under its key', () => {
    const { game, problems } = load()
    expect(problems).toEqual([])
    const fields = Object.fromEntries(translatableFields(game).map((field) => [field.key, field.text]))
    const hashed = (prefix: string) => Object.keys(fields).find((key) => key.startsWith(prefix) && /\.[0-9a-f]{6}(\.|$)/.test(key.slice(prefix.length - 1)))!
    expect(fields).toMatchObject({
      'scene.cafe.counter.title': 'The counter',
      'scene.cafe.counter.text.intro': 'Ava looks up from the till.',
      'scene.cafe.counter.choice.tea.label': 'A pot of tea',
      'scene.cafe.counter.choice.cake.label': 'A slice of cake',
      'scene.cafe.counter.choice.leave.label': 'Leave',
      'scene.cafe.counter.choice.leave.once.reason': 'You only just came in.',
      'action.wait.label': 'Wait a while',
      'action.tip.label': 'Leave a tip',
      'kind.character.label': 'Character',
      'kind.character.plural': 'Characters',
      'kind.shop.traits.signs/door.sign': 'Closed',
      'entity.character:ava.name': 'Ava',
      'entity.character:ava.description': 'Runs the café',
      'entity.shop:florist.traits.signs/door.sign': 'Back at two',
      'stat.coins.label': 'Coins',
      'stat.coins.format.one': '{n} coin',
      'stat.coins.format.other': '{n} coins',
      'storyline.ava.name': 'Ava',
      'input.drink.label': 'Your usual',
      'input.drink.options.tea.label': 'Tea',
      'signs/boards.menu.title': 'Today',
    })
    // Words with no id of their own are named by a hash of their words.
    expect(fields[hashed('scene.cafe.counter.text.')]).toBeDefined()
    expect(Object.values(fields)).toEqual(expect.arrayContaining(['What can I get you?', 'She warms the pot.', 'See you tomorrow', 'Your pockets are empty.']))
    expect(Object.values(fields)).toEqual(expect.arrayContaining(['Time passes', 'The clock ticks.', 'Tulips in the window.', 'Soup', 'Bread']))
    // What a create effect names the thing it makes, under the effect's action.
    expect(
      Object.entries(fields)
        .filter(([key]) => key.startsWith('action.sketch.create.'))
        .map(([, text]) => text),
    ).toEqual(['A sketch', 'Pencil on a napkin.'])
    // The bakery's sign is its kind's, so it is translated once, as the kind's.
    expect(Object.keys(fields).some((key) => key.startsWith('entity.shop:bakery.traits'))).toBe(false)
    // A hashed key follows the words: the same words, the same key.
    const again = translatableFields(load().game).map((field) => field.key)
    expect(again).toEqual(Object.keys(fields))
  })

  it('lays a translation over the labels, names and words in place, and leaves the content as it was', () => {
    const english = Object.fromEntries(translatableFields(load().game).map((field) => [field.text, field.key]))
    const french: Pack = {
      id: 'fr',
      schema: SCHEMA,
      words: {
        'scene.cafe.counter.title': 'Le comptoir',
        'scene.cafe.counter.text.intro': 'Ava lève les yeux de la caisse.',
        [english['What can I get you?']]: 'Je vous sers quoi ?',
        [english['She warms the pot.']]: 'Elle réchauffe la théière.',
        'scene.cafe.counter.choice.tea.label': 'Une théière',
        'action.wait.label': 'Attendre un peu',
        [english['Time passes']]: 'Le temps passe',
        'entity.character:ava.description': 'Tient le café',
        'kind.shop.traits.signs/door.sign': 'Fermé',
        'stat.coins.format.other': '{n} pièces',
        'signs/boards.menu.title': "Aujourd'hui",
      },
    }
    const { game, problems } = load([french])
    expect(problems).toEqual([])
    const state = { ...startingState(game), sceneId: 'cafe.counter' }
    const shown = view(state, game)
    expect(shown.scene.title).toBe('Le comptoir')
    expect(shown.scene.beats.map((beat) => ('text' in beat ? beat.text : ''))).toEqual(['Ava lève les yeux de la caisse.', 'Je vous sers quoi ?'])
    expect(shown.scene.choices.map((entry) => entry.label)).toEqual(['Une théière', 'A slice of cake'])
    const picked = apply(state, game, { type: 'choose', id: 'tea' }).state
    expect(view(picked, game).scene.beats.map((beat) => ('text' in beat ? beat.text : beat.type === 'chose' ? beat.label : ''))).toContain(
      'Elle réchauffe la théière.',
    )
    const idle = apply({ ...startingState(game), sceneId: null }, game, { type: 'action', id: 'wait' }).state
    expect(view(idle, game).actions[0].label).toBe('Attendre un peu')
    expect(view(idle, game).notices.unseen[0]).toMatchObject({ title: 'Le temps passe', text: 'The clock ticks.' })
    expect(game.entities?.find((entity) => entity.id === 'ava')?.description).toBe('Tient le café')
    // The kind's default reaches every shop that has it, and one with its own sign keeps it.
    expect(game.traits?.['signs/door']).toMatchObject({ 'shop:bakery': { sign: 'Fermé' }, 'shop:florist': { sign: 'Back at two' } })
    expect(game.stats?.[0].format).toEqual({ one: '{n} coin', other: '{n} pièces' })
    expect(game.data?.signs?.boards[0]).toMatchObject({ title: "Aujourd'hui" })
    // The content it was merged from is untouched.
    expect(cafe.scenes?.[0].title).toBe('The counter')
    expect(load().game.scenes[0].title).toBe('The counter')
  })

  it('reports a key that names no field, against the pack it came from', () => {
    const typo: Pack = { id: 'fr', schema: SCHEMA, words: { 'action.wiat.label': 'Attendre' } }
    expect(load([typo]).problems.map(describeProblem)).toEqual([
      'fr · words action.wiat.label · names no field the game has (translatableFields lists every key)',
    ])
  })

  it('reports two fields with different words under one key', () => {
    const clash: Content = {
      name: 'clash',
      scenes: [{ id: 'hall', body: [text('A door.', { id: 'door' }), text('A window.', { id: 'door' })], choices: [] }],
    }
    expect(loadGame([clash], { id: 'h', title: 'H' }).problems.map(describeProblem)).toEqual([
      'clash · scene hall · two fields with different words share the words key "scene.hall.text.door"; give a block of words an id, or rename one',
    ])
  })

  it('reaches the words of every feature that has some, and a translation of every key lands', () => {
    // Content with an entry in every list a feature says has words, beside the café's.
    const every: Content = {
      name: 'every',
      settings: [{ id: 'pace', label: 'Pace', type: 'choice', options: [{ value: 'slow', label: 'Slow' }], default: 'slow' }],
      locks: [{ when: { kv: 'closed' }, deny: ['action'], reason: 'The café is shut.' }],
      saveable: [{ when: { kv: 'busy' }, reason: 'Not while serving.' }],
      triggers: [{ id: 'bell', when: { kv: 'bell' }, effects: [{ notify: 'The bell rings' }] }],
      timers: [{ id: 'kettle', label: 'The kettle', ms: 1000, effects: [{ notify: 'The kettle boils' }] }],
      minigames: [{ id: 'darts', title: 'Darts', start: 'throw', states: { throw: { label: 'Throw', final: {} } } }],
      phrases: { mood: [{ text: 'cheerful' }] },
    }
    const base = { id: 'cafe', title: 'Café', plugins: [signs] }
    const { game, problems } = loadGame([cafe, every], base)
    expect(problems).toEqual([])
    // Each key whose feature says it has words gives some: a key the walk misses would never be translated.
    const reached = new Set(wordSpots(game).map((spot) => spot.at[0]))
    const withWords = Object.entries(contentKeys).flatMap(([key, entry]) => (entry.words ? [key] : []))
    expect(withWords.filter((key) => !reached.has(key))).toEqual([])
    // A translation that names every key lands in every field.
    const fields = translatableFields(game)
    const words = Object.fromEntries(fields.map((field) => [field.key, `T(${field.key})`]))
    const translated = loadGame([cafe, every], base, { packs: [{ id: 'all', schema: SCHEMA, words }] })
    expect(translated.problems).toEqual([])
    // Read where each field sat: a hashed key follows its words, so the translated game names it anew.
    const at = (path: readonly (string | number)[]) =>
      path.reduce<unknown>((value, step) => (value as Record<string | number, unknown>)?.[step], translated.game)
    expect(wordSpots(game).filter((spot) => at(spot.at) !== `T(${spot.key})`)).toEqual([])
  })
})
