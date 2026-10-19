/**
 * How a game makes the React UI its own, below the theme variables:
 *
 * - `components` replaces any built-in component by name, everywhere it's used.
 * - `classes` changes the Tailwind classes on any part, by its `data-part` name.
 * - `unstyled` drops every built-in class, leaving the structure and the hooks.
 *
 * Every element the UI draws carries a `data-part`, so plain CSS can reach it too.
 */
import { createContext, useContext, type ComponentType, type ReactNode } from 'react'
import { cn } from '../lib/utils.ts'
import type { RoomActions, Title } from './layout.tsx'
import type { Game, Overlay, Section, Sidebar, Story, When } from './regions.tsx'
import type { Clock, Exits, LocationCard, PeopleHere, Relationships, StatList } from './sidebar.tsx'
import type { Beat, SceneStage } from './scene.tsx'
import type { InlineAction, Tip } from './inline.tsx'
import type { Hotspot, Stage } from './stage.tsx'
import type { Video } from './video.tsx'
import type { MediaViewer } from './viewer.tsx'
import type { ChoiceButton, ChoiceList, PriceTag } from './choices.tsx'
import type { Notice, Notices } from './notices.tsx'
import type { QuestLog } from './quests.tsx'
import type { AppSection, DeviceButtons, DeviceDialog, DeviceScreen } from './device.tsx'
import type { FeedSection, MessagesSection } from './sections.tsx'
import type { DebugCard } from './debug.tsx'
import type { Picture } from './picture.tsx'
import type { WardrobeCard } from './wardrobe.tsx'
import type { Inventory } from './inventory.tsx'
import type { EntityTable } from './entities.tsx'
import type { InputField, InputFields } from './inputs.tsx'
import type { Backlog } from './backlog.tsx'
import type { SavesMenu } from './saves.tsx'
import type { GameMenu } from './menu.tsx'
import type { ModManager } from './mods.tsx'
import type { Icon } from './icon.tsx'
import type { CreditsPage, GatePage, LoadPage, SettingsPage, TitlePage } from './pages.tsx'
import type { MinigameCard } from './minigame.tsx'
import type { NoticeStrip } from './strip.tsx'
import type { KeyOptions } from './keys.tsx'
import type { AchievementList, AchievementsButton, AchievementsPage } from './achievements.tsx'
import type { CheatPanel, CheatsButton } from './cheats.tsx'
import type { UnlocksPanel } from './unlocks.tsx'
import type { ShopCounter, ShopDialog } from './shop.tsx'
import type { PanelHost } from './panels.tsx'
import type { JobBoard } from './jobs.tsx'
import type { StatusList } from './statuses.tsx'

/** Every `data-part` the React UI draws, which is also every key `classes` takes. */
export const PART_KEYS = [
  // The page
  'page',
  'sidebar',
  'story',
  'overlay',
  'title',
  'clock',
  // Sections, and the side column as a drawer on phones
  'section',
  'section-title',
  'section-toggle',
  'section-body',
  'section-badge',
  'top-bar',
  'top-bar-title',
  'drawer-button',
  'drawer',
  'drawer-overlay',
  // Stats
  'stats',
  'stat',
  'stat-label',
  'stat-value',
  'stat-level',
  'stat-progress',
  'stat-bar',
  'stat-pips',
  'stat-pip',
  // Where you are, and who's there
  'location',
  'location-name',
  'location-text',
  'exits',
  'exit',
  'people',
  'people-title',
  'person',
  'person-portrait',
  'person-name',
  'person-role',
  'person-actions',
  'relationships',
  'relationship',
  'relationship-header',
  'relationship-stats',
  // Scenes
  'scene-transition',
  'scene',
  'scene-header',
  'scene-portrait',
  'scene-title',
  'stage-image',
  'beats',
  'beat',
  'reveal',
  'mail-header',
  'mail-body',
  'voice-replay',
  // Inline actions, tooltips, bold and italics in the prose
  'inline-action',
  'tip',
  'tip-content',
  'bold',
  'italic',
  // Pictures, videos, the stage and the viewer
  'video',
  'stage-picture',
  'stage-layer',
  'hotspot',
  'hotspot-warning',
  'viewer-open',
  'viewer',
  'viewer-close',
  // Choices and buttons
  'actions',
  'choices',
  'choice',
  'choice-key',
  'choice-label',
  'choice-warning',
  'choice-price',
  'choice-irreversible',
  'choice-reason',
  'button',
  'badge',
  // Notices
  'notices',
  'notices-more',
  'notice',
  'notice-image',
  'notice-title',
  'notice-text',
  'notice-dismiss',
  'notice-strip',
  'notice-strip-item',
  // Minigames
  'minigame',
  'minigame-title',
  'minigame-state',
  'minigame-timer',
  'minigame-inputs',
  'minigame-input',
  // The menu and its dialogs
  'menu',
  'menu-button',
  'dialog',
  'dialog-overlay',
  'dialog-title',
  'dialog-close',
  'saves',
  'saves-actions',
  'save-slot',
  'save-name',
  'save-details',
  'saves-message',
  'saves-blocked',
  'saves-empty',
  'file-button',
  'backlog',
  'backlog-entry',
  'backlog-title',
  'backlog-choice',
  'backlog-empty',
  'mods',
  'mod',
  'mod-name',
  'mod-version',
  'mod-state',
  'mod-text',
  'mod-problem',
  'mods-message',
  'mods-empty',
  'mods-restart',
  'mods-changed',
  // Plugins' cards
  'quests',
  'quests-title',
  'quest',
  'quest-title',
  'quest-stage',
  'quest-summary',
  'quest-hint',
  'quests-done',
  'quest-done',
  'inventory',
  'inventory-title',
  'thing',
  'thing-name',
  'thing-count',
  'thing-text',
  'thing-drop',
  'wardrobe',
  'wardrobe-title',
  'wardrobe-slot',
  'wardrobe-slot-name',
  'wardrobe-worn',
  'statuses',
  'statuses-title',
  'status',
  'status-label',
  'status-stacks',
  'status-turns',
  'status-summary',
  'status-modifiers',
  'achievements-button',
  'achievements',
  'achievements-title',
  'achievements-count',
  'achievements-empty',
  'cheats-button',
  'cheats',
  'cheats-group',
  'cheats-group-title',
  'cheat',
  'cheat-text',
  'cheat-used',
  'unlocks',
  'unlocks-title',
  'unlock-form',
  'unlock-input',
  'unlocks-message',
  'unlocks-entered',
  'unlocks-list',
  'unlock',
  'unlock-name',
  'unlock-state',
  'unlock-text',
  'unlock-problem',
  'achievement',
  'achievement-image',
  'achievement-title',
  'achievement-text',
  'achievement-progress',
  'achievement-progress-text',
  'shop',
  'shop-closed',
  'shop-empty',
  'goods',
  'good',
  'good-name',
  'good-desc',
  'good-image',
  'good-details',
  'good-off',
  'good-full-price',
  'good-stock',
  'good-owned',
  'good-actions',
  'jobs',
  'jobs-title',
  'job',
  'job-title',
  'job-rank',
  'job-fired',
  'job-text',
  'job-details',
  'job-pay',
  'job-shift',
  'job-next',
  'job-record',
  'job-actions',
  'entities',
  'entity-table',
  'entity-heading',
  'entity-columns',
  'entity-column',
  'entity-row',
  'entity-name',
  'entity-image',
  'entity-desc',
  'entity-value',
  'inputs',
  'input',
  'input-label',
  'input-field',
  'input-options',
  'input-submit',
  'input-error',
  // Devices, apps, messages and feeds
  'devices',
  'device-button',
  'device-badge',
  'device-screen',
  'app',
  'app-header',
  'app-title',
  'app-back',
  'app-launcher',
  'app-button',
  'app-icon',
  'app-badge',
  'app-prose',
  'app-entries',
  'app-entry',
  'app-entry-image',
  'app-entry-title',
  'app-entry-text',
  'channel',
  'thread',
  'thread-title',
  'thread-portrait',
  'message',
  'bubble',
  'feed',
  'post',
  'post-author',
  'post-portrait',
  'post-image',
  'post-text',
  'post-meta',
  'post-comment',
  'post-comment-name',
  // The debug card
  'debug',
  'debug-header',
  'debug-title',
  'debug-seed',
  'debug-form',
  'debug-label',
  'debug-field',
  'debug-error',
  'debug-section',
  'debug-heading',
  'debug-list',
  'debug-state',
  'debug-log',
  // The pages around the game
  'title-page',
  'title-art',
  'title-name',
  'title-subtitle',
  'title-buttons',
  'title-button',
  'page-heading',
  'page-back',
  'settings-page',
  'settings',
  'setting',
  'setting-label',
  'setting-control',
  'setting-value',
  'settings-empty',
  'settings-message',
  'settings-mods',
  'mods-title',
  'mods-hint',
  'load-page',
  'credits-page',
  'credits',
  'credit',
  'credit-link',
  'achievements-page',
  'gate-page',
  'gate-title',
  'gate-text',
  'gate-buttons',
  'gate-confirm',
  'gate-decline',
] as const

export type PartKey = (typeof PART_KEYS)[number]

/**
 * Classes for a part. A string is merged over the built-in classes (yours win
 * where they clash); a function gets the built-in classes and returns the ones
 * to use, so `() => 'font-serif'` replaces them outright.
 */
export type Classes = Partial<Record<PartKey, string | ((defaults: string) => string)>>

/** A replacement for a built-in component. It gets the same props, and the built-in one as `Default`. */
export type Override<P> = ComponentType<P & { Default: ComponentType<P> }>

type PropsOf<T> = T extends ComponentType<infer P> ? P : never

/** The built-in components a game can replace, by name. */
export type Components = Partial<{
  Game: Override<PropsOf<typeof Game>>
  Sidebar: Override<PropsOf<typeof Sidebar>>
  Story: Override<PropsOf<typeof Story>>
  Overlay: Override<PropsOf<typeof Overlay>>
  Section: Override<PropsOf<typeof Section>>
  When: Override<PropsOf<typeof When>>
  Title: Override<PropsOf<typeof Title>>
  Clock: Override<PropsOf<typeof Clock>>
  StatList: Override<PropsOf<typeof StatList>>
  LocationCard: Override<PropsOf<typeof LocationCard>>
  Exits: Override<PropsOf<typeof Exits>>
  PeopleHere: Override<PropsOf<typeof PeopleHere>>
  Relationships: Override<PropsOf<typeof Relationships>>
  RoomActions: Override<PropsOf<typeof RoomActions>>
  SceneStage: Override<PropsOf<typeof SceneStage>>
  Beat: Override<PropsOf<typeof Beat>>
  InlineAction: Override<PropsOf<typeof InlineAction>>
  Tip: Override<PropsOf<typeof Tip>>
  ChoiceList: Override<PropsOf<typeof ChoiceList>>
  ChoiceButton: Override<PropsOf<typeof ChoiceButton>>
  PriceTag: Override<PropsOf<typeof PriceTag>>
  Notices: Override<PropsOf<typeof Notices>>
  Notice: Override<PropsOf<typeof Notice>>
  NoticeStrip: Override<PropsOf<typeof NoticeStrip>>
  MinigameCard: Override<PropsOf<typeof MinigameCard>>
  GameMenu: Override<PropsOf<typeof GameMenu>>
  SavesMenu: Override<PropsOf<typeof SavesMenu>>
  Backlog: Override<PropsOf<typeof Backlog>>
  ModManager: Override<PropsOf<typeof ModManager>>
  QuestLog: Override<PropsOf<typeof QuestLog>>
  Inventory: Override<PropsOf<typeof Inventory>>
  WardrobeCard: Override<PropsOf<typeof WardrobeCard>>
  StatusList: Override<PropsOf<typeof StatusList>>
  AchievementList: Override<PropsOf<typeof AchievementList>>
  AchievementsButton: Override<PropsOf<typeof AchievementsButton>>
  AchievementsPage: Override<PropsOf<typeof AchievementsPage>>
  CheatPanel: Override<PropsOf<typeof CheatPanel>>
  CheatsButton: Override<PropsOf<typeof CheatsButton>>
  UnlocksPanel: Override<PropsOf<typeof UnlocksPanel>>
  PanelHost: Override<PropsOf<typeof PanelHost>>
  ShopDialog: Override<PropsOf<typeof ShopDialog>>
  ShopCounter: Override<PropsOf<typeof ShopCounter>>
  JobBoard: Override<PropsOf<typeof JobBoard>>
  EntityTable: Override<PropsOf<typeof EntityTable>>
  InputFields: Override<PropsOf<typeof InputFields>>
  InputField: Override<PropsOf<typeof InputField>>
  DeviceButtons: Override<PropsOf<typeof DeviceButtons>>
  DeviceDialog: Override<PropsOf<typeof DeviceDialog>>
  DeviceScreen: Override<PropsOf<typeof DeviceScreen>>
  AppSection: Override<PropsOf<typeof AppSection>>
  MessagesSection: Override<PropsOf<typeof MessagesSection>>
  FeedSection: Override<PropsOf<typeof FeedSection>>
  DebugCard: Override<PropsOf<typeof DebugCard>>
  Picture: Override<PropsOf<typeof Picture>>
  Video: Override<PropsOf<typeof Video>>
  Stage: Override<PropsOf<typeof Stage>>
  Hotspot: Override<PropsOf<typeof Hotspot>>
  MediaViewer: Override<PropsOf<typeof MediaViewer>>
  Icon: Override<PropsOf<typeof Icon>>
  TitlePage: Override<PropsOf<typeof TitlePage>>
  SettingsPage: Override<PropsOf<typeof SettingsPage>>
  LoadPage: Override<PropsOf<typeof LoadPage>>
  CreditsPage: Override<PropsOf<typeof CreditsPage>>
  GatePage: Override<PropsOf<typeof GatePage>>
}>

/** What a game passes to make the UI its own. `GameProvider`, `GameShell` and `mountGame` all take these. */
export type UiOptions = {
  /** Replacements for built-in components, by name. */
  components?: Components
  /** Classes for parts, by `data-part` name. */
  classes?: Classes
  /** Drop every built-in class. The structure and the `data-part`s stay, for your own styles. */
  unstyled?: boolean
  /** Let the player click a picture or a video in the story to see it large. On if left out. */
  viewer?: boolean
  /**
   * Keyboard shortcuts: 1 to 9 for the choices or buttons on screen, Escape for
   * the menu, and any keys of the game's own in `map`. Off if left out. A
   * minigame's keys work either way.
   */
  keys?: boolean | KeyOptions
  /**
   * Play scene transitions and prose reveals (`view.transition`, reveal
   * beats). On if left out. `false` shows every scene and every line at once.
   * A player whose system asks for reduced motion gets them at once either way.
   */
  motion?: boolean
}

const NONE = {}
const UiContext = createContext<Required<UiOptions>>({ components: NONE, classes: NONE, unstyled: false, viewer: true, keys: false, motion: true })

/** Gives the components below it a game's `components`, `classes`, `unstyled`, `viewer`, `keys` and `motion`. `GameProvider` uses it. */
export function UiProvider({ components = NONE, classes = NONE, unstyled = false, viewer, keys, motion, children }: UiOptions & { children: ReactNode }) {
  const parent = useContext(UiContext)
  // Nested providers add to the outer one, so a screen can restyle just its own corner.
  const value = {
    components: parent.components === NONE ? components : { ...parent.components, ...components },
    classes: parent.classes === NONE ? classes : { ...parent.classes, ...classes },
    unstyled: unstyled || parent.unstyled,
    viewer: viewer ?? parent.viewer,
    keys: keys ?? parent.keys,
    motion: motion ?? parent.motion,
  }
  return <UiContext.Provider value={value}>{children}</UiContext.Provider>
}

/**
 * The attributes for one part: its `data-part` and its classes. `defaults` are
 * the built-in classes; `extra` is a `className` a caller passed, added last.
 */
export function usePart(name: PartKey, defaults: string, extra?: string): { 'data-part': PartKey; className: string } {
  const { classes, unstyled } = useContext(UiContext)
  const base = unstyled ? '' : defaults
  const custom = classes[name]
  const className = typeof custom === 'function' ? cn(custom(base), extra) : cn(base, custom, extra)
  return { 'data-part': name, className }
}

/** The `motion` option in effect: true unless the game turned transitions off. See `useMotion` for the player's setting too. */
export function useMotionOption(): boolean {
  return useContext(UiContext).motion
}

/** Whether the media viewer is on: `viewer` in the UI options. */
export function useViewerOn(): boolean {
  return useContext(UiContext).viewer
}

/** The `keys` option in effect: `false` when the game left it out. */
export function useKeysOption(): boolean | KeyOptions {
  return useContext(UiContext).keys
}

/** A built-in component that a game can replace by `name`. Used for every component the UI exports. */
export function overridable<P extends object>(name: keyof Components, Default: ComponentType<P>): ComponentType<P> {
  function Overridable(props: P) {
    const Custom = useContext(UiContext).components[name] as Override<P> | undefined
    return Custom ? <Custom {...props} Default={Default} /> : <Default {...props} />
  }
  Overridable.displayName = name
  return Overridable
}
