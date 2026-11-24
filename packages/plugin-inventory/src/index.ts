/**
 * @ifloom/plugin-inventory: using, dropping and giving away the things you
 * hold.
 *
 * Things are entities, held by the engine (`give`, `take`, `move`,
 * `view.held`). This plugin gives them something to do: a thing with the
 * `inventory/usable` trait has a button that runs its effects and, unless it
 * is kept, spends one. `inventory/drop` puts one down and `inventory/give`
 * hands one to someone who can hold things, such as a character.
 *
 * It requires no other plugin. With places, a dropped thing goes to where
 * you are once places names somewhere that can hold it (its `places/holder`
 * query); until then a dropped thing is gone.
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

/** What the `inventory/usable` trait holds: the button's label, what using one does, and whether it is kept. */
export type Usable = {
  /** The button: "Eat the sandwich". */
  label: string
  /** What using one does. They read the state as it was before one was spent. */
  effects: EffectRef[]
  /** Using it doesn't spend one: a book read, a torch switched on. One is spent if left out. */
  keep?: boolean
}

declare module '@ifloom/engine' {
  interface TraitRegistry {
    'inventory/usable': Usable
  }
}

/** The plugin's content, `data.inventory`. */
export type InventoryData = {
  /**
   * The kinds the inventory shows, in `InventoryView`, each an entry with
   * the kind's id (`{ id: 'item' }`), so a mod can add one. Every kind, if
   * left out.
   */
  kinds?: { id: string }[]
}

/** One thing you hold, as the UI draws it. */
export type InventoryThing = {
  /** How content names it: `'food:apple'`. */
  ref: EntityRef
  name: string
  description: string | null
  /** Its picture's path, through `artSrc`; null with none. */
  image: string | null
  /** How many are held. */
  count: number
  /** Who holds it: the protagonist being played, or `'player'`. */
  at: Holder
  /** The button that uses one, labelled by its trait, or null for a thing with no use. Send its `command`. */
  use: RenderedChoice | null
  /** The button that drops one. */
  drop: RenderedChoice
}

/** What a UI reads at `view.plugins.inventory`. */
export type InventoryView = {
  /** What you hold that the inventory shows: the protagonist's things while one is played, then the player's. */
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

/** The plugin's content: `data.inventory.kinds`, the kinds it shows. */
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

/** The kinds the inventory shows, from `data.inventory.kinds` in the game's content and packs; undefined for every kind. */
export function inventoryKindsOf(game: Game): { id: string }[] | undefined {
  return game.data?.[ID]?.kinds === undefined ? undefined : DATA.kinds.all(game)
}

/** What makes a thing usable, when it is: its `inventory/usable` trait, read through what it was made `like`. */
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
  const holder = cx.query('places/holder')
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
 * The plugin. Add it to the game's `plugins`, and give the things that do
 * something the `inventory/usable` trait (`inventory.usable(label, effects)`). It
 * keeps nothing in the save.
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
 * The `inventory/usable` trait, to spread into an entity's or a kind's
 * `traits`: `traits: { ...usable('Eat the apple', [{ stat: 'energy', by: 5 }]) }`.
 * Using one spends one unless `keep` is true.
 */
const usable = (label: string, effects: EffectRef[], options: { keep?: boolean } = {}): { 'inventory/usable': Usable } => ({
  [USABLE]: options.keep ? { label, effects, keep: true } : { label, effects },
})

/** A command: use one of a thing you hold. */
const useThing = (ref: EntityRef): CommandRef => CALLS.commands.use({ id: ref })
/** A command: drop one of a thing you hold. */
const dropThing = (ref: EntityRef): CommandRef => CALLS.commands.drop({ id: ref })
/** A command: give one of a thing you hold to someone who can hold things, such as `'character:ava'`. */
const giveThing = (ref: EntityRef, to: Holder): CommandRef => CALLS.commands.give({ id: ref, to })

/**
 * The plugin, with its helpers on it: `inventory()` makes the plugin for the
 * game's `plugins`, and content is written with `inventory.usable('Eat', effects)` and `inventory.use('food:apple')`.
 */
export const inventory = Object.assign(inventoryPlugin, { usable, use: useThing, drop: dropThing, give: giveThing })
