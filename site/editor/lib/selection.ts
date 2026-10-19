/**
 * What the editor has open, and the address that names it, so a link or a
 * reload opens the same place: `/editor#scene/market/buy`.
 */
import type { Thing } from './references.ts'

export type Selection = { thing: 'project'; field?: string } | { thing: Thing; id: string; choice?: string; field?: string }

/** What `#scene/market/buy` names: a scene and one of its choices, or a stat, kind, thing or kv key. */
export function selectionFromHash(hash: string): Selection | null {
  const [thing, id, choice] = decodeURIComponent(hash.replace(/^#/, '')).split('/')
  if (thing === 'project') return { thing: 'project' }
  if ((thing === 'scene' || thing === 'stat' || thing === 'kind' || thing === 'thing' || thing === 'kv') && id)
    return { thing, id, ...(thing === 'scene' && choice ? { choice } : {}) }
  return null
}

export function hashOf(selection: Selection): string {
  if (selection.thing === 'project') return '#project'
  return `#${selection.thing}/${encodeURIComponent(selection.id)}${selection.thing === 'scene' && selection.choice ? `/${encodeURIComponent(selection.choice)}` : ''}`
}
