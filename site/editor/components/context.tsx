'use client'
/**
 * The open project, shared by the outline, the forms, the preview and the
 * problems list: what's selected, how to change the project, and the ids
 * the pickers offer.
 */
import { createContext, useContext } from 'react'
import type { Problem } from '@ifloom/engine'
import type { Names } from '../lib/builders'
import { PLUGIN_HOLDER_KINDS, type Project } from '../lib/model'
import type { ProblemTarget, Thing } from '../lib/references'
import type { Selection } from '../lib/selection'

export type { Selection } from '../lib/selection'

export type EditorContextValue = {
  project: Project
  /** Change the project: the function gets a copy to change in place. */
  update: (change: (draft: Project) => void) => void
  /** Swap the project for a new one, as renaming does. */
  replace: (project: Project) => void
  selection: Selection
  select: (selection: Selection) => void
  /** Make a scene, stat, thing or kv key that "Add new…" named. */
  create: (thing: Thing, id: string) => void
  names: Names
  problems: Problem[]
  /** Where each problem points. */
  targets: ProblemTarget[]
  /** Play the selected scene in the preview. */
  playFrom: (scene: string) => void
}

export const EditorContext = createContext<EditorContextValue | null>(null)

export function useEditor(): EditorContextValue {
  const value = useContext(EditorContext)
  if (!value) throw new Error('useEditor is used outside the editor.')
  return value
}

/** The ids of a plugin's content list, `data.places.locations`, as references of a kind: `location:cafe`. */
function pluginRefs(data: unknown, plugin: string, list: string, kind: string): string[] {
  const entries = (data as Record<string, Record<string, unknown> | undefined> | undefined)?.[plugin]?.[list]
  return Array.isArray(entries) ? entries.flatMap((entry) => (typeof entry?.id === 'string' ? [`${kind}:${entry.id}`] : [])) : []
}

/**
 * The pickers' ids, from the pack: scene ids, stats, things (by reference),
 * kv keys, `scene#choice` pairs, storylet sets, kinds, and the unique entities
 * that can hold things: the pack's own, and the places' locations and the
 * shop's vendors its plugin content declares.
 */
export function namesOf(project: Project): Names {
  const { pack } = project
  const unique = new Set<string>([...PLUGIN_HOLDER_KINDS, ...(pack.kinds ?? []).filter((k) => k.unique).map((k) => k.id)])
  const things = pack.entities.map((entity) => `${entity.of}:${entity.id}`)
  return {
    scenes: pack.scenes.map((s) => s.id),
    stats: pack.stats.map((s) => s.id),
    things,
    kv: project.kv.map((v) => v.name),
    choices: pack.scenes.flatMap((s) => s.choices.map((c) => `${s.id}#${c.id}`)),
    sets: [...new Set(pack.scenes.flatMap((s) => s.drawnFrom ?? []))],
    kinds: [...new Set([...(pack.kinds ?? []).map((k) => k.id), ...pack.entities.map((e) => e.of)])],
    holders: [
      ...things.filter((ref) => unique.has(ref.split(':')[0])),
      ...pluginRefs(pack.data, 'places', 'locations', 'location'),
      ...pluginRefs(pack.data, 'shop', 'vendors', 'vendor'),
    ],
  }
}
