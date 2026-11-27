/**
 * Credits: the people and sources a game thanks, in groups the game names,
 * such as the team, its patrons, the photographs and their models. The engine
 * keeps them as content, so every UI reads the same credits and a mod or pack
 * can credit itself, and checks them; how a credits page looks is the UI's.
 *
 * A group is merged by its id: a later pack's credits go after the ones
 * already in it, and its title or description, when it gives one, replaces
 * the earlier one. A new id adds a group after the others.
 */
import type { Game } from '../game.ts'
import { artSrc } from '../sceneBody.ts'
import { defineFeature, listWords, type PackMerge } from './feature.ts'

/** One credit in a group, such as a person, a studio or a source the game thanks. Only `name` is needed. */
export type Credit = {
  /** The person, studio or source credited, as the credits page shows it. It's a name, so a translation leaves it alone. */
  name: string
  /** The credit's role, the part they played or gave, such as `'Writer'`, `'Cover photograph'` or `'Gold patron'`. */
  role?: string
  /** A line more about the credit, such as `'The harbour at dawn, via Unsplash'`. */
  description?: string
  /** A link to them or to the source, `http:`, `https:` or `mailto:`. */
  href?: string
  /** The licence the work is used under, such as `'CC BY 4.0'`. */
  licence?: string
  /** The path of a picture beside the credit, such as a portrait or the credited image itself. */
  art?: string
}

/** A group of credits the game declares in `credits`, such as the team or the patrons, shown under its title in order. */
export type CreditGroup = {
  /** The group's id. Content and packs that name the same id add to one group. */
  id: string
  /** The group's heading, such as `'Patrons'`. */
  title: string
  /** A line under the heading, such as `'With thanks to everyone on Patreon'`. */
  description?: string
  /** The group's credits, in order. */
  credits: Credit[]
}

/** The credits feature's content key, as types. */
export type CreditsShape = {
  game: {
    /** The game's credits, in groups, in the order they were first declared. None if left out. */
    credits?: CreditGroup[]
  }
  pack: {
    /**
     * The pack's credits, in groups. A group whose id is already declared gets these credits after its own.
     *
     * Its `title` or `description` replaces the earlier one, and a new id adds a group after the others.
     */
    credits?: CreditGroup[]
  }
  lists: 'credits'
}

/** Groups merged by id, in the order each was first declared, with a later pack's credits after the earlier ones. */
function merge(): PackMerge<CreditsShape['game'], CreditsShape['pack']> {
  const merged = new Map<string, { group: CreditGroup; from: string | undefined }>()
  const add = (groups: readonly CreditGroup[] | undefined, from: string | undefined) => {
    for (const group of groups ?? []) {
      if (typeof group?.id !== 'string') continue
      const had = merged.get(group.id)
      // Credits that aren't a list are kept as written, so the check reports them.
      if (!had) {
        merged.set(group.id, { group: { ...group, credits: Array.isArray(group.credits) ? [...group.credits] : group.credits }, from })
        continue
      }
      const both = Array.isArray(had.group.credits) && Array.isArray(group.credits)
      const joined: CreditGroup = {
        ...had.group,
        credits: both ? [...had.group.credits, ...group.credits] : Array.isArray(group.credits) ? had.group.credits : group.credits,
      }
      if (group.title !== undefined) joined.title = group.title
      if (group.description !== undefined) joined.description = group.description
      merged.set(group.id, { group: joined, from: had.from })
    }
  }
  return {
    base: (game) => add(game.credits, undefined),
    add: (pack, from) => add(pack.credits, from),
    finish: (game) => {
      if (merged.size) game.credits = [...merged.values()].map((entry) => entry.group)
    },
    from: (list, id) => (list === 'credits' && id !== undefined ? merged.get(id)?.from : undefined),
  }
}

/**
 * Returns the game's credit groups that have at least one credit, in order, as a credits page shows them. Empty when the
 * game credits no one.
 */
export function creditsOf(game: Pick<Game, 'credits'>): readonly CreditGroup[] {
  return (game.credits ?? []).filter((group) => Array.isArray(group.credits) && group.credits.length > 0)
}

const LINK = /^(?:https?:\/\/|mailto:)/i

/** The credits feature, which merges the game's credit groups and checks them. */
export const credits = defineFeature<CreditsShape>({
  name: 'credits',
  pack: { merge },
  // Groups add up across files and packs, so one id declared twice is not a clash.
  content: {
    credits: {
      declares: null,
      words: listWords('credits', 'credits', { title: true, description: true, credits: [{ role: true, description: true }] }),
    },
  },
  lists: ['credits'],
  check: (game, tools) => {
    ;(game.credits ?? []).forEach((group, index) => {
      const id = typeof group?.id === 'string' && group.id ? group.id : String(index)
      const source = { list: 'credits', id }
      const where = `credits ${id}`
      if (typeof group?.id !== 'string' || !group.id) tools.problem(source, where, 'a credit group needs its id')
      if (typeof group?.title !== 'string' || !group.title.trim()) tools.problem(source, where, 'a credit group needs its title')
      if (!Array.isArray(group?.credits)) {
        tools.problem(source, where, 'credits must be a list')
        return
      }
      group.credits.forEach((credit, at) => {
        const spot = `${where} credit ${at + 1}`
        if (typeof credit?.name !== 'string' || !credit.name.trim()) tools.problem(source, spot, 'a credit needs its name')
        if (credit?.href !== undefined && (typeof credit.href !== 'string' || !LINK.test(credit.href)))
          tools.problem(source, spot, 'href must start with http://, https:// or mailto:')
        if (typeof credit?.art === 'string') tools.file(spot, 'picture', artSrc(credit.art))
      })
    })
  },
})
