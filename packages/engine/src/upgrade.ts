/**
 * Content migrations: a pack written for an older `SCHEMA` is carried forward
 * one step at a time until it is a pack of this one, the way `STEPS` in
 * `intake.ts` carries a save. `loadGame` goes through `upgradePack`, so an old
 * pack and an old mod file still load.
 *
 * The engine's steps reshape only what the engine reads. What a plugin reads
 * (its `data`, its calls' arguments, its strings, its traits) is the plugin's
 * to carry forward, with its own `contentMigrations`, and a pack records
 * which version of each plugin's content it was written for in `plugins`.
 * Commands in a command log are carried forward the same way, by the engine's
 * `COMMAND_STEPS` and each plugin's `commandMigrations`.
 */
import { fail, ok, type Result } from './result.ts'
import type { Pack } from './loader.ts'
import type { Plugin } from './plugin.ts'

/** The content format this engine reads. A pack of an older one is upgraded by `PACK_STEPS`; a newer one is refused. */
export const SCHEMA = 22

/** A pack as it came in: some schema's shape, not necessarily this one. */
export type RawPack = Record<string, unknown> & { schema: number }

/**
 * The steps that reshape a pack, keyed by the schema each upgrades *from*.
 * Every schema from the oldest the engine reads up to `SCHEMA - 1` has one: a
 * pack whose chain has a gap is too old to read.
 *
 * When the content format changes, bump `SCHEMA` and add the step that
 * reshapes the previous schema in the same change. A step returns a new pack
 * and never changes the one it was given; the schema number is set for it.
 */
export const PACK_STEPS: Record<number, (pack: RawPack) => RawPack> = {
  // 4 → 5: flags become the kv store, wherever content can hold them.
  // Words and code (prose, strings, variants, custom) are left as they are.
  4: (pack) =>
    Object.fromEntries(
      Object.entries(pack).map(([key, value]) => {
        if (WORDS.has(key)) return [key, value]
        // An input's `variable` is its `key`.
        if (key === 'inputs' && Array.isArray(value)) value = value.map((input) => (isRecord(input) ? renamed(input, { variable: 'key' }) : input))
        return [key, deep(value, flagsToKv)]
      }),
    ) as RawPack,
  // 5 → 6: one naming rule (ADR 0008) and one gating shape, wherever content
  // can hold them. Words and code are left as they are.
  5: (pack) => Object.fromEntries(Object.entries(pack).map(([key, value]) => [key, WORDS.has(key) ? value : deep(value, toSchema6)])) as RawPack,
  // 6 → 7: a plugin call's arguments are always named (ADR 0009). Every
  // change was to a plugin's calls, values or tokens, so each plugin carries
  // its own content forward.
  6: (pack) => pack,
  // 7 → 8: the timed-effects plugin is the statuses plugin; its own steps move its calls, content and strings.
  7: (pack) => pack,
  // 8 → 9: an item's `kind` meant a genre the engine shouldn't know, so it's
  // gone. It becomes a tag, and gear's one at the start becomes the item's
  // `start`: `{ kind: 'gear' }` is `{ tags: ['gear'], start: 1 }`. (A place's
  // `kind` is the places plugin's to move.)
  8: (pack) => (Array.isArray(pack.items) ? { ...pack, items: pack.items.map((item) => (isRecord(item) ? kindToTags(item) : item)) } : pack),
  // 9 → 10: one separator rule for ids (ADR 0010): a choice in a scene is
  // `scene#choice`, as its label's prose key already was, so `/` only ever
  // names a plugin. `{ chose: 'ch1.mat/open' }` is `{ chose: 'ch1.mat#open' }`.
  // Prose keys are the author's own names, which code can also hold, so they
  // are left as they are.
  9: (pack) => Object.fromEntries(Object.entries(pack).map(([key, value]) => [key, WORDS.has(key) ? value : deep(value, toSchema10)])) as RawPack,
  // 10 → 11: a stat's hidden `bands` are levels the player isn't shown, so
  // one condition reads both: `bands: [10, 20]` is
  // `levels: { at: [10, 20], hidden: true }`, and `{ tier: 'charm', gte: 2 }`
  // is `{ level: 'charm', gte: 2 }`. A stat that had both keeps its levels.
  10: (pack) =>
    Object.fromEntries(
      Object.entries(pack).map(([key, value]) => {
        if (key === 'stats' && Array.isArray(value)) value = value.map((stat) => (isRecord(stat) ? bandsToLevels(stat) : stat))
        return [key, WORDS.has(key) ? value : deep(value, toSchema11)]
      }),
    ) as RawPack,
  // 11 → 12: the feed plugin's value `feed/unseen` is `feed/unread`, which its own steps rename.
  11: (pack) => pack,
  // 12 → 13: items and collections leave the engine; things are entities. See `toSchema13`.
  12: (pack) => toSchema13(pack),
  // 13 → 14: the cast's characters are entities with the `cast/person` trait, which the cast's own steps move.
  13: (pack) => pack,
  // 14 → 15: a kind's named conditions are its `flags`, no longer its `marks`.
  14: (pack) =>
    Array.isArray(pack.kinds)
      ? { ...pack, kinds: pack.kinds.map((kind) => (isRecord(kind) && 'marks' in kind ? renamed(kind, { marks: 'flags' }) : kind)) }
      : pack,
  // 15 → 16: how things look and move is the UI's, written as `ui` hints. See `toSchema16`.
  15: (pack) => toSchema16(pack),
  // 16 → 17: one panel model. A scene's `panel: 'shop'` opens that panel while the scene is open,
  // `panel: { panel: 'shop' }`, and its `panelData` (the name of a custom function) is gone.
  16: (pack) =>
    Array.isArray(pack.scenes)
      ? {
          ...pack,
          scenes: pack.scenes.map((scene) => {
            if (!isRecord(scene) || !('panel' in scene || 'panelData' in scene)) return scene
            const { panel, panelData: _panelData, ...rest } = scene
            return typeof panel === 'string' ? { ...rest, panel: { panel } } : panel === undefined ? rest : { ...rest, panel }
          }),
        }
      : pack,
  // 17 → 18: the game's own code is its `rules`, and content calls it as it calls a plugin's, with `game` in front.
  // See `toSchema18`.
  17: (pack) => toSchema18(pack),
  // 18 → 19: one kv vocabulary, with whose store in `of`. See `toSchema19`.
  18: (pack) => toSchema19(pack),
  // 19 → 20: one kind of button. An activity is an action with no label. See `toSchema20`.
  19: (pack) => toSchema20(pack),
  // 20 → 21: effects are told apart by their key, as conditions are (see `keyedEffect`), and an
  // input's and a setting's `kind` is its `type`, so "kind" names only a kind of entity.
  20: (pack) => {
    const out: RawPack = { ...TOOLS.effects(pack) }
    const typed = (list: unknown) =>
      Array.isArray(list) ? list.map((entry) => (isRecord(entry) && 'kind' in entry && !('type' in entry) ? renamed(entry, { kind: 'type' }) : entry)) : list
    if (Array.isArray(out.inputs)) out.inputs = typed(out.inputs)
    if (Array.isArray(out.settings)) out.settings = typed(out.settings)
    return out
  },
  // 21 → 22: the engine's beats are text, say, image, video and sound. Letters, notes and `> ` lines are
  // the React UI's inline pieces, and a turned picture its block hint. See `toSchema22`.
  21: (pack) => toSchema22(pack),
}

/** A letter or a note, as prose wrote it before schema 22: `[[mail]]…[[/mail]]`, `[[sticky]]…[[/sticky]]`. */
const FENCE = /\[\[(mail|sticky|clip|diary)\]\]([\s\S]*?)\[\[\/\1\]\]/g

/** The header lines a letter's fence began with, before schema 22. */
const MAIL_HEADER = /^(From|To|Cc|Bcc|Subject|Date):\s*(.*)$/i

/** Words a UI piece can hold as its words or an argument: no `|` and no `]`. */
const pieceSafe = (text: string) => text !== '' && !/[|\]]/.test(text)

/** A letter's fence as the `mail` piece: its body the words, each header line an argument; or the lines as they are, when they can't be one. */
function mailPiece(inner: string): string {
  const lines = inner.trim().split('\n')
  const headers: string[] = []
  let at = 0
  for (; at < lines.length; at += 1) {
    const match = lines[at].match(MAIL_HEADER)
    if (!match) break
    headers.push(`${match[1]}: ${match[2].trim()}`)
  }
  const body = lines.slice(at).join('\n').trim()
  if (pieceSafe(body) && headers.every(pieceSafe)) return `[[ui:mail|${[body, ...headers].join('|')}]]`
  return [headers.join('\n'), body].filter(Boolean).join('\n\n')
}

/** A paragraph of prose that isn't a fence, with a `> ` line as the `mono` piece. */
function monoPiece(paragraph: string): string {
  const trimmed = paragraph.trim()
  if (!trimmed.startsWith('> ')) return paragraph
  const words = trimmed.slice(2).trim()
  return pieceSafe(words) ? paragraph.replace(trimmed, `[[ui:mono|${words}]]`) : paragraph.replace(trimmed, words)
}

/**
 * A line of prose as schema 22 writes it: each fence as a paragraph of its
 * own holding the React UI's piece (`[[ui:mail|body|From: Ava|…]]`,
 * `[[ui:prop|words|sticky]]`), each `> ` paragraph as `[[ui:mono|words]]`,
 * and a picture's `rot` flag gone. Words a piece can't hold (a `|` or a
 * `]`) are kept as plain paragraphs.
 */
function paperToPieces(text: string): string {
  const out: string[] = []
  let last = 0
  const plain = (piece: string) => out.push(piece.split('\n\n').map(monoPiece).join('\n\n'))
  for (const match of text.matchAll(FENCE)) {
    plain(text.slice(last, match.index))
    const inner = match[2].trim()
    const piece = match[1] === 'mail' ? mailPiece(inner) : pieceSafe(inner) ? `[[ui:prop|${inner}|${match[1]}]]` : inner
    // A paragraph of its own, as the fence was drawn.
    const before = out.pop() ?? ''
    out.push(`${before.replace(/\s*$/, '')}${before.trim() ? '\n\n' : ''}${piece}`)
    last = match.index + match[0].length
    const rest = text.slice(last)
    if (rest.trim() && !/^\s*\n\n/.test(rest)) out.push('\n\n')
  }
  plain(text.slice(last))
  return out.join('')
}

/** A `labels` entry from before schema 22, `{ when, key }`, as `{ when, label }`. */
const keyToLabel = (entry: unknown) => (isRecord(entry) && 'key' in entry && !('label' in entry) ? renamed(entry, { key: 'label' }) : entry)

/** A picture's markup with no `rot` flag: `[[img:cup|rot|A cup]]` is `[[img:cup|A cup]]`. */
const unturned = (text: string) =>
  text.replace(/\[\[(img|wide):([^\]|]+)((?:\|[^\]|]*)*)\]\]/g, (whole, tag: string, path: string, rest: string) => {
    const parts = rest.split('|').slice(1)
    return parts.some((part) => part.trim() === 'rot')
      ? `[[${tag}:${path}${parts
          .filter((part) => part.trim() !== 'rot')
          .map((part) => `|${part}`)
          .join('')}]]`
      : whole
  })

/**
 * Schema 21 content as schema 22 writes it, where the engine's beats are
 * text, say, image, video and sound, and how a letter or a sign looks is the
 * UI's:
 * - in prose and strings, `[[mail]]From: Ava\n\nHi.[[/mail]]` is the React
 *   UI's piece `[[ui:mail|Hi.|From: Ava]]`, `[[sticky]]Milk[[/sticky]]` (and
 *   `clip` and `diary`) is `[[ui:prop|Milk|sticky]]`, and a `> ` paragraph is
 *   `[[ui:mono|…]]`, each a paragraph of its own;
 * - a picture's `rot` flag goes, and a scene's `{ text }` block naming a line
 *   that had one gets the React UI's block hint `ui: { tilt: true }`;
 * - a choice's `labels` name their words `label`, as every button's do:
 *   `{ when, key: 'cafe.order#late' }` is `{ when, label: 'cafe.order#late' }`;
 * - a minigame's `vars` are its `kv`, the store `{ kv, of: 'minigame' }` reads.
 */
function toSchema22(pack: RawPack): RawPack {
  const tilted = new Set<string>()
  // A minigame's numbers are its kv store.
  if (Array.isArray(pack.minigames))
    pack = {
      ...pack,
      minigames: pack.minigames.map((entry) => (isRecord(entry) && 'vars' in entry && !('kv' in entry) ? renamed(entry, { vars: 'kv' }) : entry)),
    }
  const labelled = (value: unknown) => deep(value, (entry) => (Array.isArray(entry.labels) ? { ...entry, labels: entry.labels.map(keyToLabel) } : entry))
  const relabelled = {
    ...pack,
    ...(pack.scenes !== undefined ? { scenes: labelled(pack.scenes) } : {}),
    ...(pack.patches !== undefined ? { patches: labelled(pack.patches) } : {}),
  }
  const out = TOOLS.words(relabelled as RawPack, (text, key) => {
    const next = unturned(paperToPieces(text))
    if (unturned(text) !== text) tilted.add(key)
    return next
  })
  if (!tilted.size || !Array.isArray(out.scenes)) return out
  const tilt = (block: unknown) =>
    isRecord(block) && typeof block.text === 'string' && tilted.has(block.text)
      ? { ...block, ui: { tilt: true, ...(isRecord(block.ui) ? block.ui : {}) } }
      : block
  return { ...out, scenes: out.scenes.map((scene) => (isRecord(scene) && Array.isArray(scene.body) ? { ...scene, body: scene.body.map(tilt) } : scene)) }
}

/**
 * The fields each effect had while effects were told apart by `kind`, before
 * schema 21. An object is only read as an effect when its `kind` is one of
 * these and every other field is one of its own, so a scene beat or an
 * input that happens to have a `kind` is left alone.
 */
const KIND_FIELDS: Record<string, readonly string[]> = {
  stat: ['stat', 'by', 'to', 'of'],
  kv: ['key', 'to', 'by', 'random', 'of'],
  create: ['of', 'like', 'entity', 'at'],
  remove: ['entity'],
  each: ['effects', 'of', 'at', 'tag', 'trait', 'where'],
  entity: ['entity', 'at', 'by', 'to'],
  move: ['entity', 'from', 'to', 'by'],
  you: ['to'],
  scene: ['scene', 'from', 'otherwise'],
  closeStoryline: ['storyline', 'turns'],
  turn: ['by'],
  notify: ['title', 'text', 'image', 'tag', 'id'],
  audio: ['channel', 'to'],
  sound: ['track'],
  minigame: ['minigame'],
  timer: ['timer', 'to', 'by'],
  roll: ['key', 'dice', 'plus', 'against'],
  panel: ['panel', 'with'],
  custom: ['name', 'with'],
}

/** The field each effect's target was in, where its key is a verb or another noun: `{ kind: 'kv', key }` is `{ kv: key }`. */
const TARGET_FIELD: Record<string, string> = {
  kv: 'key',
  remove: 'entity',
  move: 'entity',
  you: 'to',
  closeStoryline: 'storyline',
  notify: 'title',
  audio: 'channel',
  sound: 'track',
  roll: 'key',
}

/**
 * An effect written while effects were told apart by `kind`, in the keyed
 * form schema 21 writes, or the object as it came when it isn't one:
 * - `{ kind: 'stat', stat, by }` is `{ stat, by }`, and so for `entity`,
 *   `minigame`, `timer` and `panel`, whose key was already their target;
 * - the others' target is their key: `{ kind: 'kv', key: 'x', to }` is
 *   `{ kv: 'x', to }`, `remove`, `move` and `you` name their entity,
 *   `closeStoryline` its storyline, `notify` its title, `audio` its channel,
 *   `sound` its track and `roll` its key;
 * - `{ kind: 'scene', from, otherwise }` is `{ scene: { from, otherwise } }`;
 * - `{ kind: 'turn' }` is `{ turn: true }`, and with `by`, `{ turn: { by } }`;
 * - `create`'s `of` is its key and its `entity` is `with`, its kind read from
 *   its `like` when it had no `of`;
 * - `each`'s `of` is its key, or with `at`, `tag` or `trait`, a selection;
 * - a call, `{ kind: 'custom', name, with }`, is its short form, `{ [name]: with }`.
 */
export function keyedEffect(value: Record<string, unknown>): Record<string, unknown> {
  const kind = value.kind
  if (typeof kind !== 'string' || !Object.hasOwn(KIND_FIELDS, kind)) return value
  const { kind: _kind, ...rest } = value
  if (!Object.keys(rest).every((field) => KIND_FIELDS[kind].includes(field))) return value
  switch (kind) {
    case 'stat':
    case 'entity':
    case 'minigame':
    case 'timer':
    case 'panel':
      return kind in rest ? rest : value
    case 'scene':
      if ('from' in rest) return { scene: { from: rest.from, ...(rest.otherwise !== undefined ? { otherwise: rest.otherwise } : {}) } }
      return 'scene' in rest ? { scene: rest.scene } : value
    case 'turn':
      return { turn: typeof rest.by === 'number' ? { by: rest.by } : true }
    case 'create': {
      const of = typeof rest.of === 'string' ? rest.of : typeof rest.like === 'string' && rest.like.includes(':') ? rest.like.split(':')[0] : undefined
      if (of === undefined) return value
      return {
        create: of,
        ...(rest.like !== undefined ? { like: rest.like } : {}),
        ...(rest.entity !== undefined ? { with: rest.entity } : {}),
        ...(rest.at !== undefined ? { at: rest.at } : {}),
      }
    }
    case 'each': {
      const { effects, where, of, ...narrow } = rest
      const each = Object.keys(narrow).length ? { ...(of !== undefined ? { of } : {}), ...narrow } : of
      if (each === undefined) return value
      return { each, ...(where !== undefined ? { where } : {}), effects }
    }
    case 'custom':
      return typeof rest.name === 'string' ? { [rest.name]: isRecord(rest.with) ? rest.with : true } : value
    default: {
      const field = TARGET_FIELD[kind]
      if (!(field in rest)) return value
      const { [field]: target, ...others } = rest
      return { [kind]: target, ...others }
    }
  }
}

/** An `activity` command, as the `action` command it is from schema 20. */
const activityToAction = (value: Record<string, unknown>): Record<string, unknown> =>
  value.type === 'activity' && typeof value.id === 'string' ? { ...value, type: 'action' } : value

/**
 * Schema 19 content as schema 20 writes it, where an action has the fields a
 * choice has and activities fold into actions:
 * - each of `activities` is an action with no label (so no button of its
 *   own), its `cost`, `blocked` and `effects` as they were; an action the
 *   pack declares with the same id, whose command did that activity, takes
 *   them in place of its command;
 * - `{ type: 'activity', id }` is `{ type: 'action', id }`, wherever a command is;
 * - a lock's `deny` and `except` name `action` for `activity`.
 */
function toSchema20(pack: RawPack): RawPack {
  const { activities, ...rest } = pack
  let out = rest as RawPack
  if (Array.isArray(activities) && activities.length) {
    const actions = Array.isArray(out.actions) ? [...out.actions] : []
    for (const activity of activities) {
      if (!isRecord(activity) || typeof activity.id !== 'string') continue
      const at = actions.findIndex((action) => isRecord(action) && action.id === activity.id)
      if (at < 0) {
        actions.push(activity)
        continue
      }
      const action = actions[at] as Record<string, unknown>
      const command = isRecord(action.command) ? action.command : undefined
      const ranIt = command?.type === 'activity' && command.id === activity.id
      const { command: _command, ...own } = action
      const blocked = [...(Array.isArray(own.blocked) ? own.blocked : []), ...(Array.isArray(activity.blocked) ? activity.blocked : [])]
      actions[at] = ranIt ? { ...activity, ...own, ...(blocked.length ? { blocked } : {}) } : action
    }
    out = { ...out, actions }
  }
  return TOOLS.objects(out, (value) => {
    let next = activityToAction(value)
    if (Array.isArray(next.deny) && typeof next.reason === 'string') {
      const rename = (list: unknown) => (Array.isArray(list) ? list.map((entry) => (entry === 'activity' ? 'action' : entry)) : list)
      next = { ...next, deny: rename(next.deny), ...(next.except !== undefined ? { except: rename(next.except) } : {}) }
    }
    return next
  })
}

/** The range keys a kv condition can carry. */
const RANGE_KEYS = ['gte', 'gt', 'lte', 'lt']

/**
 * Schema 18 content as schema 19 writes it, where every kv store is read and
 * written the one way, with whose it is in `of`:
 * - `{ storylineKv: { storyline: 'baker', key: 'visits' }, gte: 3 }` is
 *   `{ kv: 'visits', of: 'storyline:baker', gte: 3 }`, and the effect
 *   `{ kind: 'storylineKv', storyline, key, to }` is `{ kind: 'kv', key, of: 'storyline:baker', to }`;
 * - `{ minigameVar: 'score', gte: 3 }` is `{ kv: 'score', of: 'minigame', gte: 3 }`,
 *   and the `minigameVar` effect (with `to`, `by` or `random`) is a `kv` one with `of: 'minigame'`;
 * - the stretch of the game is the kv key `phase`: `{ phase: ['open'] }` is
 *   `{ kv: 'phase', is: ['open'] }`, `{ kind: 'phase', to }` is
 *   `{ kind: 'kv', key: 'phase', to }`, and `startPhase: 'arrival'` is the
 *   starting kv `kv: { phase: 'arrival' }`;
 * - in prose and strings, `{{n:baker.visits}}` is `{{kv:visits of=storyline:baker}}`.
 */
function toSchema19(pack: RawPack): RawPack {
  const { startPhase, ...rest } = pack
  let out = rest as RawPack
  if (typeof startPhase === 'string' && startPhase !== '') {
    const kv = isRecord(out.kv) ? out.kv : {}
    out = { ...out, kv: { phase: startPhase, ...kv } }
  }
  out = TOOLS.objects(out, (value) => {
    if (isRecord(value.storylineKv) && typeof value.storylineKv.storyline === 'string' && typeof value.storylineKv.key === 'string') {
      const { storylineKv, ...range } = value
      return { kv: storylineKv.key, of: `storyline:${String(storylineKv.storyline)}`, ...range }
    }
    if (value.kind === 'storylineKv' && typeof value.storyline === 'string') {
      const { storyline, key, kind: _kind, ...write } = value
      return { kind: 'kv', key, of: `storyline:${storyline}`, ...write }
    }
    if (typeof value.minigameVar === 'string' && Object.keys(value).every((key) => key === 'minigameVar' || RANGE_KEYS.includes(key))) {
      const { minigameVar, ...range } = value
      return { kv: minigameVar, of: 'minigame', ...range }
    }
    if (value.kind === 'minigameVar') return { ...value, kind: 'kv', of: 'minigame' }
    if (Array.isArray(value.phase) && Object.keys(value).length === 1) return { kv: 'phase', is: value.phase }
    if (value.kind === 'phase' && 'to' in value) return { kind: 'kv', key: 'phase', to: value.to }
    return value
  })
  return TOOLS.words(out, (text) =>
    text.replace(/\{\{n:([A-Za-z0-9_-]+)\.([A-Za-z0-9_]+)\}\}/g, (_match, storyline: string, key: string) => `{{kv:${key} of=storyline:${storyline}}}`),
  )
}

/** The full name a call to the game's own code had before schema 18, by the bare name it was written with. */
const gameName = (name: string): string => (name.includes('/') ? name : `game/${name}`)

/** A `{{v:name …}}` token written before schema 18 whose name has no plugin in front. */
const BARE_VALUE = /\{\{v:([A-Za-z0-9_.-]+)(?=[\s}])/g

/**
 * Schema 17 content as schema 18 writes it, where the game's own code is its
 * `rules`, called with `game` in front:
 * - `{ custom: 'tired' }` and `{ custom: 'tired', with }`, as a condition or an
 *   effect, are the call in short, `{ 'game/tired': true }` or
 *   `{ 'game/tired': with }`; a plugin's by its full name is its short form;
 * - an effect `{ kind: 'custom', name: 'tired' }` names `game/tired`;
 * - a value `{ value: 'payroll' }` names `game/payroll`;
 * - in prose and strings, `{{v:payroll}}` is `{{v:game/payroll}}`.
 *
 * A pack's `custom` functions are the game's code, which a pack can't hold
 * now; the loader reports it.
 */
function toSchema18(pack: RawPack): RawPack {
  const rewritten = TOOLS.objects(pack, (value) => {
    if (typeof value.custom === 'string' && Object.keys(value).every((key) => key === 'custom' || key === 'with')) {
      const args = isRecord(value.with) ? value.with : true
      return { [gameName(value.custom)]: args }
    }
    if (value.kind === 'custom' && typeof value.name === 'string') return { ...value, name: gameName(value.name) }
    if (typeof value.value === 'string' && Object.keys(value).every((key) => key === 'value' || key === 'with'))
      return { ...value, value: gameName(value.value) }
    return value
  })
  return TOOLS.words(rewritten, (text) => text.replace(BARE_VALUE, (_match, name: string) => `{{v:${gameName(name)}`))
}

/** The pack keys that hold words or code, not content a step rewrites. */
const WORDS = new Set(['prose', 'strings', 'variants', 'custom'])

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** An object with some of its keys renamed, in the same order. */
function renamed(value: Record<string, unknown>, names: Record<string, string>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).map(([key, inner]) => [names[key] ?? key, inner]))
}

/** Every object in a value rewritten by `rewrite`, from the innermost out. */
function deep(value: unknown, rewrite: (value: Record<string, unknown>) => Record<string, unknown>): unknown {
  if (Array.isArray(value)) return value.map((inner) => deep(inner, rewrite))
  if (!isRecord(value)) return value
  return rewrite(Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, deep(inner, rewrite)])))
}

/**
 * Schema 4's flags in one object of content, as schema 5's kv store: the
 * `{ flag }` and `{ storylineFlag }` conditions, the `flag` effect (`value`
 * is `to`, `add` is `by`), the `storylineFlag` effect, and a `flags` record
 * on an entity, a character, a template or a start command.
 */
function flagsToKv(value: Record<string, unknown>): Record<string, unknown> {
  if (value.kind === 'flag') return renamed({ ...value, kind: 'kv' }, { value: 'to', add: 'by' })
  if (value.kind === 'storylineFlag') return renamed({ ...value, kind: 'storylineKv' }, { value: 'to' })
  const names: Record<string, string> = {}
  if (typeof value.flag === 'string') names.flag = 'kv'
  if (isRecord(value.storylineFlag)) names.storylineFlag = 'storylineKv'
  if (isRecord(value.flags)) names.flags = 'kv'
  return Object.keys(names).length ? renamed(value, names) : value
}

/**
 * Schema 5's field names in an effect, by kind, as schema 6 names them: an
 * effect's target by its noun, `to` to set and `by` to change.
 */
const EFFECT_FIELDS: Record<string, Record<string, string>> = {
  stat: { key: 'stat' },
  setStat: { key: 'stat' },
  item: { id: 'item' },
  phase: { value: 'to' },
  scene: { id: 'scene' },
  storylineKv: { id: 'storyline' },
  closeStoryline: { id: 'storyline' },
  collect: { to: 'collection' },
  discard: { from: 'collection', id: 'entry' },
  remove: { of: 'entity' },
  audio: { track: 'to' },
  minigame: { id: 'minigame' },
  minigameVar: { value: 'to', add: 'by' },
}

/** Schema 5's field names in a core command, by type. */
const COMMAND_FIELDS: Record<string, Record<string, string>> = {
  use: { itemId: 'id' },
  setting: { value: 'to' },
  input: { value: 'to' },
}

const RANGE = ['gte', 'gt', 'lte', 'lt']

/** A `when` turned the other way round, without stacking `not`s. */
function negated(when: unknown): unknown {
  return isRecord(when) && Object.keys(when).length === 1 && 'not' in when ? when.not : { not: when }
}

/**
 * Schema 5 content in one object, as schema 6 writes it:
 * - effects' targets by their noun, `to` and `by` (`setStat` is `stat` with `to`);
 * - `use`'s `itemId`, and `setting` and `input`'s `value` (`to`);
 * - conditions: `{ has }` is `{ item }`, `{ turn: true, gte }` is `{ turn: { gte } }`,
 *   `{ counter }` and `storylineKv`'s inner `is` are one `storylineKv`, a
 *   collection's `id` is `entry`;
 * - gating: `requires` (met while true) is `blocked` (refused while true) with
 *   each `when` turned round, and `locked` is `blocked`.
 */
function toSchema6(value: Record<string, unknown>): Record<string, unknown> {
  let out = value
  // A plugin's calls (`kind` or `type` 'custom', `custom`, or a key with a `/`) are the plugin's to rename.
  if (typeof out.kind === 'string') {
    if (EFFECT_FIELDS[out.kind] && !(out.kind === 'scene' && 'from' in out)) {
      out = renamed(out.kind === 'setStat' ? { ...out, kind: 'stat' } : out, EFFECT_FIELDS[out.kind])
    }
  } else if (typeof out.type === 'string') {
    if (COMMAND_FIELDS[out.type]) out = renamed(out, COMMAND_FIELDS[out.type])
  } else {
    if (typeof out.has === 'string' && !('item' in out)) out = renamed(out, { has: 'item' })
    if (out.turn === true) {
      const range = Object.fromEntries(RANGE.filter((key) => key in out).map((key) => [key, out[key]]))
      out = { ...Object.fromEntries(Object.entries(out).filter(([key]) => !RANGE.includes(key))), turn: range }
    }
    if (isRecord(out.counter) && !('storylineKv' in out)) out = renamed(out, { counter: 'storylineKv' })
    if (isRecord(out.storylineKv) && 'is' in out.storylineKv) {
      const { is, ...target } = out.storylineKv
      out = { ...out, storylineKv: target, is }
    }
    if (typeof out.collection === 'string' && 'id' in out && !('entry' in out)) out = renamed(out, { id: 'entry' })
  }
  if (Array.isArray(out.requires) && out.requires.every((entry) => isRecord(entry) && 'when' in entry)) {
    const flipped = out.requires.map((entry) => ({ ...(entry as Record<string, unknown>), when: negated((entry as Record<string, unknown>).when) }))
    const { requires: _requires, ...rest } = out
    out = { ...rest, blocked: [...(Array.isArray(rest.blocked) ? rest.blocked : []), ...flipped] }
  }
  if (Array.isArray(out.locked)) {
    const { locked, ...rest } = out
    out = { ...rest, blocked: [...(Array.isArray(rest.blocked) ? rest.blocked : []), ...locked] }
  }
  return out
}

/** An item with its old `kind` as a tag; gear without a `start` starts with one. */
function kindToTags(value: Record<string, unknown>): Record<string, unknown> {
  if (typeof value.kind !== 'string' || !['gear', 'stuff'].includes(value.kind)) return value
  const { kind, ...rest } = value
  const tags = Array.isArray(rest.tags) ? (rest.tags.includes(kind) ? rest.tags : [...rest.tags, kind]) : [kind]
  return { ...rest, tags, ...(kind === 'gear' && rest.start === undefined ? { start: 1 } : {}) }
}

/** A `scene/choice` key as `scene#choice`: the last `/` is the one between them, as the engine read it. */
export function choiceKey(key: string): string {
  if (key.includes('#')) return key
  const cut = key.lastIndexOf('/')
  return cut > 0 ? `${key.slice(0, cut)}#${key.slice(cut + 1)}` : key
}

/** Schema 9 content in one object, as schema 10 writes it: a `chose` condition's key with `#`. */
function toSchema10(value: Record<string, unknown>): Record<string, unknown> {
  return typeof value.chose === 'string' ? { ...value, chose: choiceKey(value.chose) } : value
}

/** A stat's schema 10 `bands` as hidden levels. */
function bandsToLevels(stat: Record<string, unknown>): Record<string, unknown> {
  if (!('bands' in stat)) return stat
  const { bands, ...rest } = stat
  return isRecord(rest.levels) || !Array.isArray(bands) ? rest : { ...rest, levels: { at: bands, hidden: true } }
}

/** Schema 10 content in one object, as schema 11 writes it: a `{ tier, gte }` condition as `{ level, gte }`. */
function toSchema11(value: Record<string, unknown>): Record<string, unknown> {
  if (typeof value.tier !== 'string' || 'level' in value) return value
  const { tier, ...rest } = value
  return { level: tier, ...rest }
}

/** The kind a collection's entries became, by the collection's id: its own id, except the phone's `gallery`, whose entries are `photo` things. */
export function collectionKind(collection: string): string {
  return collection === 'gallery' ? 'photo' : collection
}

/** An item's id as the entity it became: `item:<id>`. An id that is already a reference is left as it is. */
const itemRef = (id: unknown): unknown => (typeof id === 'string' && !id.includes(':') ? `item:${id}` : id)

/** Strings the engine said for items, which plugins say now (their own steps copy them to their keys first). */
const ITEM_STRINGS = new Set(['doesNothing', 'haveNone'])

/**
 * Schema 12 content as schema 13 writes it, where items and collections
 * leave the engine and things are entities:
 * - `items` are entities of an `item` kind (declared unlisted unless the pack
 *   declares it), held by the player from the start where they had a `start`,
 *   with the item's `traits` where a plugin's step gave it some (the
 *   inventory's turns its `use` into one);
 * - `collections` are kinds, unlisted, named by `collectionKind`;
 * - `{ item, …range }` is `{ entity: 'item:<id>', at: 'you', …range }`, and the
 *   `item` effect the `entity` effect, held by `'you'`;
 * - `collect` is `create` (given to the player), `discard` is `remove`, and
 *   `{ collection, entry }` asks for the entity, `{ collection, …range }`
 *   counts what the player holds of the kind;
 * - the strings the engine said for items are gone.
 *
 * A plugin call's arguments are the plugin's: its own steps, which run
 * before this one, rename what its calls named.
 */
function toSchema13(pack: RawPack): RawPack {
  const { items, collections, ...rest } = pack
  const prose = isRecord(pack.prose) ? pack.prose : {}
  const out: RawPack = { ...rest } as RawPack
  const kinds = Array.isArray(rest.kinds) ? [...rest.kinds] : []
  const entities = Array.isArray(rest.entities) ? [...rest.entities] : []
  const declares = (id: string) => kinds.some((kind) => isRecord(kind) && kind.id === id)
  if (Array.isArray(items) && items.length) {
    if (!declares('item')) kinds.push({ id: 'item', label: 'Item', plural: 'Items', listed: false })
    for (const item of items) {
      if (!isRecord(item) || typeof item.id !== 'string') continue
      const start = typeof item.start === 'number' && item.start > 0 ? item.start : undefined
      entities.push({
        id: item.id,
        of: 'item',
        name: item.name,
        ...(item.desc !== undefined ? { desc: item.desc } : {}),
        ...(Array.isArray(item.tags) ? { tags: item.tags } : {}),
        ...(start !== undefined ? { at: { player: start } } : {}),
        ...(isRecord(item.traits) && Object.keys(item.traits).length ? { traits: item.traits } : {}),
      })
    }
  }
  for (const collection of Array.isArray(collections) ? collections : []) {
    if (!isRecord(collection) || typeof collection.id !== 'string') continue
    const kind = collectionKind(collection.id)
    if (!declares(kind)) kinds.push({ id: kind, label: collection.name ?? kind, plural: collection.name ?? kind, listed: false })
  }
  if (kinds.length) out.kinds = kinds
  if (entities.length) out.entities = entities
  if (isRecord(rest.strings)) out.strings = Object.fromEntries(Object.entries(rest.strings).filter(([id]) => !ITEM_STRINGS.has(id)))
  return Object.fromEntries(Object.entries(out).map(([key, value]) => [key, WORDS.has(key) ? value : thingsIn(value, prose, false)])) as RawPack
}

/**
 * Schema 12 content in one value, as schema 13 writes it, from the outside
 * in. `args` is a plugin call's arguments, which are the plugin's own and
 * never read as a condition or an effect, though what is inside them is.
 */
function thingsIn(value: unknown, prose: Record<string, unknown>, args: boolean): unknown {
  if (Array.isArray(value)) return value.map((inner) => thingsIn(inner, prose, false))
  if (!isRecord(value)) return value
  const long = typeof value.custom === 'string' || ((value.kind === 'custom' || value.type === 'custom') && typeof value.name === 'string')
  const out: Record<string, unknown> = {}
  for (const [key, inner] of Object.entries(value)) out[key] = thingsIn(inner, prose, key.includes('/') || (key === 'with' && long))
  return args ? out : thingTo13(out, prose)
}

/** One condition or effect of schema 12 that named an item or a collection, as schema 13 writes it. */
function thingTo13(value: Record<string, unknown>, prose: Record<string, unknown>): Record<string, unknown> {
  const rangeOf = (from: Record<string, unknown>) => Object.fromEntries(RANGE.filter((key) => key in from).map((key) => [key, from[key]]))
  const only = (allowed: string[]) => Object.keys(value).every((key) => allowed.includes(key) || RANGE.includes(key))
  if (value.kind === 'item' && typeof value.item === 'string') {
    const { kind: _kind, item, ...rest } = value
    return { kind: 'entity', entity: itemRef(item), at: 'you', ...rest }
  }
  if (value.kind === 'collect' && typeof value.collection === 'string' && isRecord(value.entry)) {
    const { id, title, text, image, data } = value.entry
    const desc = typeof text === 'string' && typeof prose[text] === 'string' ? prose[text] : undefined
    const entity = {
      ...(id !== undefined ? { id } : {}),
      ...(title !== undefined ? { name: title } : {}),
      ...(desc !== undefined ? { desc } : {}),
      ...(image !== undefined ? { image } : {}),
      ...(isRecord(data) && Object.keys(data).length ? { kv: data } : {}),
    }
    return { kind: 'create', of: collectionKind(value.collection), entity, at: 'player' }
  }
  if (value.kind === 'discard' && typeof value.collection === 'string' && typeof value.entry === 'string') {
    return { kind: 'remove', entity: `${collectionKind(value.collection)}:${value.entry}` }
  }
  if (value.kind === undefined && value.type === undefined) {
    if (typeof value.item === 'string' && only(['item'])) return { entity: itemRef(value.item), at: 'you', ...rangeOf(value) }
    if (typeof value.collection === 'string' && only(['collection', 'entry'])) {
      const kind = collectionKind(value.collection)
      if (typeof value.entry === 'string') return { entity: `${kind}:${value.entry}` }
      return { count: { of: kind, at: 'player' }, ...rangeOf(value) }
    }
  }
  return value
}

/** `[[reveal]]` markup on a block of its own: its delay and its transition. */
const REVEAL_BLOCK = /^\[\[reveal(?::\s*(\d*)\s*)?(?:\|\s*([a-z0-9-]*)\s*)?\]\]$/

/** `[[reveal]]` markup anywhere, as written. */
const REVEAL_ANYWHERE = /[ \t]*\[\[reveal(?::[^\]|]*)?(?:\|[^\]]*)?\]\][ \t]*/g

/** A reveal's markup as the React UI's hint: `{ delay, as }`, leaving out what the markup left out. */
function revealHint(match: RegExpMatchArray): Record<string, unknown> {
  return { ...(match[1] ? { delay: Number(match[1]) } : {}), ...(match[2] ? { as: match[2] } : {}) }
}

/** Prose with its `[[reveal]]` markup taken out: a marker on a line of its own goes with its blank line, one inside a paragraph is cut out. */
function withoutReveals(text: string): string {
  if (!text.includes('[[reveal')) return text
  return text
    .split('\n\n')
    .filter((block) => !REVEAL_BLOCK.test(block.trim()))
    .map((block) => block.replace(REVEAL_ANYWHERE, (found) => (/^[ \t]/.test(found) && /[ \t]$/.test(found) ? ' ' : '')))
    .join('\n\n')
}

/** Hints laid into an object's `ui`, what it already says winning. */
function hinted(value: Record<string, unknown>, hints: Record<string, unknown>): Record<string, unknown> {
  const ui = isRecord(value.ui) ? value.ui : {}
  return { ...value, ui: { ...hints, ...ui } }
}

/**
 * Schema 15 content as schema 16 writes it. Presentation moved out of the
 * engine into `ui` hints, which the engine carries to the view as written,
 * in the React UI's words:
 *
 * - a scene's `transition` is `ui.transition`, and its `frame` is gone
 *   (nothing read it);
 * - a block's `reveal` is `ui.reveal`;
 * - `[[reveal]]` markup on a line of its own, in the prose of a scene's
 *   `{ text }` block, splits that prose: the words before it keep the
 *   key, and each part after it gets a key of its own (`<key>.2`, `<key>.3`)
 *   and a block of its own with `ui.reveal`, under the same `when`. Anywhere
 *   else, such as inside a paragraph or in a variants member, the markup is
 *   taken out and the words show at once;
 * - a `transition` effect in a choice's effects is the choice's
 *   `ui.transition` (`{ in, ms }`), which the React UI plays for the screen the
 *   choice leads to; anywhere else it is dropped;
 * - a stat's `display` is `ui.display`.
 *
 * What plugins drew (a place's transition and blocks, a person's hue) is
 * moved by their own steps, which run before this one, so a place's prose
 * still has its markup to split.
 */
function toSchema16(pack: RawPack): RawPack {
  const prose: Record<string, unknown> = isRecord(pack.prose) ? { ...pack.prose } : {}
  const out: Record<string, unknown> = { ...pack }
  /** A block list with each `{ text }` block whose prose holds reveals split at them. */
  const splitBlocks = (blocks: unknown): unknown => {
    if (!Array.isArray(blocks)) return blocks
    return blocks.flatMap((block) => {
      if (!isRecord(block) || typeof block.text !== 'string' || typeof prose[block.text] !== 'string') return [block]
      const key = block.text
      const parts: { words: string[]; reveal?: Record<string, unknown> }[] = [{ words: [] }]
      for (const piece of (prose[key] as string).split('\n\n')) {
        const marker = piece.trim().match(REVEAL_BLOCK)
        if (marker) parts.push({ words: [], reveal: revealHint(marker) })
        else parts.at(-1)!.words.push(piece)
      }
      if (parts.length === 1) return [block]
      const { reveal: _reveal, ui: _ui, text: _text, ...shared } = block
      const kept = parts.filter((part) => part.words.join('').trim() !== '')
      return kept.map((part, index) => {
        let id = key
        if (index > 0) {
          let n = index + 1
          while (`${key}.${n}` in prose && prose[`${key}.${n}`] !== part.words.join('\n\n')) n += 1
          id = `${key}.${n}`
        }
        prose[id] = part.words.join('\n\n')
        const own = index === 0 ? block : { ...shared, text: id }
        return part.reveal ? hinted(own, { reveal: part.reveal }) : own
      })
    })
  }
  if (Array.isArray(pack.scenes)) {
    out.scenes = pack.scenes.map((scene) => {
      if (!isRecord(scene)) return scene
      const { frame: _frame, transition, ...rest } = scene
      let next: Record<string, unknown> = transition !== undefined ? hinted(rest, { transition }) : rest
      if (Array.isArray(next.body)) next = { ...next, body: splitBlocks(next.body) }
      if (Array.isArray(next.choices))
        next = {
          ...next,
          choices: next.choices.map((choice) => {
            if (!isRecord(choice) || !Array.isArray(choice.effects)) return choice
            const effect = choice.effects.find((entry) => isRecord(entry) && entry.kind === 'transition' && typeof entry.to === 'string') as
              | Record<string, unknown>
              | undefined
            if (!effect) return choice
            return hinted({ ...choice }, { transition: effect.ms !== undefined ? { in: effect.to, ms: effect.ms } : { in: effect.to } })
          }),
        }
      return next
    })
  }
  if (Array.isArray(pack.stats))
    out.stats = pack.stats.map((stat) => {
      if (!isRecord(stat) || !('display' in stat)) return stat
      const { display, ...rest } = stat
      return hinted(rest, { display })
    })
  // Blocks' `reveal` everywhere else, and `transition` effects that no choice took, the deep way. Words and code are left as they are.
  for (const [key, value] of Object.entries(out)) {
    if (WORDS.has(key)) continue
    out[key] = deepArrays(value)
  }
  if (isRecord(pack.prose))
    out.prose = Object.fromEntries(Object.entries(prose).map(([id, text]) => [id, typeof text === 'string' ? withoutReveals(text) : text]))
  return out as RawPack
}

/** A value with every block's `reveal` as `ui.reveal`, and every `transition` effect left out of the lists that held it. */
function deepArrays(value: unknown): unknown {
  if (Array.isArray(value))
    return value
      .filter(
        (inner) =>
          !(
            isRecord(inner) &&
            inner.kind === 'transition' &&
            typeof inner.to === 'string' &&
            Object.keys(inner).every((key) => ['kind', 'to', 'ms'].includes(key))
          ),
      )
      .map(deepArrays)
  if (!isRecord(value)) return value
  const inner = Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, deepArrays(entry)]))
  if (isRecord(inner.reveal) && ('text' in inner || 'variants' in inner || 'media' in inner)) {
    const { reveal, ...rest } = inner
    return hinted(rest, { reveal })
  }
  return inner
}

/** How a plugin call is written in content: `short`, `long` or as a `command`. See `ContentTools.calls`. */
type CallForm = 'short' | 'long' | 'command'

/** A plugin call as `ContentTools.calls` hands it over: its full name, its arguments as written, and how it was written. */
type RawCall = { name: string; with: unknown; form: CallForm }

/**
 * What a plugin's content step is given besides the pack: ways to rewrite
 * what a pack holds without walking it by hand. Each returns a new pack.
 * `objects` and `calls` leave words and code (`prose`, `strings`,
 * `variants`, `custom`) as they are, and `words` rewrites only those words.
 */
export type ContentTools = {
  /** Every object the pack's content holds, rewritten from the innermost out. */
  objects: (pack: RawPack, rewrite: (value: Record<string, unknown>) => Record<string, unknown>) => RawPack
  /**
   * Every call to a condition, effect or command by name, however it is
   * written: `short`, `{ 'places/at': { location } }` (any key with a `/`,
   * so check the name); `long`, `{ custom: 'places/at', with }` or
   * `{ kind: 'custom', name, with }`; or a `command`,
   * `{ type: 'custom', name, with }`. Return its name and arguments: a call
   * given back as it came stays as it was. A value (`{ value, with }`) is
   * not a call; reach it with `objects`.
   */
  calls: (pack: RawPack, rewrite: (call: RawCall) => { name: string; with: unknown }) => RawPack
  /** Every line of the pack's `prose` and `strings`, given with its key. */
  words: (pack: RawPack, rewrite: (text: string, key: string) => string) => RawPack
  /**
   * Every effect the pack holds, in plugin `data` and traits too, in the form
   * this engine reads: one written while effects were told apart by `kind`
   * (`{ kind: 'stat', stat, by }`, before schema 21) in the keyed form
   * (`{ stat, by }`). One already keyed is left as it is. For a plugin whose
   * content holds effects somewhere the engine's own step can't see.
   */
  effects: (pack: RawPack) => RawPack
}

/**
 * One step of a plugin's `contentMigrations`: the whole pack as the version
 * it upgrades from wrote it, as the next version writes it. It usually
 * changes only the plugin's own `data`, calls, strings and traits. It returns
 * a new pack and never changes the one it was given.
 */
export type ContentStep = (pack: RawPack, tools: ContentTools) => RawPack

/** A command as a log from an older engine or plugin kept it: some version's shape, with its `type`. */
export type RawCommand = Record<string, unknown> & { type: string }

/**
 * One step of a plugin's `commandMigrations`: a command from a log, as the
 * version it upgrades from wrote it, as the next version takes it. It is
 * given every command, the engine's and other plugins' too, so it checks the
 * type and name and gives back the ones that aren't its own as they came.
 */
export type CommandStep = (command: RawCommand) => RawCommand

/** One plugin call in one object, rewritten. */
function callsIn(value: Record<string, unknown>, rewrite: (call: RawCall) => { name: string; with: unknown }): Record<string, unknown> {
  let out = value
  const long = (field: 'name' | 'custom', form: CallForm) => {
    const next = rewrite({ name: out[field] as string, with: out.with, form })
    if (next.name === out[field] && next.with === out.with) return
    const { with: _with, ...rest } = out
    out = { ...rest, [field]: next.name, ...(next.with !== undefined ? { with: next.with } : {}) }
  }
  if (out.kind === 'custom' && typeof out.name === 'string') long('name', 'long')
  else if (out.type === 'custom' && typeof out.name === 'string') long('name', 'command')
  if (typeof out.custom === 'string') long('custom', 'long')
  if (Object.keys(out).some((key) => key.includes('/'))) {
    let changed = false
    const entries = Object.entries(out).map(([key, inner]): [string, unknown] => {
      if (!key.includes('/')) return [key, inner]
      const next = rewrite({ name: key, with: inner, form: 'short' })
      if (next.name !== key || next.with !== inner) changed = true
      return [next.name, next.with]
    })
    if (changed) out = Object.fromEntries(entries)
  }
  return out
}

/** The tools every plugin's content step is given. */
const TOOLS: ContentTools = {
  objects: (pack, rewrite) => Object.fromEntries(Object.entries(pack).map(([key, value]) => [key, WORDS.has(key) ? value : deep(value, rewrite)])) as RawPack,
  calls: (pack, rewrite) => TOOLS.objects(pack, (value) => callsIn(value, rewrite)),
  words: (pack, rewrite) =>
    Object.fromEntries(
      Object.entries(pack).map(([key, value]) => [
        key,
        (key === 'prose' || key === 'strings') && isRecord(value)
          ? Object.fromEntries(Object.entries(value).map(([id, text]) => [id, typeof text === 'string' ? rewrite(text, id) : text]))
          : value,
      ]),
    ) as RawPack,
  effects: (pack) => TOOLS.objects(pack, keyedEffect),
}

/**
 * The engine's steps that reshape a command from a command log, keyed by the
 * schema each upgrades *from*, as `PACK_STEPS` are. Sparse: a schema with no
 * step changed no command. A plugin's commands are its own to carry forward,
 * with its `commandMigrations`.
 */
export const COMMAND_STEPS: Record<number, (command: RawCommand) => RawCommand> = {
  // 5 → 6: the naming rule. `use`'s `itemId` is `id`, and `setting` and `input` set with `to`.
  5: (command) => (COMMAND_FIELDS[command.type] ? (renamed(command, COMMAND_FIELDS[command.type]) as RawCommand) : command),
  // 19 → 20: an activity is an action, done by `{ type: 'action', id }`.
  19: (command) => activityToAction(command) as RawCommand,
}

/**
 * The version of a plugin's content a pack was written for, or of its
 * commands a log was, where it doesn't record one: its schema, or the
 * plugin's own version if that is lower, and at least 1. The first-party
 * plugins number their versions by the engine's schema, since the engine
 * once carried their content forward itself, so a pack from before plugins
 * kept versions lines up with their steps; for any plugin, a pack written
 * now without a record is read as its current version.
 */
function guessed(schema: number, current: number): number {
  return Math.max(1, Math.min(schema, current))
}

/** Each plugin's version as a pack or a log records it, or guessed from its schema; or why one can't be read. */
function startingVersions(
  plugins: readonly Plugin[],
  recorded: Record<string, unknown>,
  schema: number,
  current: (plugin: Plugin) => number,
  what: string,
): Result<Record<string, number>> {
  const out: Record<string, number> = {}
  for (const plugin of plugins) {
    const target = current(plugin)
    const given = recorded[plugin.id]
    if (given === undefined) {
      out[plugin.id] = guessed(schema, target)
      continue
    }
    if (typeof given !== 'number' || !Number.isInteger(given) || given < 1)
      return fail(`records "${String(given)}" as the ${plugin.id} plugin's ${what} version`)
    if (given > target) return fail(`written for version ${given} of the ${plugin.id} plugin's ${what}, this game's reads ${target}`)
    out[plugin.id] = given
  }
  return ok(out)
}

/**
 * Bring every plugin's version in `at` up to `upTo` (or its own version, if
 * lower), running its steps in order, the game's plugins in their order.
 * Returns whether any version moved.
 */
function catchUp<T>(
  plugins: readonly Plugin[],
  at: Record<string, number>,
  upTo: number,
  current: (plugin: Plugin) => number,
  stepOf: (plugin: Plugin, version: number) => ((value: T) => T) | undefined,
  value: { now: T },
): boolean {
  let moved = false
  for (const plugin of plugins) {
    const target = Math.min(upTo, current(plugin))
    while (at[plugin.id] < target) {
      const step = stepOf(plugin, at[plugin.id])
      if (step) value.now = step(value.now)
      at[plugin.id] += 1
      moved = true
    }
  }
  return moved
}

const contentVersion = (plugin: Plugin) => plugin.contentVersion ?? 1
const commandVersion = (plugin: Plugin) => plugin.commandVersion ?? 1

/**
 * A pack brought up to `SCHEMA` and to each of `plugins`' content versions,
 * step by step, or why it can't be: it was written for a newer engine or a
 * newer version of a plugin, or for an engine so old there is no step from
 * it. Pass the game's plugins (`game.plugins`, or the base's), so what each
 * one reads is carried forward with the rest.
 *
 * The engine's step from each schema runs after every plugin step keyed by
 * that schema or below, so a first-party plugin's step meets the pack as the
 * engine had it then. Then each plugin's later steps run. A pack that records
 * no version for a plugin is read as written for its schema, or for the
 * plugin's own version if that is lower. The result records every plugin's
 * version in `plugins`. A pack with nothing to do comes back as it is.
 */
export function upgradePack(pack: { schema: number; plugins?: Record<string, number> }, plugins: readonly Plugin[]): Result<Pack> {
  const from = pack.schema
  if (!Number.isInteger(from)) return fail(`has no schema number`)
  if (from > SCHEMA) return fail(`written for schema ${from}, this engine reads ${SCHEMA}`)
  for (let version = from; version < SCHEMA; version += 1) {
    if (!PACK_STEPS[version]) return fail(`written for schema ${from}, too old for this engine to read (it reads ${SCHEMA})`)
  }
  const recorded = isRecord(pack.plugins) ? pack.plugins : {}
  const versions = startingVersions(plugins, recorded, from, contentVersion, 'content')
  if (!versions.ok) return versions
  const at = versions.value
  const raw = { now: pack as RawPack }
  const stepOf = (plugin: Plugin, version: number) => {
    const step = plugin.contentMigrations?.[version]
    return step ? (value: RawPack): RawPack => ({ ...step(value, TOOLS), schema: value.schema }) : undefined
  }
  let changed = false
  for (let version = from; version < SCHEMA; version += 1) {
    catchUp(plugins, at, version + 1, contentVersion, stepOf, raw)
    raw.now = { ...PACK_STEPS[version](raw.now), schema: version + 1 }
    changed = true
  }
  if (catchUp(plugins, at, Infinity, contentVersion, stepOf, raw)) changed = true
  if (!changed) return ok(pack as unknown as Pack)
  const out: RawPack = { ...raw.now }
  if (plugins.length || pack.plugins !== undefined) out.plugins = { ...recorded, ...at }
  return ok(out as unknown as Pack)
}

/** What a command log records of the versions it was written with: the engine's `SCHEMA`, and each plugin's command version. */
export type CommandVersions = { schema: number; plugins: Record<string, number> }

/** The versions a command log made now records, for a game with these plugins. */
export function commandVersions(plugins: readonly Plugin[]): CommandVersions {
  return { schema: SCHEMA, plugins: Object.fromEntries(plugins.map((plugin) => [plugin.id, commandVersion(plugin)])) }
}

/**
 * How to bring a log's commands up to this engine and these plugins, given
 * the versions the log records (none, for a log from before logs kept them,
 * which is read as the oldest, so every step runs), or why its commands can't
 * be read. Each command goes through the engine's `COMMAND_STEPS` from the
 * log's schema and each plugin's `commandMigrations` from its version,
 * interleaved as `upgradePack` interleaves content. A command already in
 * this shape comes back as it is.
 */
export function commandUpgrade(plugins: readonly Plugin[], from: Partial<CommandVersions> = {}): Result<<C>(command: C) => C> {
  const schema = from.schema ?? 1
  if (!Number.isInteger(schema)) return fail(`has no schema number`)
  if (schema > SCHEMA) return fail(`written for schema ${schema}, this engine reads ${SCHEMA}`)
  const versions = startingVersions(plugins, isRecord(from.plugins) ? from.plugins : {}, schema, commandVersion, 'commands')
  if (!versions.ok) return versions
  const stepOf = (plugin: Plugin, version: number) => plugin.commandMigrations?.[version]
  return ok(<C>(command: C): C => {
    if (!isRecord(command) || typeof command.type !== 'string') return command
    const at = { ...versions.value }
    const value = { now: command as RawCommand }
    for (let version = schema; version < SCHEMA; version += 1) {
      catchUp(plugins, at, version + 1, commandVersion, stepOf, value)
      const step = COMMAND_STEPS[version]
      if (step) value.now = step(value.now)
    }
    catchUp(plugins, at, Infinity, commandVersion, stepOf, value)
    return value.now as C
  })
}
