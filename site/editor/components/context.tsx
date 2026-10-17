'use client'
/**
 * The open project, shared by the outline, the forms, the preview and the
 * problems list: what's selected, how to change the project, and the ids
 * the pickers offer.
 */
import { createContext, useContext } from 'react'
import type { Problem } from '@ifloom/engine'
import type { Names } from '../lib/builders'
import type { Project } from '../lib/model'
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
  /** Make a scene, stat, item or kv key that "Add new…" named. */
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

/** The pickers' ids, from the pack: scene ids, stats, items, kv keys, `scene#choice` pairs and storylet sets. */
export function namesOf(project: Project): Names {
  const { pack } = project
  return {
    scenes: pack.scenes.map((s) => s.id),
    stats: pack.stats.map((s) => s.id),
    items: pack.items.map((i) => i.id),
    kv: project.kv.map((v) => v.name),
    choices: pack.scenes.flatMap((s) => s.choices.map((c) => `${s.id}#${c.id}`)),
    sets: [...new Set(pack.scenes.flatMap((s) => s.drawnFrom ?? []))],
  }
}
