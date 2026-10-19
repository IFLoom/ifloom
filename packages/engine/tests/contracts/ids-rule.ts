import type { Content } from '../../src/loader.ts'

/**
 * One separator rule for ids (ADR 0010), for the contract tests that hold the
 * examples, the templates and the first-party plugins' content to it:
 *
 * - an id is letters, digits, `-` and `_`, in parts joined by `.`;
 * - `/` names a plugin: `quests/done`, `calendar/period.morning`;
 * - `#` is a choice in a scene, or a reply to a message: `ch1.mat#open`;
 * - `:` is a reference with what it is in front: `character:ava`, `mod:naps`.
 */
export const PART = '[A-Za-z0-9_-]+'
export const ID = new RegExp(`^${PART}(\\.${PART})*$`)
export const PLUGIN_NAME = new RegExp(`^[a-z0-9-]+/${PART}(\\.${PART})*$`)
export const CHOICE = new RegExp(`^${PART}(\\.${PART})*#${PART}(\\.${PART})*$`)
export const PROSE_KEY = new RegExp(`^${PART}(\\.${PART})*(#${PART}(\\.${PART})*)?$`)
export const REFERENCE = new RegExp(`^[a-z0-9-]+:${PART}(\\.${PART})*$`)

/** Every place in a value that breaks the rule, with the path to it. */
export function offences(value: unknown, path: string, out: string[] = []): string[] {
  if (Array.isArray(value)) {
    value.forEach((inner, n) => offences(inner, `${path}[${n}]`, out))
    return out
  }
  if (!value || typeof value !== 'object') return out
  for (const [key, inner] of Object.entries(value)) {
    const at = `${path}.${key}`
    // A key with a `/` is a plugin's call or string.
    if (key.includes('/') && !PLUGIN_NAME.test(key)) out.push(`${at}: "${key}" is not plugin/name`)
    if (typeof inner === 'string') {
      if (key === 'id' && !ID.test(inner)) out.push(`${at}: "${inner}" is not an id`)
      if (key === 'chose' && !CHOICE.test(inner)) out.push(`${at}: "${inner}" is not scene#choice`)
      if ((key === 'custom' || key === 'name') && inner.includes('/') && !PLUGIN_NAME.test(inner)) out.push(`${at}: "${inner}" is not plugin/name`)
      if ((key === 'of' || key === 'entity') && inner.includes(':') && !REFERENCE.test(inner)) out.push(`${at}: "${inner}" is not kind:id`)
    }
    offences(inner, at, out)
  }
  return out
}

/** Content's prose keys and variants' members that break the rule, named by where it is. */
export function proseOffences(pack: Content, where: string): string[] {
  const keys = [
    ...Object.keys(pack.prose ?? {}),
    ...Object.values(pack.variants ?? {})
      .flat()
      .map((member) => (typeof member === 'string' ? member : member.text)),
  ]
  return keys.filter((key) => !PROSE_KEY.test(key)).map((key) => `${where} prose: "${key}" is not an id, or scene#choice`)
}
