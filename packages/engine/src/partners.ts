/**
 * What first-party plugins ask each other by name.
 *
 * A plugin imports only the engine and requires no other plugin (ADR 0003),
 * so a partner's own registry block is never in its program. The answers
 * partners ask for are declared here instead, as types only, and
 * `QueryRegistry` takes them in: every caller, `context.query` and
 * `pluginQuery` alike, reads them typed without restating them. The engine
 * itself never asks them, and nothing here runs: they are still asked by
 * name at run time, and undefined in a game without that plugin.
 */
import type { CommandRef } from './calls.ts'
import type { EntityRef } from './entities.ts'

/** Who sent something, as the cast's `cast/sender` answers: a name, their picture and their face. */
export type SenderView = { name: string; image: string | null; portrait: string | null }

/** Someone the player can call, as the cast's `cast/contacts` answers. */
export type CastContact = {
  /** Their id, as the cast names them: `'ava'`. */
  id: string
  name: string
  /** A line about them, or null. */
  description: string | null
  /** Their picture, through `artSrc`, or null. */
  image: string | null
  /** Their face, for a small avatar, or null. */
  portrait: string | null
  /** The cast's `cast/call` command for them, in short. */
  command: CommandRef
  /** Why the call can't go through now; undefined when it can. */
  disabled: string | undefined
}

/**
 * The queries first-party plugins answer that other plugins ask, by full
 * name. Part of `QueryRegistry`, so they are typed wherever a query is
 * asked; a plugin's own block declares the rest of its queries.
 */
export interface PartnerQueries {
  /** The calendar's day, from 0, and period. */
  'calendar/now': () => { day: number; period: string }
  /** The calendar's periods, in order. */
  'calendar/periods': () => string[]
  /** Whether it's a time the player could go to bed. */
  'calendar/bedtime': () => boolean
  /** The id of the place the player is in, or null for nowhere. */
  'places/here': () => string | null
  /** The entity of the place the player is in, which holds what is put down there; null when nowhere. */
  'places/holder': () => EntityRef | null
  /** Whether the game has this place. */
  'places/known': (args: { location: string }) => boolean
  /** A character's face, their person's `portrait`; undefined for none. */
  'cast/portrait': (args: { character: string }) => string | undefined
  /** Everyone met who can be called. */
  'cast/contacts': () => CastContact[]
  /** Who a message or a post is from: the entity's name and picture, a person's `portrait` as the face. */
  'cast/sender': (args: { from: string }) => SenderView
}
