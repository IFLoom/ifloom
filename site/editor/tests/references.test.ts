import { describe, expect, it } from 'vitest'
import { problemsOf } from '../lib/game.ts'
import { sampleProject } from '../lib/model.ts'
import { problemTarget, rename, renameChoice, kvUsed } from '../lib/references.ts'
import { hashOf, selectionFromHash } from '../lib/selection.ts'

describe('rename', () => {
  it('moves a scene, its prose keys and everything that names it', () => {
    const project = sampleProject()
    project.pack.scenes[1].choices.push({ id: 'back', when: { seen: 'market' }, effects: [{ kind: 'scene', scene: 'market' }] })
    project.pack.prose['home#back'] = 'Go back out'
    const next = rename(project, 'scene', 'market', 'square')
    expect(next.intro).toBe('square')
    expect(next.pack.scenes[0].id).toBe('square')
    expect(next.pack.scenes[0].body).toEqual([{ text: 'square' }, { text: 'square.fiddler', when: { kv: 'heardBusker' } }])
    expect(next.pack.prose['square#buy']).toBe('Buy an iced bun')
    expect(next.pack.prose.market).toBeUndefined()
    // A storylet named market.busker isn't the market scene's sub-key: it keeps its name.
    expect(next.pack.prose['market.busker']).toBeDefined()
    expect(next.pack.scenes[1].choices[0]).toMatchObject({ when: { seen: 'square' }, effects: [{ kind: 'scene', scene: 'square' }] })
    expect(next.pack.scenes[2].choices[0].effects[1]).toEqual({ kind: 'scene', scene: 'square' })
    expect(problemsOf(next)).toEqual([])
    // The original is untouched.
    expect(project.pack.scenes[0].id).toBe('market')
  })

  it('moves a stat in conditions, effects and formulas', () => {
    const project = sampleProject()
    project.pack.stats.push({ id: 'worth', label: 'Worth', derive: { sum: ['coins', { scale: 'coins', by: 2 }] } })
    const next = rename(project, 'stat', 'coins', 'pennies')
    expect(next.pack.stats[0].id).toBe('pennies')
    expect(next.pack.stats[1].derive).toEqual({ sum: ['pennies', { scale: 'pennies', by: 2 }] })
    const buy = next.pack.scenes[0].choices[0]
    expect(buy.blocked?.[0].when).toEqual({ stat: 'pennies', lt: 3 })
    expect(buy.effects[0]).toEqual({ kind: 'stat', stat: 'pennies', by: -3 })
    expect(problemsOf(next)).toEqual([])
  })

  it('moves a thing and a kv key', () => {
    const things = rename(sampleProject(), 'thing', 'item:bun', 'item:roll')
    expect(things.pack.scenes[1].body[1].when).toEqual({ entity: 'item:roll', at: 'you' })
    expect(things.pack.scenes[0].choices[0].effects[1]).toEqual({ kind: 'entity', entity: 'item:roll', by: 1 })
    expect(things.pack.entities[0]).toMatchObject({ id: 'roll', of: 'item' })
    expect(problemsOf(things)).toEqual([])
    const vars = rename(sampleProject(), 'kv', 'heardBusker', 'heardFiddle')
    expect(vars.kv[0].name).toBe('heardFiddle')
    expect(kvUsed(vars.pack)).toEqual(['heardFiddle'])
    expect(problemsOf(vars)).toEqual([])
  })
})

describe('rename a kind', () => {
  it('moves its things, their references, counts and holders', () => {
    const project = sampleProject()
    project.pack.kinds!.push({ id: 'stall', label: 'Stall', unique: true })
    project.pack.entities.push({ id: 'bakery', of: 'stall', name: 'The bakery stall' })
    project.pack.entities[0].at = { 'stall:bakery': 4 }
    project.pack.scenes[1].body.push({ text: 'home.many', when: { count: { of: 'item', at: 'you' }, gte: 2 } })
    project.pack.prose['home.many'] = 'Plenty.'
    project.pack.scenes[1].choices.push({ id: 'give', effects: [{ kind: 'move', entity: 'item:bun', from: 'you', to: 'stall:bakery', by: 1 }] })
    project.pack.prose['home#give'] = 'Give it back'
    const next = rename(project, 'kind', 'item', 'food')
    expect(next.pack.kinds![0].id).toBe('food')
    expect(next.pack.entities[0]).toMatchObject({ id: 'bun', of: 'food' })
    expect(next.pack.scenes[0].choices[0].effects[1]).toEqual({ kind: 'entity', entity: 'food:bun', by: 1 })
    expect(next.pack.scenes[1].body[2].when).toEqual({ count: { of: 'food', at: 'you' }, gte: 2 })
    expect(problemsOf(next)).toEqual([])
    const stalls = rename(project, 'kind', 'stall', 'stand')
    expect(stalls.pack.entities[0].at).toEqual({ 'stand:bakery': 4 })
    expect(stalls.pack.scenes[1].choices[0].effects[0]).toEqual({ kind: 'move', entity: 'item:bun', from: 'you', to: 'stand:bakery', by: 1 })
    expect(problemsOf(stalls)).toEqual([])
  })

  it('walks the conditions and effects in kinds and traits', () => {
    const project = sampleProject()
    project.pack.kinds![0].flags = { fresh: { kv: 'heardBusker' } }
    project.pack.entities[0].traits = { 'inventory/usable': { label: 'Eat it', effects: [{ kind: 'kv', key: 'heardBusker', to: false }] } }
    const next = rename(project, 'kv', 'heardBusker', 'heardFiddle')
    expect(next.pack.kinds![0].flags).toEqual({ fresh: { kv: 'heardFiddle' } })
    expect(next.pack.entities[0].traits).toEqual({ 'inventory/usable': { label: 'Eat it', effects: [{ kind: 'kv', key: 'heardFiddle', to: false }] } })
  })
})

describe('renameChoice', () => {
  it('moves the choice, its label and what asks about it', () => {
    const project = sampleProject()
    project.pack.scenes[1].body.push({ text: 'home.fed', when: { chose: 'market#buy' } })
    project.pack.prose['home.fed'] = 'Fed.'
    const next = renameChoice(project, 'market', 'buy', 'treat')
    expect(next.pack.scenes[0].choices[0].id).toBe('treat')
    expect(next.pack.prose['market#treat']).toBe('Buy an iced bun')
    expect(next.pack.prose['market#buy']).toBeUndefined()
    expect(next.pack.scenes[1].body[2].when).toEqual({ chose: 'market#treat' })
    expect(problemsOf(next)).toEqual([])
  })

  it("moves the inline actions in the scene's prose that name it", () => {
    const project = sampleProject()
    project.pack.prose.market = `${project.pack.prose.market} [[act:buy|Buy one]] or [[act:buy]], not [[act:buyer]].`
    const next = renameChoice(project, 'market', 'buy', 'treat')
    expect(next.pack.prose.market).toContain('[[act:treat|Buy one]] or [[act:treat]], not [[act:buyer]].')
  })
})

describe('problemTarget', () => {
  it('finds the choice a problem is about', () => {
    const project = sampleProject()
    delete project.pack.prose['market#home']
    project.pack.scenes[0].choices[0].effects.push({ kind: 'scene', scene: 'nowhere' })
    const targets = problemsOf(project).map((p) => problemTarget(project.pack, p))
    expect(targets).toContainEqual({ thing: 'scene', id: 'market', choice: 'home' })
    expect(targets).toContainEqual({ thing: 'scene', id: 'market', choice: 'buy' })
  })

  it('finds a stat, the intro and a block', () => {
    const project = sampleProject()
    expect(problemTarget(project.pack, { pack: 'x', where: 'stat coins', what: 'bad' })).toEqual({ thing: 'stat', id: 'coins' })
    expect(problemTarget(project.pack, { pack: 'base', where: 'introScene', what: 'unknown scene "x"' })).toEqual({ thing: 'project', id: '', field: 'intro' })
    expect(problemTarget(project.pack, { pack: 'x', where: 'kind item', what: 'bad' })).toEqual({ thing: 'kind', id: 'item' })
    expect(problemTarget(project.pack, { pack: 'x', where: 'trait wardrobe/wearable on item:bun', what: 'bad' })).toEqual({ thing: 'thing', id: 'item:bun' })
    expect(problemTarget(project.pack, { pack: 'x', where: 'scene home', what: 'unknown entity "item:bun"' })).toEqual({
      thing: 'scene',
      id: 'home',
      field: 'body',
    })
  })
})

describe('the address', () => {
  it('names a selection and reads it back', () => {
    const cases = [
      { thing: 'project' as const },
      { thing: 'scene' as const, id: 'market' },
      { thing: 'scene' as const, id: 'market.busker', choice: 'listen' },
      { thing: 'stat' as const, id: 'coins' },
      { thing: 'kind' as const, id: 'item' },
      { thing: 'thing' as const, id: 'item:bun' },
    ]
    for (const selection of cases) expect(selectionFromHash(hashOf(selection))).toEqual(selection)
    expect(selectionFromHash('#nothing')).toBeNull()
    expect(selectionFromHash('')).toBeNull()
  })
})
