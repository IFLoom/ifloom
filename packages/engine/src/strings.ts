import type { Game } from './game.ts'

/**
 * The engine's own lines for the player, in English, by key. A game replaces any of them in its content's or a pack's
 * `strings`, so a translation can ship as a mod.
 *
 * The engine fills each `{name}` token from the values it has when it shows the line. Plugins declare their own
 * defaults under their id (`quests/notDoing`), and a game replaces those the same way.
 */
export const STRINGS = {
  // Refusals: why a command can't be done.
  /** The refusal of a command that can't run while a scene or minigame is open. */
  finishFirst: 'Finish this first.',
  /** The refusal of a command no feature, plugin or rule of the game handles. */
  notSupported: 'This game does not do that.',
  /** The refusal of an action or a game command the game doesn't declare. */
  noSuchAction: 'There is no such thing to do.',
  /** The refusal of a choice or action the player can't pay for, with `{stat}` the stat's label. */
  notEnough: 'Not enough {stat}.',
  /** The refusal of entering a scene the game doesn't declare. */
  noSuchScene: 'There is no such scene.',
  /** The refusal of a choice while no scene is open. */
  nothingToChoose: 'There is nothing to choose.',
  /** The refusal of a choice or action that isn't offered now. */
  notOnOffer: 'That is not on offer.',
  /** The refusal of a command that names an entity the game doesn't have. */
  noSuchThing: 'There is no such thing.',
  /** The refusal of a plugin command whose argument `{arg}` isn't a `{kind}`. */
  badArgument: 'That can’t be done: "{arg}" must be {kind}.',
  // Input.
  /** The refusal of the `input` command for an input the game doesn't declare. */
  noSuchInput: 'There is no such thing to fill in.',
  /** The refusal of the `input` command while the input's `when` doesn't hold. */
  notNow: 'Not now.',
  /** The refusal of an empty value for a text input. */
  enterSomething: 'Enter something first.',
  /** The refusal of a value that isn't a number for a number input or a number setting. */
  enterNumber: 'Enter a number.',
  /** The refusal of a text value longer than `{n}` characters. */
  tooLong: 'Keep it to {n} characters.',
  /** The refusal of a number outside an input's or a range setting's `{min}` and `{max}`. */
  between: 'Between {min} and {max}.',
  /** The refusal of a number below the input's `{min}`. */
  atLeast: 'At least {min}.',
  /** The refusal of a number above the input's `{max}`. */
  atMost: 'At most {max}.',
  /** The refusal of a value that isn't one of an input's or a setting's options. */
  notAnOption: 'That is not one of the options.',
  // Minigames.
  /** The refusal of a minigame command while no minigame runs. */
  noMinigame: 'Nothing is being played.',
  /** The refusal of `closePanel` while no panel is open. */
  noPanel: 'Nothing is open.',
  /** The refusal of a minigame input that does nothing in the minigame's current state. */
  notLive: 'That does nothing now.',
  /** The refusal of the `tick` command while no timer or minigame clock runs. */
  noTimer: 'Nothing is counting down.',
  /** The refusal of a `tick` whose `ms` isn't a number above 0. */
  tickLength: 'A tick is a number of milliseconds above 0.',
  // Settings.
  /** The refusal of a setting the game doesn't declare. */
  noSuchSetting: 'There is no such setting.',
  /** The refusal of a `ui` setting sent as a command, since only a `play` setting changes the state. */
  notAGameSetting: 'That setting does not change the game.',
  /** The refusal of a setting change when the runner keeps no profile. */
  noProfile: 'This game keeps no settings between plays.',
  /** The refusal of a value other than true or false for a toggle setting. */
  onOrOff: 'Choose on or off.',
  /** The refusal of a range setting's value that isn't a whole number of `{step}`s. */
  inSteps: 'In steps of {step}.',
  // Buttons and labels.
  /** The label of the button that leaves a scene the game no longer declares. */
  lookAround: 'Look around',
  /** The separator between the parts of a price on a button, such as `2 coins · until evening`. */
  priceSeparator: ' · ',
  /**
   * The label of a minigame input's button, keyed `minigame.<input>`. An input with no line shows its own name with a
   * capital.
   *
   * A game labels its own inputs the same way, as in `'minigame.jump': 'Jump'`.
   */
  'minigame.up': 'Up',
  /** The label of the minigame input `down`. */
  'minigame.down': 'Down',
  /** The label of the minigame input `left`. */
  'minigame.left': 'Left',
  /** The label of the minigame input `right`. */
  'minigame.right': 'Right',
  /** The label of the minigame input `space`. */
  'minigame.space': 'Space',
  /** The name the player's spoken lines (`@you: "Hi."`) show when no `saveName` gives one. A game in another language sets its own. */
  you: 'You',
  /** The text shown for an open scene the game no longer declares, such as after a mod is removed. */
  momentPassed: 'The moment has passed.',
  /** The reason on a choice or action with `once`, after the player has taken it that game or turn. */
  done: 'Already done.',
  // Saves.
  /** The refusal of an imported file or a state that isn't a save. */
  notASave: 'That is not a save file.',
  /** The refusal of a save made by another game, with `{game}` that game's id. */
  otherGame: 'That save belongs to another game ({game}).',
  /** The refusal of a save from an engine version too old for the engine's steps to carry forward. */
  saveTooOld: 'That save is from a version this game cannot read.',
  /** The refusal of a save made with a newer version of the plugin `{plugin}`. */
  pluginNewer: 'That save was made with a newer version of {plugin}.',
  /** The refusal of a save made with a newer version of the game. */
  gameNewer: 'That save was made with a newer version of this game.',
  /** The refusal of a save whose state for the plugin `{plugin}` its migrations can't carry forward. */
  pluginUnreadable: "That save's {plugin} is from a version this game cannot read.",
  /** The refusal of a save or load when the runner keeps no saves. */
  noSaves: 'This game keeps no saves.',
  /** The refusal of loading a slot that holds no save. */
  emptySlot: 'Nothing is saved there.',
  /** The reason a save failed to write. */
  notSaved: 'The game could not be saved.',
  /** The reason a save failed to read. */
  notLoaded: 'The game could not be loaded.',
  /** The reason the saves failed to list. */
  notListed: 'The saves could not be read.',
  /** The reason a save failed to delete. */
  notRemoved: 'The save could not be deleted.',
  /** The reason a save failed to export. */
  notExported: 'The save could not be exported.',
  /** The save's name when no plugin's `saveName` gives one. */
  turnLabel: 'Turn {turn}',
} as const

/** A key of the engine's own lines in {@link STRINGS}. */
export type StringKey = keyof typeof STRINGS

/** A table of lines a game, pack or plugin gives by key. A key is an engine key or a plugin's `<id>/<name>`. */
export type Strings = Partial<Record<StringKey, string>> & Record<string, string>

/**
 * Returns the line for a key with each `{name}` token filled from `vars`. Returns the key itself when no table has
 * it, so a missing line shows.
 *
 * The engine looks in the game's strings, then the plugin's defaults for a `<plugin>/<name>` key, then its own. A
 * token with no value in `vars` stays as written.
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
 * Returns a refusal's words for a `Reason`. A string is returned as written, and `{ string: 'shop/closed' }` is
 * read with {@link stringOf}.
 */
export function reasonOf(game: Game | undefined, reason: string | { string: string }): string {
  return typeof reason === 'string' ? reason : stringOf(game, reason.string)
}
