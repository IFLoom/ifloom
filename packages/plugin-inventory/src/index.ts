/**
 * The inventory plugin: things the player and other people carry, used, dropped and given away.
 *
 * It keeps who holds what in its own state, and it's a receiver (ADR 0016): a `receive` the game's other receivers
 * don't claim gives the thing to someone's inventory, `release` takes it back and `owned` counts it. A thing starts
 * held by its `inventory/at` trait. A thing with the `inventory/usable` trait gets a button that runs its effects and
 * spends one unless it is kept. `inventory/drop` puts one down, and `inventory/give` hands one to someone.
 *
 * It requires no other plugin. With places, a dropped thing lies where the player is (`places/put`). Without it, a
 * dropped thing is gone.
 */
import {
  artSrc,
  buildEffects,
  declaredTrait,
  declaredWithTrait,
  entityDescription,
  entityImage,
  entityName,
  entityOf,
  holds,
  isUnique,
  parseRef,
  PLAYER,
  protagonist,
  stringOf,
  traitOf,
  writeEntity,
  YOU,
  type CommandRef,
  type Effect,
  type EffectRef,
  type EntityRef,
  type Game,
  type GameState,
  type RenderedChoice,
} from '@ifloom/engine'
import {
  arg,
  bindCurrent,
  defineCalls,
  defineData,
  definePlugin,
  list,
  renderAction,
  type CommandsOf,
  type DefinedPlugin,
  type EffectsOf,
  type PluginProblem,
  type TraitDef,
} from '@ifloom/engine/plugin'
import {
  AT,
  canHold,
  defaultHolders,
  heldBy,
  heldCount,
  ID,
  moveHeld,
  placementCounts,
  setHeld,
  type Holder,
  type InventoryState,
  type Placement,
} from './held.ts'

export { canHold, heldBy, heldCount, holderOf, holdersOf, type Holder, type InventoryState, type Placement } from './held.ts'

/** The data of the `inventory/usable` trait, which makes a thing usable. It gives the button's label, the effects of using one and whether one is kept. */
export type Usable = {
  /** The label of the button that uses one, such as "Eat the sandwich". */
  label: string
  /** The effects of using one. They read the state as it was before one was spent. */
  effects: EffectRef[]
  /** True when using one doesn't spend it, as for a book read or a torch switched on. One is spent if left out. */
  keep?: boolean
}

declare module '@ifloom/engine' {
  interface TraitRegistry {
    'inventory/usable': Usable
    'inventory/at': Placement
  }
}

/** The inventory plugin's content, which the game declares in `data.inventory`. */
export type InventoryData = {
  /**
   * The kinds whose things the inventory shows in {@link InventoryView}, each an entry with the kind's id
   * (`{ id: 'food' }`), so a mod can add one. Every kind if left out.
   */
  kinds?: { id: string }[]
}

/** The inventory plugin's settings, which the game passes to `inventory()`. */
export type InventoryOptions = {
  /**
   * The things a New Game+ keeps in the player's own inventory, by reference (`'food:apple'`), or `'all'` for
   * everything the player holds, things made in play included. Nothing if left out.
   */
  carryOver?: readonly string[] | 'all'
}

/** A thing someone holds as the player sees it, in `view.plugins.inventory.things`. */
export type InventoryThing = {
  /** The thing's entity reference, such as `'food:apple'`. */
  ref: EntityRef
  /** The thing's name. */
  name: string
  /** The thing's `description`, with its tokens filled, or null when it has none. */
  description: string | null
  /** The path of the thing's picture through `artSrc`, or null when it has none. */
  image: string | null
  /** The number of this thing the holder holds. */
  count: number
  /** The thing's holder, the protagonist being played or `'player'`. */
  at: Holder
  /** The button that uses one, labelled by its trait, or null for a thing with no use. Its `command` is the one to send. */
  use: RenderedChoice | null
  /** The button that drops one. */
  drop: RenderedChoice
}

/** The inventory as the player sees it, in `view.plugins.inventory`. */
export type InventoryView = {
  /** The things the inventory shows, the played protagonist's first and then the player's. */
  things: InventoryThing[]
}

/**
 * What content writes for each of the plugin's calls (from `CALLS`) and its view, so a call with a misspelled argument
 * fails to compile.
 */
declare module '@ifloom/engine' {
  interface EffectRegistry extends EffectsOf<typeof CALLS> {}
  interface CommandRegistry extends CommandsOf<typeof CALLS> {}
  interface ViewRegistry {
    inventory: InventoryView
  }
}

/** The plugin's one list, `kinds`, as content writes it in `data.inventory.kinds` (a plugin's `data` holds its lists by name), the kinds it shows. */
const DATA = defineData(ID, { kinds: list<{ id: string }>({ noun: 'kind' }) })

/** The plugin's calls, and what each takes. */
const CALLS = defineCalls(ID, {
  effects: {
    /** Move `by` of the thing `entity` (all there is if left out) `from` one holder (`'you'` if left out) `to` another. */
    move: { entity: arg.entity(), from: arg.someone().optional(), to: arg.someone(), by: arg.number().optional() },
    /** Set how many of the thing `entity` a holder (`at`, `'you'` if left out) holds `to` a count. */
    set: { entity: arg.entity(), at: arg.someone().optional(), to: arg.number() },
  },
  commands: {
    /** Use one of the thing `id`, by its `inventory/usable` trait. */
    use: { id: arg.entity() },
    /** Put one of the thing `id` down where you are, or let it go. */
    drop: { id: arg.entity() },
    /** Hand one of the thing `id` to `to`, someone who can hold things. */
    give: { id: arg.entity(), to: arg.someone() },
  },
})
const USABLE = 'inventory/usable'

/** Returns the kinds the inventory shows, from `data.inventory.kinds` in the game's content and packs. Returns undefined when every kind is shown. */
export function inventoryKindsOf(game: Game): { id: string }[] | undefined {
  return game.data?.[ID]?.kinds === undefined ? undefined : DATA.kinds.all(game)
}

/** Returns a thing's `inventory/usable` trait, read through the entity it was made `like`. Returns undefined for a thing with no use. */
export function usableOf(state: GameState, game: Game, ref: EntityRef): Usable | undefined {
  return traitOf(state, game, ref, USABLE)
}

const usableTrait: TraitDef<'inventory/usable'> = {
  id: USABLE,
  words: { label: true, effects: 'effects' },
  check: (data) => [
    ...(typeof data?.label === 'string' && data.label.trim() !== '' ? [] : ['a usable thing needs a label for its button']),
    ...(Array.isArray(data?.effects) ? [] : ['a usable thing needs its effects, a list']),
  ],
  references: (data) => [{ effects: data?.effects }],
}

/** Where a thing starts: `'you'` is no one yet, a thing can't hold itself, and counts are whole numbers above 0. */
const atTrait: TraitDef<'inventory/at'> = {
  id: AT,
  check: (data, { ref }) => {
    const wrong: string[] = []
    for (const [holder, count] of Object.entries(placementCounts(data as Placement))) {
      if (holder === YOU) wrong.push('inventory/at can\'t be "you" where a thing starts: name "player" or the protagonist')
      else if (holder === ref) wrong.push('inventory/at names the entity itself: nothing can hold itself')
      if (!Number.isInteger(count) || count < 1) wrong.push(`inventory/at gives "${holder}" ${count}: a count is a whole number above 0`)
    }
    return wrong
  },
  references: (data) =>
    Object.keys(placementCounts(data as Placement))
      .filter((holder) => holder !== YOU)
      .map((holder) => ({ someone: holder })),
}

/** Whether the inventory shows things of this one's kind. */
function shows(game: Game, ref: EntityRef): boolean {
  const kinds = inventoryKindsOf(game)
  const kind = parseRef(ref)?.kind
  return !kinds || kinds.some((entry) => entry.id === kind)
}

/** Whether the thing is in the game now. */
function inGame(state: GameState, game: Game, ref: string): boolean {
  return entityOf(state, game, ref) !== undefined
}

/** The name the refusals say: the thing's, or what content wrote. */
function nameOf(state: GameState, game: Game, ref: string): string {
  return inGame(state, game, ref) ? entityName(state, game, ref) : ref
}

/** Whose one of this thing a command takes: the protagonist's while they hold one, else the player's. Undefined when neither holds any. */
function takenFrom(state: GameState, game: Game, ref: EntityRef): Holder | undefined {
  return defaultHolders(state).find((holder) => heldCount(state, game, ref, holder) > 0)
}

/** Why you can't do anything with this thing now: not in the game, or you hold none. */
function notHeld(state: GameState, game: Game, ref: EntityRef): string | undefined {
  if (!inGame(state, game, ref)) return stringOf(game, 'noSuchThing')
  return takenFrom(state, game, ref) === undefined ? stringOf(game, 'inventory/haveNone', { thing: nameOf(state, game, ref) }) : undefined
}

/** The effect that sets how many of a thing a holder holds. */
const setTo = (entity: EntityRef, at: Holder, to: number): Effect => CALLS.effects.set({ entity, at, to }) as Effect

function useEffects(state: GameState, game: Game, ref: EntityRef): Effect[] {
  const usable = usableOf(state, game, ref)
  const from = takenFrom(state, game, ref)
  if (!usable || from === undefined) return []
  const spent = usable.keep ? [] : [setTo(ref, from, heldCount(state, game, ref, from) - 1)]
  return [...spent, ...buildEffects(game, usable.effects)]
}

/** Dropping one: it leaves the inventory, then lies where the player is when the game has places. */
function dropEffects(state: GameState, game: Game, ref: EntityRef): Effect[] {
  const from = takenFrom(state, game, ref)
  if (from === undefined) return []
  return [setTo(ref, from, heldCount(state, game, ref, from) - 1), ...buildEffects(game, [{ 'places/put': { entity: ref } }])]
}

function giveEffects(state: GameState, game: Game, { id, to }: { id: EntityRef; to: Holder }): Effect[] {
  const from = takenFrom(state, game, id)
  return from === undefined ? [] : [CALLS.effects.move({ entity: id, from, to, by: 1 }) as Effect]
}

/** One holder's things as the inventory shows them. */
function thingsOf(state: GameState, game: Game, holder: Holder): InventoryThing[] {
  return heldBy(state, game, holder)
    .filter(
      ({ ref }) => shows(game, ref) && holds(state, game, bindCurrent(game.entities?.find((entity) => `${entity.of}:${entity.id}` === ref)?.visible, ref)),
    )
    .map(({ ref, count }) => {
      const usable = usableOf(state, game, ref)
      const image = entityImage(state, game, ref)
      const name = entityName(state, game, ref)
      return {
        ref,
        name,
        description: entityDescription(state, game, ref) ?? null,
        image: image === undefined ? null : artSrc(image),
        count,
        at: holder,
        use: usable ? renderAction(state, game, { id: `use.${ref}`, label: usable.label, command: useThing(ref) }) : null,
        drop: renderAction(state, game, { id: `drop.${ref}`, label: name, command: dropThing(ref) }),
      }
    })
}

/** Everything the UI needs to draw what you hold, with its buttons. */
function inventoryView(state: GameState, game: Game): InventoryView {
  const you = protagonist(state)
  const played = you !== PLAYER && inGame(state, game, you) ? thingsOf(state, game, you) : []
  return { things: [...played, ...thingsOf(state, game, PLAYER)] }
}

/** The holders a receiver's `of` or `from` reads: the one named, else the protagonist's and then the player's own. */
function holdersFor(state: GameState, who: string | undefined): Holder[] {
  return who === undefined ? defaultHolders(state) : [who as Holder]
}

/** What's wrong with where content starts things that one entity's trait can't see: holders that can't hold, unique things in two places, and cycles. */
function startProblems(game: Game): PluginProblem[] {
  const problems: PluginProblem[] = []
  const startHolder = new Map<string, string>()
  for (const ref of declaredWithTrait(game, AT)) {
    const counts = placementCounts(declaredTrait(game, ref, AT) as Placement | undefined)
    if (isUnique(game, ref)) {
      const holders = Object.keys(counts)
      if (holders.length > 1 || Object.values(counts).some((count) => count > 1))
        problems.push({ list: 'entity', id: ref, what: 'a unique thing starts in one place, one of it' })
      if (holders.length === 1) startHolder.set(ref, holders[0])
    }
  }
  // A unique thing starting inside what it holds, however far round.
  const reported = new Set<string>()
  for (const start of startHolder.keys()) {
    const path: string[] = []
    for (let at: string | undefined = start; at !== undefined; at = startHolder.get(at)) {
      const loop = path.indexOf(at)
      if (loop >= 0) {
        const cycle = path.slice(loop)
        const key = [...cycle].sort().join(',')
        if (!reported.has(key)) {
          reported.add(key)
          problems.push({ list: 'entity', id: at, what: `holders go round in a cycle: ${[...cycle, at].join(' → ')}` })
        }
        break
      }
      path.push(at)
    }
  }
  return problems
}

/**
 * Returns the inventory plugin for the game's `plugins`. Start things held with the `inventory/at` trait
 * (`inventory.at('player')`), and give each thing with a use the `inventory/usable` trait
 * (`inventory.usable(label, effects)`).
 */
function inventoryPlugin(options: InventoryOptions = {}): DefinedPlugin<InventoryState, InventoryView> {
  return definePlugin<InventoryState, InventoryView, typeof CALLS>({
    id: ID,
    version: 1,
    start: () => ({ held: {} }),
    calls: CALLS,
    data: DATA,
    cooperates: ['places'],
    traits: [usableTrait, atTrait],
    strings: {
      haveNone: 'You have no {thing}.',
      doesNothing: 'The {thing} does not do anything.',
      cantGiveTo: 'You can’t give things to {to}.',
      giveToSelf: 'You already have it.',
    },
    receiver: {
      // It claims anything: the inventory takes what no receiver before it claims.
      receive: (state, ref, count, to, { game }) => {
        const at = to ?? YOU
        return setHeld(state, game, ref, at, heldCount(state, game, ref, at) + count)
      },
      owned: (state, ref, of, { game }) => holdersFor(state, of).reduce((sum, holder) => sum + heldCount(state, game, ref, holder), 0),
      release: (state, ref, count, from, { game }) => {
        let left = count
        let next = state
        for (const holder of holdersFor(state, from)) {
          const here = Math.min(left, heldCount(next, game, ref, holder))
          if (here > 0) next = setHeld(next, game, ref, holder, heldCount(next, game, ref, holder) - here)
          left -= here
        }
        return next
      },
    },
    effects: {
      move: (state, { entity, from, to, by }, { game }) => moveHeld(state, game, entity, from ?? YOU, to, by),
      set: (state, { entity, at, to }, { game }) => setHeld(state, game, entity, at ?? YOU, to),
    },
    values: {
      /** `{{inventory/count entity=food:apple}}`: how many of a thing someone holds, `at` them (`'you'` if left out). */
      count: (state, args, { game }) => heldCount(state, game, String(args.entity ?? ''), typeof args.at === 'string' ? args.at : YOU),
    },
    commands: {
      /** `{ 'inventory/use': { id } }`: use one of the thing `id`, by its `inventory/usable` trait. */
      use: {
        whyNot: (state, { id: ref }, { game }) => {
          const held = notHeld(state, game, ref)
          if (held) return held
          return usableOf(state, game, ref) ? undefined : stringOf(game, 'inventory/doesNothing', { thing: nameOf(state, game, ref) })
        },
        // Its effects read the state as it was before one was spent, as an action's do before its cost.
        effectsOf: (state, { id }, { game }) => useEffects(state, game, id),
        run: (state, { id }, { game, apply }) => apply(useEffects(state, game, id), state),
      },
      /** `{ 'inventory/drop': { id } }`: put one of the thing `id` down where you are, or let it go. */
      drop: {
        whyNot: (state, { id }, { game }) => notHeld(state, game, id),
        effectsOf: (state, { id }, { game }) => dropEffects(state, game, id),
        run: (state, { id }, { game, apply }) => apply(dropEffects(state, game, id), state),
      },
      /** `{ 'inventory/give': { id, to } }`: hand one of the thing `id` to `to`, someone who can hold things. */
      give: {
        whyNot: (state, { id: ref, to }, { game }) => {
          const held = notHeld(state, game, ref)
          if (held) return held
          if (to === YOU || to === protagonist(state) || to === PLAYER) return stringOf(game, 'inventory/giveToSelf')
          return canHold(state, game, to) ? undefined : stringOf(game, 'inventory/cantGiveTo', { to: nameOf(state, game, to) })
        },
        effectsOf: (state, args, { game }) => giveEffects(state, game, args),
        run: (state, args, { game, apply }) => apply(giveEffects(state, game, args), state),
      },
    },
    // A New Game+ keeps the player's things `carryOver` lists; a thing made in play comes with its record.
    carry: (fresh, from, { game }) => {
      const listed = options.carryOver
      if (!listed) return fresh
      const refs = listed === 'all' ? heldBy(from, game, PLAYER).map((entry) => entry.ref) : listed
      let next = fresh
      for (const ref of refs) {
        const parts = parseRef(ref)
        const record = parts ? from.entities?.[parts.kind]?.[parts.id] : undefined
        if (parts && record && !game.entities?.some((entity) => `${entity.of}:${entity.id}` === ref) && !inGame(next, game, ref)) {
          next = writeEntity(next, ref, record)
          const made = from.created?.[parts.kind] ?? 0
          if (made > (next.created?.[parts.kind] ?? 0)) next = { ...next, created: { ...next.created, [parts.kind]: made } }
        }
        next = setHeld(next, game, ref, PLAYER, heldCount(from, game, ref, PLAYER))
      }
      return next
    },
    view: (state, { game }) => inventoryView(state, game),
    references: {
      // Nothing gives a thing to itself.
      calls: (_table, name, args) =>
        (name === 'give' && args.to !== undefined && args.to === args.id) || (name === 'move' && args.to !== undefined && args.to === args.entity)
          ? [{ problem: `"${String(args.to)}" can't hold itself` }]
          : [],
    },
    check: (game, tools) => [
      ...(inventoryKindsOf(game) ?? []).flatMap((kind) => tools.problems([{ kind: kind.id }]).map((what) => DATA.kinds.problem(kind.id, what))),
      ...startProblems(game),
    ],
  })
}

/**
 * Returns the `inventory/usable` trait, to spread into an entity's or a kind's `traits`. Using the thing spends one
 * unless `keep` is true.
 *
 * @example
 * traits: { ...inventory.usable('Eat the apple', [{ stat: 'energy', by: 5 }]) }
 */
const usable = (label: string, effects: EffectRef[], options: { keep?: boolean } = {}): { 'inventory/usable': Usable } => ({
  [USABLE]: options.keep ? { label, effects, keep: true } : { label, effects },
})

/**
 * Returns the `inventory/at` trait, to spread into an entity's `traits`: who holds it at the start, or how many each
 * holder holds.
 *
 * @example
 * traits: { ...inventory.at({ player: 2, 'place:larder': 6 }) }
 */
const at = (placement: Placement): { 'inventory/at': Placement } => ({ [AT]: placement })

/** Returns the `inventory/use` command, which uses one of a thing the player holds. */
const useThing = (ref: EntityRef): CommandRef => CALLS.commands.use({ id: ref })
/** Returns the `inventory/drop` command, which drops one of a thing the player holds. */
const dropThing = (ref: EntityRef): CommandRef => CALLS.commands.drop({ id: ref })
/** Returns the `inventory/give` command, which gives one of a thing the player holds to someone, such as `'character:ava'`. */
const giveThing = (ref: EntityRef, to: Holder): CommandRef => CALLS.commands.give({ id: ref, to })

/**
 * The inventory plugin's factory, with its helpers as properties. `inventory()` returns the plugin for the game's
 * `plugins`, and content calls helpers such as `inventory.usable('Eat', effects)` and `inventory.use('food:apple')`.
 */
export const inventory = Object.assign(inventoryPlugin, {
  /** Returns the `inventory/usable` trait, to spread into an entity's or a kind's `traits`. Using the thing spends one unless `keep` is true. */
  usable,
  /** Returns the `inventory/at` trait, to spread into an entity's `traits`, naming who holds it at the start. */
  at,
  /** Returns the `inventory/use` command, which uses one of a thing the player holds. */
  use: useThing,
  /** Returns the `inventory/drop` command, which drops one of a thing the player holds. */
  drop: dropThing,
  /** Returns the `inventory/give` command, which gives one of a thing the player holds to someone. */
  give: giveThing,
  /** Returns the `inventory/move` effect, which moves a thing from one holder to another, from `'you'` if `from` is left out. */
  move: (entity: EntityRef, to: Holder, options: { from?: Holder; by?: number } = {}): EffectRef => CALLS.effects.move({ entity, to, ...options }),
  /** Returns the `inventory/set` effect, which sets how many of a thing a holder (`'you'` if left out) holds. */
  set: (entity: EntityRef, to: number, holder?: Holder): EffectRef => CALLS.effects.set({ entity, to, ...(holder ? { at: holder } : {}) }),
})
