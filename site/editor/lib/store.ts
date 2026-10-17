/**
 * Projects in IndexedDB, one record a project. The factory is passed in, so
 * the editor gives the browser's `indexedDB` and tests give fake-indexeddb.
 * Nothing here runs until it's called, so the static build never touches it.
 */
import { upgradeProject, type Project } from './model.ts'

export type ProjectStore = {
  /** Every project, most recently changed first. */
  list: () => Promise<Project[]>
  get: (id: string) => Promise<Project | undefined>
  put: (project: Project) => Promise<void>
  remove: (id: string) => Promise<void>
}

const STORE = 'projects'

function done<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export function projectStore(factory: IDBFactory, name = 'ifloom-editor'): ProjectStore {
  let opened: Promise<IDBDatabase> | undefined
  const db = () =>
    (opened ??= new Promise((resolve, reject) => {
      const request = factory.open(name, 1)
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' })
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    }))
  const store = async (mode: IDBTransactionMode) => (await db()).transaction(STORE, mode).objectStore(STORE)
  return {
    async list() {
      const all = (await done((await store('readonly')).getAll())) as Project[]
      return all.map(upgradeProject).sort((a, b) => b.updated - a.updated)
    },
    async get(id) {
      const project = (await done((await store('readonly')).get(id))) as Project | undefined
      return project && upgradeProject(project)
    },
    async put(project) {
      await done((await store('readwrite')).put(project))
    },
    async remove(id) {
      await done((await store('readwrite')).delete(id))
    },
  }
}
