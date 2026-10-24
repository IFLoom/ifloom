/**
 * Holdings: who holds what. The player and unique entities hold things, any
 * entity can be held, and `'you'` is whoever the player is playing now. The
 * logic is in `holdings.ts`; the `entity` and `count` conditions, and what
 * `create`, `remove` and `each` do with holders, are the entities feature's.
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
  traitDef,
  writeEntity,
  YOU,
  type EntityRef,
  type Holder,
} from '../entities.ts'
import { canHold, heldBy, heldCount, holderOf, moveHeld, placementCounts, setHeld } from '../holdings.ts'
import type { Game } from '../game.ts'
import type { GameState } from '../types.ts'
import { withUi, type EntityUi, type Ui } from './ui.ts'
import { defineFeature, type FeatureCheckTools, type FeatureContext } from './feature.ts'

/** One thing a holder has, as the UI draws it. */
export type HeldView = {
  /** How content names it: `'food:apple'`. */
  ref: EntityRef
  /** Its name, with prose tokens filled in. */
  name: string
  /** Its description, filled in the same way; null with none. */
  desc: string | null
  /** Its picture's path, through `artSrc`; null with none. */
  image: string | null
  /** Its kind's tags, then its own. */
  tags: string[]
  /** How many are held. */
  count: number
  /** Who holds it: the protagonist being played, or `'player'`. */
  at: Holder
  /** Its presentation hints, its own over its kind's, as written; left out with none. See `EntityUi`. */
  ui?: Ui<EntityUi>
}

/** What the holdings feature adds, as types. */
export type HoldingsShape = {
  state: {
    /**
     * What play changed about who holds what, by holder and then thing:
     * `held.player['food:apple']`. A count is kept once written, 0 included;
     * anything else reads where content's `at` starts it.
     */
    held: Record<Holder, Record<EntityRef, number>>
    /** The protagonist the player is playing, as `'you'` reads: null for the player themselves. */
    you: EntityRef | null
  }
  effects: {
    /**
     * Change how many of a thing a holder holds `by` an amount, or put it
     * `to` a count: `'you'` if `at` is left out. Never below 0, and never
     * more than 1 of a unique thing, which is taken from whoever else held it.
     */
    entity: { kind: 'entity'; entity: string; at?: string; by: number } | { kind: 'entity'; entity: string; at?: string; to: number }
    /**
     * Move a thing `to` another holder: `from` a holder, else from wherever a
     * unique thing is, or from `'you'`; up to `by` of it, else all there is.
     */
    move: { kind: 'move'; entity: string; from?: string; to: string; by?: number }
    /** Play as a protagonist, a unique entity, so `'you'` is them; `to: null` to be the player again. */
    you: { kind: 'you'; to: string | null }
  }
  view: {
    /**
     * What you hold, in the game's order of its entities: the protagonist's
     * things while one is played, then the player's.
     */
    held: HeldView[]
  }
}

/** One holder's things as the view draws them. */
function heldView(state: GameState, game: Game, holder: Holder, cx: FeatureContext): HeldView[] {
  return heldBy(state, game, holder)
    .filter(({ ref }) => cx.holds(state, bindCurrent(entityDef(game, ref)?.visible, ref), game))
    .map(({ ref, count }) => {
      const desc = entityText(state, game, ref, 'desc')
      const image = entityImage(state, game, ref)
      return {
        ref,
        name: cx.fillTokens(entityText(state, game, ref, 'name') ?? parseRef(ref)?.id ?? ref, state, game),
        desc: desc === undefined ? null : cx.fillTokens(desc, state, game),
        image: image === undefined ? null : artSrc(image),
        tags: entityTags(state, game, ref),
        count,
        at: holder,
        ...withUi(entityUi(state, game, ref)),
      }
    })
}

/** Where a `move` takes a thing from when it doesn't say: wherever a unique thing is, else you. */
function moveSource(state: GameState, game: Game, ref: EntityRef, from: string | undefined): Holder | undefined {
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
  const startHolder = new Map<EntityRef, Holder>()
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
    const path: EntityRef[] = []
    for (let at: Holder | undefined = start; at !== undefined; at = startHolder.get(at)) {
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

export const holdings = defineFeature<HoldingsShape>({
  name: 'holdings',
  state: {
    held: { start: () => ({}), load: () => ({}) },
    you: { start: () => null, load: () => null },
  },
  effects: {
    entity: {
      apply: (state, effect, game) => {
        const at = effect.at ?? YOU
        const count = 'to' in effect ? effect.to : heldCount(state, game, effect.entity, at) + effect.by
        return setHeld(state, game, effect.entity, at, count)
      },
      references: (effect) => [...ofKind(effect.entity), ...(effect.at !== undefined ? [{ holder: effect.at }] : [])],
    },
    move: {
      apply: (state, effect, game) => {
        const from = moveSource(state, game, effect.entity, effect.from)
        return from === undefined ? state : moveHeld(state, game, effect.entity, from, effect.to, effect.by)
      },
      references: (effect) => [
        ...ofKind(effect.entity),
        ...(effect.from !== undefined ? [{ holder: effect.from }] : []),
        { holder: effect.to },
        ...(effect.entity === effect.to ? [{ holder: effect.to, holds: effect.entity }] : []),
      ],
    },
    you: {
      apply: (state, effect, game) => {
        if (effect.to === null || effect.to === PLAYER) return state.you === null ? state : { ...state, you: null }
        if (effect.to === YOU || !canHold(state, game, effect.to)) return state
        return state.you === effect.to ? state : { ...state, you: effect.to }
      },
      references: (effect) => (effect.to === null ? [] : [{ holder: effect.to, protagonist: true }]),
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
        if (holder === PLAYER || holder === '$') return []
        if (holder === YOU) return 'protagonist' in ref ? ['"you" is already whoever is played: name the protagonist, or null for the player'] : []
        const parts = parseRef(holder)
        if (!parts) return [`unknown holder "${holder}": a holder is "player", "you" or a unique entity`]
        if (!kinds.has(parts.kind)) return [`unknown kind "${parts.kind}"`]
        if (!kindOf(game, parts.kind)?.unique) return [`"${holder}" can't hold things: its kind "${parts.kind}" isn't unique`]
        return []
      },
      like: (ref) => {
        const parts = parseRef(ref.like)
        if (!parts) return ref.like === '$' ? [] : [`unknown entity "${ref.like}" to be like`]
        if (!kinds.has(parts.kind)) return [`unknown kind "${parts.kind}"`]
        if (ref.of !== undefined && parts.kind !== ref.of) return [`like names a ${parts.kind}, not a ${ref.of}`]
        if (parts.id !== '*' && !entityDef(game, ref.like)) return [`unknown entity "${ref.like}" to be like: name one the game declares`]
        return []
      },
      trait: (ref) => {
        const at = ref.trait.indexOf('/')
        if (at <= 0) return []
        const plugin = game.plugins?.find((entry) => entry.id === ref.trait.slice(0, at))
        return plugin && !traitDef(game, ref.trait) ? [`plugin "${plugin.id}" has no trait "${ref.trait}"`] : []
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
