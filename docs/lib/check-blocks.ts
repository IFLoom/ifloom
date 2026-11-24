/**
 * Type-checks the code blocks the docs write in the page, so what a page shows
 * is code that compiles against the packages as they are.
 *
 * Every ```ts, ```tsx and ```typescript block in the latest docs (not the
 * released versions, not the changelog) is one of three things, by a word in
 * its fence's meta:
 *
 *   ```ts            compiled. The block is a module of its own, so it imports
 *                    what it uses, as a reader copying it would need. The four
 *                    names every page means the same thing by are in scope
 *                    without an import: see PRELUDE.
 *   ```ts shape      a type's or function's shape, shown for reading:
 *                    `type X = { … }`, `interface X { … }`, `function f(…): R`,
 *                    with `import` lines saying where they come from if it
 *                    likes. Each name it declares must be exported by a
 *                    package. A type's fields must be the real type's, each
 *                    with its `?`, and (when neither type is generic) each
 *                    holds what the real field holds. A function takes what
 *                    the block says, parameter by parameter, each optional or
 *                    not, and returns what it says. A block that shows only
 *                    some fields says so with a last line `// …` inside the
 *                    braces. The names it uses are imported for it from the
 *                    packages, the page's own package first.
 *   ```ts fragment   not checked: a field excerpt, a lone object, a sketch.
 *
 * A compiled block may go on from the compiled block before it on the page,
 * using what that one declared: `continues` (```` ```ts continues ````) puts it
 * in the same module, after the blocks it continues.
 *
 * The words sit before the fence's other meta, `tab="React"` and the like
 * (```` ```tsx fragment tab="React" ````). The site ignores them.
 *
 * `@ifloom/*` resolve to the packages' source through the `ifloom-source`
 * condition, with docs/snippets/tsconfig.json's options (unused names
 * allowed), as if each block were a file in docs/snippets/. A relative import
 * is the reader's own file: `./game.ts` (or `./src/game.ts`) is a game module
 * from `defineGame`, and anything else is loose (`any`). A block's
 * `declare module` is seen by every block, as it would be across a game.
 *
 * `docs/snippets/tests/doc-blocks.test.ts` runs it, and
 * `node docs/lib/check-blocks.ts` prints what it finds.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

export type Marker = 'shape' | 'fragment' | null

/** One fenced TypeScript block of a page. */
export type Block = {
  /** The page, relative to the docs' content folder, such as `(latest)/reference/runner.md`. */
  page: string
  /** The fence's line in the page, from 1. */
  line: number
  lang: 'ts' | 'tsx'
  marker: Marker
  /** Compiled after the blocks before it on the page that it continues. */
  continues: boolean
  meta: string
  code: string
}

/** What's wrong at a line of a page, in the block whose fence is at `block`. */
export type Problem = { page: string; block: number; line: number; message: string }

const LANGS: Record<string, 'ts' | 'tsx'> = { ts: 'ts', tsx: 'tsx', typescript: 'ts' }

/** The TypeScript blocks of a page's Markdown, with their markers. */
export function blocksOf(source: string, page: string): Block[] {
  const lines = source.split('\n')
  const blocks: Block[] = []
  for (let at = 0; at < lines.length; at++) {
    const open = /^(\s*)(`{3,})(\S*)\s*(.*)$/.exec(lines[at])
    if (!open) continue
    const [, indent, fence, lang, meta] = open
    let end = at + 1
    while (end < lines.length && !new RegExp(`^\\s*${fence}\`*\\s*$`).test(lines[end])) end++
    const words = meta.trim().split(/\s+/)
    if (LANGS[lang]) {
      blocks.push({
        page,
        line: at + 1,
        lang: LANGS[lang],
        marker: words.includes('shape') ? 'shape' : words.includes('fragment') ? 'fragment' : null,
        continues: words.includes('continues'),
        meta,
        code: lines
          .slice(at + 1, end)
          .map((line) => (line.startsWith(indent) ? line.slice(indent.length) : line))
          .join('\n'),
      })
    }
    at = end
  }
  return blocks
}

const here = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(here, '../..')
const CONTENT = join(ROOT, 'docs/content/docs')
const LATEST = join(CONTENT, '(latest)')
/** Where the blocks seem to live, so `@ifloom/*`, React and the rest resolve as they do for the snippets. */
const HOME = join(ROOT, 'docs/snippets/.blocks')

/** Every TypeScript block of the latest docs. */
export function docBlocks(): Block[] {
  const pages: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (/\.mdx?$/.test(entry.name) && entry.name !== 'changelog.md') pages.push(path)
    }
  }
  walk(LATEST)
  return pages.sort().flatMap((path) => blocksOf(readFileSync(path, 'utf8'), relative(CONTENT, path)))
}

/**
 * The names a compiled block may use without importing them, each what every
 * page means by it: the loaded game, a state of it, the runner and its view.
 */
export const PRELUDE = `import type { Game, GameState, Runner, View } from '@ifloom/engine'
declare global {
  /** The game, as \`loadGame\` or a game module's \`build()\` gives it. */
  const game: Game
  /** A state of the game. */
  const state: GameState
  /** The game's runner. */
  const runner: Runner
  /** A view of the game. */
  const view: View
}
export {}
`

/** The entries a shape block's names are looked up in, in order. */
export const ENTRIES = [
  '@ifloom/engine',
  '@ifloom/engine/plugin',
  '@ifloom/engine/testing',
  '@ifloom/browser',
  '@ifloom/audio',
  '@ifloom/react',
  '@ifloom/react/kit',
  '@ifloom/cli',
  '@ifloom/cli/game',
  '@ifloom/cli/vite',
  ...[
    'achievements',
    'calendar',
    'cast',
    'cheats',
    'debug',
    'devices',
    'feed',
    'generators',
    'inventory',
    'jobs',
    'messages',
    'places',
    'quests',
    'shop',
    'statuses',
    'unlocks',
    'wardrobe',
  ].flatMap((plugin) => [`@ifloom/plugin-${plugin}`, `@ifloom/plugin-${plugin}/react`]),
]

/** The compiler options the blocks are checked with: docs/snippets/tsconfig.json's, unused names allowed. */
export function compilerOptions(): ts.CompilerOptions {
  const config = ts.getParsedCommandLineOfConfigFile(
    join(ROOT, 'docs/snippets/tsconfig.json'),
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
      },
    },
  )
  if (!config) throw new Error('no docs/snippets/tsconfig.json')
  return { ...config.options, noUnusedLocals: false, noUnusedParameters: false, noEmit: true }
}

/** A relative import's stand-in: the names the block imports from it, loose, and a game module for `game.ts`. */
function stub(specifier: string, clause: string): string {
  const isGame = /(^|\/)game(\.ts)?$/.test(specifier)
  const lines = isGame
    ? [`import type { GameModule } from '@ifloom/cli/game'`, `declare const module: GameModule`, `export default module`]
    : [`declare const loose: any`, `export default loose`]
  const named = /\{([^}]*)\}/.exec(clause)?.[1] ?? ''
  for (const part of named.split(',')) {
    const name = part
      .trim()
      .replace(/^type\s+/, '')
      .split(/\s+as\s+/)[0]
      .trim()
    if (name) lines.push(`export declare const ${name}: any`, `export type ${name} = any`)
  }
  return lines.join('\n') + '\n'
}

type Unit = { file: string; blocks: Block[]; text: string; offsets: { block: Block; start: number }[] }

/** Each compiled block, or run of blocks that continue one another, as a module. */
function unitsOf(blocks: Block[], orphans: Block[]): Unit[] {
  const units: Unit[] = []
  // The last module on the page for each tab, '' for blocks with none: a tab goes on from its own blocks.
  let page = ''
  let last = new Map<string, Unit>()
  for (const block of blocks) {
    if (block.marker) continue
    if (block.page !== page) [page, last] = [block.page, new Map()]
    const tab = /\btab="([^"]*)"/.exec(block.meta)?.[1] ?? ''
    const before = last.get(tab)
    if (block.continues && !before) orphans.push(block)
    if (block.continues && before) {
      before.offsets.push({ block, start: before.text.length + 1 })
      before.text += '\n' + block.code + '\n'
      before.blocks.push(block)
      if (block.lang === 'tsx' && before.file.endsWith('.ts')) before.file += 'x'
      continue
    }
    const id = `${block.page.replace(/[^a-zA-Z0-9]+/g, '_')}_L${block.line}`
    const unit = { file: join(HOME, id, 'a/b/c', `block.${block.lang}`), blocks: [block], text: block.code + '\n', offsets: [{ block, start: 0 }] }
    last.set(tab, unit)
    units.push(unit)
  }
  return units
}

/** The entries a page's own package has, looked in first for a shape block's names. */
function homeEntries(page: string): string[] {
  const plugin = /\/plugins\/([a-z-]+)\.md$/.exec(page)?.[1] ?? /\/api\/plugin-([a-z-]+)\.md$/.exec(page)?.[1]
  if (plugin) return [`@ifloom/plugin-${plugin}`, `@ifloom/plugin-${plugin}/react`]
  if (/\/api\/react(-kit)?\.md$/.test(page)) return ['@ifloom/react', '@ifloom/react/kit']
  if (/\/api\/(browser|audio)\.md$/.test(page)) return ['@ifloom/browser', '@ifloom/audio']
  if (/\/api\/cli(-game|-vite)?\.md$/.test(page)) return ['@ifloom/cli', '@ifloom/cli/game', '@ifloom/cli/vite']
  if (page.includes('/react/')) return ['@ifloom/react', '@ifloom/react/kit']
  if (page.includes('/browser/')) return ['@ifloom/browser', '@ifloom/audio']
  if (page.includes('/cli/')) return ['@ifloom/cli', '@ifloom/cli/game', '@ifloom/cli/vite']
  return []
}

/** A shape block as a module: its imports blanked out, with the names it uses imported from the entries. */
type Shape = {
  file: string
  block: Block
  header: number
  source: ts.SourceFile
  imported: Map<string, string>
  functions: Map<string, ts.Signature[]>
  types: Map<string, ts.TypeAliasDeclaration | ts.InterfaceDeclaration>
}

function blank(text: string, start: number, end: number): string {
  return text.slice(0, start) + text.slice(start, end).replace(/[^\n]/g, ' ') + text.slice(end)
}

/** The names each entry exports, as `name → entry → symbol`, read through a module that imports them all. */
function exportsOf(program: ts.Program, probe: string): Map<string, Map<string, ts.Symbol>> {
  const checker = program.getTypeChecker()
  const names = new Map<string, Map<string, ts.Symbol>>()
  for (const statement of program.getSourceFile(probe)!.statements) {
    if (!ts.isImportDeclaration(statement)) continue
    const entry = (statement.moduleSpecifier as ts.StringLiteral).text
    const module = checker.getSymbolAtLocation(statement.moduleSpecifier)
    if (!module) continue
    for (const symbol of checker.getExportsOfModule(module)) {
      const byEntry = names.get(symbol.name) ?? new Map<string, ts.Symbol>()
      byEntry.set(entry, symbol)
      names.set(symbol.name, byEntry)
    }
  }
  return names
}

/** The declarations a shape block shows, by name. */
function declaredIn(source: ts.SourceFile): Map<string, ts.Statement> {
  const declared = new Map<string, ts.Statement>()
  for (const statement of source.statements) {
    if ((ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isFunctionDeclaration(statement)) && statement.name) {
      if (!declared.has(statement.name.text)) declared.set(statement.name.text, statement)
    } else if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) if (ts.isIdentifier(declaration.name)) declared.set(declaration.name.text, statement)
    }
  }
  return declared
}

/** Codes a shape block may break: it declares without implementing. */
const SHAPE_ALLOWED = new Set([
  2391, // Function implementation is missing.
  1155, // 'const' declarations must be initialized.
  2384, // Overload signatures must all be ambient or non-ambient.
])

/** The package folder a file is in, such as `/…/packages/engine/`. */
const packageOf = (file: string) => /^.*\/(?:packages|examples)\/[^/]+\//.exec(file)?.[0] ?? file

const ellipsis = /^\s*\/\/\s*(…|\.\.\.)\s*$/m

/** The members a type literal or interface shows, with whether each is optional, and whether it shows only some (`// …` last). */
function membersOf(node: ts.Node, source: ts.SourceFile): { members: Map<string, boolean>; some: boolean } | null {
  const body = ts.isInterfaceDeclaration(node) ? node : ts.isTypeAliasDeclaration(node) && ts.isTypeLiteralNode(node.type) ? node.type : null
  if (!body) return null
  const members = new Map<string, boolean>()
  for (const member of body.members) {
    if (!member.name || !(ts.isIdentifier(member.name) || ts.isStringLiteral(member.name))) continue
    members.set(member.name.text, member.questionToken !== undefined)
  }
  const text = source.text.slice(body.members.end, body.end)
  return { members, some: ellipsis.test(text) }
}

/** A function's call signatures, or a component's (`ComponentType` is a union of a function and a class). */
function signaturesOf(type: ts.Type): readonly ts.Signature[] {
  const own = type.getCallSignatures()
  if (own.length || !type.isUnion()) return own
  return type.types.flatMap((each) => each.getCallSignatures())
}

/** A signature as its declaration writes it, such as `(game: Game, id: string): SceneDef | undefined`. */
function signatureText(signature: ts.Signature): string {
  const declaration = signature.getDeclaration() as ts.SignatureDeclaration | undefined
  if (!declaration) return '(…)'
  const parameters = declaration.parameters
    .map((parameter) => {
      const optional = parameter.questionToken || parameter.initializer ? '?' : ''
      const name = ts.isIdentifier(parameter.name) ? parameter.name.text : 'options'
      return `${parameter.dotDotDotToken ? '...' : ''}${name}${optional}${parameter.type ? `: ${parameter.type.getText()}` : ''}`
    })
    .join(', ')
  const generics = declaration.typeParameters ? `<${declaration.typeParameters.map((each) => each.getText()).join(', ')}>` : ''
  return `${generics}(${parameters})${declaration.type ? `: ${declaration.type.getText()}` : ''}`.replace(/\s+/g, ' ')
}

/** A field's type as its declaration writes it, else as the checker prints it. */
function typeText(checker: ts.TypeChecker, property: ts.Symbol, type: ts.Type): string {
  const declaration = property.valueDeclaration
  const node = declaration && (ts.isPropertySignature(declaration) || ts.isPropertyDeclaration(declaration)) ? declaration.type : undefined
  return node ? node.getText().replace(/\s+/g, ' ') : checker.typeToString(type)
}

/** A component's return as a block writes it: `JSX.Element`, `ReactNode`, either `| null`. */
const isComponentReturn = (text: string | undefined) => !!text && /^(React\.)?(JSX\.Element|ReactNode|ReactElement)( \| null)?$/.test(text)

/**
 * Whether a signature a block shows is the real one: its parameters, each optional or not, and, when neither is
 * generic, that the function takes what the block says each parameter takes and returns what it says it returns.
 */
function matches(checker: ts.TypeChecker, shown: ts.Signature, real: ts.Signature): boolean {
  const shownDeclaration = shown.getDeclaration() as ts.SignatureDeclaration
  const realDeclaration = real.getDeclaration() as ts.SignatureDeclaration | undefined
  if (!realDeclaration) return true
  const shownParameters = shownDeclaration.parameters
  const realParameters = realDeclaration.parameters
  // A component a block shows with no props takes none it needs.
  if (isComponentReturn(shownDeclaration.type?.getText()) && realParameters.length === 1) {
    const props = checker.getTypeOfSymbol(real.parameters[0])
    if (!shownParameters.length) return checker.getPropertiesOfType(props).every((property) => property.flags & ts.SymbolFlags.Optional)
    return shownParameters.length === 1 && checker.isTypeAssignableTo(checker.getTypeOfSymbol(shown.parameters[0]), props)
  }
  if (shownParameters.length !== realParameters.length) return false
  const optional = (parameter: ts.ParameterDeclaration) =>
    parameter.questionToken !== undefined || parameter.initializer !== undefined || parameter.dotDotDotToken !== undefined
  if (shownParameters.some((parameter, index) => optional(parameter) !== optional(realParameters[index]))) return false
  if (shown.getTypeParameters()?.length || real.getTypeParameters()?.length) return true
  for (let index = 0; index < shownParameters.length; index++) {
    // What the block says a parameter takes, the function must take.
    // An optional parameter with a default has no `undefined` in its type, so compare them without it.
    const strip = (type: ts.Type) => (optional(shownParameters[index]) ? checker.getNonNullableType(type) : type)
    if (!checker.isTypeAssignableTo(strip(checker.getTypeOfSymbol(shown.parameters[index])), strip(checker.getTypeOfSymbol(real.parameters[index]))))
      return false
  }
  if (isComponentReturn(shownDeclaration.type?.getText())) return true
  return checker.isTypeAssignableTo(real.getReturnType(), shown.getReturnType())
}

/** Problems in the blocks: each TypeScript error, at its block, and each shape that isn't its type's. */
export function checkBlocks(blocks: Block[] = docBlocks()): Problem[] {
  const orphans: Block[] = []
  const units = unitsOf(blocks, orphans)
  const files = new Map<string, string>()
  const prelude = join(HOME, 'prelude.d.ts')
  const probe = join(HOME, 'entries.ts')
  files.set(prelude, PRELUDE)
  files.set(probe, [...ENTRIES, 'react'].map((entry, index) => `import * as e${index} from '${entry}'`).join('\n') + '\nexport {}\n')
  for (const unit of units) {
    files.set(unit.file, unit.text)
    for (const match of unit.text.matchAll(/^\s*import\s+(type\s+)?([^'"]*?)\s*from\s*['"](\.{1,2}\/[^'"]+)['"]/gm)) {
      const target = resolve(dirname(unit.file), match[3])
      const path = /\.[cm]?[jt]sx?$/.test(target) ? target.replace(/\.[cm]?js(x?)$/, '.ts$1') : `${target}.ts`
      const before = files.get(path)
      files.set(path, (before ?? '') + stub(match[3], match[2]))
    }
  }
  const options = compilerOptions()
  const host = ts.createCompilerHost(options, true)
  const disk = ts.createCompilerHost(options, true)
  host.fileExists = (path) => files.has(path) || disk.fileExists(path)
  host.directoryExists = (path) => path.startsWith(HOME) || (disk.directoryExists?.(path) ?? true)
  host.readFile = (path) => files.get(path) ?? disk.readFile(path)
  host.getSourceFile = (path, language, onError, create) => {
    const text = files.get(path)
    return text !== undefined ? ts.createSourceFile(path, text, language, true) : disk.getSourceFile(path, language, onError, create)
  }
  const roots = [prelude, probe, ...units.map((unit) => unit.file)]
  const first = ts.createProgram({ rootNames: roots, options, host })
  const names = exportsOf(first, probe)
  const globals = new Set(
    first
      .getTypeChecker()
      .getSymbolsInScope(first.getSourceFile(probe)!, ts.SymbolFlags.Type | ts.SymbolFlags.Value)
      .map((symbol) => symbol.name),
  )

  // Each shape block, with what it uses imported for it.
  const shapes: Shape[] = []
  for (const block of blocks) {
    if (block.marker !== 'shape') continue
    const id = `${block.page.replace(/[^a-zA-Z0-9]+/g, '_')}_L${block.line}`
    const parsed = ts.createSourceFile(
      `shape.${block.lang}`,
      block.code,
      ts.ScriptTarget.Latest,
      true,
      block.lang === 'tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    )
    let text = block.code
    const imported = new Map<string, string>()
    for (const statement of parsed.statements) {
      if (!ts.isImportDeclaration(statement)) continue
      const entry = (statement.moduleSpecifier as ts.StringLiteral).text
      const bindings = statement.importClause?.namedBindings
      // Another library's import stays, for the names the block uses from it; a package's goes, as the block declares them.
      if (!entry.startsWith('@ifloom/')) continue
      if (bindings && ts.isNamedImports(bindings)) for (const element of bindings.elements) imported.set(element.name.text, entry)
      text = blank(text, statement.getStart(parsed), statement.end)
    }
    const declared = declaredIn(parsed)
    const kept = new Set<string>()
    for (const statement of parsed.statements) {
      const bindings = ts.isImportDeclaration(statement) ? statement.importClause?.namedBindings : undefined
      if (
        ts.isImportDeclaration(statement) &&
        !(statement.moduleSpecifier as ts.StringLiteral).text.startsWith('@ifloom/') &&
        bindings &&
        ts.isNamedImports(bindings)
      )
        for (const element of bindings.elements) kept.add(element.name.text)
    }
    const order = [...homeEntries(block.page), ...ENTRIES, 'react']
    const used = new Set<string>()
    // Names used only as types, such as `Game` in `game: Game`, which on a React page is also a component.
    const asValue = new Set<string>()
    const visit = (node: ts.Node) => {
      if (ts.isIdentifier(node)) {
        used.add(node.text)
        if (!ts.isTypeReferenceNode(node.parent) && !ts.isQualifiedName(node.parent)) asValue.add(node.text)
      }
      ts.forEachChild(node, visit)
    }
    parsed.statements.forEach((statement) => !ts.isImportDeclaration(statement) && visit(statement))
    const imports: string[] = []
    for (const name of used) {
      if (declared.has(name)) continue
      const byEntry = names.get(name)
      if (!byEntry || kept.has(name)) continue
      const aliased = (symbol: ts.Symbol) => (symbol.flags & ts.SymbolFlags.Alias ? first.getTypeChecker().getAliasedSymbol(symbol) : symbol)
      const fits = (each: string) => byEntry.has(each) && (asValue.has(name) || (aliased(byEntry.get(each)!).flags & ts.SymbolFlags.Type) !== 0)
      const entry = imported.get(name) ?? order.find(fits) ?? order.find((each) => byEntry.has(each))!
      // React's names only fill a gap: `KeyboardEvent` is the DOM's.
      if (entry === 'react' && globals.has(name)) continue
      const target = aliased(byEntry.get(entry) ?? byEntry.values().next().value!)
      imports.push(`import { ${target.flags & ts.SymbolFlags.Value ? '' : 'type '}${name} } from '${entry}'`)
    }
    const header = imports.length
    const file = join(HOME, id, `shape.${block.lang}`)
    files.set(file, [...imports, text].join('\n') + '\n')
    shapes.push({ file, block, header, source: parsed, imported, functions: new Map(), types: new Map() })
  }
  const program = ts.createProgram({ rootNames: [...roots, ...shapes.map((shape) => shape.file)], options, host, oldProgram: first })
  const checker = program.getTypeChecker()
  const problems: Problem[] = orphans.map((block) => ({
    page: block.page,
    block: block.line,
    line: block.line,
    message: 'continues, but no compiled block with its tab comes before it on the page',
  }))
  const diagnosticsOf = (source: ts.SourceFile) => [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)]
  for (const unit of units) {
    const source = program.getSourceFile(unit.file)!
    for (const diagnostic of diagnosticsOf(source)) {
      const start = diagnostic.start ?? 0
      const at = unit.offsets.findLast((offset) => offset.start <= start)!
      const { line } = source.getLineAndCharacterOfPosition(start)
      const top = source.getLineAndCharacterOfPosition(at.start).line
      problems.push({
        page: at.block.page,
        block: at.block.line,
        line: at.block.line + 1 + line - top,
        message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      })
    }
  }
  for (const shape of shapes) {
    const { block } = shape
    const source = program.getSourceFile(shape.file)!
    for (const statement of source.statements) {
      if ((ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) && !shape.types.has(statement.name.text))
        shape.types.set(statement.name.text, statement)
      if (!ts.isFunctionDeclaration(statement) || !statement.name) continue
      const signature = checker.getSignatureFromDeclaration(statement)
      if (signature) shape.functions.set(statement.name.text, [...(shape.functions.get(statement.name.text) ?? []), signature])
    }
    const at = (line: number) => block.line + 1 + line
    const report = (line: number, message: string) => problems.push({ page: block.page, block: block.line, line: at(line), message })
    for (const diagnostic of diagnosticsOf(source)) {
      if (SHAPE_ALLOWED.has(diagnostic.code)) continue
      report(source.getLineAndCharacterOfPosition(diagnostic.start ?? 0).line - shape.header, ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
    }
    const order = [...homeEntries(block.page), ...ENTRIES, 'react']
    for (const [name, statement] of declaredIn(shape.source)) {
      const line = shape.source.getLineAndCharacterOfPosition(statement.getStart(shape.source)).line
      const byEntry = names.get(name)
      const entry = shape.imported.get(name) ?? order.find((each) => byEntry?.has(each))
      const exported = entry ? byEntry?.get(entry) : undefined
      if (!exported) {
        report(line, shape.imported.has(name) ? `${name} is not exported by ${shape.imported.get(name)}` : `${name} is not exported by any package`)
        continue
      }
      const real = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported
      if (ts.isFunctionDeclaration(statement)) {
        const shownSignatures = shape.functions.get(name) ?? []
        const realSignatures = signaturesOf(checker.getTypeOfSymbol(real))
        if (!realSignatures.length) report(line, `${name} is not a function in ${entry}`)
        else if (!shownSignatures.every((shown) => realSignatures.some((each) => matches(checker, shown, each))))
          report(line, `${name} doesn't match ${entry}'s: ${realSignatures.map((each) => `\`${signatureText(each)}\``).join(' or ')}`)
        continue
      }
      const shown = membersOf(statement, shape.source)
      if (!shown) continue
      if (!(real.flags & (ts.SymbolFlags.TypeAlias | ts.SymbolFlags.Interface))) {
        report(line, `${name} is not a type in ${entry}`)
        continue
      }
      const type = checker.getDeclaredTypeOfSymbol(real)
      if (type.isUnion()) continue
      // A registry other packages (or other blocks) augment shows only what its own package declares.
      const home = packageOf(real.declarations?.[0]?.getSourceFile().fileName ?? '')
      const own = checker
        .getPropertiesOfType(type)
        .filter((property) => property.declarations?.some((each) => packageOf(each.getSourceFile().fileName) === home) ?? true)
      const actual = new Map(own.map((property) => [property.name, (property.flags & ts.SymbolFlags.Optional) !== 0]))
      const missing = [...actual.keys()].filter((key) => !shown.members.has(key))
      const extra = [...shown.members.keys()].filter((key) => !actual.has(key))
      const optional = [...shown.members].filter(([key, value]) => actual.has(key) && actual.get(key) !== value).map(([key]) => key)
      if (extra.length) report(line, `${name} (${entry}) has no ${extra.map((key) => `\`${key}\``).join(', ')}`)
      if (missing.length && !shown.some)
        report(line, `${name} (${entry}) also has ${missing.map((key) => `\`${key}${actual.get(key) ? '?' : ''}\``).join(', ')}`)
      if (optional.length)
        report(line, `${name} (${entry}): ${optional.map((key) => (actual.get(key) ? `\`${key}\` is optional` : `\`${key}\` is required`)).join(', ')}`)
      // Each field holds what the block says it holds, when neither type is generic.
      const local = shape.types.get(name)
      if (
        !local ||
        local.typeParameters?.length ||
        (checker.getDeclaredTypeOfSymbol(real).isClassOrInterface() && (checker.getDeclaredTypeOfSymbol(real) as ts.InterfaceType).typeParameters?.length)
      )
        continue
      if ((real.declarations?.[0] as ts.TypeAliasDeclaration | undefined)?.typeParameters?.length) continue
      const localType = checker.getTypeAtLocation(local.name)
      for (const property of own) {
        const mine = checker.getPropertyOfType(localType, property.name)
        if (!mine) continue
        const theirs = checker.getNonNullableType(checker.getTypeOfSymbol(property))
        const said = checker.getNonNullableType(checker.getTypeOfSymbol(mine))
        if (!checker.isTypeAssignableTo(theirs, said))
          report(line, `${name}.${property.name} (${entry}) is \`${typeText(checker, property, theirs)}\`, not \`${typeText(checker, mine, said)}\``)
      }
    }
  }
  return problems
}

if (import.meta.main) {
  const started = Date.now()
  const problems = checkBlocks()
  for (const problem of problems) console.log(`${problem.page}:${problem.line}: ${problem.message.split('\n')[0]}`)
  console.log(`${problems.length} problems in ${Date.now() - started} ms`)
}
