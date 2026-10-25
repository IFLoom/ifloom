/**
 * `ifloom words`: every field of the game a player reads, from the engine's
 * `translatableFields`, as a list to read or as the JSON of a words table to
 * translate from.
 */
import { translatableFields, type Game } from '@ifloom/engine'

/** The fields as lines, `<key>: "<words>"`, each with where it is, then a count. */
export function wordsText(game: Game): string {
  const fields = translatableFields(game)
  const lines = fields.map((field) => `${field.key}: ${JSON.stringify(field.text)}  (${field.where})`)
  lines.push(`${fields.length} field${fields.length === 1 ? '' : 's'} to translate.`)
  return lines.join('\n')
}

/** The fields as a words table, key to words in the game's own language, as JSON to copy and translate. */
export function wordsJson(game: Game): string {
  const table = Object.fromEntries(translatableFields(game).map((field) => [field.key, field.text]))
  return JSON.stringify(table, null, 2) + '\n'
}
