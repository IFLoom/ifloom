/**
 * The state intake: every way a `GameState` comes into play. A new game is
 * built by `startingState`; anything else (a save, a command log's start, a
 * state a test wrote by hand) comes in through `loadState`, which carries it
 * forward and fills it in. Each field of the state declares its new-game value
 * and its load default once, in `FIELDS`, and both paths read that table.
 */
import { fail, ok, type Result } from './result.ts'
import { stringOf } from './strings.ts'
import type { Game } from './game.ts'
import { rulesPlugin, type Plugin, type PluginSlice } from './plugin.ts'
import { SAVE_VERSION, type GameState, type StartOptions } from './types.ts'
import { choiceKey, collectionKind } from './upgrade.ts'
import { hash } from './random.ts'
import { featureContext } from './core.ts'
import type { StateField } from './features/feature.ts'
import { entityDef } from './entities.ts'
import type { Times } from './features/scenes.ts'
import { carrySteps, featureFields, fillSteps, loadSteps, startSteps, type FeatureFill } from './features/registry.ts'

export type { StartOptions } from './types.ts'

/** One field of the state: what a new game has, and what a loaded state that lacks it gets. See `StateField`. */
type Field<K extends keyof GameState> = StateField<GameState[K]>

/**
 * Every field of `GameState`: the core's, declared here, and each feature's,
 * declared in its `state`. A new field is declared once: its new-game value
 * and, for a field an older save won't have, its load default. Old saves
 * then load without a step in `STEPS`; a step is only needed to reshape what
 * a save already has.
 */
export const FIELDS: { [K in keyof GameState]-?: Field<K> } = {
  version: { start: () => SAVE_VERSION },
  seed: { start: (game, options) => options.seed ?? hash(game.id) },
  ...featureFields,
  // A plugin the save lacks starts fresh in `carryPlugins`.
  plugins: { start: (game) => startingPlugins(game) },
  // Only a game that declares a version stamps its saves with one; `carryGame` carries it.
  gameVersion: { start: (game) => game.version },
}

/** The game's plugins, after the game's own rules as the plugin `game` when they keep a state (`rules.start`). */
function withRules(game: Game): readonly Plugin[] {
  const rules = game.rules?.start ? rulesPlugin(game) : undefined
  return rules ? [rules, ...(game.plugins ?? [])] : (game.plugins ?? [])
}

function startingPlugins(game: Game): Record<string, PluginSlice> {
  const out: Record<string, PluginSlice> = {}
  for (const plugin of withRules(game)) {
    if (plugin.start) out[plugin.id] = { version: plugin.version, state: plugin.start(game) }
  }
  return out
}

/** What `carryOver` takes from the game before, laid over a fresh state: each feature's fields, worked out from the fresh state. */
function carried(state: GameState, game: Game, from: GameState, options: StartOptions): GameState {
  if (!game.carryOver) return state
  const cx = featureContext()
  return Object.assign({ ...state }, ...carrySteps.map((step) => step(state, game, from, options, cx))) as GameState
}

/**
 * A new game: every field at its start value, with a New Game+'s carried
 * values laid over, then what features work out from the whole state (what
 * the opening screen starts playing).
 */
export function startingState(game: Game, options: StartOptions = {}): GameState {
  const fresh: Record<string, unknown> = {}
  for (const [key, field] of Object.entries(FIELDS) as [string, Field<keyof GameState>][]) {
    const value = field.start(game, options)
    if (value !== undefined) fresh[key] = value
  }
  let state = fresh as GameState
  if (options.carry) {
    state = carried(state, game, options.carry, options)
  }
  return startSteps.reduce((next, step) => step(next, game, featureContext()), state)
}

/** A save as it came off disk: some version of the shape, not necessarily this one. */
type Saved = Record<string, unknown> & { version?: unknown }

/** The oldest save format the engine still reads. A save older than this, or with no version, is refused. */
const OLDEST = 1

/**
 * The engine's steps that reshape what a save already has, keyed by the
 * version each upgrades *from*. A version with no step only added fields,
 * which their load defaults in `FIELDS` fill.
 *
 * When the save format changes after release, bump `SAVE_VERSION`, and add the
 * step that reshapes the previous version in the same change. A step is given
 * the game too, for one that has to read its content.
 */
const STEPS: Record<number, (state: Saved, game: Game) => Saved> = {
  // 1 → 2: the player's name moves into flags (the kv store since 12), and choices start being remembered.
  1: ({ playerName, playerFirst, playerLast, ...state }) => ({
    ...state,
    flags: { playerName, playerFirst, playerLast, ...(state.flags as object) },
    chosen: {},
  }),
  // 2 → 3: one clock, the turn. A day was the only turn there was, so the turn
  // is the day, and everything stamped with a day is stamped with that turn.
  2: (state) => {
    const time = state.time as { day: number } | undefined
    const stamped = <T extends { day?: number }>(list: T[] = []) => list.map(({ day, ...rest }) => ({ ...rest, turn: day ?? 0 }))
    const flags = Object.fromEntries(
      Object.entries((state.flags ?? {}) as Record<string, unknown>).map(([key, value]) => [key.startsWith('day:') ? `turn:${key.slice(4)}` : key, value]),
    )
    const storylines = Object.fromEntries(
      Object.entries((state.storylines ?? {}) as Record<string, { closedUntilDay?: number | null }>).map(([id, { closedUntilDay, ...rest }]) => [
        id,
        { ...rest, closedUntil: closedUntilDay ?? null },
      ]),
    )
    const collections = Object.fromEntries(
      Object.entries((state.collections ?? {}) as Record<string, { day?: number }[]>).map(([id, list]) => [id, stamped(list)]),
    )
    return { ...state, turn: time?.day ?? 0, flags, storylines, collections, notices: stamped(state.notices as { day?: number }[]) }
  },
  // 3 → 4: entities and created, from their load defaults.
  // 4 → 5: the clock leaves the engine for the calendar plugin, with the same day and period
  // (the last one, 'sleep', is the calendar's 'late'). A game without the calendar keeps it unused.
  4: ({ time, ...state }) => {
    const clock = time as { day: number; period: string } | undefined
    if (!clock) return state
    const plugins = { ...(state.plugins as Record<string, unknown>) }
    plugins.calendar ??= { version: 1, state: { day: clock.day, period: clock.period === 'sleep' ? 'late' : clock.period } }
    return { ...state, plugins }
  },
  // 5 → 6: where the player is leaves the engine for the places plugin.
  5: ({ locationId, ...state }) => {
    if (locationId === null || locationId === undefined) return state
    const plugins = { ...(state.plugins as Record<string, unknown>) }
    plugins.places ??= { version: 1, state: { at: locationId } }
    return { ...state, plugins }
  },
  // 6 → 7: removed, from its load default.
  // 7 → 8: storylines lose standing and rapport. A relationship is a stat the game declares on the cast's
  // characters now, and the engine cannot know which; a version-7 save's standing is dropped.
  7: (state) => ({
    ...state,
    storylines: Object.fromEntries(
      Object.entries((state.storylines ?? {}) as Record<string, { closedUntil?: number | null; flags?: Record<string, unknown> }>).map(
        ([id, { closedUntil, flags }]) => [id, { closedUntil: closedUntil ?? null, flags: flags ?? {} }],
      ),
    ),
  }),
  // 8 → 9: settings, 9 → 10: audio, 10 → 11: media, all from their load defaults.
  // 11 → 12: flags become the kv store: the game's, each storyline's and each entity's.
  11: ({ flags, ...state }) => {
    const moved = <T extends { flags?: unknown; kv?: unknown }>({ flags: own, ...rest }: T) => ({ ...rest, kv: own ?? rest.kv ?? {} })
    return {
      ...state,
      kv: flags ?? state.kv ?? {},
      storylines: Object.fromEntries(
        Object.entries((state.storylines ?? {}) as Record<string, { flags?: unknown }>).map(([id, storyline]) => [id, moved(storyline)]),
      ),
      entities: Object.fromEntries(
        Object.entries((state.entities ?? {}) as Record<string, Record<string, { flags?: unknown }>>).map(([kind, byId]) => [
          kind,
          Object.fromEntries(Object.entries(byId).map(([id, entity]) => [id, moved(entity)])),
        ]),
      ),
    }
  },
  // 12 → 13: the timed-effects plugin is the statuses plugin, so its state moves from `plugins.effects`.
  12: (state) => {
    const plugins = state.plugins as Record<string, unknown> | undefined
    if (!plugins || !('effects' in plugins) || 'statuses' in plugins) return state
    const { effects, ...rest } = plugins
    return { ...state, plugins: { ...rest, statuses: effects } }
  },
  // 13 → 14: a choice in a scene is `scene#choice` (ADR 0010), so the choices picked are counted by it.
  // The once-a-turn records of choices (`turn:scene.choice` in kv) aren't moved: each lasts the turn it was made in.
  13: (state) => ({
    ...state,
    chosen: Object.fromEntries(Object.entries((state.chosen ?? {}) as Record<string, number>).map(([key, count]) => [choiceKey(key), count])),
  }),
  // 14 → 15: an entity's record keeps only what play changed, and reads the rest from content. Empty
  // stats and kv go here; the entities feature's `loaded` drops what equals the game's content (names, starts).
  14: (state) => ({
    ...state,
    entities: Object.fromEntries(
      Object.entries((state.entities ?? {}) as Record<string, Record<string, Record<string, unknown>>>).map(([kind, byId]) => [
        kind,
        Object.fromEntries(
          Object.entries(byId).map(([id, record]) => [
            id,
            Object.fromEntries(Object.entries(record).filter(([, value]) => !(value && typeof value === 'object' && !Object.keys(value).length))),
          ]),
        ),
      ]),
    ),
  }),
  // 15 → 16: items and collections leave the engine; both are things the player holds. An item's count
  // is held by the player, the entity named after it (see `itemRef`), 0s kept. A collection's entries
  // become things made in play of a kind named after the collection (the phone's `gallery` is `photo`
  // things), held by the player: its title the name, its prose the description, its data the kv.
  15: ({ items, collections, ...state }, game) => {
    const player: Record<string, number> = { ...(state.held as Record<string, Record<string, number>> | undefined)?.player }
    for (const [id, count] of Object.entries((items ?? {}) as Record<string, unknown>)) {
      if (typeof count === 'number') player[itemRef(game, id)] = count
    }
    const entities = { ...(state.entities as Record<string, Record<string, Record<string, unknown>>> | undefined) }
    for (const [collection, entries] of Object.entries((collections ?? {}) as Record<string, OldEntry[]>)) {
      const kind = collectionKind(collection)
      for (const entry of Array.isArray(entries) ? entries : []) {
        if (typeof entry?.id !== 'string' || entities[kind]?.[entry.id]) continue
        const desc = entry.text !== undefined ? game.prose?.line(entry.text) : undefined
        const record: Record<string, unknown> = {
          ...(entry.title !== undefined ? { name: entry.title } : {}),
          ...(desc ? { desc } : {}),
          ...(entry.image !== undefined ? { image: entry.image } : {}),
          ...(entry.data && Object.keys(entry.data).length ? { kv: { ...entry.data } } : {}),
        }
        entities[kind] = { ...entities[kind], [entry.id]: record }
        player[`${kind}:${entry.id}`] = 1
      }
    }
    const held = { ...(state.held as Record<string, Record<string, number>> | undefined) }
    if (Object.keys(player).length) held.player = player
    return { ...state, entities, held }
  },
  // 16 → 17: how the next screen comes in is the UI's to say, from a choice's `ui` hints, so the
  // save no longer keeps a `transition` effect's override.
  16: ({ transition: _transition, ...state }) => state,
  // 17 → 18: what the player has seen and chosen is one record per id, `{ n, first, last }`, in
  // `seen` and `chosen`, from the counts and the four records of turns beside them. A record a save
  // kept no turn for (one from before they were kept) is dated the turn the save is at. A choice's
  // once-a-turn cap reads its record's `last`, so the `turn:` kv keys that capped the game's choices
  // go; one that still caps this turn makes the choice's `last` this turn, `once.key` naming its key.
  17: ({ seenOn, lastSeenOn, chosenOn, lastChosenOn, ...state }, game) => {
    const turn = typeof state.turn === 'number' ? state.turn : 0
    const fold = (counts: unknown, firsts: unknown, lasts: unknown) => {
      const n = (counts ?? {}) as Record<string, unknown>
      const first = (firsts ?? {}) as Record<string, number>
      const last = (lasts ?? {}) as Record<string, number>
      const out: Record<string, Times> = {}
      for (const id of new Set([...Object.keys(n), ...Object.keys(first), ...Object.keys(last)])) {
        const given = n[id]
        // A record already in this shape (a state written now, with an old version number) is kept.
        if (given && typeof given === 'object') out[id] = given as Times
        else {
          const from = first[id] ?? last[id] ?? turn
          out[id] = { n: typeof given === 'number' ? given : 0, first: from, last: last[id] ?? from }
        }
      }
      return out
    }
    const chosen = fold(state.chosen, chosenOn, lastChosenOn)
    const kv = { ...(state.kv as Record<string, unknown> | undefined) }
    for (const scene of game.scenes ?? []) {
      for (const choice of 'choices' in scene && Array.isArray(scene.choices) ? (scene.choices as SceneChoiceDef[]) : []) {
        if (!choice.once) continue
        const key = `turn:${choice.once.key ?? `${scene.id}#${choice.id}`}`
        if (!(key in kv)) continue
        const id = `${scene.id}#${choice.id}`
        if (kv[key] === turn) chosen[id] = { n: chosen[id]?.n ?? 0, first: chosen[id]?.first ?? turn, last: turn }
      }
    }
    for (const scene of game.scenes ?? []) {
      for (const choice of 'choices' in scene && Array.isArray(scene.choices) ? (scene.choices as SceneChoiceDef[]) : []) {
        if (choice.once) delete kv[`turn:${choice.once.key ?? `${scene.id}#${choice.id}`}`]
      }
    }
    return { ...state, seen: fold(state.seen, seenOn, lastSeenOn), chosen, ...(state.kv !== undefined ? { kv } : {}) }
  },
  // 18 → 19: the stretch of the game the player is in is the kv key `phase`, not a field of its own.
  // A save in no phase (`''`) has no key; one that already has a `phase` key keeps it.
  18: ({ phase, ...state }) => {
    const kv = { ...(state.kv as Record<string, unknown> | undefined) }
    if (typeof phase === 'string' && phase !== '' && kv.phase === undefined) kv.phase = phase
    return { ...state, kv }
  },
  // 19 → 20: a running minigame keeps its numbers as its kv store, `kv`, not `vars`. (A flowing scene's
  // visit, `flow`, came in this version too, from its load default.)
  19: (state) => {
    const running = state.minigame as Record<string, unknown> | null | undefined
    if (!running || typeof running !== 'object' || !('vars' in running) || 'kv' in running) return state
    const { vars, ...rest } = running
    return { ...state, minigame: { ...rest, kv: vars } }
  },
  // 20 → 21: a notice's `text` is its words, as content writes them now, not a prose key: a key the
  // game's prose has becomes those words.
  20: (state, game) => {
    const notices = state.notices as { text?: unknown }[] | undefined
    if (!Array.isArray(notices)) return state
    return {
      ...state,
      notices: notices.map((notice) =>
        notice && typeof notice.text === 'string' ? { ...notice, text: game.prose?.line(notice.text) ?? notice.text } : notice,
      ),
    }
  },
  // 21 → 22: a thing's line is its `description`, as content writes it, so what an entity made in play was given is kept under that name too.
  21: (state) => {
    const entities = state.entities as Record<string, Record<string, Record<string, unknown>> | undefined> | undefined
    if (!entities || typeof entities !== 'object') return state
    const kinds = Object.entries(entities).map(([kind, byId]) => [
      kind,
      byId && typeof byId === 'object'
        ? Object.fromEntries(
            Object.entries(byId).map(([id, record]) => {
              if (!record || typeof record !== 'object' || !('desc' in record) || 'description' in record) return [id, record]
              const { desc, ...rest } = record
              return [id, { ...rest, description: desc }]
            }),
          )
        : byId,
    ])
    return { ...state, entities: Object.fromEntries(kinds) }
  },
  // 22 → 23: a layered picture is a `picture`, not a stage, so a pool pick made for one of its layers is kept
  // under the slot `picture:<layer>`, not `stage:<layer>`, and a reload shows the file it showed before.
  22: (state) => {
    const media = state.media as { picks?: Record<string, unknown> } | undefined
    if (!media || typeof media !== 'object' || !media.picks || typeof media.picks !== 'object') return state
    const picks = Object.fromEntries(Object.entries(media.picks).map(([key, file]) => [key.replace(/\|stage:(\d+)$/, '|picture:$1'), file]))
    return { ...state, media: { ...media, picks } }
  },
}

/** A data scene's choice, as far as the version 18 step reads it. */
type SceneChoiceDef = { id: string; once?: { key?: string } }

/** A collection entry as saves before version 16 kept it. */
type OldEntry = { id?: unknown; title?: string; text?: string; image?: string; data?: Record<string, unknown> }

/**
 * The entity an item became, by the item's id: the `item` kind's with that
 * id, else the one entity the game declares with that id (a raincoat that is
 * clothing now), else `item:<id>`, as a pack's items are upgraded.
 */
function itemRef(game: Game, id: string): string {
  if (entityDef(game, `item:${id}`)) return `item:${id}`
  const named = (game.entities ?? []).filter((entity) => entity.id === id)
  return named.length === 1 ? `${named[0].of}:${id}` : `item:${id}`
}

/** The engine's steps, then each field's load default. Null when the save's version can't be read. */
function carryEngine(data: Saved, game: Game): GameState | null {
  let state = data
  let version = typeof state.version === 'number' ? state.version : 0
  if (!Number.isInteger(version) || version < OLDEST || version > SAVE_VERSION) return null
  while (version < SAVE_VERSION) {
    const step = STEPS[version]
    if (step) state = step(state, game)
    version += 1
  }
  let next = (state.version === SAVE_VERSION ? state : { ...state, version: SAVE_VERSION }) as Record<string, unknown>
  for (const [key, field] of Object.entries(FIELDS) as [string, Field<keyof GameState>][]) {
    if (!field.load) continue
    const value = next[key]
    if (field.keeps ? field.keeps(value) : value !== undefined && value !== null) continue
    next = { ...next, [key]: field.load() }
  }
  return next as unknown as GameState
}

/**
 * Every plugin's state brought up to the version the game has: a plugin added
 * since the save starts fresh, an older state is carried forward step by step.
 * The reason, when a state is newer than its plugin or has no route forward.
 * The state of a plugin the game no longer has is kept as it is.
 */
function carryPlugins(state: GameState, game: Game): GameState | string {
  let plugins = state.plugins ?? {}
  let changed = !state.plugins
  for (const plugin of withRules(game)) {
    const slice = plugins[plugin.id]
    if (!slice) {
      if (!plugin.start) continue
      plugins = { ...plugins, [plugin.id]: { version: plugin.version, state: plugin.start(game) } }
      changed = true
      continue
    }
    if (slice.version === plugin.version) continue
    if (slice.version > plugin.version) {
      return stringOf(game, 'pluginNewer', { plugin: plugin.id })
    }
    let version = slice.version
    let inner = slice.state
    // The same tools a game's step gets: the state as the engine carried it, filled from the game on request.
    const tools: MigrationTools = { game, fill: (parts) => fillDeclared(state, game, parts) }
    while (version < plugin.version) {
      const step = plugin.migrations?.[version]
      if (!step) return stringOf(game, 'pluginUnreadable', { plugin: plugin.id })
      inner = step(inner, tools)
      version += 1
    }
    plugins = { ...plugins, [plugin.id]: { version, state: inner } }
    changed = true
  }
  return changed ? { ...state, plugins } : state
}

/**
 * What `MigrationTools.fill` can fill, each named by the feature that fills
 * it: the player's stats (start values), kv keys (the content's starting kv
 * and the keys it resets each turn) and play settings (defaults).
 */
export type FillPart = FeatureFill

/** What a step of `rules.migrations` is given besides the state. */
export type MigrationTools = {
  /** The game the save is loading into, for a step that needs its content: which entity an old id now names, say. */
  game: Game
  /**
   * The state this step was given, with what the game declares and the save
   * lacks filled in: the parts asked for, or every part if left out. Nothing
   * is filled unless a step calls this. See `FillPart`.
   */
  fill: (parts?: FillPart[]) => GameState
}

/**
 * A state with what the game declares and the save lacks filled in: only the
 * parts asked for, every part if left out. Nothing the save already has is
 * changed.
 */
function fillDeclared(state: GameState, game: Game, parts?: readonly FillPart[]): GameState {
  return fillSteps.reduce((next, fill) => (!parts || parts.includes(fill.part) ? fill.run(next, game) : next), state)
}

/**
 * The game's own `migrations`, from the version the save records (1 if none)
 * to `game.version`. The reason, through `say`, when the save is from a newer
 * version of the game.
 */
function carryGame(state: GameState, game: Game): GameState | string {
  const target = game.version ?? 1
  let version = state.gameVersion ?? 1
  if (version > target) return stringOf(game, 'gameNewer')
  let next = state
  while (version < target) {
    const step = game.rules?.migrations?.[version]
    if (step) {
      const given = next
      next = step(given, { game, fill: (parts) => fillDeclared(given, game, parts) })
    }
    version += 1
  }
  if (game.version === undefined) return next
  return next.gameVersion === game.version ? next : { ...next, gameVersion: game.version }
}

/**
 * What the game as it is now declares and the save lacks, as each feature's
 * `loaded` says: a storyline added since. A game that declares no `version`
 * also gets the fills marked `unversioned` (its play settings)
 * here, as it always has; one that declares a version fills them in its own
 * steps, with `tools.fill()`.
 */
function fillGame(state: GameState, game: Game): GameState {
  const next = loadSteps.reduce((filled, step) => step(filled, game), state)
  if (game.version !== undefined) return next
  return fillSteps.reduce((filled, fill) => (fill.unversioned ? fill.run(filled, game) : filled), next)
}

/**
 * A state from anywhere (a save, a command log, a test) made ready to play in
 * this game, or the reason it can't be, through `say`. In order: the engine's
 * own steps and each field's load default, the plugins' migrations, the
 * game's migrations, then what the game declares and the save lacks.
 */
export function loadState(raw: unknown, game: Game): Result<GameState> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail(stringOf(game, 'notASave'))
  const engine = carryEngine(raw as Saved, game)
  if (!engine) return fail(stringOf(game, 'saveTooOld'))
  const plugged = carryPlugins(engine, game)
  if (typeof plugged === 'string') return fail(plugged)
  const carried = carryGame(plugged, game)
  if (typeof carried === 'string') return fail(carried)
  return ok(fillGame(carried, game))
}
