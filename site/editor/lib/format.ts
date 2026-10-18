/**
 * Writes plain data as TypeScript, the way the examples are written: single
 * quotes, bare keys where they can be, two-space indents, and an object or a
 * list on one line when it fits, broken one entry a line with trailing commas
 * when it doesn't.
 */

/** Written into the output as it is: a name such as `SCHEMA`, not a string. */
export class Raw {
  constructor(readonly code: string) {}
}

export type FormatOptions = {
  /** The longest a line may be before an object or a list breaks. 120 if left out. */
  width?: number
  /** Keys whose value always breaks, one entry a line, even if it would fit. */
  alwaysBreak?: (key: string | null, depth: number) => boolean
}

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/

/** A string as a single-quoted literal. */
export function quote(text: string): string {
  return `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')}'`
}

/** An object key: bare when it is an identifier, quoted when not. */
export function key(name: string): string {
  return IDENTIFIER.test(name) ? name : quote(name)
}

function entries(value: object): [string, unknown][] {
  return Object.entries(value).filter(([, v]) => v !== undefined)
}

/** The value on one line. */
function inline(value: unknown): string {
  if (value instanceof Raw) return value.code
  if (value === null) return 'null'
  if (typeof value === 'string') return quote(value)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return `[${value.map(inline).join(', ')}]`
  if (typeof value === 'object') {
    const parts = entries(value).map(([k, v]) => `${key(k)}: ${inline(v)}`)
    return parts.length ? `{ ${parts.join(', ')} }` : '{}'
  }
  return 'undefined'
}

/**
 * The value as TypeScript. `indent` is where the value's own line starts and
 * `prefix` is what comes before it on that line (`key: `), so the width check
 * counts the whole line.
 */
export function formatTs(value: unknown, options: FormatOptions = {}, indent = 0, prefix = 0, name: string | null = null): string {
  const width = options.width ?? 120
  const one = inline(value)
  const depth = indent / 2
  const mustBreak = options.alwaysBreak?.(name, depth) ?? false
  const container = value !== null && typeof value === 'object' && !(value instanceof Raw)
  // A trailing comma follows most values, so count it.
  if (!container || (!mustBreak && indent + prefix + one.length + 1 <= width)) return one
  const pad = ' '.repeat(indent + 2)
  const close = ' '.repeat(indent)
  if (Array.isArray(value)) {
    if (!value.length) return '[]'
    const lines = value.map((item) => `${pad}${formatTs(item, options, indent + 2, 0, null)},`)
    return `[\n${lines.join('\n')}\n${close}]`
  }
  const list = entries(value as object)
  if (!list.length) return '{}'
  const lines = list.map(([k, v]) => {
    const head = `${key(k)}: `
    return `${pad}${head}${formatTs(v, options, indent + 2, head.length, k)},`
  })
  return `{\n${lines.join('\n')}\n${close}}`
}

/** A name for an exported constant, from a pack id: `my-story` gives `myStory`. */
export function constName(id: string): string {
  const words = id.split(/[^A-Za-z0-9]+/).filter(Boolean)
  const camel = words.map((word, i) => (i === 0 ? word.charAt(0).toLowerCase() + word.slice(1) : word.charAt(0).toUpperCase() + word.slice(1))).join('')
  if (!camel) return 'pack'
  if (/^[0-9]/.test(camel)) return `pack${camel.charAt(0).toUpperCase()}${camel.slice(1)}`
  return RESERVED.has(camel) ? `${camel}Pack` : camel
}

const RESERVED = new Set(
  'break case catch class const continue debugger default delete do else enum export extends false finally for function if import in instanceof new null return super switch this throw true try typeof var void while with yield let static implements interface package private protected public await'.split(
    ' ',
  ),
)
