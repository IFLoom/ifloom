import type { Game } from '@ifloom/engine'
import { useGame } from './context.tsx'

/**
 * The React UI's own words, in English. A game overrides any of them through
 * `game.strings` with a `ui.` in front — `{ 'ui.quests': 'Journal' }` — the same
 * table the engine's own lines come from.
 */
export const UI_STRINGS = {
  quests: 'Quests',
  statLevel: 'Level {level}',
  statProgress: '{label}: {percent}% of the way to level {next}',
  questNew: 'New',
  questStage: '{stage} of {stages}',
  track: 'Track',
  untrack: 'Untrack',
  allSeen: 'Mark all seen',
  allRead: 'Mark all read',
  back: 'Back',
  dismiss: 'Dismiss',
  likes: '♥ {n}',
  debug: 'Debug',
  seed: 'seed {seed}',
  undo: 'Undo',
  redo: 'Redo',
  set: 'Set',
  debugSet: 'Set',
  debugWhy: 'Why not',
  debugState: 'State',
  debugLog: 'Log',
  locksOn: 'Locks on',
  greyedOut: 'Greyed out',
  noneOn: 'None.',
  nothingGreyed: 'Nothing.',
  closeScene: 'Close the scene',
  // debug
  debugStat: 'Stat',
  debugKv: 'kv key',
  debugItem: 'Item',
  debugStatOf: 'Stat of',
  debugGo: 'Go',
  debugScene: 'Scene',
  debugTime: 'Time',
  debugTurn: 'Turn',
  wardrobe: 'Wearing',
  inventory: 'Carrying',
  takeOff: 'Take off',
  wear: 'Wear',
  nothingOn: 'Nothing',
  saves: 'Saves',
  save: 'Save',
  saveNew: 'Save in a new slot',
  load: 'Load',
  remove: 'Delete',
  exportSave: 'Export',
  importSave: 'Import a save file',
  noSaves: 'No saves yet.',
  brokenSave: 'A save that can’t be read',
  missingPacks: 'This save was made with packs this game doesn’t have: {packs}.',
  missingPlugins: 'This save was made with plugins this game doesn’t have: {plugins}.',
  backlog: 'Backlog',
  backlogEmpty: 'Nothing yet.',
  chose: 'You chose: {label}',
  enter: 'Enter',
  mods: 'Mods',
  addMod: 'Add a mod file',
  noMods: 'No mods added.',
  modOn: 'On',
  modOff: 'Off',
  applyMods: 'Restart with these mods',
  close: 'Close',
  priceSeparator: ' · ',
  itemCount: '×{n}',
  wearItem: 'Wear {item}',
  mailHeader: '{key}: {value}',
  newGame: 'New game',
  continue: 'Continue',
  newGamePlus: 'New Game+',
  settings: 'Settings',
  noSettings: 'There are no settings.',
  credits: 'Credits',
  titlePage: 'Title screen',
  replayVoice: 'Hear it again',
  zoom: 'Enlarge',
  closeViewer: 'Close',
  menu: 'Menu',
  timeLeft: 'Time left',
  minigameUp: 'Up',
  minigameDown: 'Down',
  minigameLeft: 'Left',
  minigameRight: 'Right',
  minigameSpace: 'Space',
  notices: 'Notices',
  noticesMore: '+{n} more',
  noticesFewer: 'Show fewer',
  unread: 'Unread',
  // achievements
  achievements: 'Achievements',
  achievementsCount: '{earned} of {total}',
  achievementEarned: 'Earned',
  achievementProgress: '{value} of {target}',
  noAchievements: 'No achievements yet.',
  // cheats
  cheats: 'Cheats',
  cheatUsedOnce: 'Used once',
  cheatUsedTimes: 'Used {n} times',
  // the shop
  shopAt: 'Shop at {vendor}',
  vendorClosed: 'Closed',
  buy: 'Buy',
  sellFor: 'Sell for {price}',
  stockLeft: '{n} left',
  owned: 'You have {n}',
  percentOff: '{percent}% off',
  noGoods: 'Nothing for sale.',
  // jobs
  jobs: 'Jobs',
  applyJob: 'Apply',
  workShift: 'Work a shift',
  quitJob: 'Quit',
  jobPay: 'Pays {pay} a shift',
  jobNextRank: 'Next: {title}, after {n} more shifts',
  jobNextRankOne: 'Next: {title}, after 1 more shift',
  jobNextRankSoon: 'Next: {title}',
  shiftToday: 'Next shift: today',
  shiftTomorrow: 'Next shift: tomorrow',
  shiftInDays: 'Next shift: in {n} days',
  jobShifts: 'Shifts worked: {n}',
  jobMissed: 'Missed: {n}',
  jobFired: 'Let go',
  // statuses
  statuses: 'Statuses',
  turnsLeft: '{n} turns left',
  turnLeft: '1 turn left',
  statusStacks: '×{n}',
  modifierAdd: '{n} {stat}',
  modifierMultiply: '×{n} {stat}',
} as const

export type UiStringKey = keyof typeof UI_STRINGS

/** The UI's words for a key: the game's `ui.<key>`, else the English. `{name}` is filled from `vars`. */
export function uiSay(game: Game, key: UiStringKey, vars: Record<string, string | number> = {}): string {
  const text = game.strings?.[`ui.${key}`] ?? UI_STRINGS[key]
  return text.replace(/\{(\w+)\}/g, (whole: string, name: string) => (name in vars ? String(vars[name]) : whole))
}

/** `uiSay` for the game in context. */
export function useWords(): (key: UiStringKey, vars?: Record<string, string | number>) => string {
  const { runner } = useGame()
  return (key, vars) => uiSay(runner.game, key, vars)
}
