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
import type { Clock, StatList } from './sidebar.tsx'
import type { Beat, BeatGroup, Fold, Scene, SceneHeader } from './scene.tsx'
import type { InlineAction, Tip } from './inline.tsx'
import type { Hotspot, LayeredPicture } from './layered.tsx'
import type { Video } from './video.tsx'
import type { MediaViewer } from './viewer.tsx'
import type { ChoiceButton, ChoiceList, PriceTag } from './choices.tsx'
import type { Notice, Notices } from './notices.tsx'
import type { Picture } from './picture.tsx'
import type { Inventory } from './inventory.tsx'
import type { EntityTable } from './entities.tsx'
import type { InputField, InputFields } from './inputs.tsx'
import type { Backlog } from './backlog.tsx'
import type { SavesMenu } from './saves.tsx'
import type { GameMenu } from './menu.tsx'
import type { ModManager } from './mods.tsx'
import type { Icon } from './icon.tsx'
import type { CreditsPage, GatePage, LoadPage, SettingsPage, SplashPage, TitlePage } from './pages.tsx'
import type { MinigameCard } from './minigame.tsx'
import type { DiceOverlay, DiceRoll } from './dice.tsx'
import type { Countdown, Timers } from './timers.tsx'
import type { ChangeItem, Changes } from './changes.tsx'
import type { NoticeStrip } from './strip.tsx'
import type { KeyOptions } from './keys.tsx'
import type { PanelHost } from './panels.tsx'

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
  // Scenes
  'scene-transition',
  'scene',
  'scene-header',
  'scene-portrait',
  'scene-title',
  'scene-image',
  'beats',
  'beat',
  'speaker-name',
  'line',
  'line-portrait',
  'reveal',
  'inline-mail',
  'mail-header',
  'mail-body',
  'inline-prop',
  'inline-mono',
  'voice-replay',
  'group',
  'fold',
  'fold-summary',
  'fold-beats',
  // What the last command changed
  'changes',
  'change',
  'change-text',
  'change-label',
  // Inline actions, tooltips, inline pieces, bold and italics in the prose
  'inline-action',
  'tip',
  'tip-content',
  'inline-ui',
  'inline-modal',
  'bold',
  'italic',
  // Pictures, videos, layered pictures and the viewer
  'video',
  'picture',
  'picture-layer',
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
  // Dice rolls
  'dice',
  'dice-label',
  'dice-faces',
  'dice-face',
  'dice-plus',
  'dice-total',
  'dice-outcome',
  'dice-critical',
  'dice-overlay',
  'dice-dismiss',
  // Timers
  'timers',
  'timer',
  'timer-label',
  'timer-bar',
  'timer-left',
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
  // What you carry, and the entities' tables
  'inventory',
  'inventory-title',
  'thing',
  'thing-name',
  'thing-count',
  'thing-text',
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
  'credit-group',
  'credit-group-title',
  'credit-group-description',
  'credit-list',
  'credit',
  'credit-art',
  'credit-name',
  'credit-link',
  'credit-role',
  'credit-meta',
  'gate-page',
  'gate-title',
  'gate-text',
  'gate-buttons',
  'gate-confirm',
  'gate-decline',
  'splash-page',
  'splash-card',
  'splash-art',
  'splash-title',
  'splash-text',
  'splash-skip',
] as const

/**
 * The `data-part` names that plugin UIs add, as keys of an interface each UI augments. `classes` and `usePart` then
 * take them typed.
 *
 *   declare module '@ifloom/react' {
 *     interface PartNames { shop: true; good: true }
 *   }
 */
// oxlint-disable-next-line typescript/no-empty-interface, typescript/no-empty-object-type -- filled by augmentation
export interface PartNames {}

/** A `data-part` name, either one the React UI renders or one a plugin's UI adds through {@link PartNames}. */
// oxlint-disable-next-line typescript/no-redundant-type-constituents -- `never` here until a plugin's UI augments PartNames
export type PartKey = (typeof PART_KEYS)[number] | Extract<keyof PartNames, string>

/**
 * Tailwind classes for the UI's parts, by `data-part` name. A string merges over the built-in classes and wins where
 * they clash.
 *
 * A function gets the built-in classes and returns the ones to use, so `() => 'font-serif'` replaces them outright.
 */
export type Classes = Partial<Record<PartKey, string | ((defaults: string) => string)>>

/** A component that replaces a built-in one. It gets the same props, and the built-in component as `Default`. */
export type Override<P> = ComponentType<P & { Default: ComponentType<P> }>

type PropsOf<T> = T extends ComponentType<infer P> ? P : never

/**
 * The built-in components a game can replace, by name, each typed by the props it takes. A plugin's React UI adds its
 * own by augmenting this interface.
 *
 *   declare module '@ifloom/react' {
 *     interface OverridableComponents { ShopCounter: Override<ShopCounterProps> }
 *   }
 */
export interface OverridableComponents {
  /** The replacement for `Game`. */
  Game: Override<PropsOf<typeof Game>>
  /** The replacement for `Sidebar`. */
  Sidebar: Override<PropsOf<typeof Sidebar>>
  /** The replacement for `Story`. */
  Story: Override<PropsOf<typeof Story>>
  /** The replacement for `Overlay`. */
  Overlay: Override<PropsOf<typeof Overlay>>
  /** The replacement for `Section`. */
  Section: Override<PropsOf<typeof Section>>
  /** The replacement for `When`. */
  When: Override<PropsOf<typeof When>>
  /** The replacement for `Title`. */
  Title: Override<PropsOf<typeof Title>>
  /** The replacement for `Clock`. */
  Clock: Override<PropsOf<typeof Clock>>
  /** The replacement for `StatList`. */
  StatList: Override<PropsOf<typeof StatList>>
  /** The replacement for `RoomActions`. */
  RoomActions: Override<PropsOf<typeof RoomActions>>
  /** The replacement for `Scene`. */
  Scene: Override<PropsOf<typeof Scene>>
  /** The replacement for `Beat`. */
  Beat: Override<PropsOf<typeof Beat>>
  /** The replacement for `SceneHeader`. */
  SceneHeader: Override<PropsOf<typeof SceneHeader>>
  /** The replacement for `BeatGroup`. */
  BeatGroup: Override<PropsOf<typeof BeatGroup>>
  /** The replacement for `Fold`. */
  Fold: Override<PropsOf<typeof Fold>>
  /** The replacement for `InlineAction`. */
  InlineAction: Override<PropsOf<typeof InlineAction>>
  /** The replacement for `Tip`. */
  Tip: Override<PropsOf<typeof Tip>>
  /** The replacement for `ChoiceList`. */
  ChoiceList: Override<PropsOf<typeof ChoiceList>>
  /** The replacement for `ChoiceButton`. */
  ChoiceButton: Override<PropsOf<typeof ChoiceButton>>
  /** The replacement for `PriceTag`. */
  PriceTag: Override<PropsOf<typeof PriceTag>>
  /** The replacement for `Notices`. */
  Notices: Override<PropsOf<typeof Notices>>
  /** The replacement for `Notice`. */
  Notice: Override<PropsOf<typeof Notice>>
  /** The replacement for `NoticeStrip`. */
  NoticeStrip: Override<PropsOf<typeof NoticeStrip>>
  /** The replacement for `MinigameCard`. */
  MinigameCard: Override<PropsOf<typeof MinigameCard>>
  /** The replacement for `DiceRoll`. */
  DiceRoll: Override<PropsOf<typeof DiceRoll>>
  /** The replacement for `DiceOverlay`. */
  DiceOverlay: Override<PropsOf<typeof DiceOverlay>>
  /** The replacement for `Countdown`. */
  Countdown: Override<PropsOf<typeof Countdown>>
  /** The replacement for `Timers`. */
  Timers: Override<PropsOf<typeof Timers>>
  /** The replacement for `Changes`. */
  Changes: Override<PropsOf<typeof Changes>>
  /** The replacement for `ChangeItem`. */
  ChangeItem: Override<PropsOf<typeof ChangeItem>>
  /** The replacement for `GameMenu`. */
  GameMenu: Override<PropsOf<typeof GameMenu>>
  /** The replacement for `SavesMenu`. */
  SavesMenu: Override<PropsOf<typeof SavesMenu>>
  /** The replacement for `Backlog`. */
  Backlog: Override<PropsOf<typeof Backlog>>
  /** The replacement for `ModManager`. */
  ModManager: Override<PropsOf<typeof ModManager>>
  /** The replacement for `Inventory`. */
  Inventory: Override<PropsOf<typeof Inventory>>
  /** The replacement for `PanelHost`. */
  PanelHost: Override<PropsOf<typeof PanelHost>>
  /** The replacement for `EntityTable`. */
  EntityTable: Override<PropsOf<typeof EntityTable>>
  /** The replacement for `InputFields`. */
  InputFields: Override<PropsOf<typeof InputFields>>
  /** The replacement for `InputField`. */
  InputField: Override<PropsOf<typeof InputField>>
  /** The replacement for `Picture`. */
  Picture: Override<PropsOf<typeof Picture>>
  /** The replacement for `Video`. */
  Video: Override<PropsOf<typeof Video>>
  /** The replacement for `LayeredPicture`. */
  LayeredPicture: Override<PropsOf<typeof LayeredPicture>>
  /** The replacement for `Hotspot`. */
  Hotspot: Override<PropsOf<typeof Hotspot>>
  /** The replacement for `MediaViewer`. */
  MediaViewer: Override<PropsOf<typeof MediaViewer>>
  /** The replacement for `Icon`. */
  Icon: Override<PropsOf<typeof Icon>>
  /** The replacement for `TitlePage`. */
  TitlePage: Override<PropsOf<typeof TitlePage>>
  /** The replacement for `SettingsPage`. */
  SettingsPage: Override<PropsOf<typeof SettingsPage>>
  /** The replacement for `LoadPage`. */
  LoadPage: Override<PropsOf<typeof LoadPage>>
  /** The replacement for `CreditsPage`. */
  CreditsPage: Override<PropsOf<typeof CreditsPage>>
  /** The replacement for `GatePage`. */
  GatePage: Override<PropsOf<typeof GatePage>>
  /** The replacement for `SplashPage`. */
  SplashPage: Override<PropsOf<typeof SplashPage>>
}

/** Replacements for any of the {@link OverridableComponents}, by name. */
export type Components = Partial<OverridableComponents>

/** The options that change how the UI looks, part of {@link UiOptions}. They replace components and restyle parts. */
export type StyleOptions = {
  /** The game's replacements for built-in components, by name. */
  components?: Components
  /** The game's classes for the UI's parts, by `data-part` name. */
  classes?: Classes
  /** True to drop every built-in class, keeping the structure and the `data-part`s for your own styles. False if left out. */
  unstyled?: boolean
}

/**
 * The options that change how the UI behaves, part of {@link UiOptions}. They turn the media viewer, keyboard shortcuts
 * and motion on or off.
 */
export type BehaviourOptions = {
  /** True to let the player click a picture or a video in the story to see it large. True if left out. */
  viewer?: boolean
  /**
   * The keyboard shortcuts, 1 to 9 for the choices or actions on screen, Escape for the menu and the game's own keys in
   * `map`. Off if left out.
   *
   * A minigame's keys work either way.
   */
  keys?: boolean | KeyOptions
  /**
   * True to play scene transitions and prose reveals, the `ui.transition` and `ui.reveal` hints. True if left
   * out, and `false` shows every scene and every line at once.
   *
   * A player whose system asks for reduced motion sees them at once either way.
   */
  motion?: boolean
}

/**
 * The options that make the React UI a game's own, how it looks and how it behaves. `GameProvider`, `GameShell` and
 * `mountGame` all take them.
 */
export type UiOptions = StyleOptions & BehaviourOptions

const NONE = {}
const UiContext = createContext<Required<UiOptions>>({ components: NONE, classes: NONE, unstyled: false, viewer: true, keys: false, motion: true })

/**
 * Renders its children with a game's {@link UiOptions}. A provider inside another adds to the outer one's options, so a
 * screen can restyle its own corner.
 *
 * `GameProvider` renders one.
 */
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
 * Returns the `data-part` and `className` attributes for one part. `defaults` are its built-in classes, and `extra` is
 * a caller's `className`, added last.
 *
 * The game's `classes` for the part go over `defaults`, and `unstyled` drops `defaults`.
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

/**
 * Returns a component that renders `Default`, or the game's replacement registered under `name` in `components`. Every
 * component the UI exports is one.
 */
export function overridable<P extends object>(name: keyof OverridableComponents, Default: ComponentType<P>): ComponentType<P> {
  function Overridable(props: P) {
    const Custom = useContext(UiContext).components[name] as Override<P> | undefined
    return Custom ? <Custom {...props} Default={Default} /> : <Default {...props} />
  }
  Overridable.displayName = name
  return Overridable
}
