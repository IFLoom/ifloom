import { describe, expect, it } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { duplicateProject, newProject, sampleProject } from '../lib/model.ts'
import { projectStore } from '../lib/store.ts'

describe('the project store', () => {
  it('keeps, lists, updates and removes projects', async () => {
    const store = projectStore(new IDBFactory())
    const a = { ...newProject('A'), updated: 1 }
    const b = { ...sampleProject(), updated: 2 }
    await store.put(a)
    await store.put(b)
    expect((await store.list()).map((p) => p.title)).toEqual(['Market day', 'A'])
    await store.put({ ...a, title: 'A again', updated: 3 })
    expect((await store.list()).map((p) => p.title)).toEqual(['A again', 'Market day'])
    expect((await store.get(b.id))?.pack).toEqual(b.pack)
    await store.remove(a.id)
    expect((await store.list()).map((p) => p.id)).toEqual([b.id])
    expect(await store.get(a.id)).toBeUndefined()
  })

  it('keeps a duplicate apart from its original', async () => {
    const store = projectStore(new IDBFactory())
    const original = sampleProject()
    const copy = duplicateProject(original)
    copy.pack.scenes.pop()
    await store.put(original)
    await store.put(copy)
    expect(copy.id).not.toBe(original.id)
    expect(copy.title).toBe('Market day (copy)')
    expect((await store.get(original.id))?.pack.scenes).toHaveLength(3)
    expect((await store.get(copy.id))?.pack.scenes).toHaveLength(2)
  })

  it('survives being opened again', async () => {
    const factory = new IDBFactory()
    const project = newProject()
    await projectStore(factory).put(project)
    expect((await projectStore(factory).list()).map((p) => p.id)).toEqual([project.id])
  })
})
