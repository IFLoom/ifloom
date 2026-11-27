/**
 * The inventory plugin, which lets the player use, drop and give away the things they hold.
 *
 * The engine keeps what each holder holds (`give`, `take`, `move`, `view.held`). A thing with the `inventory/usable`
 * trait gets a button that runs its effects and spends one unless it is kept. `inventory/drop` puts one down, and
 * `inventory/give` moves one to another holder, such as a character.
 *
 * It requires no other plugin. With places, a dropped thing goes to the holder the `places/holder` query names for
 * where the player is. Without one, a dropped thing is gone.
 */
import {
  artSrc,
  buildEffects,
  canHold,
  entityDescription,
  entityImage,
  entityName,
  entityOf,
  heldBy,
  heldCount,
  holds,
  parseRef,
  PLAYER,
  protagonist,
  stringOf,
  traitOf,
  YOU,
  type CommandRef,
  type Effect,
  type EffectRef,
  type EntityRef,
  type Game,
  type GameState,
  type Holder,
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
  type PluginContext,
  type TraitDef,
} from '@ifloom/engine/plugin'
import { CONTENT_VERSION, contentMigrations, COMMAND_VERSION, commandMigrations } from './upgrade.ts'

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

/** A thing the player holds as the player sees it, in `view.plugins.inventory.things`. */
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
 * What content writes for each of the plugin's calls (from `CALLS`), its
 * queries' answers and its view, so a call with a misspelled argument fails
 * to compile.
 */
declare module '@ifloom/engine' {
  interface CommandRegistry extends CommandsOf<typeof CALLS> {}
  interface ViewRegistry {
    inventory: InventoryView
  }
}

const ID = 'inventory'

/** The plugin's one list, `kinds`, as content writes it in `data.inventory.kinds` (a plugin's `data` holds its lists by name), the kinds it shows. */
const DATA = defineData(ID, { kinds: list<{ id: string }>({ noun: 'kind' }) })

/** The plugin's calls, and what each takes. */
const CALLS = defineCalls(ID, {
  commands: {
    /** Use one of the thing `id`, by its `inventory/usable` trait. */
    use: { id: arg.entity() },
    /** Put one of the thing `id` down where you are, or let it go. */
    drop: { id: arg.entity() },
    /** Hand one of the thing `id` to `to`, someone who can hold things. */
    give: { id: arg.entity(), to: arg.holder() },
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

type Ctx = Pick<PluginContext<unknown>, 'game' | 'query'>

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

/**
 * Whose one of this thing a command takes: the protagonist's while they
 * hold one, else the player's. Undefined when neither holds any.
 */
function takenFrom(state: GameState, game: Game, ref: EntityRef): Holder | undefined {
  const you = protagonist(state)
  if (heldCount(state, game, ref, you) > 0) return you
  return heldCount(state, game, ref, PLAYER) > 0 ? PLAYER : undefined
}

/** Why you can't do anything with this thing now: not in the game, or you hold none. */
function notHeld(state: GameState, game: Game, ref: EntityRef): string | undefined {
  if (!inGame(state, game, ref)) return stringOf(game, 'noSuchThing')
  return takenFrom(state, game, ref) === undefined ? stringOf(game, 'inventory/haveNone', { thing: nameOf(state, game, ref) }) : undefined
}

function useEffects(state: GameState, game: Game, ref: EntityRef): Effect[] {
  const usable = usableOf(state, game, ref)
  const from = takenFrom(state, game, ref)
  if (!usable || from === undefined) return []
  const spent: Effect[] = usable.keep ? [] : [{ entity: ref, at: from, by: -1 }]
  return [...spent, ...buildEffects(game, usable.effects)]
}

/** Where a dropped thing goes: the holder places names for where you are, if it names one that can hold; nowhere otherwise. */
function dropHolder(state: GameState, cx: Ctx): Holder | undefined {
  const holder = cx.query<string | null>('places/holder')
  return typeof holder === 'string' && canHold(state, cx.game, holder) ? holder : undefined
}

function dropEffects(state: GameState, ref: EntityRef, cx: Ctx): Effect[] {
  const from = takenFrom(state, cx.game, ref)
  if (from === undefined) return []
  const to = dropHolder(state, cx)
  return to === undefined ? [{ entity: ref, at: from, by: -1 }] : [{ move: ref, from, to, by: 1 }]
}

function giveEffects(state: GameState, game: Game, { id, to }: { id: EntityRef; to: Holder }): Effect[] {
  const from = takenFrom(state, game, id)
  return from === undefined ? [] : [{ move: id, from, to, by: 1 }]
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

/**
 * Returns the inventory plugin for the game's `plugins`. Give each thing with a use the `inventory/usable` trait
 * (`inventory.usable(label, effects)`); the plugin keeps nothing in the save.
 */
function inventoryPlugin(): DefinedPlugin<null, InventoryView> {
  return definePlugin<null, InventoryView, typeof CALLS>({
    id: ID,
    version: 1,
    calls: CALLS,
    data: DATA,
    contentVersion: CONTENT_VERSION,
    contentMigrations,
    commandVersion: COMMAND_VERSION,
    commandMigrations,
    cooperates: ['places'],
    traits: [usableTrait],
    strings: {
      haveNone: 'You have no {thing}.',
      doesNothing: 'The {thing} does not do anything.',
      cantGiveTo: 'You can’t give things to {to}.',
      giveToSelf: 'You already have it.',
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
        effectsOf: (state, { id }, context) => dropEffects(state, id, context),
        run: (state, { id }, context) => context.apply(dropEffects(state, id, context), state),
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
    view: (state, { game }) => inventoryView(state, game),
    references: {
      // Nothing gives a thing to itself.
      calls: (_table, name, args) =>
        name === 'give' && args.to !== undefined && args.to === args.id ? [{ problem: `"${String(args.to)}" can't hold itself` }] : [],
    },
    check: (game, tools) =>
      (inventoryKindsOf(game) ?? []).flatMap((kind) => tools.problems([{ kind: kind.id }]).map((what) => DATA.kinds.problem(kind.id, what))),
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

/** Returns the `inventory/use` command, which uses one of a thing the player holds. */
const useThing = (ref: EntityRef): CommandRef => CALLS.commands.use({ id: ref })
/** Returns the `inventory/drop` command, which drops one of a thing the player holds. */
const dropThing = (ref: EntityRef): CommandRef => CALLS.commands.drop({ id: ref })
/** Returns the `inventory/give` command, which gives one of a thing the player holds to another holder, such as `'character:ava'`. */
const giveThing = (ref: EntityRef, to: Holder): CommandRef => CALLS.commands.give({ id: ref, to })

/**
 * The inventory plugin's factory, with its helpers as properties. `inventory()` returns the plugin for the game's
 * `plugins`, and content calls helpers such as `inventory.usable('Eat', effects)` and `inventory.use('food:apple')`.
 */
export const inventory = Object.assign(inventoryPlugin, {
  /** Returns the `inventory/usable` trait, to spread into an entity's or a kind's `traits`. Using the thing spends one unless `keep` is true. */
  usable,
  /** Returns the `inventory/use` command, which uses one of a thing the player holds. */
  use: useThing,
  /** Returns the `inventory/drop` command, which drops one of a thing the player holds. */
  drop: dropThing,
  /** Returns the `inventory/give` command, which gives one of a thing the player holds to another holder. */
  give: giveThing,
})
