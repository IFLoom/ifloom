import { describe, expect, it } from 'vitest'
import { SCHEMA, checkGame, inlineMarkup, loadGame, parseBeats } from '@ifloom/engine'
import { conditionForm, costOf, effectForm, newCondition, newEffect, rangeOf, shortBlock, snippet, transitionFields, transitionOptions, transitionValue, withCost, withRange } from '../lib/builders.ts'
import { CONDITION_FORMS, EFFECT_FORMS } from '../lib/kinds.ts'
import { MARKUP_KINDS, insertInline, insertParagraph, markup, proseBeats, sampleMarkup } from '../lib/markup.ts'

describe('the condition builder', () => {
  it('opens every new condition in its own form', () => {
    for (const form of [...CONDITION_FORMS, 'plugin'] as const) expect(conditionForm(newCondition(form))).toBe(form)
  })

  it('falls back to JSON for what no form can show', () => {
    expect(conditionForm({ stat: 'coins', gte: 1, lt: 5 })).toBe('json')
    expect(conditionForm({ stat: 'coins', of: 'staff:ana', gte: 1 })).toBe('json')
    expect(conditionForm({ storyline: 'ava' })).toBe('json')
  })

  it('reads and writes one comparison', () => {
    expect(rangeOf({ kv: 'met' })).toEqual({ op: 'set', value: 0 })
    expect(rangeOf({ kv: 'role', is: 'cook' })).toEqual({ op: 'is', value: 'cook' })
    expect(withRange({ stat: 'coins', gte: 3 }, { op: 'lt', value: 2 })).toEqual({ stat: 'coins', lt: 2 })
    expect(withRange({ stat: 'coins', gte: 3 }, { op: 'set', value: 0 })).toEqual({ stat: 'coins' })
  })

  it('makes conditions the checker accepts', () => {
    const names = { scenes: ['a'], stats: ['coins'], items: ['key'], kv: ['met'], choices: ['a/go'], sets: [] }
    const conditions = CONDITION_FORMS.filter((f) => f !== 'setting').map((f) => newCondition(f, names))
    const { problems } = loadGame(
      [
        {
          id: 'p',
          schema: SCHEMA,
          stats: [{ id: 'coins', label: 'Coins', levels: { at: [5] } }],
          items: [{ id: 'key', name: 'Key', desc: 'A key.' }],
          scenes: [{ id: 'a', body: [{ text: 'a', when: { all: conditions } }], choices: [{ id: 'go', effects: [] }] }],
          prose: { a: 'A.', 'a#go': 'Go' },
        },
      ],
      { id: 'g', title: 'G' },
    )
    expect(problems).toEqual([])
  })
})

describe('the effect builder', () => {
  it('opens every new effect in its own form', () => {
    for (const form of [...EFFECT_FORMS, 'kvBy', 'draw', 'plugin'] as const) expect(effectForm(newEffect(form))).toBe(form)
  })

  it('falls back to JSON for an entity’s stat', () => {
    expect(effectForm({ kind: 'stat', stat: 'morale', by: 1, of: 'staff:ana' })).toBe('json')
  })

  it('reads and writes a cost', () => {
    const effects = [{ kind: 'item', item: 'bun', by: 1 } as const, { kind: 'stat', stat: 'coins', by: -3 } as const]
    expect(costOf(effects)).toEqual([{ stat: 'coins', amount: 3 }])
    expect(withCost(effects, [{ stat: 'coins', amount: 4 }])).toEqual([
      { kind: 'stat', stat: 'coins', by: -4 },
      { kind: 'item', item: 'bun', by: 1 },
    ])
    expect(withCost(effects, [])).toEqual([{ kind: 'item', item: 'bun', by: 1 }])
    expect(shortBlock({ id: 'coins', label: 'Coins' }, 'coins', 4)).toEqual({ when: { stat: 'coins', lt: 4 }, reason: 'You need 4 coins.' })
  })

  it('writes snippets as TypeScript', () => {
    expect(snippet(newEffect('stat', { scenes: [], stats: ['coins'], items: [], kv: [], choices: [], sets: [] }))).toBe("{ kind: 'stat', stat: 'coins', by: 1 }")
    expect(snippet({ all: [{ stat: 'coins', gte: 3 }, { kv: 'met' }] })).toBe("{ all: [{ stat: 'coins', gte: 3 }, { kv: 'met' }] }")
  })

  it('makes effects a game can run', () => {
    const game = loadGame(
      [
        {
          id: 'p',
          schema: SCHEMA,
          stats: [{ id: 'coins', label: 'Coins' }],
          items: [{ id: 'key', name: 'Key', desc: 'A key.' }],
          scenes: [
            { id: 'a', body: [{ text: 'a' }], choices: [{ id: 'go', effects: [newEffect('stat', { scenes: ['a'], stats: ['coins'], items: ['key'], kv: ['met'], choices: [], sets: [] }), newEffect('item', { scenes: ['a'], stats: ['coins'], items: ['key'], kv: ['met'], choices: [], sets: [] }), newEffect('scene', { scenes: ['a'], stats: [], items: [], kv: [], choices: [], sets: [] })] }] },
          ],
          prose: { a: 'A.', 'a#go': 'Go' },
        },
      ],
      { id: 'g', title: 'G' },
    )
    expect(checkGame(game.game).problems).toEqual([])
  })
})

describe('the transition fields', () => {
  it('read a transition and write the shortest one back', () => {
    expect(transitionFields(undefined)).toEqual({ in: '', out: '', ms: undefined })
    expect(transitionFields('fade')).toEqual({ in: 'fade', out: 'fade', ms: undefined })
    expect(transitionValue({ in: 'fade', out: 'fade', ms: undefined })).toBe('fade')
    expect(transitionValue({ in: '', out: '', ms: undefined })).toBeUndefined()
    expect(transitionValue({ in: 'slide-up', out: '', ms: 400 })).toEqual({ in: 'slide-up', ms: 400 })
    expect(transitionValue(transitionFields({ in: 'zoom', out: 'fade' }))).toEqual({ in: 'zoom', out: 'fade' })
    // A name of the game's own stays on the menu.
    expect(transitionOptions('curtain')).toEqual(['fade', 'slide-up', 'slide-left', 'zoom', 'none', 'curtain'])
    expect(effectForm(newEffect('transition'))).toBe('transition')
  })
})

describe('the markup helper', () => {
  it('writes markup the engine reads as the beat it means', () => {
    const beats = Object.fromEntries(MARKUP_KINDS.map((kind) => [kind, parseBeats(sampleMarkup(kind))]))
    expect(beats.img).toEqual([{ kind: 'image', size: 'inline', src: 'art/place/market.jpg', alt: 'The market square' }])
    expect(beats.wide[0]).toMatchObject({ kind: 'image', size: 'wide' })
    expect(beats.video[0]).toMatchObject({ kind: 'video', src: 'art/clips/kettle.mp4' })
    expect(beats.sound).toEqual([{ kind: 'sound', track: 'knock' }])
    expect(beats.voice).toEqual([{ kind: 'say', who: 'character', text: 'New beans this week.', voice: 'ava.beans' }])
    expect(beats.speaker[0]).toMatchObject({ kind: 'say', who: 'character' })
    expect(beats.mono[0]).toMatchObject({ kind: 'mono' })
    expect(proseBeats(sampleMarkup('pool'))).toEqual([{ kind: 'image', size: 'inline', src: 'pool:door', alt: 'tags red,night' }])
    expect(markup('speaker', { name: 'You', text: 'Just a coffee.' })).toBe('You: "Just a coffee."')
    expect(markup('img', { path: 'a', alt: 'x|y]' })).toBe('[[img:a|xy]]')
    expect(beats.reveal).toEqual([{ kind: 'reveal', delay: 1000, as: 'fade', at: 1000 }])
    expect(markup('reveal', { delay: '', as: '' })).toBe('[[reveal]]')
    expect(markup('reveal', { delay: '1500 ms', as: 'slide-up' })).toBe('[[reveal:1500|slide-up]]')
    expect(inlineMarkup(sampleMarkup('act'))).toEqual([{ kind: 'act', id: 'answer', text: 'Pick it up', markup: '[[act:answer|Pick it up]]' }])
    expect(markup('act', { id: 'answer', words: '' })).toBe('[[act:answer]]')
    expect(inlineMarkup(sampleMarkup('tip'))).toEqual([{ kind: 'tip', key: 'market.stall', text: 'the stall', markup: '[[tip:market.stall|the stall]]' }])
  })

  it('puts an inline action or a tooltip in the line, with spaces round it', () => {
    expect(insertInline('The phone rings.', 15, '[[act:answer]]')).toEqual({ text: 'The phone rings [[act:answer]].', cursor: 30 })
    expect(insertInline('Ring', 4, '[[act:a]]')).toEqual({ text: 'Ring [[act:a]]', cursor: 14 })
  })

  it('puts a paragraph in with blank lines around it', () => {
    expect(insertParagraph('One.\nTwo.', 4, '> Hm.')).toEqual({ text: 'One.\n\n> Hm.\n\nTwo.', cursor: 11 })
    expect(insertParagraph('', 0, 'Hi')).toEqual({ text: 'Hi', cursor: 2 })
  })
})
