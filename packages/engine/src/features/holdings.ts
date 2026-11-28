/**
 * Holdings: who holds what. The player and unique entities hold things, any
 * entity can be held, and `'you'` is whoever the player is playing now (the
 * player feature's `you`). The logic is in `holdings.ts`; the `entity` and
 * `count` conditions, and what `create`, `remove` and `each` do with holders,
 * are the entities feature's.
 */
import { artSrc } from '../sceneBody.ts'
import {
  bindCurrent,
  entityDef,
  entityImage,
  entityUi,
  entityTags,
  entityText,
  hasEntity,
  isUnique,
  kindOf,
  ofKind,
  parseRef,
  PLAYER,
  protagonist,
  writeEntity,
  YOU,
  type EntityRef,
  type Holder,
} from '../entities.ts'
import { heldBy, heldCount, holderOf, moveHeld, placementCounts, setHeld } from '../holdings.ts'
import type { Game } from '../game.ts'
import type { Amount, GameState } from '../types.ts'
import { withUi, type EntityUi, type Ui } from './ui.ts'
import { defineFeature, type FeatureCheckTools, type FeatureContext } from './feature.ts'

/** A thing you hold as the player sees it, in `view.held`. Only things whose `visible` holds are listed. */
export type HeldView = {
  /** The thing's entity reference, such as `'food:apple'`. */
  ref: EntityRef
  /** The thing's name, with its prose tokens filled in. */
  name: string
  /** The thing's description, with its tokens filled in. Null if it has none. */
  description: string | null
  /** The thing's picture, as a path through `artSrc`. Null if it has none. */
  image: string | null
  /** The thing's tags, its kind's first and then its own. */
  tags: string[]
  /** The number of the thing held. */
  count: number
  /** The thing's holder, the protagonist being played or `'player'`. */
  at: Holder
  /** The thing's presentation hints (a {@link EntityUi}), its own over its kind's, kept as written. Left out if it has none. */
  ui?: Ui<EntityUi>
}

/** The holdings feature's state, effects, view and reference, as types. */
export type HoldingsShape = {
  state: {
    /**
     * The counts play has changed, by holder and then thing, such as `held.player['food:apple']`. A count stays once
     * written, 0 included.
     *
     * For a count play hasn't changed, the engine reads the entity's `at` in content.
     */
    held: Record<string, Record<string, number>>
  }
  effects: {
    /**
     * An effect that changes how many of a thing a holder holds `by` an amount, or sets the count `to` one. The
     * holder is `'you'` if `at` is left out.
     *
     * A count never goes below 0, and never above 1 for a unique thing, which the engine takes from whoever else held
     * it. `by` and `to` are each an `Amount`.
     */
    entity: { entity: string; at?: string; by: Amount } | { entity: string; at?: string; to: Amount }
    /**
     * An effect that moves a thing `to` another holder, `by` of it (an `Amount`) or all there is. It moves it `from`
     * the holder named, else from wherever a unique thing is, else from `'you'`.
     */
    move: { move: string; from?: string; to: string; by?: Amount }
  }
  view: {
    /** The things you hold, in the game's order of its entities. The protagonist's come first while one is played, then the player's. */
    held: HeldView[]
  }
  references: {
    /** A reference to a holder, `'player'`, `'you'` or a unique entity. `holds` names the thing given to it, which can't be the holder itself. */
    holder: { holder: string; holds?: string }
  }
}

/** One holder's things as the view draws them. */
function heldView(state: GameState, game: Game, holder: Holder, cx: FeatureContext): HeldView[] {
  return heldBy(state, game, holder)
    .filter(({ ref }) => cx.holds(state, game, bindCurrent(entityDef(game, ref)?.visible, ref)))
    .map(({ ref, count }) => {
      const description = entityText(state, game, ref, 'description')
      const image = entityImage(state, game, ref)
      return {
        ref,
        name: cx.fillTokens(state, game, entityText(state, game, ref, 'name') ?? parseRef(ref)?.id ?? ref),
        description: description === undefined ? null : cx.fillTokens(state, game, description),
        image: image === undefined ? null : artSrc(image),
        tags: entityTags(state, game, ref),
        count,
        at: holder,
        ...withUi(entityUi(state, game, ref)),
      }
    })
}

/** Where a `move` takes a thing from when it doesn't say: wherever a unique thing is, else you. */
function moveSource(state: GameState, game: Game, ref: string, from: string | undefined): string | undefined {
  if (from !== undefined) return from
  return isUnique(game, ref) ? holderOf(state, game, ref) : YOU
}

/**
 * What is wrong with where content starts things: a holder that isn't the
 * player or a declared unique entity, `'you'`, a count that isn't a whole
 * number above 0, a unique thing in more than one place, and things that
 * would hold themselves.
 */
function checkStarts(game: Game, tools: FeatureCheckTools): void {
  const startHolder = new Map<string, string>()
  for (const entity of game.entities ?? []) {
    if (entity.at === undefined) continue
    const ref = `${entity.of}:${entity.id}`
    const source = { list: 'entity', id: ref }
    const where = `entity ${ref}`
    const counts = placementCounts(entity.at)
    for (const [holder, count] of Object.entries(counts)) {
      if (holder === YOU) tools.problem(source, where, 'at can\'t be "you" where a thing starts: name "player" or the protagonist')
      else if (holder === ref) tools.problem(source, where, 'at names the entity itself: nothing can hold itself')
      else if (holder !== PLAYER) {
        if (!entityDef(game, holder)) tools.problem(source, where, `at names unknown holder "${holder}"`)
        else if (!isUnique(game, holder)) tools.problem(source, where, `at names "${holder}", whose kind isn't unique, so it can't hold things`)
      }
      if (!Number.isInteger(count) || count < 1) tools.problem(source, where, `at gives "${holder}" ${count}: a count is a whole number above 0`)
    }
    if (isUnique(game, ref)) {
      const holders = Object.keys(counts)
      if (holders.length > 1 || Object.values(counts).some((count) => count > 1)) tools.problem(source, where, 'a unique thing starts in one place, one of it')
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
          tools.problem({ list: 'entity', id: at }, `entity ${at}`, `holders go round in a cycle: ${[...cycle, at].join(' → ')}`)
        }
        break
      }
      path.push(at)
    }
  }
}

/** The kinds the game declares, with its plugins'. */
function kindIds(game: Game): Set<string> {
  return new Set([...(game.kinds ?? []), ...(game.plugins ?? []).flatMap((plugin) => plugin.content?.kinds ?? [])].map((kind) => kind.id))
}

/** The holdings feature, which keeps the counts each holder holds. */
export const holdings = defineFeature<HoldingsShape>({
  name: 'holdings',
  state: {
    held: { start: () => ({}), load: () => ({}) },
  },
  effects: {
    entity: {
      apply: (state, effect, game, cx) => {
        const at = effect.at ?? YOU
        const count = 'to' in effect ? cx.amount(state, game, effect.to) : heldCount(state, game, effect.entity, at) + cx.amount(state, game, effect.by)
        return setHeld(state, game, effect.entity, at, count)
      },
      references: (effect) => [
        ...ofKind(effect.entity),
        ...(effect.at !== undefined ? [{ holder: effect.at }] : []),
        { amount: 'to' in effect ? effect.to : effect.by },
      ],
    },
    move: {
      apply: (state, effect, game, cx) => {
        const from = moveSource(state, game, effect.move, effect.from)
        const by = effect.by === undefined ? undefined : cx.amount(state, game, effect.by)
        return from === undefined ? state : moveHeld(state, game, effect.move, from, effect.to, by)
      },
      references: (effect) => [
        ...ofKind(effect.move),
        ...(effect.by !== undefined ? [{ amount: effect.by }] : []),
        ...(effect.from !== undefined ? [{ holder: effect.from }] : []),
        { holder: effect.to },
        ...(effect.move === effect.to ? [{ holder: effect.to, holds: effect.move }] : []),
      ],
    },
  },
  // A New Game+ carries how many the player held of what `carryOver.held` lists, or of everything; a thing made in play comes with its record.
  carry: {
    key: 'held',
    run: (fresh, game, from) => {
      const listed = game.carryOver?.held
      if (!listed) return {}
      const refs = listed === 'all' ? [...new Set([...heldBy(from, game, PLAYER), ...heldBy(fresh, game, PLAYER)].map((entry) => entry.ref))] : listed
      let next = fresh
      for (const ref of refs) {
        const parts = parseRef(ref)
        const record = parts ? from.entities?.[parts.kind]?.[parts.id] : undefined
        if (parts && record && !entityDef(game, ref) && !hasEntity(next, game, ref)) {
          next = writeEntity(next, ref, record)
          const made = from.created?.[parts.kind] ?? 0
          if (made > (next.created?.[parts.kind] ?? 0)) next = { ...next, created: { ...next.created, [parts.kind]: made } }
        }
        next = setHeld(next, game, ref, PLAYER, heldCount(from, game, ref, PLAYER))
      }
      return { held: next.held, entities: next.entities, created: next.created }
    },
    check: (game, tools) => {
      if (!Array.isArray(game.carryOver?.held)) return
      // A thing made in play has no declaration, so only its kind is checked.
      const kinds = kindIds(game)
      for (const ref of game.carryOver.held) {
        const kind = parseRef(ref)?.kind
        if (kind === undefined) tools.problem({ list: 'carryOver' }, 'carryOver', `unknown entity "${ref}": name one as "kind:id"`)
        else if (!kinds.has(kind)) tools.problem({ list: 'carryOver' }, 'carryOver', `unknown kind "${kind}"`)
      }
    },
  },
  check: (game, tools) => checkStarts(game, tools),
  resolve: (game) => {
    const kinds = kindIds(game)
    return {
      holder: (ref) => {
        const { holder } = ref
        if ('holds' in ref && ref.holds === holder) return [`"${holder}" can't hold itself`]
        if (holder === PLAYER || holder === YOU || holder === '$') return []
        const parts = parseRef(holder)
        if (!parts) return [`unknown holder "${holder}": a holder is "player", "you" or a unique entity`]
        if (!kinds.has(parts.kind)) return [`unknown kind "${parts.kind}"`]
        if (!kindOf(game, parts.kind)?.unique) return [`"${holder}" can't hold things: its kind "${parts.kind}" isn't unique`]
        return []
      },
    }
  },
  // What you hold: the protagonist's things while one is played, then the player's.
  view: (state, game, _shown, cx) => {
    const you = protagonist(state)
    const played = you !== PLAYER && hasEntity(state, game, you) ? heldView(state, game, you, cx) : []
    return { held: [...played, ...heldView(state, game, PLAYER, cx)] }
  },
})
