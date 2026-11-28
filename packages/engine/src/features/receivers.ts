/**
 * Receivers: giving someone a thing, taking it back and asking how many they have, as content says it whichever
 * plugin keeps things (ADR 0016). The `receive` and `release` effects and the `owned` condition ask the game's
 * receivers through the core (`receivers.ts`). The feature keeps no state and names no plugin, and without a receiver
 * the calls do nothing, so a game that keeps things in kv keys never needs them.
 */
import { ofKind, type EntityRef } from '../entities.ts'
import type { Game } from '../game.ts'
import type { Amount, Range } from '../types.ts'
import { inRange, wanted } from '../range.ts'
import { defineFeature } from './feature.ts'

/** The receivers feature's calls and reference, as types. */
export type ReceiversShape = {
  conditions: {
    /**
     * A condition on how many of a thing someone has, added up across every plugin that keeps things, such as
     * `{ owned: 'food:coffee', gte: 2 }`. With no range it holds for at least one.
     *
     * `of` names whose, `'player'`, `'you'` or a unique entity, and each plugin reads its own default if left out (the
     * protagonist being played, else the player). `via` asks one plugin only.
     */
    owned: { owned: string; of?: string; via?: string } & Range
  }
  effects: {
    /**
     * An effect that gives someone a thing, `by` how many (1 if left out), such as `{ receive: 'clothing:shirt' }`.
     * The first plugin in the game's `receivers` order that claims the thing takes it, and `via` names one plugin to
     * take it whatever it claims.
     *
     * `to` names who gets it, `'player'`, `'you'` or a unique entity, and the plugin that takes it chooses if left out.
     * Without a plugin that keeps things it does nothing.
     */
    receive: { receive: string; by?: Amount; to?: string; via?: string }
    /**
     * An effect that takes back `by` of a thing (1 if left out) `from` someone, asking each plugin that keeps things
     * in turn until that many are gone, such as `{ release: 'food:coffee' }`. `via` asks one plugin only.
     */
    release: { release: string; by?: Amount; from?: string; via?: string }
  }
  references: {
    /**
     * A call that needs a plugin that keeps things, a `receive`, `release` or `owned`. With `receiver`, that plugin
     * must be in the game and keep things.
     */
    receiver: { receiver?: string }
  }
}

/** The references a call to the receivers makes: the thing, who, how many and which plugin. */
function callReferences(ref: string, who: string | undefined, by: Amount | undefined, via: string | undefined) {
  return [...ofKind(ref), { entity: ref }, ...(who !== undefined ? [{ someone: who }] : []), ...(by !== undefined ? [{ amount: by }] : []), { receiver: via }]
}

/** The receivers feature, which hands `receive`, `release` and `owned` to the plugins that keep things. */
export const receivers = defineFeature<ReceiversShape>({
  name: 'receivers',
  conditions: {
    owned: {
      holds: (state, condition, game, cx) => inRange(cx.owned(state, game, condition.owned as EntityRef, condition.of, condition.via), condition),
      explain: (state, condition, game, cx) =>
        `owned ${condition.owned}${condition.of !== undefined ? ` of ${condition.of}` : ''} is ${cx.owned(state, game, condition.owned as EntityRef, condition.of, condition.via)}; wants ${wanted(condition)}`,
      references: (condition) => callReferences(condition.owned, condition.of, undefined, condition.via),
    },
  },
  effects: {
    receive: {
      apply: (state, effect, game, cx) =>
        cx.receive(state, game, effect.receive as EntityRef, effect.by === undefined ? 1 : cx.amount(state, game, effect.by), effect.to, effect.via),
      references: (effect) => callReferences(effect.receive, effect.to, effect.by, effect.via),
    },
    release: {
      apply: (state, effect, game, cx) =>
        cx.release(state, game, effect.release as EntityRef, effect.by === undefined ? 1 : cx.amount(state, game, effect.by), effect.from, effect.via),
      references: (effect) => callReferences(effect.release, effect.from, effect.by, effect.via),
    },
  },
  check: (game, tools, cx) => {
    const keeping = cx.receivers(game)
    for (const id of game.receivers ?? []) {
      if (!keeping.includes(id)) tools.problem({ list: 'receivers' }, 'receivers', `"${id}" is no plugin of the game's that keeps things`)
    }
  },
  resolve: (game: Game, _tools) => ({
    receiver: ({ receiver }) => {
      const plugins = (game.plugins ?? []).filter((plugin) => plugin.receiver !== undefined).map((plugin) => plugin.id)
      if (receiver !== undefined) {
        if (!(game.plugins ?? []).some((plugin) => plugin.id === receiver)) return [`via names "${receiver}", which isn't one of the game's plugins`]
        return plugins.includes(receiver) ? [] : [`via names "${receiver}", which keeps no things`]
      }
      return plugins.length ? [] : ['no plugin of the game keeps things, so this does nothing: add one, such as the inventory, or use kv keys']
    },
  }),
})
