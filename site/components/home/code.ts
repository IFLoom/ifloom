// The content the homepage types out, and a small highlighter for it. It runs as
// written: loadGame([cafe, { introScene: 'counter' }], { id, title }) reports no
// problems, and its view is what the output panel beside it shows.

export const LINES = [
  `import type { Content } from '@ifloom/engine'`,
  ``,
  `export const cafe: Content = {`,
  `  stats: [`,
  `    { id: 'coins', label: 'Coins', start: 3,`,
  `      format: '£{n}', spendable: true },`,
  `  ],`,
  `  scenes: [{`,
  `    id: 'counter',`,
  `    title: 'The Corner Café',`,
  `    body: [{ text: 'counter' }],`,
  `    choices: [`,
  `      { id: 'tea',`,
  `        effects: [{ stat: 'coins', by: -2 }] },`,
  `      { id: 'cake',`,
  `        effects: [{ stat: 'coins', by: -5 }],`,
  `        blocked: [{`,
  `          when: { stat: 'coins', lt: 5 },`,
  `          reason: 'You only have £3 on you.',`,
  `        }] },`,
  `    ],`,
  `  }],`,
  `  prose: {`,
  `    counter: 'A lemon cake sits under a glass dome.',`,
  `    'counter#tea': 'A pot of tea',`,
  `    'counter#cake': 'A slice of lemon cake',`,
  `  },`,
  `}`,
]

export type Token = { c: string; t: string }

const PATTERN =
  /(\/\/.*$)|('(?:[^'\\]|\\.)*')|\b(import|from|export|const|type)\b|\b(Content)\b|(-?\b\d+\b)|\b(true|false)\b|([A-Za-z_]\w*)(?=\s*:)|([{}[\](),:])/g
const CLASSES = ['com', 'str', 'kw', 'ty', 'num', 'bool', 'key', 'pun']

export function tokenize(line: string): Token[] {
  const out: Token[] = []
  let last = 0
  for (const m of line.matchAll(PATTERN)) {
    if (m.index > last) out.push({ c: '', t: line.slice(last, m.index) })
    const group = m.slice(1).findIndex((g) => g !== undefined)
    out.push({ c: CLASSES[group] ?? '', t: m[0] })
    last = m.index + m[0].length
  }
  if (last < line.length) out.push({ c: '', t: line.slice(last) })
  return out
}

export const TOKENS = LINES.map(tokenize)

// Where each line starts in the whole text, counting a newline after each.
export const STARTS = LINES.reduce<number[]>((acc, _line, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + LINES[i - 1].length + 1)
  return acc
}, [])
export const TOTAL = STARTS[STARTS.length - 1] + LINES[LINES.length - 1].length

/** The first `count` characters of a line, still highlighted. */
export function cut(tokens: Token[], count: number): Token[] {
  const out: Token[] = []
  let left = count
  for (const token of tokens) {
    if (left <= 0) break
    out.push(token.t.length <= left ? token : { c: token.c, t: token.t.slice(0, left) })
    left -= token.t.length
  }
  return out
}

/** The index of the first line containing `text`. */
export function lineOf(text: string): number {
  const i = LINES.findIndex((line) => line.includes(text))
  if (i < 0) throw new Error(`No line has ${text}`)
  return i
}
