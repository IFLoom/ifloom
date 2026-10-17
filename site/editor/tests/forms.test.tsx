// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import type { Condition, EffectRef } from '@ifloom/engine'
import { ConditionBuilder } from '../components/ConditionBuilder'
import { EditorContext, namesOf, type Selection } from '../components/context'
import { EffectList } from '../components/EffectBuilder'
import { SceneForm } from '../components/forms/SceneForm'
import { problemsOf } from '../lib/game'
import { sampleProject, type Project } from '../lib/model'
import { problemTarget } from '../lib/references'

afterEach(cleanup)

const names = { scenes: ['market', 'home'], stats: ['coins'], items: ['bun'], kv: ['met'], choices: ['market#buy'], sets: ['market'] }

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
      { kind: 'item', item: 'bun', by: 1 },
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
