// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import type { Condition, EffectRef, EntityDef, KindDef } from '@ifloom/engine'
import { ConditionBuilder } from '../components/ConditionBuilder'
import { EditorContext, namesOf, type Selection } from '../components/context'
import { EffectList } from '../components/EffectBuilder'
import { KindFields, ThingFields } from '../components/forms/DefFields'
import { SceneForm } from '../components/forms/SceneForm'
import { problemsOf } from '../lib/game'
import { sampleProject, type Project } from '../lib/model'
import { problemTarget } from '../lib/references'

afterEach(cleanup)

const names = { scenes: ['market', 'home'], stats: ['coins'], things: ['item:bun'], kv: ['met'], choices: ['market#buy'], sets: ['market'] }

describe('the condition builder', () => {
  it('switches kind and edits the fields of the new one', () => {
    const onChange = vi.fn()
    const { rerender } = render(<ConditionBuilder value={{ kv: 'met' }} names={names} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Kind of condition'), { target: { value: 'stat' } })
    expect(onChange).toHaveBeenLastCalledWith({ stat: 'coins', gte: 1 })
    rerender(<ConditionBuilder value={{ stat: 'coins', gte: 1 }} names={names} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Comparison'), { target: { value: 'lt' } })
    expect(onChange).toHaveBeenLastCalledWith({ stat: 'coins', lt: 1 })
    fireEvent.change(screen.getByLabelText('Number'), { target: { value: '3' } })
    expect(onChange).toHaveBeenLastCalledWith({ stat: 'coins', gte: 3 })
  })

  it('nests parts under all of', () => {
    function Harness() {
      const [value, setValue] = useState<Condition>({ all: [] })
      return (
        <>
          <ConditionBuilder value={value} names={names} onChange={setValue} />
          <output data-testid="out">{JSON.stringify(value)}</output>
        </>
      )
    }
    render(<Harness />)
    fireEvent.click(screen.getByText('+ Add a part'))
    fireEvent.click(screen.getByText('+ Add a part'))
    expect(JSON.parse(screen.getByTestId('out').textContent!)).toEqual({ all: [{ kv: 'met' }, { kv: 'met' }] })
  })
})

describe('the effect list', () => {
  it('adds, changes and removes effects', () => {
    function Harness() {
      const [value, setValue] = useState<EffectRef[]>([])
      return (
        <>
          <EffectList value={value} names={names} onChange={setValue} />
          <output data-testid="out">{JSON.stringify(value)}</output>
        </>
      )
    }
    render(<Harness />)
    const out = () => JSON.parse(screen.getByTestId('out').textContent!)
    fireEvent.click(screen.getByText('+ Add an effect'))
    expect(out()).toEqual([{ kind: 'scene', scene: 'market' }])
    fireEvent.change(screen.getByLabelText('Kind of effect'), { target: { value: 'draw' } })
    expect(out()).toEqual([{ kind: 'scene', from: 'market' }])
    fireEvent.change(screen.getByLabelText('Otherwise'), { target: { value: 'home' } })
    expect(out()).toEqual([{ kind: 'scene', from: 'market', otherwise: 'home' }])
    fireEvent.click(screen.getByLabelText('Remove effect 1'))
    expect(out()).toEqual([])
  })
})

describe('the scene form', () => {
  function Editor({ start, onProject }: { start: Project; onProject?: (project: Project) => void }) {
    const [project, setProject] = useState(start)
    const [selection, select] = useState<Selection>({ thing: 'scene', id: 'market', choice: 'buy' })
    const problems = problemsOf(project)
    const update = (change: (draft: Project) => void) =>
      setProject((current) => {
        const draft = structuredClone(current)
        change(draft)
        onProject?.(draft)
        return draft
      })
    return (
      <EditorContext.Provider
        value={{
          project,
          update,
          replace: (next) => (setProject(next), onProject?.(next)),
          selection,
          select,
          create: () => {},
          names: namesOf(project),
          problems,
          targets: problems.map((p) => problemTarget(project.pack, p)),
          playFrom: () => {},
        }}
      >
        <SceneForm id={selection.thing === 'scene' ? selection.id : 'market'} />
      </EditorContext.Provider>
    )
  }

  it('shows a choice’s cost and blocks it when the player is short', () => {
    const project = sampleProject()
    project.pack.scenes[0].choices[0].blocked = undefined
    let latest = project
    render(<Editor start={project} onProject={(p) => (latest = p)} />)
    const card = document.getElementById('choice-buy')!
    expect(within(card).getByText('costs 3 coins')).toBeTruthy()
    fireEvent.click(within(card).getByText('Block it when short'))
    expect(latest.pack.scenes[0].choices[0].blocked).toEqual([{ when: { stat: 'coins', lt: 3 }, reason: 'You need 3 coins.' }])
    fireEvent.change(within(card).getByLabelText('Amount'), { target: { value: '4' } })
    expect(latest.pack.scenes[0].choices[0].effects).toEqual([
      { kind: 'stat', stat: 'coins', by: -4 },
      { kind: 'entity', entity: 'item:bun', by: 1 },
    ])
  })

  it('edits a choice’s label under its prose key', () => {
    let latest = sampleProject()
    render(<Editor start={latest} onProject={(p) => (latest = p)} />)
    const card = document.getElementById('choice-buy')!
    fireEvent.change(within(card).getByPlaceholderText('The button text'), { target: { value: 'Buy a bun' } })
    expect(latest.pack.prose['market#buy']).toBe('Buy a bun')
  })

  it('shows the checker’s problems for the scene', () => {
    const project = sampleProject()
    delete project.pack.prose.market
    render(<Editor start={project} />)
    expect(screen.getAllByLabelText('Problems')[0].textContent).toMatch(/no prose for "market"/)
  })
})

describe('the kind form', () => {
  function Harness({ start }: { start: KindDef }) {
    const [value, setValue] = useState<KindDef>(start)
    return (
      <>
        <KindFields value={value} names={{ ...names, kinds: ['item'], holders: ['character:ava'] }} onChange={setValue} />
        <output data-testid="out">{JSON.stringify(value)}</output>
      </>
    )
  }
  const out = () => JSON.parse(screen.getByTestId('out').textContent!)

  it('lists a kind always, never or while a condition holds', () => {
    render(<Harness start={{ id: 'note', label: 'Note', listed: false }} />)
    fireEvent.change(screen.getByLabelText('Listed'), { target: { value: 'when' } })
    expect(out().listed).toEqual({ entity: '$', at: 'you' })
    fireEvent.change(screen.getByLabelText('Held by'), { target: { value: 'player' } })
    expect(out().listed).toEqual({ entity: '$', at: 'player' })
    fireEvent.change(screen.getByLabelText('Listed'), { target: { value: 'yes' } })
    expect(out()).toEqual({ id: 'note', label: 'Note' })
  })

  it('makes it unique and adds a mark', () => {
    render(<Harness start={{ id: 'stall', label: 'Stall' }} />)
    fireEvent.click(screen.getByLabelText(/Unique/))
    fireEvent.click(screen.getByText('+ Add a mark'))
    fireEvent.change(screen.getByLabelText('Mark 1'), { target: { value: 'open' } })
    expect(out()).toEqual({ id: 'stall', label: 'Stall', unique: true, marks: { open: { entity: '$', at: 'you' } } })
  })
})

describe('the thing form', () => {
  function Harness({ start }: { start: EntityDef }) {
    const [value, setValue] = useState<EntityDef>(start)
    return (
      <>
        <ThingFields value={value} names={{ ...names, kinds: ['item'], holders: ['character:ava'] }} onChange={setValue} />
        <output data-testid="out">{JSON.stringify(value)}</output>
      </>
    )
  }
  const out = () => JSON.parse(screen.getByTestId('out').textContent!)

  it('places it with holders', () => {
    render(<Harness start={{ id: 'bun', of: 'item', name: 'Bun' }} />)
    fireEvent.click(screen.getByText('+ Add a holder'))
    expect(out().at).toBe('player')
    fireEvent.click(screen.getByText('+ Add a holder'))
    expect(out().at).toEqual({ player: 1, 'character:ava': 1 })
    fireEvent.change(screen.getByLabelText('Holder 2 count'), { target: { value: '6' } })
    expect(out().at).toEqual({ player: 1, 'character:ava': 6 })
    fireEvent.click(screen.getByLabelText('Remove holder 1'))
    expect(out().at).toEqual({ 'character:ava': 6 })
  })

  it('adds the first-party traits as forms, and keeps others as JSON', () => {
    render(<Harness start={{ id: 'hat', of: 'item', name: 'Hat', traits: { 'laundry/washable': { temp: 30 } } }} />)
    fireEvent.click(screen.getByText('+ Wearable'))
    fireEvent.change(screen.getByLabelText('Slot'), { target: { value: 'head' } })
    fireEvent.click(screen.getByText('+ Sellable'))
    expect(out().traits).toEqual({ 'laundry/washable': { temp: 30 }, 'wardrobe/wearable': { slot: 'head' }, 'shop/sellable': { price: { coins: 1 } } })
    fireEvent.click(screen.getByText('+ Usable'))
    fireEvent.change(screen.getByLabelText('Use label'), { target: { value: 'Put it on' } })
    expect(out().traits['inventory/usable']).toEqual({ label: 'Put it on', effects: [] })
    fireEvent.click(screen.getByText('+ Person'))
    fireEvent.change(screen.getByLabelText('Talk scene'), { target: { value: 'home' } })
    expect(out().traits['cast/person']).toEqual({ talk: 'home' })
    const trait = document.getElementById('trait-wardrobe/wearable')!
    fireEvent.click(within(trait).getByText('Remove'))
    expect(out().traits['wardrobe/wearable']).toBeUndefined()
    expect(out().traits['laundry/washable']).toEqual({ temp: 30 })
  })
})
