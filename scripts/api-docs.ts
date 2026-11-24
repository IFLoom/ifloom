// Writes the API section of the docs, docs/content/docs/(latest)/api/, from the packages' source and its TSDoc:
// a page for each entry point (a plugin's page covers its main entry and its `/react` subpath), with every export's
// signature and, for an object type, a table of its fields. The hand-written pages explain; these list.
//
//   npm run api-docs      writes the pages (node scripts/api-docs.ts)
//
// The output depends only on the source, in a fixed order, so `docs/snippets/tests/api-docs.test.ts` regenerates it in
// memory and fails when the committed pages differ. Each signature block is a `shape` block, so the docs' block checker
// (docs/lib/check-blocks.ts) holds it to the export as well; one whose types name something no package exports is a
// `fragment`.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import GithubSlugger from 'github-slugger'
import ts from 'typescript'
import { compilerOptions, ENTRIES } from '../docs/lib/check-blocks.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const LATEST = join(ROOT, 'docs/content/docs/(latest)')
export const API = join(LATEST, 'api')
const HOME = join(ROOT, 'docs/snippets/.api')

/** A page of the API section: the entries it covers and the hand-written pages its exports are explained on first. */
type PageSpec = { slug: string; title: string; description: string; entries: string[]; home: string[] }

const PLUGINS = ENTRIES.filter((entry) => /^@ifloom\/plugin-[a-z]+$/.test(entry)).map((entry) => entry.slice('@ifloom/plugin-'.length))

const SPECS: PageSpec[] = [
  {
    slug: 'engine',
    title: '@ifloom/engine',
    description: 'Every export of @ifloom/engine, the main entry for writing and running a game: its signature and its fields.',
    entries: ['@ifloom/engine'],
    home: ['reference/'],
  },
  {
    slug: 'engine-plugin',
    title: '@ifloom/engine/plugin',
    description: 'Every export of @ifloom/engine/plugin, the entry for writing a plugin: its signature and its fields.',
    entries: ['@ifloom/engine/plugin'],
    home: ['reference/'],
  },
  {
    slug: 'engine-testing',
    title: '@ifloom/engine/testing',
    description: "Every export of @ifloom/engine/testing, the engine's test helpers: its signature and its fields.",
    entries: ['@ifloom/engine/testing'],
    home: ['reference/testing.md', 'reference/'],
  },
  {
    slug: 'react',
    title: '@ifloom/react',
    description: 'Every export of @ifloom/react, the React UI: its signature and its fields.',
    entries: ['@ifloom/react'],
    home: ['react/'],
  },
  {
    slug: 'react-kit',
    title: '@ifloom/react/kit',
    description: "Every export of @ifloom/react/kit, what a plugin's or a game's own React components are built from: its signature and its fields.",
    entries: ['@ifloom/react/kit'],
    home: ['react/kit.md', 'react/'],
  },
  {
    slug: 'browser',
    title: '@ifloom/browser',
    description: 'Every export of @ifloom/browser, the browser helpers for any UI: its signature and its fields.',
    entries: ['@ifloom/browser'],
    home: ['browser/'],
  },
  {
    slug: 'audio',
    title: '@ifloom/audio',
    description: 'Every export of @ifloom/audio, the audio player: its signature and its fields.',
    entries: ['@ifloom/audio'],
    home: ['browser/'],
  },
  {
    slug: 'cli',
    title: '@ifloom/cli',
    description: "Every export of @ifloom/cli, the command line's parts for scripts: its signature and its fields.",
    entries: ['@ifloom/cli'],
    home: ['cli/'],
  },
  {
    slug: 'cli-game',
    title: '@ifloom/cli/game',
    description: "Every export of @ifloom/cli/game, the game module's entry: its signature and its fields.",
    entries: ['@ifloom/cli/game'],
    home: ['cli/', 'guide/organising.md'],
  },
  {
    slug: 'cli-vite',
    title: '@ifloom/cli/vite',
    description: 'Every export of @ifloom/cli/vite, the Vite preset: its signature and its fields.',
    entries: ['@ifloom/cli/vite'],
    home: ['cli/'],
  },
  ...PLUGINS.map((plugin) => ({
    slug: `plugin-${plugin}`,
    title: `@ifloom/plugin-${plugin}`,
    description: `Every export of @ifloom/plugin-${plugin} and its /react subpath, if it has one: its signature and its fields.`,
    entries: [`@ifloom/plugin-${plugin}`, `@ifloom/plugin-${plugin}/react`],
    home: [`plugins/${plugin}.md`, 'plugins/'],
  })),
]

const FLAGS = ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope | ts.TypeFormatFlags.UseSingleQuotesForStringLiteralType
/** A field's type is shortened in a table past this many characters; the block above the table has it whole. */
const CELL = 90

/** A program over every entry, through the packages' source. */
function programOf(): { program: ts.Program; probe: string } {
  const options = compilerOptions()
  const probe = join(HOME, 'entries.ts')
  const text = [...ENTRIES, 'react'].map((entry, index) => `import * as e${index} from '${entry}'`).join('\n') + '\nexport {}\n'
  const host = ts.createCompilerHost(options, true)
  const disk = ts.createCompilerHost(options, true)
  host.fileExists = (path) => path === probe || disk.fileExists(path)
  host.directoryExists = (path) => path.startsWith(HOME) || (disk.directoryExists?.(path) ?? true)
  host.readFile = (path) => (path === probe ? text : disk.readFile(path))
  host.getSourceFile = (path, language, onError, create) =>
    path === probe ? ts.createSourceFile(path, text, language, true) : disk.getSourceFile(path, language, onError, create)
  return { program: ts.createProgram({ rootNames: [probe], options, host }), probe }
}

/** The package folder a file is in, such as `/…/packages/engine/`. */
const packageOf = (file: string) => /^.*\/packages\/[^/]+\//.exec(file)?.[0] ?? file

/** The first column of a table that lists exports, each row explained under the heading the table is in. */
const LISTING = new Set(['Builder', 'Helper', 'Hook', 'Function', 'Component', 'Export', 'Name'])

/** A heading the hand-written pages have, for the "Explained in" link. */
type Heading = { page: string; url: string; title: string; slug: string; depth: number }

/** The pages whose headings are words, not exports, so no export is explained there: the glossary's are terms. */
const NOT_HOMES = new Set(['reference/glossary.md'])

/** Each hand-written heading, by its text (an "A and B" heading under each of A and B). */
function handWritten(): Map<string, Heading[]> {
  const headings = new Map<string, Heading[]>()
  const pages: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (path !== API) walk(path)
      } else if (entry.name.endsWith('.md') && entry.name !== 'changelog.md' && !NOT_HOMES.has(relative(LATEST, path))) pages.push(path)
    }
  }
  walk(LATEST)
  for (const path of pages.sort()) {
    const page = relative(LATEST, path)
    const source = readFileSync(path, 'utf8')
    const title = /^title:\s*"?(.*?)"?\s*$/m.exec(source)?.[1] ?? page
    const url = '/docs/' + page.replace(/\.md$/, '').replace(/(^|\/)index$/, '')
    const slugger = new GithubSlugger()
    let fence = ''
    let header = ''
    let last: Heading | undefined
    for (const line of source.split('\n')) {
      const open = /^\s*(`{3,}|~{3,})/.exec(line)?.[1]
      if (open && (!fence || open.startsWith(fence))) {
        fence = fence ? '' : open
        continue
      }
      if (fence) continue
      // A table that lists exports (`| Builder | Writes |`) explains each row's under the heading above it.
      const row = /^\|\s*`([A-Za-z_$][\w$]*)`\s*\|/.exec(line)?.[1]
      if (row && LISTING.has(header) && last) headings.set(row, [...(headings.get(row) ?? []), { ...last, depth: 9 }])
      if (line.startsWith('|')) {
        if (!/^\|\s*[`-]/.test(line) && !/^\|[\s|:-]*$/.test(line)) header = /^\|\s*([^|]*?)\s*\|/.exec(line)?.[1] ?? ''
        continue
      }
      header = ''
      const heading = /^(#{2,4})\s+(.+?)\s*$/.exec(line)
      if (!heading) continue
      const slug = slugger.slug(heading[2])
      last = { page, url: url.replace(/\/$/, ''), title: title.replace(/\\"/g, '"'), slug, depth: heading[1].length }
      for (const name of heading[2].replace(/`/g, '').split(/\s*,\s*|\s+and\s+/)) {
        if (!/^[A-Za-z_$][\w$]*$/.test(name)) continue
        headings.set(name, [
          ...(headings.get(name) ?? []),
          { page, url: url.replace(/\/$/, ''), title: title.replace(/\\"/g, '"'), slug, depth: heading[1].length },
        ])
      }
    }
  }
  return headings
}

/** The hand-written heading that explains `name`, from the page's home pages first. */
function explained(headings: Map<string, Heading[]>, name: string, spec: PageSpec): Heading | undefined {
  const all = headings.get(name)
  if (!all) return undefined
  const rank = (heading: Heading) => {
    const home = spec.home.findIndex((prefix) => heading.page === prefix || (prefix.endsWith('/') && heading.page.startsWith(prefix)))
    return home < 0 ? spec.home.length : home
  }
  return [...all].sort((a, b) => rank(a) - rank(b) || a.depth - b.depth)[0]
}

const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed })
/** A type node on one line, without its comments: `{ name: string; open: boolean }`. */
function printed(node: ts.Node): string {
  return printer.printNode(ts.EmitHint.Unspecified, node, node.getSourceFile()).replace(/\s+/g, ' ').replace(/; \}/g, ' }').replace(/"/g, "'")
}

/** Whether a type's fields are made from a list of keys: `Record<K, …>`, `{ [K in …]: … }`, or either under `Partial`. */
function isKeyed(node: ts.TypeNode): boolean {
  if (ts.isMappedTypeNode(node)) return true
  if (ts.isIntersectionTypeNode(node)) return node.types.some(isKeyed)
  if (ts.isParenthesizedTypeNode(node)) return isKeyed(node.type)
  if (!ts.isTypeReferenceNode(node) || !ts.isIdentifier(node.typeName)) return false
  const name = node.typeName.text
  if (name === 'Record') return node.typeArguments?.[0]?.kind !== ts.SyntaxKind.StringKeyword
  return ['Partial', 'Readonly', 'Required'].includes(name) && !!node.typeArguments?.length && isKeyed(node.typeArguments[0])
}

/** Text made safe for a Markdown table cell. */
const cell = (text: string) => text.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ')
/** A type shortened past CELL characters, never inside a name, so a link is never cut in half. */
const shortened = (text: string) =>
  text.length > CELL
    ? text
        .slice(0, CELL - 1)
        .replace(/[\w$]+$/, '')
        .trimEnd() + '…'
    : text
/** Code in a cell: a code span, its spaces outside it so none are lost. */
function codeRun(text: string): string {
  const [, before, code, after] = /^(\s*)([\s\S]*?)(\s*)$/.exec(cell(text))!
  return code ? `${before ? ' ' : ''}\`${code.replace(/`/g, "'")}\`${after ? ' ' : ''}` : before || after ? ' ' : ''
}
/** The names and string literals in a type's text, in order. */
const TOKENS = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|[A-Za-z_$][\w$]*/g

/** Where an export's own section is: its page's slug and its heading's anchor. */
type Home = { slug: string; anchor: string }

/** The anchors of a page's headings, in the page's order, as the site makes them: each entry's (when it has several), then each export's. */
function anchorsOf(entries: string[], namesOf: (entry: string) => string[]): Map<string, string> {
  const slugger = new GithubSlugger()
  const anchors = new Map<string, string>()
  for (const entry of entries) {
    if (entries.length > 1) anchors.set(entry, slugger.slug(entry))
    for (const name of namesOf(entry)) anchors.set(`${entry} ${name}`, slugger.slug(name))
  }
  return anchors
}

/** Markdown from TSDoc parts: links as code, `<` outside code escaped so the page stays plain Markdown. */
function docText(parts: readonly ts.SymbolDisplayPart[]): string {
  let text = ''
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index]
    if (part.kind === 'link') {
      // `{@link X}` or `{@link X | words}`: the parts are '{@link ', a linkName or linkText, '}'.
      const words: string[] = []
      for (index++; index < parts.length && parts[index].text !== '}'; index++) words.push(parts[index].text)
      const [target, label] = words.join('').split(/\s*\|\s*|\s+(?=\S)/, 2)
      text += label ? label : '`' + target.trim() + '`'
      continue
    }
    text += part.text
  }
  // A code example in a comment is shown, not compiled: it calls what it describes without importing it.
  return escapeHtml(text.trim()).replace(/^(\s*```)(ts|tsx|typescript)\b(?! fragment)/gm, '$1$2 fragment')
}

/** `<` outside backticks, as `&lt;`, so a TSDoc `Array<T>` isn't read as an HTML tag. */
function escapeHtml(text: string): string {
  return text
    .split(/(```[\s\S]*?```|`[^`]*`)/)
    .map((piece, index) => (index % 2 ? piece : piece.replace(/</g, '&lt;')))
    .join('')
}

/** A tag's text, such as `@default`'s. */
function tagText(symbol: ts.Symbol, checker: ts.TypeChecker, name: string): string | undefined {
  const tag = symbol.getJsDocTags(checker).find((each) => each.name === name)
  return tag ? (tag.text ? docText(tag.text) : '') : undefined
}

type Kind = 'function' | 'component' | 'const' | 'type' | 'class'

/** One export of an entry, ready to write. */
type Section = { name: string; kinds: Kind[]; body: string[] }

/** One TSDoc comment the API pages print (an export's, a field's or a helper's), for the docs' style check. */
export type ApiComment = {
  /** The entry the comment is first printed under, such as `@ifloom/engine`. */
  entry: string
  /** The export's name, or `Export.field` for a field or a helper. */
  name: string
  /** The file and line that declare it, relative to the repo, such as `packages/engine/src/stats.ts:12`. */
  source: string
  /** The comment's text as the page prints it, empty when it has none. */
  text: string
}

class Writer {
  checker: ts.TypeChecker
  /** Every name the entries export, and the globals: what a block may name and still compile. */
  known: Set<string>
  /** The entries that export each name, by the symbol it is there: a name two entries export as different things is ambiguous. */
  exporters = new Map<string, Map<string, ts.Symbol>>()
  headings: Map<string, Heading[]>
  /** Each exported type's section, by its symbol, so a page can link to it. */
  homes = new Map<ts.Symbol, Home>()
  /** The page being written. */
  page?: PageSpec
  /** The export being written, and its entry, for the comments `note` records. */
  at = { entry: '', name: '' }
  /** Each comment the pages print, by the declaration it is on, so an export two entries share is recorded once. */
  comments = new Map<ts.Node, ApiComment>()
  constructor(program: ts.Program, probe: string) {
    this.checker = program.getTypeChecker()
    this.known = new Set(this.checker.getSymbolsInScope(program.getSourceFile(probe)!, ts.SymbolFlags.Type | ts.SymbolFlags.Value).map((symbol) => symbol.name))
    for (const statement of program.getSourceFile(probe)!.statements) {
      if (!ts.isImportDeclaration(statement)) continue
      const module = this.checker.getSymbolAtLocation(statement.moduleSpecifier)
      if (!module) continue
      for (const symbol of this.checker.getExportsOfModule(module)) {
        this.known.add(symbol.name)
        const target = symbol.flags & ts.SymbolFlags.Alias ? this.checker.getAliasedSymbol(symbol) : symbol
        const byEntry = this.exporters.get(symbol.name) ?? new Map<string, ts.Symbol>()
        byEntry.set((statement.moduleSpecifier as ts.StringLiteral).text, target)
        this.exporters.set(symbol.name, byEntry)
      }
    }
    this.headings = handWritten()
  }

  /** Records a comment the pages print, once for each declaration. Nothing written depends on it. */
  note(declaration: ts.Node | undefined, name: string, text: string) {
    if (!declaration || this.comments.has(declaration)) return
    const file = declaration.getSourceFile()
    const line = file.getLineAndCharacterOfPosition(declaration.getStart()).line + 1
    this.comments.set(declaration, { entry: this.at.entry, name, source: `${relative(ROOT, file.fileName)}:${line}`, text })
  }

  /** Exported aliases the checker would print expanded (`GameState` is a `Flat<…>`), by their expanded text. */
  aliases = new Map<string, string>()

  /** A type as the checker prints it, with the exported aliases it expands put back, and `| undefined` left off optional fields. */
  typeText(type: ts.Type, flags = 0): string {
    let text = this.checker.typeToString(type, undefined, FLAGS | flags)
    for (const [expanded, name] of this.aliases) if (text.includes(expanded)) text = text.split(expanded).join(name)
    return text.replace(/(\?: [^;{}]*?) \| undefined;/g, '$1;')
  }

  /** A type node's own text, when it names only what a block can, else the checker's text for its type. */
  nodeText(node: ts.TypeNode | undefined, type: () => ts.Type, scope: readonly ts.TypeParameterDeclaration[] = []): string {
    const text = node && printed(node)
    const generics = scope.length ? `<${scope.map((each) => each.name.text).join(', ')}>` : ''
    return text && this.compiles(`type Probe${generics} = ${text}`) ? text : this.typeText(type())
  }

  /** Learns the exported aliases the checker prints expanded, so `typeText` can put their names back. */
  learnAliases(symbols: ts.Symbol[]) {
    const found = new Map<string, string>()
    for (const symbol of symbols) {
      const target = symbol.flags & ts.SymbolFlags.Alias ? this.checker.getAliasedSymbol(symbol) : symbol
      if (!(target.flags & ts.SymbolFlags.TypeAlias)) continue
      const declaration = target.declarations?.find(ts.isTypeAliasDeclaration)
      if (!declaration || declaration.typeParameters) continue
      const text = this.checker.typeToString(this.checker.getDeclaredTypeOfSymbol(target), undefined, FLAGS)
      if (text !== symbol.name && text.length > 40 && !found.has(text)) found.set(text, symbol.name)
    }
    // Longest first, so a type that holds another is put back whole.
    this.aliases = new Map([...found].sort((a, b) => b[0].length - a[0].length || compare(a[1], b[1])))
  }

  /** The properties a type shows: those its own package declares, and whether others add more. */
  ownProperties(type: ts.Type, home: string, shown?: ts.Symbol): { properties: ts.Symbol[]; more: boolean } {
    const all = this.checker.getPropertiesOfType(type)
    // An interface other packages augment (a registry): only what its own package's declarations name or extend.
    const declarations = shown?.declarations?.filter(ts.isInterfaceDeclaration) ?? []
    if (declarations.some((each) => packageOf(each.getSourceFile().fileName) !== home)) {
      const names = new Set<string>()
      for (const declaration of declarations) {
        if (packageOf(declaration.getSourceFile().fileName) !== home) continue
        for (const member of declaration.members) if (member.name) names.add(this.checker.getSymbolAtLocation(member.name)?.name ?? '')
        for (const clause of declaration.heritageClauses ?? [])
          for (const each of clause.types)
            for (const property of this.checker.getPropertiesOfType(this.checker.getTypeAtLocation(each))) names.add(property.name)
      }
      const properties = all.filter((property) => names.has(property.name))
      return { properties, more: properties.length < all.length }
    }
    const properties = all.filter(
      (property) => !property.declarations?.length || property.declarations.some((each) => packageOf(each.getSourceFile().fileName) === home),
    )
    return { properties, more: properties.length < all.length }
  }

  /** A field's type: as its declaration writes it where that reads the same here, else as the checker prints it. */
  propertyType(property: ts.Symbol, shown: ts.Declaration | undefined): string {
    const optional = (property.flags & ts.SymbolFlags.Optional) !== 0
    const type = this.checker.getTypeOfSymbol(property)
    const declaration = property.declarations?.length === 1 ? property.declarations[0] : undefined
    const node = declaration && (ts.isPropertySignature(declaration) || ts.isPropertyDeclaration(declaration)) ? declaration.type : undefined
    let owner: ts.Node | undefined = declaration?.parent
    while (owner && !ts.isInterfaceDeclaration(owner) && !ts.isTypeAliasDeclaration(owner)) owner = owner.parent
    // The declaration's words only where they mean this field's type: not a generic's `T`, nor a mapped type's source.
    const strip = (each: ts.Type) => this.checker.getNonNullableType(each)
    const same = node && strip(this.checker.getTypeFromTypeNode(node)) === strip(type)
    const own = same && !(optional && /\|\s*undefined\s*$/.test(node.getText())) ? node : undefined
    const text = this.nodeText(own, () => type, owner === shown ? ((owner as ts.InterfaceDeclaration | undefined)?.typeParameters ?? []) : [])
    return optional && !own ? text.replace(/ \| undefined$/, '') : text
  }

  /** `name?: Type` lines and a table of the fields, for an object type. */
  fields(type: ts.Type, home: string, shown?: ts.Declaration, symbol?: ts.Symbol): { lines: string[]; table: string[]; more: boolean; extra: string[] } {
    const extra: string[] = []
    const { properties, more } = this.ownProperties(type, home, symbol)
    const lines: string[] = []
    const rows: string[] = []
    // An index signature beside named fields is said in words, as optional fields don't fit it in a block.
    const indexes = this.checker.getIndexInfosOfType(type).map((info) => `[key: ${this.typeText(info.keyType)}]: ${this.typeText(info.type)}`)
    if (!properties.length) lines.push(...indexes.map((each) => `  ${each}`))
    else extra.push(...indexes.map((each) => `It also takes any other key: \`${each}\`.`))
    let documented = false
    for (const property of properties) {
      const optional = (property.flags & ts.SymbolFlags.Optional) !== 0
      const readonly = property.declarations?.some((each) => ts.getCombinedModifierFlags(each) & ts.ModifierFlags.Readonly) ? 'readonly ' : ''
      const name = /^[A-Za-z_$][\w$]*$/.test(property.name) ? property.name : `'${property.name}'`
      const text = this.propertyType(property, shown)
      lines.push(`  ${readonly}${name}${optional ? '?' : ''}: ${text}`)
      const description = docText(property.getDocumentationComment(this.checker))
      this.note(property.declarations?.[0], `${this.at.name}.${property.name}`, description)
      const fallback = tagText(property, this.checker, 'default')
      if (description || fallback) documented = true
      rows.push(
        `| \`${property.name}\` | ${this.linked(shortened(text))} | ${optional ? 'yes' : ''} | ${fallback ? cell(fallback) : ''} | ${cell(description)} |`,
      )
    }
    const table = rows.length ? ['| Field | Type | Optional | Default | Description |', '|---|---|---|---|---|', ...rows] : []
    return { lines, table: documented ? table : [], more, extra }
  }

  /** The exported type a name in a type's text stands for, preferring what this page's entries export, when that is one thing. */
  typeNamed(name: string): ts.Symbol | undefined {
    const byEntry = this.exporters.get(name)
    if (!byEntry) return undefined
    // Only types: `Game` is the engine's type and also the React UI's component, which no type names.
    const isType = (each: ts.Symbol | undefined): each is ts.Symbol =>
      !!each && (each.flags & (ts.SymbolFlags.TypeAlias | ts.SymbolFlags.Interface | ts.SymbolFlags.Class | ts.SymbolFlags.Enum)) !== 0
    const here = (this.page?.entries ?? []).map((entry) => byEntry.get(entry)).filter(isType)
    const found = new Set(here.length ? here : [...byEntry.values()].filter(isType))
    const [symbol] = found
    return found.size === 1 ? symbol : undefined
  }

  /** A link to an exported type's section: on this page by its anchor, else on its own page. */
  hrefOf(symbol: ts.Symbol): string | undefined {
    const home = this.homes.get(symbol)
    return home && (home.slug === this.page?.slug ? `#${home.anchor}` : `/docs/api/${home.slug}#${home.anchor}`)
  }

  /** A type's text cut into its pieces: the exported types it names, with their links, and the code between them. */
  pieces(text: string): { code: string; href?: string }[] {
    const pieces: { code: string; href?: string }[] = []
    let last = 0
    for (const match of text.matchAll(TOKENS)) {
      const [token] = match
      const at = match.index
      if (!/^[A-Za-z_$]/.test(token)) continue
      // Not a field's or a parameter's name, nor a name reached through a dot.
      if (/^\s*\??:/.test(text.slice(at + token.length)) || /\.\s*$/.test(text.slice(0, at))) continue
      const symbol = this.typeNamed(token)
      const href = symbol && this.hrefOf(symbol)
      if (!href) continue
      if (at > last) pieces.push({ code: text.slice(last, at) })
      // A list of it is one link, `Blocked[]`, rather than a link and a stray `[]`.
      const list = /^(\[\])*/.exec(text.slice(at + token.length))![0]
      pieces.push({ code: token + list, href })
      last = at + token.length + list.length
    }
    if (last < text.length) pieces.push({ code: text.slice(last) })
    return pieces
  }

  /** A type in a table cell, each exported type it names linked to its section. */
  linked(text: string): string {
    return this.pieces(text)
      .map((piece) => (piece.href ? `[\`${piece.code}\`](${piece.href})` : codeRun(piece.code)))
      .join('')
      .trim()
  }

  /** "Uses:" and a link to each exported type a block names but its own, in order, once each; nothing when it names none. */
  uses(code: string, name: string): string[] {
    const seen = new Map<string, string>()
    for (const piece of this.pieces(code)) {
      const each = piece.code.replace(/(\[\])+$/, '')
      if (piece.href && each !== name && !seen.has(each)) seen.set(each, piece.href)
    }
    return seen.size ? ['', `Uses: ${[...seen].map(([each, href]) => `[\`${each}\`](${href})`).join(', ')}.`] : []
  }

  /** The names a piece of code uses, and those it declares itself (type parameters, parameters, its own name). */
  namesIn(code: string): { used: string[]; declared: Set<string> } {
    const source = ts.createSourceFile('block.ts', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const declared = new Set<string>()
    const used: string[] = []
    const visit = (node: ts.Node) => {
      if (
        (ts.isTypeParameterDeclaration(node) || ts.isFunctionDeclaration(node) || ts.isTypeAliasDeclaration(node) || ts.isParameter(node)) &&
        node.name &&
        ts.isIdentifier(node.name)
      )
        declared.add(node.name.text)
      if (ts.isMappedTypeNode(node)) declared.add(node.typeParameter.name.text)
      if (ts.isInferTypeNode(node)) declared.add(node.typeParameter.name.text)
      if (ts.isTypeReferenceNode(node) || ts.isExpressionWithTypeArguments(node) || ts.isTypeQueryNode(node)) {
        const name = ts.isTypeReferenceNode(node) ? node.typeName : ts.isTypeQueryNode(node) ? node.exprName : node.expression
        let first: ts.Node = name
        while (ts.isQualifiedName(first)) first = first.left
        while (ts.isPropertyAccessExpression(first)) first = first.expression
        if (ts.isIdentifier(first)) used.push(first.text)
      }
      if (ts.isImportTypeNode(node)) used.push('import()')
      ts.forEachChild(node, visit)
    }
    visit(source)
    return { used, declared }
  }

  /** Whether a block's code names only what the packages export, the globals, and what it declares itself. */
  compiles(code: string): boolean {
    const { used, declared } = this.namesIn(code)
    return used.every((name) => declared.has(name) || this.known.has(name))
  }

  /**
   * A signature block: `shape` with an import line naming where the export comes from (and any name it uses that
   * another entry exports as something else), or `fragment` when it names something a reader can't import.
   */
  block(code: string, name: string, entry: string, value: boolean): string[] {
    if (!this.compiles(code)) {
      if (process.env.API_DOCS_DEBUG) {
        const { used, declared } = this.namesIn(code)
        console.log(`${name} (${entry}) is a fragment: ${[...new Set(used.filter((each) => !declared.has(each) && !this.known.has(each)))].join(', ')}`)
      }
      return ['```ts fragment', code, '```']
    }
    const { used, declared } = this.namesIn(code)
    const ambiguous = [...new Set(used)]
      .filter((each) => each !== name && !declared.has(each) && ((this.exporters.get(each)?.get(entry)?.flags ?? 0) & ts.SymbolFlags.Type) !== 0)
      .filter((each) => new Set(this.exporters.get(each)!.values()).size > 1)
      .sort(compare)
    const names = [value ? name : `type ${name}`, ...ambiguous.map((each) => `type ${each}`)]
    const all = names.every((each) => each.startsWith('type '))
    const imports = `import ${all ? 'type ' : ''}{ ${names.map((each) => (all ? each.slice(5) : each)).join(', ')} } from '${entry}'`
    return ['```ts shape', imports, code, '```']
  }

  /**
   * What a type alias that isn't an object type stands for: its declaration's own text where a reader can resolve every
   * name in it, else each member of its union, as written where it can be and as the checker prints it where not. A
   * member that only plugins declare (a registry's entries) is left out, and `dropped` says so.
   */
  aliasParts(node: ts.TypeNode | undefined, type: ts.Type, home: string, scope: readonly ts.TypeParameterDeclaration[]): { parts: string[]; dropped: boolean } {
    const generics = scope.length ? `<${scope.map((each) => each.name.text).join(', ')}>` : ''
    const fits = (text: string) => this.compiles(`type Probe${generics} = ${text}`)
    const text = node && printed(node)
    if (text && fits(text)) return { parts: [text], dropped: false }
    const nodes = node && ts.isUnionTypeNode(node) ? node.types : node ? [node] : []
    const parts: string[] = []
    let dropped = false
    const foreign = (member: ts.Type) => {
      if (!(member.flags & ts.TypeFlags.Object)) return false
      const properties = this.checker.getPropertiesOfType(member)
      return (
        properties.length > 0 &&
        properties.every(
          (property) => property.declarations?.length && property.declarations.every((each) => packageOf(each.getSourceFile().fileName) !== home),
        )
      )
    }
    for (const each of nodes.length ? nodes : [undefined]) {
      const own = each && printed(each)
      if (own && fits(own)) {
        parts.push(own)
        continue
      }
      const resolved = each ? this.checker.getTypeFromTypeNode(each) : type
      for (const member of resolved.isUnion() && !(resolved.flags & ts.TypeFlags.Boolean) ? resolved.types : [resolved]) {
        if (foreign(member)) dropped = true
        else parts.push(this.typeText(member, ts.TypeFormatFlags.InTypeAlias))
      }
    }
    return { parts: [...new Set(parts)], dropped }
  }

  /** A function's signatures, as `function name(…): R` lines. */
  signatures(name: string, type: ts.Type, component = false): string[] {
    return type.getCallSignatures().map((signature) => `function ${name}${this.signatureText(signature, component)}`)
  }

  /** A signature as its declaration writes it, each type the checker's where the declaration's can't be read here. */
  signatureText(signature: ts.Signature, component = false): string {
    const declaration = signature.getDeclaration() as ts.SignatureDeclaration | undefined
    if (!declaration) return this.checker.signatureToString(signature, undefined, FLAGS)
    const generics = declaration.typeParameters ? `<${declaration.typeParameters.map((each) => each.getText()).join(', ')}>` : ''
    const parameters = declaration.parameters.map((parameter, index) => {
      const symbol = signature.parameters[index]
      const optional = parameter.questionToken || parameter.initializer ? '?' : ''
      const name = ts.isIdentifier(parameter.name) ? parameter.name.text : component ? 'props' : 'options'
      let type = this.nodeText(parameter.type, () => this.checker.getTypeOfSymbol(symbol), declaration.typeParameters)
      if (optional && !parameter.type) type = type.replace(/ \| undefined$/, '')
      return `${parameter.dotDotDotToken ? '...' : ''}${name}${optional}: ${type}`
    })
    const predicate = this.checker.getTypePredicateOfSignature(signature)
    const returns = declaration.type
      ? this.nodeText(declaration.type, () => signature.getReturnType(), declaration.typeParameters)
      : predicate
        ? `${predicate.parameterName} is ${this.typeText(predicate.type!)}`
        : this.typeText(signature.getReturnType())
    // A component's element, as a reader writes it (the checker prints it `Element`, which is the DOM's).
    return `${generics}(${parameters.join(', ')}): ${component ? returns.replace(/^(React\.)?(JSX\.)?Element\b/, 'JSX.Element') : returns}`
  }

  /** The parameters' and return's TSDoc, as a list, when the function has any. */
  parameterDocs(type: ts.Type): string[] {
    const signature = type.getCallSignatures()[0]
    if (!signature) return []
    const lines: string[] = []
    for (const parameter of signature.getParameters()) {
      const declaration = parameter.valueDeclaration
      const text = declaration && ts.isParameter(declaration) ? docText(parameter.getDocumentationComment(this.checker)) : ''
      if (text) lines.push(`- \`${parameter.name}\`: ${text}`)
    }
    const returns = signature.getJsDocTags().find((tag) => tag.name === 'returns' || tag.name === 'return')
    if (returns?.text) lines.push(`- Returns: ${docText(returns.text)}`)
    return lines.length ? ['', ...lines] : []
  }

  section(name: string, symbol: ts.Symbol, entry: string, spec: PageSpec): Section {
    const checker = this.checker
    const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol
    const declaration = target.declarations?.[0]
    const home = packageOf(declaration?.getSourceFile().fileName ?? '')
    const kinds: Kind[] = []
    const body: string[] = []
    const summary = docText(target.getDocumentationComment(checker))
    this.at = { entry, name }
    this.note(declaration, name, summary)
    const isReact = entry.includes('react')

    if (target.flags & ts.SymbolFlags.Value && !(target.flags & ts.SymbolFlags.Module && !(target.flags & ts.SymbolFlags.Function))) {
      const type = checker.getTypeOfSymbol(target)
      const calls = type.getCallSignatures()
      if (target.flags & ts.SymbolFlags.Class) {
        kinds.push('class')
        const code = `const ${name}: ${this.typeText(type)}`
        body.push(...this.block(code, name, entry, true), ...this.uses(code, name))
      } else if (calls.length) {
        const component =
          isReact &&
          /^[A-Z]/.test(name) &&
          calls.every((each) => /^((React\.)?(JSX\.)?Element( \| null)?|.*ReactNode.*|.*ReactElement.*)$/.test(checker.typeToString(each.getReturnType())))
        kinds.push(component ? 'component' : 'function')
        const code = this.signatures(name, type, component).join('\n')
        body.push(...this.block(code, name, entry, true), ...this.uses(code, name))
        body.push(...this.parameterDocs(type))
        // A plugin's helpers, or anything else a function carries.
        const helpers = checker
          .getPropertiesOfType(type)
          .filter((property) => !['prototype', 'displayName', 'propTypes', 'defaultProps', '$$typeof', 'type', 'compare'].includes(property.name) || !component)
        if (helpers.length && !component) {
          body.push('', '| Helper | Signature | Description |', '|---|---|---|')
          for (const helper of helpers) {
            const helperType = checker.getTypeOfSymbol(helper)
            const signature = helperType.getCallSignatures().map((each) => this.signatureText(each))
            const description = docText(helper.getDocumentationComment(checker))
            this.note(helper.declarations?.[0], `${name}.${helper.name}`, description)
            body.push(
              `| \`${name}.${helper.name}\` | ${signature.length ? signature.map((each) => this.linked(each)).join('<br>') : this.linked(shortened(this.typeText(helperType)))} | ${cell(description)} |`,
            )
          }
        }
      } else {
        kinds.push('const')
        const objectLike =
          type.flags & ts.TypeFlags.Object && !checker.isArrayType(type) && !checker.isTupleType(type) && checker.getPropertiesOfType(type).length > 0
        const whole = this.typeText(type)
        if (objectLike && whole.length > 80) {
          const { lines, table } = this.fields(type, home)
          body.push(...this.block(`const ${name}: {\n${lines.join('\n')}\n}`, name, entry, true))
          if (table.some((row) => /\| [^|]+ \|$/.test(row))) body.push('', ...table)
        } else body.push(...this.block(`const ${name}: ${whole}`, name, entry, true), ...this.uses(whole, name))
      }
    }

    if (target.flags & (ts.SymbolFlags.TypeAlias | ts.SymbolFlags.Interface)) {
      kinds.push('type')
      if (body.length) body.push('')
      const type = checker.getDeclaredTypeOfSymbol(target)
      const typeDeclaration = target.declarations?.find((each) => ts.isTypeAliasDeclaration(each) || ts.isInterfaceDeclaration(each)) as
        | ts.TypeAliasDeclaration
        | ts.InterfaceDeclaration
        | undefined
      const parameters = typeDeclaration?.typeParameters ? `<${typeDeclaration.typeParameters.map((each) => each.getText()).join(', ')}>` : ''
      const aliasOf = typeDeclaration && ts.isTypeAliasDeclaration(typeDeclaration) ? typeDeclaration.type : undefined
      const isObject =
        !type.isUnion() &&
        !(
          type.flags &
          (ts.TypeFlags.StringLike |
            ts.TypeFlags.NumberLike |
            ts.TypeFlags.BooleanLike |
            ts.TypeFlags.BigIntLike |
            ts.TypeFlags.ESSymbolLike |
            ts.TypeFlags.Null |
            ts.TypeFlags.Undefined |
            ts.TypeFlags.Void |
            ts.TypeFlags.Never |
            ts.TypeFlags.Unknown |
            ts.TypeFlags.Any |
            ts.TypeFlags.TemplateLiteral |
            ts.TypeFlags.StringMapping |
            ts.TypeFlags.Conditional |
            ts.TypeFlags.Index |
            ts.TypeFlags.IndexedAccess |
            ts.TypeFlags.TypeParameter)
        ) &&
        !(
          aliasOf &&
          (ts.isFunctionTypeNode(aliasOf) ||
            ts.isConditionalTypeNode(aliasOf) ||
            ts.isTypeOperatorNode(aliasOf) ||
            ts.isArrayTypeNode(aliasOf) ||
            ts.isTupleTypeNode(aliasOf))
        ) &&
        !checker.isArrayType(type) &&
        !checker.isTupleType(type) &&
        !(aliasOf && ts.isMappedTypeNode(aliasOf) && parameters) &&
        (checker.getPropertiesOfType(type).length > 0 || checker.getIndexInfosOfType(type).length > 0) &&
        type.getCallSignatures().length === 0
      if (isObject) {
        const { lines, table, more, extra } = this.fields(type, home, typeDeclaration, target)
        // Fields made from a list of keys (`Record<PartKey, …>`) grow with that list, which a game can add to.
        const keyed = !more && aliasOf && isKeyed(aliasOf) && checker.getPropertiesOfType(type).length > 0
        body.push(...this.block(`type ${name}${parameters} = {\n${lines.join('\n')}${more || keyed ? '\n  // …' : ''}\n}`, name, entry, false))
        if (extra.length) body.push('', ...extra)
        if (more) body.push('', 'Plugins add fields of their own to it, which their pages list.')
        if (keyed) body.push('', `Its fields are the keys of \`${printed(aliasOf)}\`, so they grow when a game or a plugin adds to those.`)
        if (table.length) body.push('', ...table)
      } else {
        const { parts, dropped } = this.aliasParts(aliasOf, type, home, typeDeclaration?.typeParameters ?? [])
        const text = parts.length > 1 ? `\n${parts.map((part) => `  | ${part}`).join('\n')}` : ` ${parts[0]}`
        body.push(...this.block(`type ${name}${parameters} =${text}`, name, entry, false), ...this.uses(text, name))
        if (dropped) body.push('', 'Plugins add members of their own, which their pages list.')
      }
    }

    const heading = explained(this.headings, name, spec)
    const lead = [kinds.map((kind, index) => (index ? kind : kind[0].toUpperCase() + kind.slice(1))).join(' and ') + '.']
    if (heading) lead.push(`Explained in [${heading.title}](${heading.url}#${heading.slug}).`)
    const deprecated = tagText(target, checker, 'deprecated')
    return {
      name,
      kinds,
      body: [
        lead.join(' '),
        ...(deprecated !== undefined ? ['', `Deprecated${deprecated ? `: ${deprecated}` : '.'}`] : []),
        ...(summary ? ['', summary] : []),
        '',
        ...body,
      ],
    }
  }

  /** The sections of an entry's exports, in alphabetical order. */
  entry(entry: string, spec: PageSpec, module: ts.Symbol): Section[] {
    this.page = spec
    const exports = this.checker.getExportsOfModule(module).filter((symbol) => symbol.name !== 'default')
    exports.sort((a, b) => compare(a.name, b.name))
    return exports.map((symbol) => this.section(symbol.name, symbol, entry, spec))
  }
}

/** Alphabetical, ignoring case, then by case, so the order never depends on the locale. */
const compare = (a: string, b: string) => (a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : a < b ? -1 : a > b ? 1 : 0)

const KIND_TITLES: Record<Kind, string> = { function: 'Functions', component: 'Components', const: 'Constants', class: 'Classes', type: 'Types' }

/** One page's Markdown. */
function pageOf(writer: Writer, spec: PageSpec, modules: Map<string, ts.Symbol>): string {
  const lines = ['---', `title: "${spec.title}"`, `description: "${spec.description}"`, '---']
  const several = spec.entries.length > 1
  lines.push(
    `Generated from the source of ${spec.entries.map((entry) => `\`${entry}\``).join(' and ')} and its TSDoc by \`npm run api-docs\`. Each export links to the page that explains it, where one does.`,
  )
  const sectionsOf = new Map(spec.entries.map((entry) => [entry, writer.entry(entry, spec, modules.get(entry)!)]))
  const anchors = anchorsOf(spec.entries, (entry) => sectionsOf.get(entry)!.map((section) => section.name))
  for (const [entry, sections] of sectionsOf) {
    const depth = several ? '###' : '##'
    if (several) lines.push('', `## ${entry}`)
    lines.push('')
    for (const kind of ['component', 'function', 'const', 'class', 'type'] as Kind[]) {
      const these = sections.filter((section) => section.kinds[0] === kind)
      if (these.length)
        lines.push(`- ${KIND_TITLES[kind]}: ${these.map((section) => `[\`${section.name}\`](#${anchors.get(`${entry} ${section.name}`)})`).join(', ')}`)
    }
    if (!sections.length) lines.push('This entry exports nothing.')
    for (const section of sections) lines.push('', `${depth} ${section.name}`, '', ...section.body)
  }
  return lines.join('\n') + '\n'
}

/** The index page: each page, with its entries and how many exports it lists. */
function indexOf(counts: Map<PageSpec, number>): string {
  const lines = [
    '---',
    'title: "API"',
    'description: "Every export of every IFLoom package, with its exact signature and fields, generated from the source and its TSDoc."',
    '---',
    "These pages list every export of every entry point, with its signature and, for an object type, each field with its type, whether it's optional, its default and its TSDoc. They're generated from the source by `npm run api-docs`, so they can't drift from it. The [Reference](/docs/reference), [React UI](/docs/react), [Browser](/docs/browser), [CLI](/docs/cli) and [Plugins](/docs/plugins) sections explain when and how to use each one, and each export here links to its explanation.",
    '',
    '| Page | Entries | Exports |',
    '|---|---|---|',
  ]
  for (const [spec, count] of counts)
    lines.push(`| [${spec.title}](/docs/api/${spec.slug}) | ${spec.entries.map((entry) => `\`${entry}\``).join(', ')} | ${count} |`)
  return lines.join('\n') + '\n'
}

function metaOf(): string {
  const at = (slugs: string[]) => slugs
  const meta = {
    title: 'API',
    description: 'Every export, generated from the source',
    root: true,
    pages: [
      'index',
      '---Engine---',
      ...at(['engine', 'engine-plugin', 'engine-testing']),
      '---UI and browser---',
      ...at(['react', 'react-kit', 'browser', 'audio']),
      '---CLI---',
      ...at(['cli', 'cli-game', 'cli-vite']),
      '---Plugins---',
      ...PLUGINS.map((plugin) => `plugin-${plugin}`),
    ],
  }
  return JSON.stringify(meta, null, 2) + '\n'
}

/** The names an entry's sections are written under, in their order. */
const exportNames = (checker: ts.TypeChecker, module: ts.Symbol) =>
  checker
    .getExportsOfModule(module)
    .map((symbol) => symbol.name)
    .filter((name) => name !== 'default')
    .sort(compare)

/**
 * Each exported symbol's section. An export several entries share is at the entry of the package that declares it,
 * the first such in the pages' order, else the first entry that exports it.
 */
function homesOf(checker: ts.TypeChecker, specs: PageSpec[], modules: Map<string, ts.Symbol>): Map<ts.Symbol, Home> {
  const found = new Map<ts.Symbol, { home: Home; own: boolean }>()
  for (const spec of specs) {
    const anchors = anchorsOf(spec.entries, (entry) => exportNames(checker, modules.get(entry)!))
    for (const entry of spec.entries) {
      const folder = `/packages/${entry.slice('@ifloom/'.length).split('/')[0]}/`
      for (const symbol of checker.getExportsOfModule(modules.get(entry)!)) {
        if (symbol.name === 'default') continue
        const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol
        const own = packageOf(target.declarations?.[0]?.getSourceFile().fileName ?? '').endsWith(folder)
        const before = found.get(target)
        if (before && (before.own || !own)) continue
        found.set(target, { home: { slug: spec.slug, anchor: anchors.get(`${entry} ${symbol.name}`)! }, own })
      }
    }
  }
  return new Map([...found].map(([symbol, { home }]) => [symbol, home]))
}

/** Every page of the API section, by its file name, and the number of exports listed. */
export function apiDocs(): { files: Map<string, string>; exports: number } {
  const { files, exports } = generated()
  return { files, exports }
}

/** Every comment the API pages print (each export's, field's and helper's), in the pages' order, once each. */
export function apiComments(): ApiComment[] {
  return generated().comments
}

/** The API pages, and the comments they print. */
function generated(): { files: Map<string, string>; exports: number; comments: ApiComment[] } {
  const { program, probe } = programOf()
  const writer = new Writer(program, probe)
  const modules = new Map<string, ts.Symbol>()
  for (const statement of program.getSourceFile(probe)!.statements) {
    if (!ts.isImportDeclaration(statement)) continue
    const module = writer.checker.getSymbolAtLocation(statement.moduleSpecifier)
    if (module) modules.set((statement.moduleSpecifier as ts.StringLiteral).text, module)
  }
  writer.learnAliases([...modules.values()].flatMap((module) => writer.checker.getExportsOfModule(module)))
  const files = new Map<string, string>()
  const counts = new Map<PageSpec, number>()
  const specs = SPECS.map((each) => {
    // A plugin with nothing for the player has no `/react` subpath.
    const entries = each.entries.filter((entry) => modules.has(entry))
    return {
      ...each,
      entries,
      description: each.description.replace(' and its /react subpath, if it has one', entries.length > 1 ? ' and its /react subpath' : ''),
    }
  })
  writer.homes = homesOf(writer.checker, specs, modules)
  for (const spec of specs) {
    files.set(`${spec.slug}.md`, pageOf(writer, spec, modules))
    counts.set(
      spec,
      spec.entries.reduce((sum, entry) => sum + writer.checker.getExportsOfModule(modules.get(entry)!).length, 0),
    )
  }
  files.set('index.md', indexOf(counts))
  files.set('meta.json', metaOf())
  return { files, exports: [...counts.values()].reduce((a, b) => a + b, 0), comments: [...writer.comments.values()] }
}

/** The committed pages, by file name, to compare with what `apiDocs` makes. */
export function committedApiDocs(): Map<string, string> {
  const files = new Map<string, string>()
  if (!existsSync(API)) return files
  for (const name of readdirSync(API).sort()) files.set(name, readFileSync(join(API, name), 'utf8'))
  return files
}

if (import.meta.main) {
  const started = Date.now()
  const { files, exports } = apiDocs()
  rmSync(API, { recursive: true, force: true })
  mkdirSync(API, { recursive: true })
  for (const [name, text] of files) writeFileSync(join(API, name), text)
  console.log(`${files.size - 2} pages, ${exports} exports, in ${Date.now() - started} ms: ${relative(ROOT, API)}`)
}
