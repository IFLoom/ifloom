/**
 * What first-party plugins ask each other by name.
 *
 * A plugin imports only the engine and requires no other plugin,
 * so a partner's own registry block is never in its program. The answers
 * partners ask for are declared here instead, as types only, and
 * `QueryRegistry` takes them in: every caller, `context.query` and
 * `pluginQuery` alike, reads them typed without restating them. The engine
 * itself never asks them, and nothing here runs: they are still asked by
 * name at run time, and undefined in a game without that plugin.
 */
import type { CommandRef } from './calls.ts'
import type { EntityRef } from './entities.ts'

/** The sender of a message or a post, as the cast's `cast/sender` query answers. */
export type SenderView = {
  /** The sender's name. */
  name: string
  /** The sender's picture, or null. */
  image: string | null
  /** The sender's face for a small avatar, a person's `portrait`, or null. */
  portrait: string | null
}

/** A character the player can call, as the cast's `cast/contacts` query answers. */
export type CastContact = {
  /** The character's id, as the cast names them, such as `'ava'`. */
  id: string
  /** The character's name. */
  name: string
  /** The character's description, a line about them, or null. */
  description: string | null
  /** The character's picture, through `artSrc`, or null. */
  image: string | null
  /** The character's face for a small avatar, or null. */
  portrait: string | null
  /** The cast's `cast/call` command for the character, in the short form. */
  command: CommandRef
  /** The reason the call can't go through now, or undefined when it can. */
  disabled: string | undefined
}

/**
 * The queries first-party plugins answer for other plugins, by full name. `QueryRegistry` includes them, so they are
 * typed wherever a query is asked.
 *
 * A plugin's own registry block declares the rest of its queries.
 */
export interface PartnerQueries {
  /** Returns the calendar's day, from 0, and its period. */
  'calendar/now': () => { day: number; period: string }
  /** Returns the calendar's periods, in order. */
  'calendar/periods': () => string[]
  /** Returns true at a time the player could go to bed. */
  'calendar/bedtime': () => boolean
  /** Returns the id of the location the player is at, or null when they are at none. */
  'places/here': () => string | null
  /** Returns the entity of the location the player is at, which holds the things put down there, or null when they are at none. */
  'places/holder': () => EntityRef | null
  /** Returns true when the game has the location. */
  'places/known': (args: { location: string }) => boolean
  /** Returns a character's face, their person's `portrait`, or undefined for none. */
  'cast/portrait': (args: { character: string }) => string | undefined
  /** Returns the characters the player has met who can be called. */
  'cast/contacts': () => CastContact[]
  /** Returns the {@link SenderView} of the entity a message or a post is from, with a person's `portrait` as the face. */
  'cast/sender': (args: { from: string }) => SenderView
}
