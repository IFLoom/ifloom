import type { Game } from './game.ts'

/**
 * Every word the engine shows the player, by key, in English.
 *
 * A game replaces any of them with `game.strings` — or a pack's `strings`, so a
 * translation can ship as a mod — and the engine says the game's version
 * everywhere it would have said its own. `{name}` and friends are filled in
 * from what the engine knows at the time.
 *
 * Plugins declare their own defaults under their id (`quests/notDoing`), and
 * the game overrides those the same way.
 */
export const STRINGS = {
  // Refusals: why a command can't be done.
  finishFirst: 'Finish this first.',
  notSupported: 'This game does not do that.',
  noSuchAction: 'There is no such thing to do.',
  notEnough: 'Not enough {stat}.',
  noSuchScene: 'There is no such scene.',
  nothingToChoose: 'There is nothing to choose.',
  notOnOffer: 'That is not on offer.',
  noSuchThing: 'There is no such thing.',
  badArgument: 'That can’t be done: "{arg}" must be {kind}.',
  // Input.
  noSuchInput: 'There is no such thing to fill in.',
  notNow: 'Not now.',
  enterSomething: 'Enter something first.',
  enterNumber: 'Enter a number.',
  tooLong: 'Keep it to {n} characters.',
  between: 'Between {min} and {max}.',
  atLeast: 'At least {min}.',
  atMost: 'At most {max}.',
  notAnOption: 'That is not one of the options.',
  // Minigames.
  noMinigame: 'Nothing is being played.',
  noPanel: 'Nothing is open.',
  notLive: 'That does nothing now.',
  noTimer: 'Nothing is counting down.',
  tickLength: 'A tick is a number of milliseconds above 0.',
  // Settings.
  noSuchSetting: 'There is no such setting.',
  notAGameSetting: 'That setting does not change the game.',
  noProfile: 'This game keeps no settings between plays.',
  onOrOff: 'Choose on or off.',
  inSteps: 'In steps of {step}.',
  // Buttons and labels.
  lookAround: 'Look around',
  /** Between the parts of a price on a button, its stats and plugins' notes: `2 coins · until evening`. */
  priceSeparator: ' · ',
  /**
   * A minigame input's button, by the input's name: `minigame.<input>`. A
   * game names its own inputs the same way (`'minigame.jump': 'Jump'`); one
   * with no line is its own name with a capital.
   */
  'minigame.up': 'Up',
  'minigame.down': 'Down',
  'minigame.left': 'Left',
  'minigame.right': 'Right',
  'minigame.space': 'Space',
  /** The name the player's spoken lines show (`@you: "Hi."`) when the game's `rules.saveName` gives none. A game in another language sets its own. */
  you: 'You',
  momentPassed: 'The moment has passed.',
  /** On a button that can be pressed only once, a game or a turn, once it has been. */
  done: 'Already done.',
  // Saves.
  notASave: 'That is not a save file.',
  otherGame: 'That save belongs to another game ({game}).',
  saveTooOld: 'That save is from a version this game cannot read.',
  pluginNewer: 'That save was made with a newer version of {plugin}.',
  gameNewer: 'That save was made with a newer version of this game.',
  pluginUnreadable: "That save's {plugin} is from a version this game cannot read.",
  noSaves: 'This game keeps no saves.',
  emptySlot: 'Nothing is saved there.',
  notSaved: 'The game could not be saved.',
  notLoaded: 'The game could not be loaded.',
  notListed: 'The saves could not be read.',
  notRemoved: 'The save could not be deleted.',
  notExported: 'The save could not be exported.',
  /** A save's name when no plugin says when it is. */
  turnLabel: 'Turn {turn}',
} as const

/** A key of the engine's own strings. */
export type StringKey = keyof typeof STRINGS

/** What a game, pack or plugin gives for strings: any engine key, or a plugin's `id/name`. */
export type Strings = Partial<Record<StringKey, string>> & Record<string, string>

/**
 * The words for a key: the game's, else the plugin's default for a `plugin/name`
 * key, else the engine's, else the key itself so a missing line shows up. Each
 * `{name}` is replaced from `vars`; one with no value is left as it is.
 */
export function stringOf(game: Game | undefined, key: StringKey | (string & {}), vars: Record<string, string | number> = {}): string {
  let text = game?.strings?.[key]
  if (text === undefined) {
    const at = key.indexOf('/')
    if (at > 0) {
      const plugin = game?.plugins?.find((entry) => entry.id === key.slice(0, at))
      text = plugin?.strings?.[key.slice(at + 1)]
    }
  }
  text ??= (STRINGS as Record<string, string>)[key] ?? key
  return text.replace(/\{(\w+)\}/g, (whole: string, name: string) => (name in vars ? String(vars[name]) : whole))
}

/**
 * A refusal's words: a `Reason` written in place as it is, or one by key
 * (`{ string: 'shop/closed' }`) from the game's strings, through `stringOf`.
 */
export function reasonOf(game: Game | undefined, reason: string | { string: string }): string {
  return typeof reason === 'string' ? reason : stringOf(game, reason.string)
}
