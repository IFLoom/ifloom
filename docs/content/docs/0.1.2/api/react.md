---
title: "@ifloom/react"
description: "Every export of @ifloom/react, the React UI: its signature and its fields."
---
Generated from the source of `@ifloom/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

- Components: [`DefaultLayout`](#defaultlayout), [`GameProvider`](#gameprovider), [`GameShell`](#gameshell), [`InlineImage`](#inlineimage), [`InlineMail`](#inlinemail), [`InlineModal`](#inlinemodal), [`InlineMono`](#inlinemono), [`InlineProp`](#inlineprop), [`InlineTrigger`](#inlinetrigger), [`KeepPicturesOn`](#keeppictureson), [`Plugins`](#plugins), [`StatGauge`](#statgauge), [`UiProvider`](#uiprovider), [`WithPages`](#withpages)
- Functions: [`assetUrl`](#asseturl), [`checkUiHints`](#checkuihints), [`mountGame`](#mountgame), [`poweredByIFLoom`](#poweredbyifloom), [`TextSize`](#textsize), [`useAudio`](#useaudio), [`useBacklog`](#usebacklog), [`useClock`](#useclock), [`useGame`](#usegame), [`useHolds`](#useholds), [`useMinigame`](#useminigame), [`useMods`](#usemods), [`useMotion`](#usemotion), [`usePage`](#usepage), [`usePart`](#usepart), [`usePicturesShown`](#usepicturesshown), [`usePluginUis`](#usepluginuis), [`useProfile`](#useprofile), [`useReducedMotion`](#usereducedmotion), [`useSaves`](#usesaves), [`useScene`](#usescene), [`useSetting`](#usesetting), [`useTimer`](#usetimer), [`useTimers`](#usetimers), [`useWords`](#usewords)
- Constants: [`Backlog`](#backlog), [`Beat`](#beat), [`BeatGroup`](#beatgroup), [`ChangeItem`](#changeitem), [`Changes`](#changes), [`ChoiceButton`](#choicebutton), [`ChoiceList`](#choicelist), [`Clock`](#clock), [`Countdown`](#countdown), [`CreditsPage`](#creditspage), [`DiceOverlay`](#diceoverlay), [`DiceRoll`](#diceroll), [`EntityTable`](#entitytable), [`Fold`](#fold), [`Game`](#game), [`GameMenu`](#gamemenu), [`GatePage`](#gatepage), [`Hotspot`](#hotspot), [`InlineAction`](#inlineaction), [`InputField`](#inputfield), [`InputFields`](#inputfields), [`LayeredPicture`](#layeredpicture), [`LoadPage`](#loadpage), [`MediaViewer`](#mediaviewer), [`MinigameCard`](#minigamecard), [`ModManager`](#modmanager), [`Notice`](#notice), [`Notices`](#notices), [`NoticeStrip`](#noticestrip), [`Overlay`](#overlay), [`PanelHost`](#panelhost), [`Picture`](#picture), [`PriceTag`](#pricetag), [`RoomActions`](#roomactions), [`SavesMenu`](#savesmenu), [`Scene`](#scene), [`SceneHeader`](#sceneheader), [`Section`](#section), [`SettingsPage`](#settingspage), [`Sidebar`](#sidebar), [`SplashPage`](#splashpage), [`StatList`](#statlist), [`Story`](#story), [`TEXT_SIZES`](#text_sizes), [`Timers`](#timers), [`Tip`](#tip), [`Title`](#title), [`TitlePage`](#titlepage), [`TRANSITIONS`](#transitions), [`Video`](#video), [`When`](#when)
- Types: [`BehaviourOptions`](#behaviouroptions), [`CheckUiOptions`](#checkuioptions), [`Classes`](#classes), [`ClockState`](#clockstate), [`Components`](#components), [`CountdownProps`](#countdownprops), [`DiceRollProps`](#dicerollprops), [`GameContextValue`](#gamecontextvalue), [`GameProps`](#gameprops), [`GameProviderProps`](#gameproviderprops), [`GameShellProps`](#gameshellprops), [`GateOptions`](#gateoptions), [`InlineComponent`](#inlinecomponent), [`InlineComponents`](#inlinecomponents), [`InlineProps`](#inlineprops), [`KeyOptions`](#keyoptions), [`MediaViewerProps`](#mediaviewerprops), [`MinigameControls`](#minigamecontrols), [`ModsOption`](#modsoption), [`ModsState`](#modsstate), [`MountOptions`](#mountoptions), [`OverridableComponents`](#overridablecomponents), [`Page`](#page), [`PageDef`](#pagedef), [`PagesOptions`](#pagesoptions), [`PageState`](#pagestate), [`PanelComponent`](#panelcomponent), [`PartKey`](#partkey), [`PartNames`](#partnames), [`PluginSectionComponent`](#pluginsectioncomponent), [`PluginSpot`](#pluginspot), [`Reveal`](#reveal), [`RevealBeat`](#revealbeat), [`RevealGroup`](#revealgroup), [`RevealPoint`](#revealpoint), [`SavesState`](#savesstate), [`Say`](#say), [`SceneRolls`](#scenerolls), [`SceneTiming`](#scenetiming), [`ScreenTransition`](#screentransition), [`SectionProps`](#sectionprops), [`SidebarProps`](#sidebarprops), [`SplashCard`](#splashcard), [`SplashOptions`](#splashoptions), [`StatDisplay`](#statdisplay), [`StoryProps`](#storyprops), [`StyleOptions`](#styleoptions), [`Transition`](#transition), [`TransitionName`](#transitionname), [`UiOptions`](#uioptions), [`UiStringKey`](#uistringkey), [`VideoProps`](#videoprops), [`ViewerMedia`](#viewermedia), [`Words`](#words)

## assetUrl

Function. Explained in [Components](/docs/0.1.2/reference/react/components#asseturl).

Returns the URL to load a file from, the data URL in the page when there is one, else the path unchanged. A leading
`./` is ignored in the lookup.

A build made with `ifloom build --inline-assets` puts the files from `art/` in the page as data URLs, under their
paths.

```ts shape
import { assetUrl } from '@ifloom/react'
function assetUrl(src: string): string
```

## Backlog

Const. Explained in [Components](/docs/0.1.2/reference/react/components#backlog).

Renders the backlog as the `backlog` part, the scenes the player has seen oldest first, each followed by the choice
made in it. It needs the runner's backlog on.

```ts shape
import { Backlog } from '@ifloom/react'
const Backlog: ComponentType<{ className?: string; }>
```

## Beat

Const. Explained in [Components](/docs/0.1.2/reference/react/components#beat).

Renders one beat of a scene's body, such as a paragraph, a spoken line or a picture. It's a `beat` part with
`data-beat` naming its type, or a `video` part for a video.

A past choice (`chose`) shows its label, small and set in. A picture whose block has `ui.tilt` sits at a slight
angle, and a picture or a clip opens in the `MediaViewer` when clicked, unless the viewer is off. A sound beat
renders nothing, and a spoken line with a voice gets a button to hear it again while the game's sound plays. Inline
actions and tooltips render as `InlineAction` and `Tip` buttons in the line, and letters, notes and signs are UI
pieces (`InlineMail`, `InlineProp`, `InlineMono`). Replace it in `components` to render some beats your own way and
pass the rest to `Default`.

```ts shape
import { Beat } from '@ifloom/react'
const Beat: ComponentType<{ beat: SceneBeat; }>
```

Uses: [`SceneBeat`](/docs/0.1.2/api/engine#scenebeat).

## BeatGroup

Const. Explained in [Components](/docs/0.1.2/reference/react/components#beatgroup).

Renders the beats of a body section with ui hints in one `group` part, so a game styles the section as one box.
`section` is the section's hints, and `children` its beats.

Each hint that's a string, a number or true/false becomes a `data-*` attribute, so `{ card: 'result' }` is
`data-card="result"`. Replace it in `components` to render a section your own way, and the beats in it still come in
on time.

```ts shape
import { BeatGroup } from '@ifloom/react'
const BeatGroup: ComponentType<{ section: BlockUi & { readonly [hint: string]: unknown; }; children: ReactNode; }>
```

Uses: [`BlockUi`](/docs/0.1.2/api/engine#blockui).

## BehaviourOptions

Type.

The options that change how the UI behaves, part of `UiOptions`. They turn the media viewer, keyboard shortcuts
and motion on or off.

```ts shape
import type { BehaviourOptions } from '@ifloom/react'
type BehaviourOptions = {
  viewer?: boolean
  keys?: boolean | KeyOptions
  motion?: boolean
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `viewer` | `boolean` | yes |  | True to let the player click a picture or a video in the story to see it large. True if left out. |
| `keys` | `boolean \|` [`KeyOptions`](#keyoptions) | yes |  | The keyboard shortcuts, 1 to 9 for the choices or actions on screen, Escape for the menu and the game's own keys in `map`. Off if left out. A minigame's keys work either way. |
| `motion` | `boolean` | yes |  | True to play scene transitions and prose reveals, the `ui.transition` and `ui.reveal` hints. True if left out, and `false` shows every scene and every line at once. A player whose system asks for reduced motion sees them at once either way. |

## ChangeItem

Const. Explained in [Components](/docs/0.1.2/reference/react/components#changeitem).

Renders one stat change from `view.changes` as a `change` part, its signed text in the stat's format (`change-text`)
and then the change's `name` (`change-label`) when the view gives one.

The name is an entity's name, or the stat's label when its format doesn't say what it is. The part carries
`data-stat`, `data-of` for an entity's stat and `data-dir="up"` or `"down"`.

```ts shape
import { ChangeItem } from '@ifloom/react'
const ChangeItem: ComponentType<{ change: ChangeView; }>
```

Uses: [`ChangeView`](/docs/0.1.2/api/engine#changeview).

## Changes

Const. Explained in [Components](/docs/0.1.2/reference/react/components#changes).

Renders the stats the last command changed, `view.changes`, as a `changes` list of `ChangeItem`s, and nothing when
none changed. The default layout leaves it out, so place it in yours, such as after `<Scene />`.

```ts shape
import { Changes } from '@ifloom/react'
const Changes: ComponentType<{ className?: string; }>
```

## checkUiHints

Function. Explained in [Presentation hints](/docs/0.1.2/reference/react/hints#checkuihints).

Returns each problem with a game's `ui` hints and UI pieces for the React UI, as `where: what`. An empty list means
there are none.

It reports a hint the React UI doesn't read on that target, such as a typo or another UI's, and each value a hint's
declaration finds wrong. Examples are a transition the game doesn't have, a `timer` that isn't one of the game's
timers, pips on a stat with a range over 20, or a `hue` outside 0 to 360.

It also reads the prose and the words in place for UI pieces, `[[ui:name|…]]`. It reports a name that's neither
built in, nor a plugin UI's, nor one of the game's own `inline` components, which would show only its words. It runs
each built-in piece's check, so a `modal` with no prose key is reported. A game's own component with a built-in
name reads its arguments its own way, so the check skips it.

```ts shape
import { checkUiHints } from '@ifloom/react'
function checkUiHints(game: Game, options?: CheckUiOptions): string[]
```

Uses: [`Game`](/docs/0.1.2/api/engine#game), [`CheckUiOptions`](#checkuioptions).

## CheckUiOptions

Type. Explained in [Presentation hints](/docs/0.1.2/reference/react/hints#checkuioptions).

Settings for `checkUiHints`. Each is optional.

```ts shape
import type { CheckUiOptions } from '@ifloom/react'
type CheckUiOptions = {
  plugins?: readonly PluginUi[]
  inline?: InlineComponents
  allow?: readonly string[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `plugins` | `readonly` [`PluginUi[]`](/docs/0.1.2/api/react-kit#pluginui) | yes |  | The plugin UIs the game uses, the same list it gives `mountGame`. The check accepts their `hints` and UI pieces. |
| `inline` | [`InlineComponents`](#inlinecomponents) | yes |  | The game's own components for UI pieces, the same object you give `mountGame` or the `GameProvider`. |
| `allow` | `readonly string[]` | yes |  | The hint and UI piece names the check never reports, such as `['mood']` for another UI's. |

## ChoiceButton

Const. Explained in [Components](/docs/0.1.2/reference/react/components#choicebutton).

Renders a choice or an action from its `RenderedChoice` as a `choice` button with its label and price. A disabled
button shows its reason on the button itself, not on hover.

A warning, the reason a plugin's guard will refuse it softly such as running past dawn, is marked and written under
it, and so is an irreversible note. With `keys` on, a numbered choice shows its number key.

```ts shape
import { ChoiceButton } from '@ifloom/react'
const ChoiceButton: ComponentType<{ choice: RenderedChoice; className?: string; }>
```

Uses: [`RenderedChoice`](/docs/0.1.2/api/engine#renderedchoice).

## ChoiceList

Const. Explained in [Components](/docs/0.1.2/reference/react/components#choicelist).

Renders a list of choices or actions as `ChoiceButton`s, one per row, and nothing for an empty list. `part` names it
`'choices'`, or `'actions'` for the room's actions.

```ts shape
import { ChoiceList } from '@ifloom/react'
const ChoiceList: ComponentType<{ choices: RenderedChoice[]; className?: string; part?: 'actions' | 'choices'; }>
```

Uses: [`RenderedChoice`](/docs/0.1.2/api/engine#renderedchoice).

## Classes

Type. Explained in [Components](/docs/0.1.2/reference/react/components#classes).

Tailwind classes for the UI's parts, by `data-part` name. A string merges over the built-in classes and wins where
they clash.

A function gets the built-in classes and returns the ones to use, so `() => 'font-serif'` replaces them outright.

```ts shape
import type { Classes } from '@ifloom/react'
type Classes = {
  entities?: string | ((defaults: string) => string)
  actions?: string | ((defaults: string) => string)
  inputs?: string | ((defaults: string) => string)
  settings?: string | ((defaults: string) => string)
  stats?: string | ((defaults: string) => string)
  timers?: string | ((defaults: string) => string)
  changes?: string | ((defaults: string) => string)
  setting?: string | ((defaults: string) => string)
  stat?: string | ((defaults: string) => string)
  scene?: string | ((defaults: string) => string)
  timer?: string | ((defaults: string) => string)
  achievements?: string | ((defaults: string) => string)
  achievement?: string | ((defaults: string) => string)
  button?: string | ((defaults: string) => string)
  picture?: string | ((defaults: string) => string)
  video?: string | ((defaults: string) => string)
  input?: string | ((defaults: string) => string)
  choice?: string | ((defaults: string) => string)
  minigame?: string | ((defaults: string) => string)
  channel?: string | ((defaults: string) => string)
  dice?: string | ((defaults: string) => string)
  bold?: string | ((defaults: string) => string)
  devices?: string | ((defaults: string) => string)
  app?: string | ((defaults: string) => string)
  feed?: string | ((defaults: string) => string)
  post?: string | ((defaults: string) => string)
  jobs?: string | ((defaults: string) => string)
  job?: string | ((defaults: string) => string)
  message?: string | ((defaults: string) => string)
  location?: string | ((defaults: string) => string)
  exits?: string | ((defaults: string) => string)
  quests?: string | ((defaults: string) => string)
  quest?: string | ((defaults: string) => string)
  shop?: string | ((defaults: string) => string)
  goods?: string | ((defaults: string) => string)
  statuses?: string | ((defaults: string) => string)
  status?: string | ((defaults: string) => string)
  unlocks?: string | ((defaults: string) => string)
  unlock?: string | ((defaults: string) => string)
  cheat?: string | ((defaults: string) => string)
  cheats?: string | ((defaults: string) => string)
  wardrobe?: string | ((defaults: string) => string)
  inventory?: string | ((defaults: string) => string)
  debug?: string | ((defaults: string) => string)
  credits?: string | ((defaults: string) => string)
  title?: string | ((defaults: string) => string)
  viewer?: string | ((defaults: string) => string)
  mods?: string | ((defaults: string) => string)
  page?: string | ((defaults: string) => string)
  sidebar?: string | ((defaults: string) => string)
  story?: string | ((defaults: string) => string)
  overlay?: string | ((defaults: string) => string)
  clock?: string | ((defaults: string) => string)
  section?: string | ((defaults: string) => string)
  'section-title'?: string | ((defaults: string) => string)
  'section-toggle'?: string | ((defaults: string) => string)
  'section-body'?: string | ((defaults: string) => string)
  'section-badge'?: string | ((defaults: string) => string)
  'top-bar'?: string | ((defaults: string) => string)
  'top-bar-title'?: string | ((defaults: string) => string)
  'drawer-button'?: string | ((defaults: string) => string)
  drawer?: string | ((defaults: string) => string)
  'drawer-overlay'?: string | ((defaults: string) => string)
  'stat-label'?: string | ((defaults: string) => string)
  'stat-value'?: string | ((defaults: string) => string)
  'stat-level'?: string | ((defaults: string) => string)
  'stat-progress'?: string | ((defaults: string) => string)
  'stat-bar'?: string | ((defaults: string) => string)
  'stat-pips'?: string | ((defaults: string) => string)
  'stat-pip'?: string | ((defaults: string) => string)
  'scene-transition'?: string | ((defaults: string) => string)
  'scene-header'?: string | ((defaults: string) => string)
  'scene-portrait'?: string | ((defaults: string) => string)
  'scene-title'?: string | ((defaults: string) => string)
  'scene-image'?: string | ((defaults: string) => string)
  beats?: string | ((defaults: string) => string)
  beat?: string | ((defaults: string) => string)
  'speaker-name'?: string | ((defaults: string) => string)
  line?: string | ((defaults: string) => string)
  'line-portrait'?: string | ((defaults: string) => string)
  reveal?: string | ((defaults: string) => string)
  'inline-mail'?: string | ((defaults: string) => string)
  'mail-header'?: string | ((defaults: string) => string)
  'mail-body'?: string | ((defaults: string) => string)
  'inline-prop'?: string | ((defaults: string) => string)
  'inline-mono'?: string | ((defaults: string) => string)
  'voice-replay'?: string | ((defaults: string) => string)
  group?: string | ((defaults: string) => string)
  fold?: string | ((defaults: string) => string)
  'fold-summary'?: string | ((defaults: string) => string)
  'fold-beats'?: string | ((defaults: string) => string)
  change?: string | ((defaults: string) => string)
  'change-text'?: string | ((defaults: string) => string)
  'change-label'?: string | ((defaults: string) => string)
  'inline-action'?: string | ((defaults: string) => string)
  tip?: string | ((defaults: string) => string)
  'tip-content'?: string | ((defaults: string) => string)
  'inline-ui'?: string | ((defaults: string) => string)
  'inline-modal'?: string | ((defaults: string) => string)
  italic?: string | ((defaults: string) => string)
  'picture-layer'?: string | ((defaults: string) => string)
  hotspot?: string | ((defaults: string) => string)
  'hotspot-warning'?: string | ((defaults: string) => string)
  'viewer-open'?: string | ((defaults: string) => string)
  'viewer-close'?: string | ((defaults: string) => string)
  choices?: string | ((defaults: string) => string)
  'choice-key'?: string | ((defaults: string) => string)
  'choice-label'?: string | ((defaults: string) => string)
  'choice-warning'?: string | ((defaults: string) => string)
  'choice-price'?: string | ((defaults: string) => string)
  'choice-irreversible'?: string | ((defaults: string) => string)
  'choice-reason'?: string | ((defaults: string) => string)
  badge?: string | ((defaults: string) => string)
  notices?: string | ((defaults: string) => string)
  'notices-more'?: string | ((defaults: string) => string)
  notice?: string | ((defaults: string) => string)
  'notice-image'?: string | ((defaults: string) => string)
  'notice-title'?: string | ((defaults: string) => string)
  'notice-text'?: string | ((defaults: string) => string)
  'notice-dismiss'?: string | ((defaults: string) => string)
  'notice-strip'?: string | ((defaults: string) => string)
  'notice-strip-item'?: string | ((defaults: string) => string)
  'dice-label'?: string | ((defaults: string) => string)
  'dice-faces'?: string | ((defaults: string) => string)
  'dice-face'?: string | ((defaults: string) => string)
  'dice-plus'?: string | ((defaults: string) => string)
  'dice-total'?: string | ((defaults: string) => string)
  'dice-outcome'?: string | ((defaults: string) => string)
  'dice-critical'?: string | ((defaults: string) => string)
  'dice-overlay'?: string | ((defaults: string) => string)
  'dice-dismiss'?: string | ((defaults: string) => string)
  'timer-label'?: string | ((defaults: string) => string)
  'timer-bar'?: string | ((defaults: string) => string)
  'timer-left'?: string | ((defaults: string) => string)
  'minigame-title'?: string | ((defaults: string) => string)
  'minigame-state'?: string | ((defaults: string) => string)
  'minigame-timer'?: string | ((defaults: string) => string)
  'minigame-inputs'?: string | ((defaults: string) => string)
  'minigame-input'?: string | ((defaults: string) => string)
  menu?: string | ((defaults: string) => string)
  'menu-button'?: string | ((defaults: string) => string)
  dialog?: string | ((defaults: string) => string)
  'dialog-overlay'?: string | ((defaults: string) => string)
  'dialog-title'?: string | ((defaults: string) => string)
  'dialog-close'?: string | ((defaults: string) => string)
  saves?: string | ((defaults: string) => string)
  'saves-actions'?: string | ((defaults: string) => string)
  'save-slot'?: string | ((defaults: string) => string)
  'save-name'?: string | ((defaults: string) => string)
  'save-details'?: string | ((defaults: string) => string)
  'saves-message'?: string | ((defaults: string) => string)
  'saves-blocked'?: string | ((defaults: string) => string)
  'saves-empty'?: string | ((defaults: string) => string)
  'file-button'?: string | ((defaults: string) => string)
  backlog?: string | ((defaults: string) => string)
  'backlog-entry'?: string | ((defaults: string) => string)
  'backlog-title'?: string | ((defaults: string) => string)
  'backlog-choice'?: string | ((defaults: string) => string)
  'backlog-empty'?: string | ((defaults: string) => string)
  mod?: string | ((defaults: string) => string)
  'mod-name'?: string | ((defaults: string) => string)
  'mod-version'?: string | ((defaults: string) => string)
  'mod-state'?: string | ((defaults: string) => string)
  'mod-text'?: string | ((defaults: string) => string)
  'mod-problem'?: string | ((defaults: string) => string)
  'mods-message'?: string | ((defaults: string) => string)
  'mods-empty'?: string | ((defaults: string) => string)
  'mods-restart'?: string | ((defaults: string) => string)
  'mods-changed'?: string | ((defaults: string) => string)
  'entity-table'?: string | ((defaults: string) => string)
  'entity-heading'?: string | ((defaults: string) => string)
  'entity-columns'?: string | ((defaults: string) => string)
  'entity-column'?: string | ((defaults: string) => string)
  'entity-row'?: string | ((defaults: string) => string)
  'entity-name'?: string | ((defaults: string) => string)
  'entity-image'?: string | ((defaults: string) => string)
  'entity-desc'?: string | ((defaults: string) => string)
  'entity-value'?: string | ((defaults: string) => string)
  'input-label'?: string | ((defaults: string) => string)
  'input-field'?: string | ((defaults: string) => string)
  'input-options'?: string | ((defaults: string) => string)
  'input-submit'?: string | ((defaults: string) => string)
  'input-error'?: string | ((defaults: string) => string)
  'title-page'?: string | ((defaults: string) => string)
  'title-art'?: string | ((defaults: string) => string)
  'title-name'?: string | ((defaults: string) => string)
  'title-subtitle'?: string | ((defaults: string) => string)
  'title-buttons'?: string | ((defaults: string) => string)
  'title-button'?: string | ((defaults: string) => string)
  'page-heading'?: string | ((defaults: string) => string)
  'page-back'?: string | ((defaults: string) => string)
  'settings-page'?: string | ((defaults: string) => string)
  'setting-label'?: string | ((defaults: string) => string)
  'setting-control'?: string | ((defaults: string) => string)
  'setting-value'?: string | ((defaults: string) => string)
  'settings-empty'?: string | ((defaults: string) => string)
  'settings-message'?: string | ((defaults: string) => string)
  'settings-mods'?: string | ((defaults: string) => string)
  'mods-title'?: string | ((defaults: string) => string)
  'mods-hint'?: string | ((defaults: string) => string)
  'load-page'?: string | ((defaults: string) => string)
  'credits-page'?: string | ((defaults: string) => string)
  'credit-group'?: string | ((defaults: string) => string)
  'credit-group-title'?: string | ((defaults: string) => string)
  'credit-group-description'?: string | ((defaults: string) => string)
  'credit-list'?: string | ((defaults: string) => string)
  credit?: string | ((defaults: string) => string)
  'credit-art'?: string | ((defaults: string) => string)
  'credit-name'?: string | ((defaults: string) => string)
  'credit-link'?: string | ((defaults: string) => string)
  'credit-role'?: string | ((defaults: string) => string)
  'credit-meta'?: string | ((defaults: string) => string)
  'gate-page'?: string | ((defaults: string) => string)
  'gate-title'?: string | ((defaults: string) => string)
  'gate-text'?: string | ((defaults: string) => string)
  'gate-buttons'?: string | ((defaults: string) => string)
  'gate-confirm'?: string | ((defaults: string) => string)
  'gate-decline'?: string | ((defaults: string) => string)
  'splash-page'?: string | ((defaults: string) => string)
  'splash-card'?: string | ((defaults: string) => string)
  'splash-art'?: string | ((defaults: string) => string)
  'splash-title'?: string | ((defaults: string) => string)
  'splash-text'?: string | ((defaults: string) => string)
  'splash-skip'?: string | ((defaults: string) => string)
  'splash-link'?: string | ((defaults: string) => string)
  'achievement-earned'?: string | ((defaults: string) => string)
  'achievement-image'?: string | ((defaults: string) => string)
  'achievement-progress'?: string | ((defaults: string) => string)
  'achievement-progress-text'?: string | ((defaults: string) => string)
  'achievement-text'?: string | ((defaults: string) => string)
  'achievement-title'?: string | ((defaults: string) => string)
  'achievements-button'?: string | ((defaults: string) => string)
  'achievements-count'?: string | ((defaults: string) => string)
  'achievements-empty'?: string | ((defaults: string) => string)
  'achievements-title'?: string | ((defaults: string) => string)
  'achievements-page'?: string | ((defaults: string) => string)
  people?: string | ((defaults: string) => string)
  person?: string | ((defaults: string) => string)
  'person-actions'?: string | ((defaults: string) => string)
  'person-desc'?: string | ((defaults: string) => string)
  'person-name'?: string | ((defaults: string) => string)
  'person-portrait'?: string | ((defaults: string) => string)
  relationship?: string | ((defaults: string) => string)
  'relationship-header'?: string | ((defaults: string) => string)
  'relationship-stats'?: string | ((defaults: string) => string)
  relationships?: string | ((defaults: string) => string)
  'debug-error'?: string | ((defaults: string) => string)
  'debug-field'?: string | ((defaults: string) => string)
  'debug-form'?: string | ((defaults: string) => string)
  'debug-header'?: string | ((defaults: string) => string)
  'debug-heading'?: string | ((defaults: string) => string)
  'debug-label'?: string | ((defaults: string) => string)
  'debug-list'?: string | ((defaults: string) => string)
  'debug-log'?: string | ((defaults: string) => string)
  'debug-section'?: string | ((defaults: string) => string)
  'debug-seed'?: string | ((defaults: string) => string)
  'debug-state'?: string | ((defaults: string) => string)
  'debug-title'?: string | ((defaults: string) => string)
  'app-back'?: string | ((defaults: string) => string)
  'app-button'?: string | ((defaults: string) => string)
  'app-entries'?: string | ((defaults: string) => string)
  'app-entry'?: string | ((defaults: string) => string)
  'app-entry-image'?: string | ((defaults: string) => string)
  'app-entry-text'?: string | ((defaults: string) => string)
  'app-entry-title'?: string | ((defaults: string) => string)
  'app-header'?: string | ((defaults: string) => string)
  'app-icon'?: string | ((defaults: string) => string)
  'app-launcher'?: string | ((defaults: string) => string)
  'app-prose'?: string | ((defaults: string) => string)
  'app-title'?: string | ((defaults: string) => string)
  'device-badge'?: string | ((defaults: string) => string)
  'device-button'?: string | ((defaults: string) => string)
  'device-screen'?: string | ((defaults: string) => string)
  'app-badge'?: string | ((defaults: string) => string)
  'post-author'?: string | ((defaults: string) => string)
  'post-comment'?: string | ((defaults: string) => string)
  'post-comment-name'?: string | ((defaults: string) => string)
  'post-image'?: string | ((defaults: string) => string)
  'post-meta'?: string | ((defaults: string) => string)
  'post-portrait'?: string | ((defaults: string) => string)
  'post-text'?: string | ((defaults: string) => string)
  'inventory-title'?: string | ((defaults: string) => string)
  thing?: string | ((defaults: string) => string)
  'thing-name'?: string | ((defaults: string) => string)
  'thing-count'?: string | ((defaults: string) => string)
  'thing-text'?: string | ((defaults: string) => string)
  'thing-drop'?: string | ((defaults: string) => string)
  'job-actions'?: string | ((defaults: string) => string)
  'job-details'?: string | ((defaults: string) => string)
  'job-fired'?: string | ((defaults: string) => string)
  'job-next'?: string | ((defaults: string) => string)
  'job-pay'?: string | ((defaults: string) => string)
  'job-rank'?: string | ((defaults: string) => string)
  'job-record'?: string | ((defaults: string) => string)
  'job-shift'?: string | ((defaults: string) => string)
  'job-text'?: string | ((defaults: string) => string)
  'job-title'?: string | ((defaults: string) => string)
  'jobs-title'?: string | ((defaults: string) => string)
  bubble?: string | ((defaults: string) => string)
  conversation?: string | ((defaults: string) => string)
  'conversation-last'?: string | ((defaults: string) => string)
  'conversation-name'?: string | ((defaults: string) => string)
  'conversation-portrait'?: string | ((defaults: string) => string)
  'conversation-unread'?: string | ((defaults: string) => string)
  conversations?: string | ((defaults: string) => string)
  'messages-empty'?: string | ((defaults: string) => string)
  thread?: string | ((defaults: string) => string)
  'thread-back'?: string | ((defaults: string) => string)
  'thread-portrait'?: string | ((defaults: string) => string)
  'thread-title'?: string | ((defaults: string) => string)
  typing?: string | ((defaults: string) => string)
  exit?: string | ((defaults: string) => string)
  'location-name'?: string | ((defaults: string) => string)
  'location-text'?: string | ((defaults: string) => string)
  'location-thing'?: string | ((defaults: string) => string)
  'location-thing-name'?: string | ((defaults: string) => string)
  'location-thing-pick'?: string | ((defaults: string) => string)
  'location-things'?: string | ((defaults: string) => string)
  'quest-done'?: string | ((defaults: string) => string)
  'quest-hint'?: string | ((defaults: string) => string)
  'quest-stage'?: string | ((defaults: string) => string)
  'quest-summary'?: string | ((defaults: string) => string)
  'quest-title'?: string | ((defaults: string) => string)
  'quests-done'?: string | ((defaults: string) => string)
  'quests-title'?: string | ((defaults: string) => string)
  'shop-closed'?: string | ((defaults: string) => string)
  'shop-empty'?: string | ((defaults: string) => string)
  good?: string | ((defaults: string) => string)
  'good-name'?: string | ((defaults: string) => string)
  'good-desc'?: string | ((defaults: string) => string)
  'good-image'?: string | ((defaults: string) => string)
  'good-details'?: string | ((defaults: string) => string)
  'good-off'?: string | ((defaults: string) => string)
  'good-full-price'?: string | ((defaults: string) => string)
  'good-stock'?: string | ((defaults: string) => string)
  'good-owned'?: string | ((defaults: string) => string)
  'good-actions'?: string | ((defaults: string) => string)
  'status-label'?: string | ((defaults: string) => string)
  'status-modifiers'?: string | ((defaults: string) => string)
  'status-stacks'?: string | ((defaults: string) => string)
  'status-summary'?: string | ((defaults: string) => string)
  'status-turns'?: string | ((defaults: string) => string)
  'statuses-title'?: string | ((defaults: string) => string)
  'cheat-text'?: string | ((defaults: string) => string)
  'cheat-used'?: string | ((defaults: string) => string)
  'cheats-button'?: string | ((defaults: string) => string)
  'cheats-group'?: string | ((defaults: string) => string)
  'cheats-group-title'?: string | ((defaults: string) => string)
  'unlock-form'?: string | ((defaults: string) => string)
  'unlock-input'?: string | ((defaults: string) => string)
  'unlock-name'?: string | ((defaults: string) => string)
  'unlock-problem'?: string | ((defaults: string) => string)
  'unlock-state'?: string | ((defaults: string) => string)
  'unlock-text'?: string | ((defaults: string) => string)
  'unlocks-entered'?: string | ((defaults: string) => string)
  'unlocks-list'?: string | ((defaults: string) => string)
  'unlocks-message'?: string | ((defaults: string) => string)
  'unlocks-title'?: string | ((defaults: string) => string)
  'wardrobe-slot'?: string | ((defaults: string) => string)
  'wardrobe-slot-name'?: string | ((defaults: string) => string)
  'wardrobe-title'?: string | ((defaults: string) => string)
  'wardrobe-worn'?: string | ((defaults: string) => string)
  // …
}
```

Its fields are the keys of `Partial<Record<PartKey, string | ((defaults: string) => string)>>`, so they grow when a game or a plugin adds to those.

## Clock

Const. Explained in [Components](/docs/0.1.2/reference/react/components#clock).

Renders the game's time from `view.when` as the `clock` part, and nothing when no plugin writes one. The calendar
plugin's UI has fuller parts.

```ts shape
import { Clock } from '@ifloom/react'
const Clock: ComponentType<object>
```

## ClockState

Type.

The game's time that `useClock` returns.

```ts shape
import type { ClockState } from '@ifloom/react'
type ClockState = {
  when: string | null
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `when` | `string \| null` |  |  | The time line the plugins' `label`s write, `view.when`, such as "Day 3 · Wednesday morning". It's null when none writes one. |

## Components

Type. Explained in [Components](/docs/0.1.2/reference/react/components#components).

Replacements for any of the `OverridableComponents`, by name.

```ts shape
import type { Components } from '@ifloom/react'
type Components = {
  Game?: Override<GameProps> | undefined
  Sidebar?: Override<SidebarProps> | undefined
  Story?: Override<StoryProps> | undefined
  Overlay?: Override<{ className?: string; children?: ReactNode; }> | undefined
  Section?: Override<SectionProps> | undefined
  When?: Override<{ condition: Condition; children?: ReactNode; }> | undefined
  Title?: Override<{ className?: string; }> | undefined
  Clock?: Override<object> | undefined
  StatList?: Override<object> | undefined
  RoomActions?: Override<{ className?: string; }> | undefined
  Scene?: Override<{ className?: string; }> | undefined
  Beat?: Override<{ beat: SceneBeat; }> | undefined
  SceneHeader?: Override<{ scene: { id: string | null; key: string; title: string; body: string; beats: SceneBeat[]; fresh: number; tags: string[]; speaker: SpeakerView | null; image: string | null; picture: PictureView | null; choices: RenderedChoice[]; ui?: Ui<SceneUi>; }; }> | undefined
  BeatGroup?: Override<{ section: BlockUi & { readonly [hint: string]: unknown; }; children: ReactNode; }> | undefined
  Fold?: Override<{ label: string; children: ReactNode; }> | undefined
  InlineAction?: Override<{ text: string; choice: RenderedChoice; className?: string; }> | undefined
  Tip?: Override<{ text: string; tip: string; className?: string; }> | undefined
  ChoiceList?: Override<{ choices: RenderedChoice[]; className?: string; part?: 'actions' | 'choices'; }> | undefined
  ChoiceButton?: Override<{ choice: RenderedChoice; className?: string; }> | undefined
  PriceTag?: Override<{ price: Price; className?: string; }> | undefined
  Notices?: Override<{ className?: string; limit?: number; }> | undefined
  Notice?: Override<{ notice: NoticeView; }> | undefined
  NoticeStrip?: Override<{ className?: string; }> | undefined
  MinigameCard?: Override<{ className?: string; }> | undefined
  DiceRoll?: Override<DiceRollProps> | undefined
  DiceOverlay?: Override<{ rolls: readonly Roll[]; className?: string; }> | undefined
  Countdown?: Override<CountdownProps> | undefined
  Timers?: Override<{ className?: string; }> | undefined
  Changes?: Override<{ className?: string; }> | undefined
  ChangeItem?: Override<{ change: ChangeView; }> | undefined
  GameMenu?: Override<{ className?: string; }> | undefined
  SavesMenu?: Override<{ className?: string; onLoaded?: (() => void); }> | undefined
  Backlog?: Override<{ className?: string; }> | undefined
  ModManager?: Override<{ className?: string; }> | undefined
  PanelHost?: Override<object> | undefined
  EntityTable?: Override<{ kinds?: string[]; className?: string; }> | undefined
  InputFields?: Override<{ className?: string; }> | undefined
  InputField?: Override<{ input: InputView; }> | undefined
  Picture?: Override<ClassAttributes<HTMLImageElement> & ImgHTMLAttributes<HTMLImageElement> & { 'data-part'?: string; }> | undefined
  Video?: Override<VideoProps | (Omit<DetailedHTMLProps<VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement>, 'src' | 'poster' | 'autoPlay' | 'loop' | 'muted' | 'controls'> & { src: string; poster?: string; alt?: string; autoplay: boolean; loop: boolean; muted: boolean; controls: boolean; })> | undefined
  LayeredPicture?: Override<{ picture: PictureView; className?: string; }> | undefined
  Hotspot?: Override<{ hotspot: HotspotView; }> | undefined
  MediaViewer?: Override<MediaViewerProps> | undefined
  Icon?: Override<{ name: IconName; label?: string; }> | undefined
  TitlePage?: Override<{ className?: string; }> | undefined
  SettingsPage?: Override<{ className?: string; }> | undefined
  LoadPage?: Override<{ className?: string; }> | undefined
  CreditsPage?: Override<{ className?: string; }> | undefined
  GatePage?: Override<{ className?: string; }> | undefined
  SplashPage?: Override<{ className?: string; }> | undefined
  // …
}
```

Plugins add fields of their own to it, which their pages list.

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `Game` | [`Override`](/docs/0.1.2/api/react-kit#override)`<`[`GameProps`](#gameprops)`> \| undefined` | yes |  | The replacement for `Game`. |
| `Sidebar` | [`Override`](/docs/0.1.2/api/react-kit#override)`<`[`SidebarProps`](#sidebarprops)`> \| undefined` | yes |  | The replacement for `Sidebar`. |
| `Story` | [`Override`](/docs/0.1.2/api/react-kit#override)`<`[`StoryProps`](#storyprops)`> \| undefined` | yes |  | The replacement for `Story`. |
| `Overlay` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; children?: ReactNode; }> \| undefined` | yes |  | The replacement for `Overlay`. |
| `Section` | [`Override`](/docs/0.1.2/api/react-kit#override)`<`[`SectionProps`](#sectionprops)`> \| undefined` | yes |  | The replacement for `Section`. |
| `When` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ condition:` [`Condition`](/docs/0.1.2/api/engine#condition)`; children?: ReactNode; }> \| undefined` | yes |  | The replacement for `When`. |
| `Title` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }> \| undefined` | yes |  | The replacement for `Title`. |
| `Clock` | [`Override`](/docs/0.1.2/api/react-kit#override)`<object> \| undefined` | yes |  | The replacement for `Clock`. |
| `StatList` | [`Override`](/docs/0.1.2/api/react-kit#override)`<object> \| undefined` | yes |  | The replacement for `StatList`. |
| `RoomActions` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }> \| undefined` | yes |  | The replacement for `RoomActions`. |
| `Scene` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }> \| undefined` | yes |  | The replacement for `Scene`. |
| `Beat` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ beat:` [`SceneBeat`](/docs/0.1.2/api/engine#scenebeat)`; }> \| undefined` | yes |  | The replacement for `Beat`. |
| `SceneHeader` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ scene: { id: string \| null; key: string; title: string; body: string; beats:…` | yes |  | The replacement for `SceneHeader`. |
| `BeatGroup` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ section:` [`BlockUi`](/docs/0.1.2/api/engine#blockui) `& { readonly [hint: string]: unknown; }; children: ReactNode;…` | yes |  | The replacement for `BeatGroup`. |
| `Fold` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ label: string; children: ReactNode; }> \| undefined` | yes |  | The replacement for `Fold`. |
| `InlineAction` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ text: string; choice:` [`RenderedChoice`](/docs/0.1.2/api/engine#renderedchoice)`; className?: string; }> \| undefined` | yes |  | The replacement for `InlineAction`. |
| `Tip` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ text: string; tip: string; className?: string; }> \| undefined` | yes |  | The replacement for `Tip`. |
| `ChoiceList` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ choices:` [`RenderedChoice[]`](/docs/0.1.2/api/engine#renderedchoice)`; className?: string; part?: 'actions' \| 'choices'; }…` | yes |  | The replacement for `ChoiceList`. |
| `ChoiceButton` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ choice:` [`RenderedChoice`](/docs/0.1.2/api/engine#renderedchoice)`; className?: string; }> \| undefined` | yes |  | The replacement for `ChoiceButton`. |
| `PriceTag` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ price:` [`Price`](/docs/0.1.2/api/engine#price)`; className?: string; }> \| undefined` | yes |  | The replacement for `PriceTag`. |
| `Notices` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; limit?: number; }> \| undefined` | yes |  | The replacement for `Notices`. |
| `Notice` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ notice:` [`NoticeView`](/docs/0.1.2/api/engine#noticeview)`; }> \| undefined` | yes |  | The replacement for `Notice`. |
| `NoticeStrip` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }> \| undefined` | yes |  | The replacement for `NoticeStrip`. |
| `MinigameCard` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }> \| undefined` | yes |  | The replacement for `MinigameCard`. |
| `DiceRoll` | [`Override`](/docs/0.1.2/api/react-kit#override)`<`[`DiceRollProps`](#dicerollprops)`> \| undefined` | yes |  | The replacement for `DiceRoll`. |
| `DiceOverlay` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ rolls: readonly` [`Roll[]`](/docs/0.1.2/api/engine#roll)`; className?: string; }> \| undefined` | yes |  | The replacement for `DiceOverlay`. |
| `Countdown` | [`Override`](/docs/0.1.2/api/react-kit#override)`<`[`CountdownProps`](#countdownprops)`> \| undefined` | yes |  | The replacement for `Countdown`. |
| `Timers` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }> \| undefined` | yes |  | The replacement for `Timers`. |
| `Changes` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }> \| undefined` | yes |  | The replacement for `Changes`. |
| `ChangeItem` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ change:` [`ChangeView`](/docs/0.1.2/api/engine#changeview)`; }> \| undefined` | yes |  | The replacement for `ChangeItem`. |
| `GameMenu` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }> \| undefined` | yes |  | The replacement for `GameMenu`. |
| `SavesMenu` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; onLoaded?: (() => void); }> \| undefined` | yes |  | The replacement for `SavesMenu`. |
| `Backlog` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }> \| undefined` | yes |  | The replacement for `Backlog`. |
| `ModManager` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }> \| undefined` | yes |  | The replacement for `ModManager`. |
| `PanelHost` | [`Override`](/docs/0.1.2/api/react-kit#override)`<object> \| undefined` | yes |  | The replacement for `PanelHost`. |
| `EntityTable` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ kinds?: string[]; className?: string; }> \| undefined` | yes |  | The replacement for `EntityTable`. |
| `InputFields` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }> \| undefined` | yes |  | The replacement for `InputFields`. |
| `InputField` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ input:` [`InputView`](/docs/0.1.2/api/engine#inputview)`; }> \| undefined` | yes |  | The replacement for `InputField`. |
| `Picture` | [`Override`](/docs/0.1.2/api/react-kit#override)`<ClassAttributes<HTMLImageElement> & ImgHTMLAttributes<HTMLImageElement> & { '…` | yes |  | The replacement for `Picture`. |
| `Video` | [`Override`](/docs/0.1.2/api/react-kit#override)`<`[`VideoProps`](#videoprops) `\| (Omit<DetailedHTMLProps<VideoHTMLAttributes<HTMLVideoElement>,…` | yes |  | The replacement for `Video`. |
| `LayeredPicture` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ picture:` [`PictureView`](/docs/0.1.2/api/engine#pictureview)`; className?: string; }> \| undefined` | yes |  | The replacement for `LayeredPicture`. |
| `Hotspot` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ hotspot:` [`HotspotView`](/docs/0.1.2/api/engine#hotspotview)`; }> \| undefined` | yes |  | The replacement for `Hotspot`. |
| `MediaViewer` | [`Override`](/docs/0.1.2/api/react-kit#override)`<`[`MediaViewerProps`](#mediaviewerprops)`> \| undefined` | yes |  | The replacement for `MediaViewer`. |
| `Icon` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ name:` [`IconName`](/docs/0.1.2/api/react-kit#iconname)`; label?: string; }> \| undefined` | yes |  | The replacement for `Icon`. |
| `TitlePage` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }> \| undefined` | yes |  | The replacement for `TitlePage`. |
| `SettingsPage` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }> \| undefined` | yes |  | The replacement for `SettingsPage`. |
| `LoadPage` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }> \| undefined` | yes |  | The replacement for `LoadPage`. |
| `CreditsPage` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }> \| undefined` | yes |  | The replacement for `CreditsPage`. |
| `GatePage` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }> \| undefined` | yes |  | The replacement for `GatePage`. |
| `SplashPage` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }> \| undefined` | yes |  | The replacement for `SplashPage`. |

## Countdown

Const. Explained in [Components](/docs/0.1.2/reference/react/components#countdown).

Renders a running timer by id as the `timer` part, with its label, a bar that empties and the seconds left. It
renders nothing once the timer has run out or stopped.

It's marked `data-urgent` with a quarter or less to go. With motion off, or for a player who asks for reduced
motion, only the seconds show.

```ts shape
import { Countdown } from '@ifloom/react'
const Countdown: ComponentType<CountdownProps>
```

Uses: [`CountdownProps`](#countdownprops).

## CountdownProps

Type.

The props of `Countdown`.

```ts shape
import type { CountdownProps } from '@ifloom/react'
type CountdownProps = {
  timer: string
  label?: boolean
  className?: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `timer` | `string` |  |  | The timer's id. `Countdown` renders nothing while it isn't running. |
| `label` | `boolean` | yes |  | True to show the timer's `label` above the bar. True if left out. |
| `className` | `string` | yes |  | Classes added to the `timer` part's own. |

## CreditsPage

Const. Explained in [Components](/docs/0.1.2/reference/react/components#creditspage).

Renders the credits page from the game's `credits`, a heading for each group and a line for each credit with its
role, description, licence and picture. Its links open in a new tab.

```ts shape
import { CreditsPage } from '@ifloom/react'
const CreditsPage: ComponentType<{ className?: string; }>
```

## DefaultLayout

Component. Explained in [Components](/docs/0.1.2/reference/react/components#defaultlayout).

Renders the React UI's own layout, which `GameShell` and `mountGame` render when you give them none. The `react` and
`next` templates start you with a copy of it in `src/layout.tsx`.

Each section hides itself when the game has nothing for it, so the same layout suits a novel and a town. The plugin
UIs' components go at each `<Plugins at="…" />`, in the order of the game's `plugins` list.

```ts shape
import { DefaultLayout } from '@ifloom/react'
function DefaultLayout(): JSX.Element
```

## DiceOverlay

Const. Explained in [Components](/docs/0.1.2/reference/react/components#diceoverlay).

Renders the last command's rolls that no block's `ui.dice` hint names, for a moment over the scene, such as a roll a
trigger made. Each is a `DiceRoll` inside the `dice-overlay` part.

It goes a few seconds after the dice settle, or when the player presses `dice-dismiss`. `Scene` renders it.

```ts shape
import { DiceOverlay } from '@ifloom/react'
const DiceOverlay: ComponentType<{ rolls: readonly Roll[]; className?: string; }>
```

Uses: [`Roll`](/docs/0.1.2/api/engine#roll).

## DiceRoll

Const. Explained in [Components](/docs/0.1.2/reference/react/components#diceroll).

Renders one roll from `view.rolls`, its dice tumbling for a second and then settling on the rolled faces. It shows
the bonus, the total and, with a target, the outcome and the number needed.

A die on its top face or on 1 is marked, and so is a critical. Its parts are `dice` (with `data-roll`, `data-state`
`rolling` or `settled`, `data-passed` and `data-critical`), `dice-label`, `dice-faces`, `dice-face`, `dice-plus`,
`dice-total`, `dice-outcome` and `dice-critical`. Screen readers announce the result once the dice settle.

```ts shape
import { DiceRoll } from '@ifloom/react'
const DiceRoll: ComponentType<DiceRollProps>
```

Uses: [`DiceRollProps`](#dicerollprops).

## DiceRollProps

Type.

The props of `DiceRoll`.

```ts shape
import type { DiceRollProps } from '@ifloom/react'
type DiceRollProps = {
  roll: Roll
  animate?: boolean
  className?: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `roll` | [`Roll`](/docs/0.1.2/api/engine#roll) |  |  | The roll to render, from `view.rolls`, with its dice, each die's face and its total. |
| `animate` | `boolean` | yes |  | True to let the dice tumble before they settle. True if left out, and the `motion` option or a player's reduced-motion setting turns it off either way. |
| `className` | `string` | yes |  | Classes added to the `dice` part's own. |

## EntityTable

Const. Explained in [Components](/docs/0.1.2/reference/react/components#entitytable).

Renders the listed entities in `view.entities` as a table per kind, one row each, with the entity's picture,
description and stats. It renders nothing when every kind is empty.

`kinds` limits it to the kinds given by id, and every listed kind shows if left out.

```ts shape
import { EntityTable } from '@ifloom/react'
const EntityTable: ComponentType<{ kinds?: string[]; className?: string; }>
```

## Fold

Const. Explained in [Components](/docs/0.1.2/reference/react/components#fold).

Renders a fold, a body section with a `ui.fold` hint that `fold()` writes, as a `<details>` the player opens and
shuts. It starts shut, inside its `BeatGroup`.

The `fold` part holds `label`, the hint's words, in a `fold-summary` part and the beats (`children`) in `fold-beats`.
Replace it in `components` to render a fold your own way.

```ts shape
import { Fold } from '@ifloom/react'
const Fold: ComponentType<{ label: string; children: ReactNode; }>
```

## Game

Const. Explained in [Components](/docs/0.1.2/reference/react/components#game).

Renders the page, the root of a layout inside the game's provider, as the `page` part. With a `Sidebar` it's a grid
of the side column and the story, and carries `data-has-sidebar`.

Without a `Sidebar` it's one centred column. With `pages` on, it renders on the `game` page, and the title screen,
the settings and the other pages render in its place.

```ts shape
import { Game } from '@ifloom/react'
const Game: ComponentType<GameProps>
```

Uses: [`GameProps`](#gameprops).

## GameContextValue

Type.

The running game that `useGame` returns, with the runner, its snapshot, the view and `send`.

```ts shape
import type { GameContextValue } from '@ifloom/react'
type GameContextValue = {
  runner: Runner
  mods?: ModsOption
  snapshot: RunnerSnapshot
  view: View
  send: (command: CommandRef) => Result<GameState>
  panels: Record<string, PanelComponent>
  inline: InlineComponents
  sections: Record<string, PluginSectionComponent>
  plugins: readonly PluginUi[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `runner` | [`Runner`](/docs/0.1.2/api/engine#runner) |  |  | The runner the game was mounted with. |
| `mods` | [`ModsOption`](#modsoption) | yes |  | The mods option the game was mounted with, for the mods page. It's undefined for a game without mods. |
| `snapshot` | [`RunnerSnapshot`](/docs/0.1.2/api/engine#runnersnapshot) |  |  | The runner's snapshot, `runner.snapshot()`, with the view, settings, backlog, undo, saves and helpers. |
| `view` | [`View`](/docs/0.1.2/api/engine#view) |  |  | The view, the same as `snapshot.view`. |
| `send` | `(command:` [`CommandRef`](/docs/0.1.2/api/engine#commandref)`) =>` [`Result`](/docs/0.1.2/api/engine#result)`<`[`GameState`](/docs/0.1.2/api/engine#gamestate)`>` |  |  | Sends a command and returns the runner's result, so a caller can show a refusal. The command is a core one or a plugin's as its helpers write it, such as `shop.buy('counter', 'food:bun')`. |
| `panels` | `Record<string,` [`PanelComponent`](#panelcomponent)`>` |  |  | The game's own panels by name, as `GameProviderProps.panels` gave them. The plugin UIs' panels aren't included. |
| `inline` | [`InlineComponents`](#inlinecomponents) |  |  | The components for UI pieces that the plugin UIs and the game add, by name, the game's over the plugins'. The built-in ones aren't included. |
| `sections` | `Record<string,` [`PluginSectionComponent`](#pluginsectioncomponent)`>` |  |  | The components for plugin sections in apps, by plugin id, the plugin UIs' with the game's own over them. |
| `plugins` | `readonly` [`PluginUi[]`](/docs/0.1.2/api/react-kit#pluginui) |  |  | The plugin UIs from the provider's `plugins` whose plugin the game has, in that order. |

## GameMenu

Const. Explained in [Components](/docs/0.1.2/reference/react/components#gamemenu).

Renders the player's menu as the `menu` part, with buttons for saves, the backlog, undo and redo when the runner has
them. With `keys` on, Escape opens the same buttons in a dialog.

It adds mods when the provider has them, and each plugin UI's `settings`, such as the unlocks plugin's code box,
behind a button of its own. With pages on, it has Settings and Title screen buttons instead, which switch to those
pages, and the mods and the plugin UIs' settings move to the settings page.

```ts shape
import { GameMenu } from '@ifloom/react'
const GameMenu: ComponentType<{ className?: string; }>
```

## GameProps

Type.

The props of `Game`.

```ts shape
import type { GameProps } from '@ifloom/react'
type GameProps = {
  className?: string
  children?: ReactNode
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `className` | `string` | yes |  | Classes added to the `page` part's own. |
| `children` | `ReactNode` | yes |  | The regions inside the page, such as a `Sidebar`, a `Story` and an `Overlay`. |

## GameProvider

Component. Explained in [Components](/docs/0.1.2/reference/react/components#gameprovider).

Renders its children connected to a runner, so every component under it reads the runner's snapshot and sends
commands through `useGame`. It re-renders when the runner has a new snapshot, and only then.

```ts shape
import { GameProvider } from '@ifloom/react'
function GameProvider(props: GameProviderProps): JSX.Element
```

Uses: [`GameProviderProps`](#gameproviderprops).

## GameProviderProps

Type.

The props of `GameProvider`, the runner and the plugin UIs with the game's own panels, UI pieces, sections and mods.

```ts shape
import type { GameProviderProps } from '@ifloom/react'
type GameProviderProps = {
  components?: Components
  classes?: Classes
  unstyled?: boolean
  viewer?: boolean
  keys?: boolean | KeyOptions
  motion?: boolean
  runner: Runner
  plugins?: readonly PluginUi[]
  panels?: Record<string, PanelComponent>
  inline?: InlineComponents
  sections?: Record<string, PluginSectionComponent>
  mods?: ModsOption
  children: ReactNode
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `components` | [`Components`](#components) | yes |  | The game's replacements for built-in components, by name. |
| `classes` | [`Classes`](#classes) | yes |  | The game's classes for the UI's parts, by `data-part` name. |
| `unstyled` | `boolean` | yes |  | True to drop every built-in class, keeping the structure and the `data-part`s for your own styles. False if left out. |
| `viewer` | `boolean` | yes |  | True to let the player click a picture or a video in the story to see it large. True if left out. |
| `keys` | `boolean \|` [`KeyOptions`](#keyoptions) | yes |  | The keyboard shortcuts, 1 to 9 for the choices or actions on screen, Escape for the menu and the game's own keys in `map`. Off if left out. A minigame's keys work either way. |
| `motion` | `boolean` | yes |  | True to play scene transitions and prose reveals, the `ui.transition` and `ui.reveal` hints. True if left out, and `false` shows every scene and every line at once. A player whose system asks for reduced motion sees them at once either way. |
| `runner` | [`Runner`](/docs/0.1.2/api/engine#runner) |  |  | The runner to render and send commands to, such as `browserRunner(game)` or `createRunner(game)`. |
| `plugins` | `readonly` [`PluginUi[]`](/docs/0.1.2/api/react-kit#pluginui) | yes |  | The plugin UIs to use, each from a plugin's `/react` subpath, such as `shopUi` from `@ifloom/plugin-shop/react`. The default layout places their components in this order. One for a plugin the game doesn't have does nothing. Leave a plugin out to render it yourself. |
| `panels` | `Record<string,` [`PanelComponent`](#panelcomponent)`>` | yes |  | The game's own panels, by the name its scenes, apps and `panel` effects give. One here replaces a plugin UI's panel of the same name. |
| `inline` | [`InlineComponents`](#inlinecomponents) | yes |  | The game's own components for `[[ui:name\|words\|arg\|…]]` in its prose, by name. One here replaces a built-in one of the same name, such as `modal` or `image`. A name no component renders shows its words. |
| `sections` | `Record<string,` [`PluginSectionComponent`](#pluginsectioncomponent)`>` | yes |  | The game's components for plugin sections in apps, by plugin id. They replace the plugin UIs', such as the messages and feed UIs'. |
| `mods` | [`ModsOption`](#modsoption) | yes |  | The mods the player can add, turn off or remove. Leave it out for a game without mods. |
| `children` | `ReactNode` |  |  | The UI to render inside the provider. |

## GameShell

Component. Explained in [The React UI](/docs/0.1.2/reference/react#gameshell).

Renders the whole React UI for a runner, the root that `mountGame` renders too. It renders the layout,
`DefaultLayout` unless you give your own, inside the game's provider.

It also plays the game's sound, sets its text size and, with `pages` on, renders the pages around the game. Every
part a layout uses is exported on its own, so a game can build another page entirely.

```ts shape
import { GameShell } from '@ifloom/react'
function GameShell(props: GameShellProps): JSX.Element
```

Uses: [`GameShellProps`](#gameshellprops).

## GameShellProps

Type.

The props of `GameShell`, the `GameProviderProps` without `children`, with a layout, pages and sound.

```ts shape
import type { GameShellProps } from '@ifloom/react'
type GameShellProps = {
  sections?: Record<string, PluginSectionComponent>
  inline?: InlineComponents
  plugins?: readonly PluginUi[]
  components?: Components
  classes?: Classes
  unstyled?: boolean
  viewer?: boolean
  keys?: boolean | KeyOptions
  motion?: boolean
  runner: Runner
  panels?: Record<string, PanelComponent>
  mods?: ModsOption
  layout?: ComponentType
  pages?: boolean | PagesOptions
  audio?: false | AudioOptions
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `sections` | `Record<string,` [`PluginSectionComponent`](#pluginsectioncomponent)`>` | yes |  | The game's components for plugin sections in apps, by plugin id. They replace the plugin UIs', such as the messages and feed UIs'. |
| `inline` | [`InlineComponents`](#inlinecomponents) | yes |  | The game's own components for `[[ui:name\|words\|arg\|…]]` in its prose, by name. One here replaces a built-in one of the same name, such as `modal` or `image`. A name no component renders shows its words. |
| `plugins` | `readonly` [`PluginUi[]`](/docs/0.1.2/api/react-kit#pluginui) | yes |  | The plugin UIs to use, each from a plugin's `/react` subpath, such as `shopUi` from `@ifloom/plugin-shop/react`. The default layout places their components in this order. One for a plugin the game doesn't have does nothing. Leave a plugin out to render it yourself. |
| `components` | [`Components`](#components) | yes |  | The game's replacements for built-in components, by name. |
| `classes` | [`Classes`](#classes) | yes |  | The game's classes for the UI's parts, by `data-part` name. |
| `unstyled` | `boolean` | yes |  | True to drop every built-in class, keeping the structure and the `data-part`s for your own styles. False if left out. |
| `viewer` | `boolean` | yes |  | True to let the player click a picture or a video in the story to see it large. True if left out. |
| `keys` | `boolean \|` [`KeyOptions`](#keyoptions) | yes |  | The keyboard shortcuts, 1 to 9 for the choices or actions on screen, Escape for the menu and the game's own keys in `map`. Off if left out. A minigame's keys work either way. |
| `motion` | `boolean` | yes |  | True to play scene transitions and prose reveals, the `ui.transition` and `ui.reveal` hints. True if left out, and `false` shows every scene and every line at once. A player whose system asks for reduced motion sees them at once either way. |
| `runner` | [`Runner`](/docs/0.1.2/api/engine#runner) |  |  | The runner to render and send commands to, such as `browserRunner(game)` or `createRunner(game)`. |
| `panels` | `Record<string,` [`PanelComponent`](#panelcomponent)`>` | yes |  | The game's own panels, by the name its scenes, apps and `panel` effects give. One here replaces a plugin UI's panel of the same name. |
| `mods` | [`ModsOption`](#modsoption) | yes |  | The mods the player can add, turn off or remove. Leave it out for a game without mods. |
| `layout` | `ComponentType` | yes |  | The layout, the page as a component, such as a `Game` with a `Sidebar` and a `Story` in your `src/layout.tsx`. `DefaultLayout` if left out. Any component of your own works, since `useGame()` and every built-in component work inside it. |
| `pages` | `boolean \|` [`PagesOptions`](#pagesoptions) | yes |  | The title screen and the pages around the game, `true` or the `PagesOptions` for them. Off if left out, and the game starts straight away. With pages on, the layout renders on the `game` page. |
| `audio` | `false \|` [`AudioOptions`](/docs/0.1.2/api/audio#audiooptions) | yes |  | The game's sound through `@ifloom/audio`, which starts when the game declares any audio. `false` turns it off, and an object goes to `startAudio` as its options. |

## GateOptions

Type.

A notice the player confirms once before the title screen, in `PagesOptions.gate`. The game writes every word of it.

```ts shape
import type { GateOptions } from '@ifloom/react'
type GateOptions = {
  title: string
  text: string
  confirm: string
  decline?: { label: string; href?: string }
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `title` | `string` |  |  | The gate's heading. |
| `text` | `string` |  |  | The gate's text, split into paragraphs on blank lines. |
| `confirm` | `string` |  |  | The label of the button that confirms and goes on to the title screen. |
| `decline` | `{ label: string; href?: string }` | yes |  | The button that declines, with its label. It goes to `href` if given, and otherwise the gate stays. |

## GatePage

Const. Explained in [Components](/docs/0.1.2/reference/react/components#gatepage).

Renders the gate from `PagesOptions.gate`, a notice the player confirms before the title screen. The profile's
`ui:gate` namespace remembers the confirmation, so the gate shows once per device.

Declining goes to the decline button's `href`, or leaves the gate where it is.

```ts shape
import { GatePage } from '@ifloom/react'
const GatePage: ComponentType<{ className?: string; }>
```

## Hotspot

Const. Explained in [Components](/docs/0.1.2/reference/react/components#hotspot).

Renders one hotspot of a layered picture as a `hotspot` button over it, placed by its `rect` in percent. Its
`aria-label` is the hotspot's label.

A disabled one stays in the tab order with `aria-disabled`, gives its reason in `title` and to screen readers, and
sends nothing. One with a warning shows the warning icon.

```ts shape
import { Hotspot } from '@ifloom/react'
const Hotspot: ComponentType<{ hotspot: HotspotView; }>
```

Uses: [`HotspotView`](/docs/0.1.2/api/engine#hotspotview).

## InlineAction

Const. Explained in [Components](/docs/0.1.2/reference/react/components#inlineaction).

Renders an inline action from `[[act:id|words]]` as an `inline-action` button that sends its command, with its
price after the words. It has no number key, since the number keys choose the listed choices.

A disabled one has `data-disabled` and `aria-disabled` and stays focusable, and a tap, hover or focus shows the
reason in a `tip-content` bubble. A warning or an irreversible note shows the same way.

```ts shape
import { InlineAction } from '@ifloom/react'
const InlineAction: ComponentType<{ text: string; choice: RenderedChoice; className?: string; }>
```

Uses: [`RenderedChoice`](/docs/0.1.2/api/engine#renderedchoice).

## InlineComponent

Type.

A component that renders the UI piece named `N` in prose.

```ts shape
import type { InlineComponent } from '@ifloom/react'
type InlineComponent<N extends string = string> = ComponentType<InlineProps<N>>
```

Uses: [`InlineProps`](#inlineprops).

## InlineComponents

Type. Explained in [Components](/docs/0.1.2/reference/react/components#inlinecomponents).

A game's or a plugin UI's components for UI pieces in prose, by name. A name the engine's `InlineUi` declares gets its
arguments typed, and any other name takes them as text.

```ts shape
import type { InlineComponents } from '@ifloom/react'
type InlineComponents = {
  modal?: InlineComponent<'modal'>
  image?: InlineComponent<'image'>
  mail?: InlineComponent<'mail'>
  prop?: InlineComponent<'prop'>
  mono?: InlineComponent<'mono'>
  // …
}
```

It also takes any other key: `[key: string]: ComponentType<InlineProps<never>> | undefined`.

Its fields are the keys of `{ [N in keyof InlineUi]?: InlineComponent<N> } & { [name: string]: ComponentType<InlineProps<never>> | undefined }`, so they grow when a game or a plugin adds to those.

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `modal` | [`InlineComponent`](#inlinecomponent)`<'modal'>` | yes |  | The arguments of `[[ui:modal\|words\|key\|title]]`, whose words open a dialog with the prose key's line. The dialog's title is `title`, else the words. |
| `image` | [`InlineComponent`](#inlinecomponent)`<'image'>` | yes |  | The arguments of `[[ui:image\|words\|path\|alt]]`, whose words open the picture at `path` in the viewer. `path` resolves as `[[img:…]]` does. |
| `mail` | [`InlineComponent`](#inlinecomponent)`<'mail'>` | yes |  | The header lines of `[[ui:mail\|body\|From: Ava\|Subject: Hello]]`, a letter or an email in a paragraph of its own. The body follows the header. |
| `prop` | [`InlineComponent`](#inlinecomponent)`<'prop'>` | yes |  | The face of `[[ui:prop\|words\|sticky]]`, a note in the story's world in a paragraph of its own. The face is `sticky`, `clip` or `diary`. |
| `mono` | [`InlineComponent`](#inlinecomponent)`<'mono'>` | yes |  | The arguments of `[[ui:mono\|words]]`, which takes none. It sets the words in a typewriter face, such as a sign or a screen. |

## InlineImage

Component. Explained in [Components](/docs/0.1.2/reference/react/components#inlineimage).

Renders the built-in `image` UI piece from `[[ui:image|words|path|alt]]`, the words as an `InlineTrigger` that opens
the picture at `path` in the `MediaViewer`. `alt` describes the picture, else the words do.

The path resolves as `[[img:…]]` resolves it, with `art/` and `.jpg` added to a bare name. Replace it with an `image`
of your own in `inline`.

```ts shape
import { InlineImage } from '@ifloom/react'
function InlineImage(props: InlineProps<'image'>): JSX.Element
```

Uses: [`InlineProps`](#inlineprops).

## InlineMail

Component. Explained in [Components](/docs/0.1.2/reference/react/components#inlinemail).

Renders the built-in `mail` UI piece from `[[ui:mail|body|From: Ava|Subject: Hello]]`, a letter or an email as an
`inline-mail` card. Each header line is a `mail-header` part, and the body a `mail-body` part.

Written as a paragraph of its own, it renders as one. Replace it with a `mail` of your own in `inline`.

```ts shape
import { InlineMail } from '@ifloom/react'
function InlineMail(props: InlineProps<'mail'>): JSX.Element
```

Uses: [`InlineProps`](#inlineprops).

## InlineModal

Component. Explained in [Components](/docs/0.1.2/reference/react/components#inlinemodal).

Renders the built-in `modal` UI piece from `[[ui:modal|words|key|title]]`, the words as an `InlineTrigger` that
opens a dialog with the prose key's line. A key with no prose shows only the words.

The dialog renders the line as a scene's paragraphs, from `proseBeats` for this save, in an `inline-modal` part,
titled `title` or else the words. Escape, the close button or a click outside closes it, and focus goes back to the
words. Replace it with a `modal` of your own in `inline`.

```ts shape
import { InlineModal } from '@ifloom/react'
function InlineModal(props: InlineProps<'modal'>): JSX.Element
```

Uses: [`InlineProps`](#inlineprops).

## InlineMono

Component. Explained in [Components](/docs/0.1.2/reference/react/components#inlinemono).

Renders the built-in `mono` UI piece from `[[ui:mono|words]]`, the words in a typewriter face as an `inline-mono`
part. Replace it with a `mono` of your own in `inline`.

```ts shape
import { InlineMono } from '@ifloom/react'
function InlineMono(props: InlineProps<'mono'>): JSX.Element
```

Uses: [`InlineProps`](#inlineprops).

## InlineProp

Component. Explained in [Components](/docs/0.1.2/reference/react/components#inlineprop).

Renders the built-in `prop` UI piece from `[[ui:prop|words|face]]`, a note in the story's world, as an `inline-prop`
part. `data-face` carries the face, such as `sticky`, `clip` or `diary`.

Written as a paragraph of its own, it renders as one. Replace it with a `prop` of your own in `inline`.

```ts shape
import { InlineProp } from '@ifloom/react'
function InlineProp(props: InlineProps<'prop'>): JSX.Element
```

Uses: [`InlineProps`](#inlineprops).

## InlineProps

Type.

The props a UI piece's component gets from `[[ui:name|words|arg|…]]` in prose. The `args` are typed by the name's
entry in the engine's `InlineUi`.

```ts shape
import type { InlineProps } from '@ifloom/react'
type InlineProps<N extends string = string> = {
  name: N
  text: string
  args: InlineUiArgs<N>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `name` | `N` |  |  | The UI piece's name, from `[[ui:name\|…]]`. |
| `text` | `string` |  |  | The UI piece's words, its second part, which the component shows. |
| `args` | [`InlineUiArgs`](/docs/0.1.2/api/engine#inlineuiargs)`<N>` |  |  | The UI piece's parts after its words, typed by the name's entry in `InlineUi`. |

## InlineTrigger

Component. Explained in [Components](/docs/0.1.2/reference/react/components#inlinetrigger).

Renders a UI piece's words as a button that opens a dialog over the page, the `inline-ui` part with `data-ui` set to
the piece's name. Focus returns to it when `open` goes back to false.

The built-in `modal` and `image` pieces use it, and so can a game's own.

```ts shape
import { InlineTrigger } from '@ifloom/react'
function InlineTrigger(props: { name: string; open: boolean; onOpen: () => void; className?: string; children: ReactNode }): JSX.Element
```

## InputField

Const. Explained in [Components](/docs/0.1.2/reference/react/components#inputfield).

Renders one input from `view.inputs` as a text box, a number box or its options to choose from. It shows the engine's
refusal when the value won't do.

```ts shape
import { InputField } from '@ifloom/react'
const InputField: ComponentType<{ input: InputView; }>
```

Uses: [`InputView`](/docs/0.1.2/api/engine#inputview).

## InputFields

Const. Explained in [Components](/docs/0.1.2/reference/react/components#inputfields).

Renders the inputs in `view.inputs` while no scene is open, such as a field the room offers. It renders nothing
while a scene is open, since `Scene` renders those inputs itself.

```ts shape
import { InputFields } from '@ifloom/react'
const InputFields: ComponentType<{ className?: string; }>
```

## KeepPicturesOn

Component. Explained in [Components](/docs/0.1.2/reference/react/components#keeppictureson).

Renders its children with their pictures shown even while the game's pictures setting is off. A layered picture uses
it, since its hotspots are play.

```ts shape
import { KeepPicturesOn } from '@ifloom/react'
function KeepPicturesOn(props: { children: ReactNode }): JSX.Element
```

## KeyOptions

Type. Explained in [Components](/docs/0.1.2/reference/react/components#keyoptions).

Settings for the `keys` option, given as an object in place of `true`.

```ts shape
import type { KeyOptions } from '@ifloom/react'
type KeyOptions = {
  map?: Record<string, Command>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `map` | `Record<string,` [`Command`](/docs/0.1.2/api/engine#command)`>` | yes |  | The game's own keys, each mapped by `KeyboardEvent.key` (`'m'`, `'F2'`, `' '`) to the command it sends. They come before the built-in keys, so mapping `'1'` or `'Escape'` replaces that key. |

## LayeredPicture

Const. Explained in [Components](/docs/0.1.2/reference/react/components#layeredpicture).

Renders a layered picture with its hotspots, from `view.scene.picture` or a location's `location.picture`. It renders
even while the game's pictures setting is off, since its hotspots are play.

The layers stack bottom first, each filling a box shaped by the picture's `aspect`, else the first layer's own, else
16/9. Pictures go through `Picture` and videos through `Video`.

```ts shape
import { LayeredPicture } from '@ifloom/react'
const LayeredPicture: ComponentType<{ picture: PictureView; className?: string; }>
```

Uses: [`PictureView`](/docs/0.1.2/api/engine#pictureview).

## LoadPage

Const. Explained in [Components](/docs/0.1.2/reference/react/components#loadpage).

Renders the load page, which lists every save newest first to load, any that can't be read to delete, and a button to
import a save file. It needs a runner made with `saves`.

```ts shape
import { LoadPage } from '@ifloom/react'
const LoadPage: ComponentType<{ className?: string; }>
```

## MediaViewer

Const. Explained in [Components](/docs/0.1.2/reference/react/components#mediaviewer).

Renders a picture or video from the story large over the page, as the `viewer` part. A `Beat` opens it when the
player clicks its picture or clip, and `viewer: false` turns it off.

Escape, a click outside or the close button closes it.

```ts shape
import { MediaViewer } from '@ifloom/react'
const MediaViewer: ComponentType<MediaViewerProps>
```

Uses: [`MediaViewerProps`](#mediaviewerprops).

## MediaViewerProps

Type.

The props of `MediaViewer`.

```ts shape
import type { MediaViewerProps } from '@ifloom/react'
type MediaViewerProps = {
  media: ViewerMedia
  open: boolean
  onOpenChange: (open: boolean) => void
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `media` | [`ViewerMedia`](#viewermedia) |  |  | The picture or video beat to show. |
| `open` | `boolean` |  |  | True while the viewer is open. |
| `onOpenChange` | `(open: boolean) => void` |  |  | The function the viewer calls with false when the player closes it. |

## MinigameCard

Const. Explained in [Components](/docs/0.1.2/reference/react/components#minigamecard).

Renders the running minigame from `view.minigame` as the `minigame` part, with its title, its words, its timer's
bar and a button for each live input. `Scene` renders it in place of the scene.

The keyboard presses inputs too, by the minigame's `keys`, else the arrow keys and space.

```ts shape
import { MinigameCard } from '@ifloom/react'
const MinigameCard: ComponentType<{ className?: string; }>
```

## MinigameControls

Type.

The running minigame and its `send`, which `useMinigame` returns.

```ts shape
import type { MinigameControls } from '@ifloom/react'
type MinigameControls = {
  minigame: MinigameView | null
  send: (input: string) => ReturnType<Runner['apply']>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `minigame` | [`MinigameView`](/docs/0.1.2/api/engine#minigameview) `\| null` |  |  | The running minigame, `view.minigame`, or `null` when none runs. |
| `send` | `(input: string) => ReturnType<`[`Runner`](/docs/0.1.2/api/engine#runner)`['apply']>` |  |  | Presses one of the minigame's inputs by id, and returns the runner's result so a caller can show a refusal. |

## ModManager

Const. Explained in [Components](/docs/0.1.2/reference/react/components#modmanager).

Renders the mod manager as the `mods` part, which lists the player's mods to turn on, off or remove, and adds one
from a file. It needs `mods` on the provider.

Mods change the game itself, so a change takes effect when the game is built again, in the provider's `onChange`,
such as by reloading the page. The loader's problems with a mod show under it. Once anything has changed, a line
says a restart applies it, with the button that does. It's in the menu, and on the settings page when the game has
pages.

```ts shape
import { ModManager } from '@ifloom/react'
const ModManager: ComponentType<{ className?: string; }>
```

## ModsOption

Type. Explained in [Components](/docs/0.1.2/reference/react/components#modsoption).

The game's mods for the mod manager, with the store, the loader's problems and the function that applies a change.

```ts shape
import type { ModsOption } from '@ifloom/react'
type ModsOption = {
  store: Mods
  problems?: string[]
  onChange?: () => void
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `store` | [`Mods`](/docs/0.1.2/api/engine#mods) |  |  | The store that keeps the player's mods, `mods(game.id, driver)` from `@ifloom/engine` over the same driver as the saves. |
| `problems` | `string[]` | yes |  | The loader's problems, each worded by `describeProblem`. The mod manager shows a problem starting `mod:<id> ` under that mod. |
| `onChange` | `() => void` | yes |  | The function that builds the game again with the mods as they now are, such as `() => location.reload()`. |

## ModsState

Type.

The player's mods and the functions that change them, which `useMods` returns to a mod manager.

```ts shape
import type { ModsState } from '@ifloom/react'
type ModsState = {
  available: boolean
  list: InstalledMod[]
  add: (file: File) => Promise<boolean>
  toggle: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
  changed: boolean
  restart: (() => void) | undefined
  problemsFor: (id: string) => string[]
  message: string | null
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `available` | `boolean` |  |  | True when the game has mods. It's false when the provider was given no `mods`. |
| `list` | [`InstalledMod[]`](/docs/0.1.2/api/engine#installedmod) |  |  | The mods the player has added. |
| `add` | `(file: File) => Promise<boolean>` |  |  | Adds a mod from a file, and resolves to true when it was added. When it fails, `message` gives the reason. |
| `toggle` | `(id: string) => Promise<void>` |  |  | Turns a mod on or off. |
| `remove` | `(id: string) => Promise<void>` |  |  | Removes a mod. |
| `changed` | `boolean` |  |  | True once the mods have changed since the game was built, so a restart would differ. |
| `restart` | `(() => void) \| undefined` |  |  | The provider's `onChange`, which builds the game again with the mods as they are now. It's undefined when the provider gave none. |
| `problemsFor` | `(id: string) => string[]` |  |  | Returns the problems the loader found in one mod. |
| `message` | `string \| null` |  |  | The reason the last file couldn't be added or the mods couldn't be read or changed, or null. |

## mountGame

Function. Explained in [The React UI](/docs/0.1.2/reference/react#mountgame).

Starts a game in the page and returns its runner once the game renders. It throws when nothing in the page matches
`root`.

It takes a game, or what `loadGame` returns, and logs any problems as warnings. It makes the runner with
`browserRunner`, so the game has undo, saves, an autosave and the player's stored settings, and renders `GameShell`
into `#root`. The game's sound plays if it has any.

```ts shape
import { mountGame } from '@ifloom/react'
function mountGame(loaded: Game | { game: Game; problems?: readonly unknown[] }, options?: MountOptions): Promise<Runner>
```

Uses: [`Game`](/docs/0.1.2/api/engine#game), [`MountOptions`](#mountoptions), [`Runner`](/docs/0.1.2/api/engine#runner).

## MountOptions

Type. Explained in [The React UI](/docs/0.1.2/reference/react#mountoptions).

Settings for `mountGame`, the `GameShellProps` without `runner`, with where to render and how to start.

```ts shape
import type { MountOptions } from '@ifloom/react'
type MountOptions = {
  audio?: false | AudioOptions
  sections?: Record<string, PluginSectionComponent>
  inline?: InlineComponents
  plugins?: readonly PluginUi[]
  components?: Components
  classes?: Classes
  unstyled?: boolean
  viewer?: boolean
  keys?: boolean | KeyOptions
  motion?: boolean
  panels?: Record<string, PanelComponent>
  mods?: ModsOption
  layout?: ComponentType
  pages?: boolean | PagesOptions
  root?: string | Element
  start?: GameState
  runner?: RunnerOptions
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `audio` | `false \|` [`AudioOptions`](/docs/0.1.2/api/audio#audiooptions) | yes |  | The game's sound through `@ifloom/audio`, which starts when the game declares any audio. `false` turns it off, and an object goes to `startAudio` as its options. |
| `sections` | `Record<string,` [`PluginSectionComponent`](#pluginsectioncomponent)`>` | yes |  | The game's components for plugin sections in apps, by plugin id. They replace the plugin UIs', such as the messages and feed UIs'. |
| `inline` | [`InlineComponents`](#inlinecomponents) | yes |  | The game's own components for `[[ui:name\|words\|arg\|…]]` in its prose, by name. One here replaces a built-in one of the same name, such as `modal` or `image`. A name no component renders shows its words. |
| `plugins` | `readonly` [`PluginUi[]`](/docs/0.1.2/api/react-kit#pluginui) | yes |  | The plugin UIs to use, each from a plugin's `/react` subpath, such as `shopUi` from `@ifloom/plugin-shop/react`. The default layout places their components in this order. One for a plugin the game doesn't have does nothing. Leave a plugin out to render it yourself. |
| `components` | [`Components`](#components) | yes |  | The game's replacements for built-in components, by name. |
| `classes` | [`Classes`](#classes) | yes |  | The game's classes for the UI's parts, by `data-part` name. |
| `unstyled` | `boolean` | yes |  | True to drop every built-in class, keeping the structure and the `data-part`s for your own styles. False if left out. |
| `viewer` | `boolean` | yes |  | True to let the player click a picture or a video in the story to see it large. True if left out. |
| `keys` | `boolean \|` [`KeyOptions`](#keyoptions) | yes |  | The keyboard shortcuts, 1 to 9 for the choices or actions on screen, Escape for the menu and the game's own keys in `map`. Off if left out. A minigame's keys work either way. |
| `motion` | `boolean` | yes |  | True to play scene transitions and prose reveals, the `ui.transition` and `ui.reveal` hints. True if left out, and `false` shows every scene and every line at once. A player whose system asks for reduced motion sees them at once either way. |
| `panels` | `Record<string,` [`PanelComponent`](#panelcomponent)`>` | yes |  | The game's own panels, by the name its scenes, apps and `panel` effects give. One here replaces a plugin UI's panel of the same name. |
| `mods` | [`ModsOption`](#modsoption) | yes |  | The mods the player can add, turn off or remove. Leave it out for a game without mods. |
| `layout` | `ComponentType` | yes |  | The layout, the page as a component, such as a `Game` with a `Sidebar` and a `Story` in your `src/layout.tsx`. `DefaultLayout` if left out. Any component of your own works, since `useGame()` and every built-in component work inside it. |
| `pages` | `boolean \|` [`PagesOptions`](#pagesoptions) | yes |  | The title screen and the pages around the game, `true` or the `PagesOptions` for them. Off if left out, and the game starts straight away. With pages on, the layout renders on the `game` page. |
| `root` | `string \| Element` | yes |  | The element to render the game into, or a selector for it. `'#root'` if left out. |
| `start` | [`GameState`](/docs/0.1.2/api/engine#gamestate) | yes |  | The state the game starts from. A new game with a random seed if left out. |
| `runner` | [`RunnerOptions`](/docs/0.1.2/api/engine#runneroptions) | yes |  | The runner options, laid over `browserRunner`'s defaults of undo 50 deep, saves in `localStorage` and an autosave each turn. |

## Notice

Const. Explained in [Components](/docs/0.1.2/reference/react/components#notice).

Renders one notice from `view.notices` as the `notice` part, with its picture, title, text and a button that dismisses it.

```ts shape
import { Notice } from '@ifloom/react'
const Notice: ComponentType<{ notice: NoticeView; }>
```

Uses: [`NoticeView`](/docs/0.1.2/api/engine#noticeview).

## Notices

Const. Explained in [Components](/docs/0.1.2/reference/react/components#notices).

Renders the unseen notices from `view.notices.unseen`, up to `limit`, as the `notices` part. The default layout puts
it in the overlay.

On a narrow screen only the first shows, with a `notices-more` button ("+2 more") that shows the rest.

```ts shape
import { Notices } from '@ifloom/react'
const Notices: ComponentType<{ className?: string; limit?: number; }>
```

## NoticeStrip

Const. Explained in [Components](/docs/0.1.2/reference/react/components#noticestrip).

Renders a row of unread counts as the `notice-strip` part. It starts with the unseen notices, then the plugin UIs'
components at the `strip` spot, such as each device app with a badge.

Each count is a button that opens it, the notices in a dialog or the device on that app. It renders nothing when
nothing is unread, and no built-in layout includes it.

```ts shape
import { NoticeStrip } from '@ifloom/react'
const NoticeStrip: ComponentType<{ className?: string; }>
```

## Overlay

Const. Explained in [Components](/docs/0.1.2/reference/react/components#overlay).

Renders the `overlay` part, which sticks to the bottom of the window over the page and sits after it at the end. The
default layout puts the notices in it.

It takes no room while it has nothing in it.

```ts shape
import { Overlay } from '@ifloom/react'
const Overlay: ComponentType<{ className?: string; children?: ReactNode; }>
```

## OverridableComponents

Type. Explained in [Components](/docs/0.1.2/reference/react/components#overridablecomponents-and-partnames).

The built-in components a game can replace, by name, each typed by the props it takes. A plugin's React UI adds its
own by augmenting this interface.

  declare module '@ifloom/react' {
    interface OverridableComponents { ShopCounter: Override&lt;ShopCounterProps> }
  }

```ts shape
import type { OverridableComponents } from '@ifloom/react'
type OverridableComponents = {
  Game: Override<GameProps>
  Sidebar: Override<SidebarProps>
  Story: Override<StoryProps>
  Overlay: Override<{ className?: string; children?: ReactNode; }>
  Section: Override<SectionProps>
  When: Override<{ condition: Condition; children?: ReactNode; }>
  Title: Override<{ className?: string; }>
  Clock: Override<object>
  StatList: Override<object>
  RoomActions: Override<{ className?: string; }>
  Scene: Override<{ className?: string; }>
  Beat: Override<{ beat: SceneBeat; }>
  SceneHeader: Override<{ scene: { id: string | null; key: string; title: string; body: string; beats: SceneBeat[]; fresh: number; tags: string[]; speaker: SpeakerView | null; image: string | null; picture: PictureView | null; choices: RenderedChoice[]; ui?: Ui<SceneUi>; }; }>
  BeatGroup: Override<{ section: BlockUi & { readonly [hint: string]: unknown; }; children: ReactNode; }>
  Fold: Override<{ label: string; children: ReactNode; }>
  InlineAction: Override<{ text: string; choice: RenderedChoice; className?: string; }>
  Tip: Override<{ text: string; tip: string; className?: string; }>
  ChoiceList: Override<{ choices: RenderedChoice[]; className?: string; part?: 'actions' | 'choices'; }>
  ChoiceButton: Override<{ choice: RenderedChoice; className?: string; }>
  PriceTag: Override<{ price: Price; className?: string; }>
  Notices: Override<{ className?: string; limit?: number; }>
  Notice: Override<{ notice: NoticeView; }>
  NoticeStrip: Override<{ className?: string; }>
  MinigameCard: Override<{ className?: string; }>
  DiceRoll: Override<DiceRollProps>
  DiceOverlay: Override<{ rolls: readonly Roll[]; className?: string; }>
  Countdown: Override<CountdownProps>
  Timers: Override<{ className?: string; }>
  Changes: Override<{ className?: string; }>
  ChangeItem: Override<{ change: ChangeView; }>
  GameMenu: Override<{ className?: string; }>
  SavesMenu: Override<{ className?: string; onLoaded?: (() => void); }>
  Backlog: Override<{ className?: string; }>
  ModManager: Override<{ className?: string; }>
  PanelHost: Override<object>
  EntityTable: Override<{ kinds?: string[]; className?: string; }>
  InputFields: Override<{ className?: string; }>
  InputField: Override<{ input: InputView; }>
  Picture: Override<ClassAttributes<HTMLImageElement> & ImgHTMLAttributes<HTMLImageElement> & { 'data-part'?: string; }>
  Video: Override<VideoProps | (Omit<DetailedHTMLProps<VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement>, 'src' | 'poster' | 'autoPlay' | 'loop' | 'muted' | 'controls'> & { src: string; poster?: string; alt?: string; autoplay: boolean; loop: boolean; muted: boolean; controls: boolean; })>
  LayeredPicture: Override<{ picture: PictureView; className?: string; }>
  Hotspot: Override<{ hotspot: HotspotView; }>
  MediaViewer: Override<MediaViewerProps>
  Icon: Override<{ name: IconName; label?: string; }>
  TitlePage: Override<{ className?: string; }>
  SettingsPage: Override<{ className?: string; }>
  LoadPage: Override<{ className?: string; }>
  CreditsPage: Override<{ className?: string; }>
  GatePage: Override<{ className?: string; }>
  SplashPage: Override<{ className?: string; }>
  // …
}
```

Plugins add fields of their own to it, which their pages list.

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `Game` | [`Override`](/docs/0.1.2/api/react-kit#override)`<`[`GameProps`](#gameprops)`>` |  |  | The replacement for `Game`. |
| `Sidebar` | [`Override`](/docs/0.1.2/api/react-kit#override)`<`[`SidebarProps`](#sidebarprops)`>` |  |  | The replacement for `Sidebar`. |
| `Story` | [`Override`](/docs/0.1.2/api/react-kit#override)`<`[`StoryProps`](#storyprops)`>` |  |  | The replacement for `Story`. |
| `Overlay` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; children?: ReactNode; }>` |  |  | The replacement for `Overlay`. |
| `Section` | [`Override`](/docs/0.1.2/api/react-kit#override)`<`[`SectionProps`](#sectionprops)`>` |  |  | The replacement for `Section`. |
| `When` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ condition:` [`Condition`](/docs/0.1.2/api/engine#condition)`; children?: ReactNode; }>` |  |  | The replacement for `When`. |
| `Title` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }>` |  |  | The replacement for `Title`. |
| `Clock` | [`Override`](/docs/0.1.2/api/react-kit#override)`<object>` |  |  | The replacement for `Clock`. |
| `StatList` | [`Override`](/docs/0.1.2/api/react-kit#override)`<object>` |  |  | The replacement for `StatList`. |
| `RoomActions` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }>` |  |  | The replacement for `RoomActions`. |
| `Scene` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }>` |  |  | The replacement for `Scene`. |
| `Beat` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ beat:` [`SceneBeat`](/docs/0.1.2/api/engine#scenebeat)`; }>` |  |  | The replacement for `Beat`. |
| `SceneHeader` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ scene: { id: string \| null; key: string; title: string; body: string; beats:…` |  |  | The replacement for `SceneHeader`. |
| `BeatGroup` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ section:` [`BlockUi`](/docs/0.1.2/api/engine#blockui) `& { readonly [hint: string]: unknown; }; children: ReactNode;…` |  |  | The replacement for `BeatGroup`. |
| `Fold` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ label: string; children: ReactNode; }>` |  |  | The replacement for `Fold`. |
| `InlineAction` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ text: string; choice:` [`RenderedChoice`](/docs/0.1.2/api/engine#renderedchoice)`; className?: string; }>` |  |  | The replacement for `InlineAction`. |
| `Tip` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ text: string; tip: string; className?: string; }>` |  |  | The replacement for `Tip`. |
| `ChoiceList` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ choices:` [`RenderedChoice[]`](/docs/0.1.2/api/engine#renderedchoice)`; className?: string; part?: 'actions' \| 'choices'; }>` |  |  | The replacement for `ChoiceList`. |
| `ChoiceButton` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ choice:` [`RenderedChoice`](/docs/0.1.2/api/engine#renderedchoice)`; className?: string; }>` |  |  | The replacement for `ChoiceButton`. |
| `PriceTag` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ price:` [`Price`](/docs/0.1.2/api/engine#price)`; className?: string; }>` |  |  | The replacement for `PriceTag`. |
| `Notices` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; limit?: number; }>` |  |  | The replacement for `Notices`. |
| `Notice` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ notice:` [`NoticeView`](/docs/0.1.2/api/engine#noticeview)`; }>` |  |  | The replacement for `Notice`. |
| `NoticeStrip` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }>` |  |  | The replacement for `NoticeStrip`. |
| `MinigameCard` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }>` |  |  | The replacement for `MinigameCard`. |
| `DiceRoll` | [`Override`](/docs/0.1.2/api/react-kit#override)`<`[`DiceRollProps`](#dicerollprops)`>` |  |  | The replacement for `DiceRoll`. |
| `DiceOverlay` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ rolls: readonly` [`Roll[]`](/docs/0.1.2/api/engine#roll)`; className?: string; }>` |  |  | The replacement for `DiceOverlay`. |
| `Countdown` | [`Override`](/docs/0.1.2/api/react-kit#override)`<`[`CountdownProps`](#countdownprops)`>` |  |  | The replacement for `Countdown`. |
| `Timers` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }>` |  |  | The replacement for `Timers`. |
| `Changes` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }>` |  |  | The replacement for `Changes`. |
| `ChangeItem` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ change:` [`ChangeView`](/docs/0.1.2/api/engine#changeview)`; }>` |  |  | The replacement for `ChangeItem`. |
| `GameMenu` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }>` |  |  | The replacement for `GameMenu`. |
| `SavesMenu` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; onLoaded?: (() => void); }>` |  |  | The replacement for `SavesMenu`. |
| `Backlog` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }>` |  |  | The replacement for `Backlog`. |
| `ModManager` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }>` |  |  | The replacement for `ModManager`. |
| `PanelHost` | [`Override`](/docs/0.1.2/api/react-kit#override)`<object>` |  |  | The replacement for `PanelHost`. |
| `EntityTable` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ kinds?: string[]; className?: string; }>` |  |  | The replacement for `EntityTable`. |
| `InputFields` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }>` |  |  | The replacement for `InputFields`. |
| `InputField` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ input:` [`InputView`](/docs/0.1.2/api/engine#inputview)`; }>` |  |  | The replacement for `InputField`. |
| `Picture` | [`Override`](/docs/0.1.2/api/react-kit#override)`<ClassAttributes<HTMLImageElement> & ImgHTMLAttributes<HTMLImageElement> & { '…` |  |  | The replacement for `Picture`. |
| `Video` | [`Override`](/docs/0.1.2/api/react-kit#override)`<`[`VideoProps`](#videoprops) `\| (Omit<DetailedHTMLProps<VideoHTMLAttributes<HTMLVideoElement>,…` |  |  | The replacement for `Video`. |
| `LayeredPicture` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ picture:` [`PictureView`](/docs/0.1.2/api/engine#pictureview)`; className?: string; }>` |  |  | The replacement for `LayeredPicture`. |
| `Hotspot` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ hotspot:` [`HotspotView`](/docs/0.1.2/api/engine#hotspotview)`; }>` |  |  | The replacement for `Hotspot`. |
| `MediaViewer` | [`Override`](/docs/0.1.2/api/react-kit#override)`<`[`MediaViewerProps`](#mediaviewerprops)`>` |  |  | The replacement for `MediaViewer`. |
| `Icon` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ name:` [`IconName`](/docs/0.1.2/api/react-kit#iconname)`; label?: string; }>` |  |  | The replacement for `Icon`. |
| `TitlePage` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }>` |  |  | The replacement for `TitlePage`. |
| `SettingsPage` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }>` |  |  | The replacement for `SettingsPage`. |
| `LoadPage` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }>` |  |  | The replacement for `LoadPage`. |
| `CreditsPage` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }>` |  |  | The replacement for `CreditsPage`. |
| `GatePage` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }>` |  |  | The replacement for `GatePage`. |
| `SplashPage` | [`Override`](/docs/0.1.2/api/react-kit#override)`<{ className?: string; }>` |  |  | The replacement for `SplashPage`. |

## Page

Type.

The name of a page, either a built-in one or the id of one a game or a plugin UI adds.

```ts shape
import type { Page } from '@ifloom/react'
type Page = 'splash' | 'gate' | 'title' | 'game' | 'load' | 'settings' | 'credits' | (string & {})
```

## PageDef

Type.

A page a game adds in `PagesOptions.pages`, with its button on the title screen. A plugin UI adds one as a `PluginPage`.

```ts shape
import type { PageDef } from '@ifloom/react'
type PageDef = {
  label: string
  component: ComponentType
  showOnTitle?: boolean
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `label` | `string` |  |  | The label of the page's button on the title screen. |
| `component` | `ComponentType` |  |  | The component that renders the page. `usePage().back()` leaves it. |
| `showOnTitle` | `boolean` | yes |  | True to show a button for the page on the title screen. True if left out. |

## PagesOptions

Type. Explained in [Components](/docs/0.1.2/reference/react/components#pagesoptions).

Settings for the title screen and the pages around the game, the `pages` option. Each is optional.

```ts shape
import type { PagesOptions } from '@ifloom/react'
type PagesOptions = {
  subtitle?: string
  art?: string
  gate?: GateOptions
  splash?: false | SplashOptions
  pages?: Record<string, PageDef>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `subtitle` | `string` | yes |  | The line under the title on the title screen. |
| `art` | `string` | yes |  | The path of the title screen's picture. |
| `gate` | [`GateOptions`](#gateoptions) | yes |  | The notice shown before the title screen until the player confirms it. |
| `splash` | `false \|` [`SplashOptions`](#splashoptions) | yes |  | The splash cards shown one after another as the game opens, before the gate and the title screen. The "Powered by IFLoom" card alone if left out, and none for `false`. |
| `pages` | `Record<string,` [`PageDef`](#pagedef)`>` | yes |  | The pages the game adds, by id. One with the id of a page a plugin UI adds, such as `achievements`, replaces it. |

## PageState

Type.

The page the player is on among the pages around the game, with the functions that move between them.

```ts shape
import type { PageState } from '@ifloom/react'
type PageState = {
  enabled: boolean
  page: Page
  from: Page | null
  go: (page: Page) => void
  back: () => void
  endSplash: () => void
  options: PagesOptions
  added: Readonly<Record<string, PageDef>>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `enabled` | `boolean` |  |  | True while pages are on. It's false when the game mounted without `pages`, and then the page is always `game`. |
| `page` | [`Page`](#page) |  |  | The page showing. |
| `from` | [`Page`](#page) `\| null` |  |  | The page under this one, which `back` returns to. It's null at the title screen, the gate and the game. |
| `go` | `(page:` [`Page`](#page)`) => void` |  |  | Shows a page. `title`, `game` and `gate` start afresh, and any other goes on top of the one showing. |
| `back` | `() => void` |  |  | Returns to the page under this one, or to the title screen when there is none. |
| `endSplash` | `() => void` |  |  | Ends the splash cards and shows the gate or the title screen. The splash page calls it after the last card. |
| `options` | [`PagesOptions`](#pagesoptions) |  |  | The options the pages were set up with. |
| `added` | `Readonly<Record<string,` [`PageDef`](#pagedef)`>>` |  |  | Every page added to the built-in ones, by id, the plugin UIs' (such as `achievements`) with the game's own `pages` over them. |

## PanelComponent

Type. Explained in [Components](/docs/0.1.2/reference/react/components#panelcomponent).

A component that renders a panel, for a scene's panel, an app's panel section or the `panel` effect. Its `data`
prop is the data the game's own panel returned, else the panel's `with`.

```ts shape
import type { PanelComponent } from '@ifloom/react'
type PanelComponent = ComponentType<{ data: unknown }>
```

## PanelHost

Const. Explained in [Components](/docs/0.1.2/reference/react/components#panelhost).

Renders the open panel, `view.panel`, in a `PartDialog`, and sends `closePanel` when the player closes it. The panel
gets its `with` as `data`.

It renders the game's own panel of that name, else a plugin UI's, else the built-in `stats`. The
default layout has one, and a layout of your own puts it anywhere inside the `GameProvider`.

```ts shape
import { PanelHost } from '@ifloom/react'
const PanelHost: ComponentType<object>
```

## PartKey

Type. Explained in [Components](/docs/0.1.2/reference/react/components#partkey).

A `data-part` name, either one the React UI renders or one a plugin's UI adds through `PartNames`.

```ts shape
import type { PartKey } from '@ifloom/react'
type PartKey =
  | 'entities'
  | 'actions'
  | 'inputs'
  | 'settings'
  | 'stats'
  | 'timers'
  | 'changes'
  | 'setting'
  | 'stat'
  | 'scene'
  | 'timer'
  | 'button'
  | 'picture'
  | 'video'
  | 'input'
  | 'choice'
  | 'minigame'
  | 'dice'
  | 'bold'
  | 'credits'
  | 'title'
  | 'viewer'
  | 'mods'
  | 'page'
  | 'sidebar'
  | 'story'
  | 'overlay'
  | 'clock'
  | 'section'
  | 'section-title'
  | 'section-toggle'
  | 'section-body'
  | 'section-badge'
  | 'top-bar'
  | 'top-bar-title'
  | 'drawer-button'
  | 'drawer'
  | 'drawer-overlay'
  | 'stat-label'
  | 'stat-value'
  | 'stat-level'
  | 'stat-progress'
  | 'stat-bar'
  | 'stat-pips'
  | 'stat-pip'
  | 'scene-transition'
  | 'scene-header'
  | 'scene-portrait'
  | 'scene-title'
  | 'scene-image'
  | 'beats'
  | 'beat'
  | 'speaker-name'
  | 'line'
  | 'line-portrait'
  | 'reveal'
  | 'inline-mail'
  | 'mail-header'
  | 'mail-body'
  | 'inline-prop'
  | 'inline-mono'
  | 'voice-replay'
  | 'group'
  | 'fold'
  | 'fold-summary'
  | 'fold-beats'
  | 'change'
  | 'change-text'
  | 'change-label'
  | 'inline-action'
  | 'tip'
  | 'tip-content'
  | 'inline-ui'
  | 'inline-modal'
  | 'italic'
  | 'picture-layer'
  | 'hotspot'
  | 'hotspot-warning'
  | 'viewer-open'
  | 'viewer-close'
  | 'choices'
  | 'choice-key'
  | 'choice-label'
  | 'choice-warning'
  | 'choice-price'
  | 'choice-irreversible'
  | 'choice-reason'
  | 'badge'
  | 'notices'
  | 'notices-more'
  | 'notice'
  | 'notice-image'
  | 'notice-title'
  | 'notice-text'
  | 'notice-dismiss'
  | 'notice-strip'
  | 'notice-strip-item'
  | 'dice-label'
  | 'dice-faces'
  | 'dice-face'
  | 'dice-plus'
  | 'dice-total'
  | 'dice-outcome'
  | 'dice-critical'
  | 'dice-overlay'
  | 'dice-dismiss'
  | 'timer-label'
  | 'timer-bar'
  | 'timer-left'
  | 'minigame-title'
  | 'minigame-state'
  | 'minigame-timer'
  | 'minigame-inputs'
  | 'minigame-input'
  | 'menu'
  | 'menu-button'
  | 'dialog'
  | 'dialog-overlay'
  | 'dialog-title'
  | 'dialog-close'
  | 'saves'
  | 'saves-actions'
  | 'save-slot'
  | 'save-name'
  | 'save-details'
  | 'saves-message'
  | 'saves-blocked'
  | 'saves-empty'
  | 'file-button'
  | 'backlog'
  | 'backlog-entry'
  | 'backlog-title'
  | 'backlog-choice'
  | 'backlog-empty'
  | 'mod'
  | 'mod-name'
  | 'mod-version'
  | 'mod-state'
  | 'mod-text'
  | 'mod-problem'
  | 'mods-message'
  | 'mods-empty'
  | 'mods-restart'
  | 'mods-changed'
  | 'entity-table'
  | 'entity-heading'
  | 'entity-columns'
  | 'entity-column'
  | 'entity-row'
  | 'entity-name'
  | 'entity-image'
  | 'entity-desc'
  | 'entity-value'
  | 'input-label'
  | 'input-field'
  | 'input-options'
  | 'input-submit'
  | 'input-error'
  | 'title-page'
  | 'title-art'
  | 'title-name'
  | 'title-subtitle'
  | 'title-buttons'
  | 'title-button'
  | 'page-heading'
  | 'page-back'
  | 'settings-page'
  | 'setting-label'
  | 'setting-control'
  | 'setting-value'
  | 'settings-empty'
  | 'settings-message'
  | 'settings-mods'
  | 'mods-title'
  | 'mods-hint'
  | 'load-page'
  | 'credits-page'
  | 'credit-group'
  | 'credit-group-title'
  | 'credit-group-description'
  | 'credit-list'
  | 'credit'
  | 'credit-art'
  | 'credit-name'
  | 'credit-link'
  | 'credit-role'
  | 'credit-meta'
  | 'gate-page'
  | 'gate-title'
  | 'gate-text'
  | 'gate-buttons'
  | 'gate-confirm'
  | 'gate-decline'
  | 'splash-page'
  | 'splash-card'
  | 'splash-art'
  | 'splash-title'
  | 'splash-text'
  | 'splash-skip'
  | 'splash-link'
  | Extract<keyof PartNames, string>
```

Uses: [`PartNames`](#partnames).

## PartNames

Type. Explained in [Components](/docs/0.1.2/reference/react/components#overridablecomponents-and-partnames).

The `data-part` names that plugin UIs add, as keys of an interface each UI augments. `classes` and `usePart` then
take them typed.

  declare module '@ifloom/react' {
    interface PartNames { shop: true; good: true }
  }

```ts shape
import type { PartNames } from '@ifloom/react'
type PartNames = {

  // …
}
```

Plugins add fields of their own to it, which their pages list.

## Picture

Const. Explained in [Components](/docs/0.1.2/reference/react/components#picture).

Renders a picture as an `<img>` that takes no space when its file is missing. Every picture the UI renders goes
through it, so replacing it in `components` changes them all.

It loads lazily, so a picture far down the page waits until the player scrolls near it. It renders nothing while the
game's pictures setting (`ui.settings.images`) is off, except inside a layered picture.

```ts shape
import { Picture } from '@ifloom/react'
const Picture: ComponentType<ClassAttributes<HTMLImageElement> & ImgHTMLAttributes<HTMLImageElement> & { 'data-part'?: string; }>
```

## Plugins

Component. Explained in [Plugin UIs and the kit](/docs/0.1.2/reference/react/kit#plugins).

Renders the components the game's plugin UIs place at one spot of the layout, in `plugins` order. The `room` spot
renders nothing while a minigame runs, since the minigame replaces the room.

The default layout has one at each `PluginSpot`, and a layout of your own puts them where it likes.

```ts shape
import { Plugins } from '@ifloom/react'
function Plugins(props: { at: PluginSpot }): JSX.Element | null
```

Uses: [`PluginSpot`](#pluginspot).

## PluginSectionComponent

Type. Explained in [Components](/docs/0.1.2/reference/react/components#pluginsectioncomponent).

A component that renders another plugin's view as a section of a device's app, such as a messages channel or a feed.
It gets the plugin's slice of the view and the section's `with`.

```ts shape
import type { PluginSectionComponent } from '@ifloom/react'
type PluginSectionComponent = ComponentType<{ data: unknown; with: Record<string, unknown> }>
```

## PluginSpot

Type. Explained in [Plugin UIs and the kit](/docs/0.1.2/reference/react/kit#pluginspot).

A spot in the layout where plugin UIs place their components, in the order of the game's `plugins` list. Each spot
is one of these:

- `stats`: inside the side column's Stats section, under the stats.
- `sidebar`: the side column, after the Stats section.
- `room`: the story, after the scene and before the room's actions. Nothing renders here while a minigame runs.
- `story`: the end of the story, after the room's actions.
- `strip`: the `NoticeStrip`'s row of counts, after the notices.

```ts shape
import type { PluginSpot } from '@ifloom/react'
type PluginSpot = 'stats' | 'sidebar' | 'room' | 'story' | 'strip'
```

## poweredByIFLoom

Function. Explained in [Components](/docs/0.1.2/reference/react/components#poweredbyifloom).

Returns the "Powered by IFLoom" card, with the IFLoom mark, the words `ui.poweredBy`, the IFLoom name and a link to
ifloom.dev labelled `ui.visitIfloom`. It holds for 3000 milliseconds.

A game that lists its own cards puts it among them where it should show, and `overrides` change its timing or
transition.

```ts shape
import { poweredByIFLoom } from '@ifloom/react'
function poweredByIFLoom(overrides?: Partial<Omit<SplashCard, 'id'>>): SplashCard
```

Uses: [`SplashCard`](#splashcard).

## PriceTag

Const. Explained in [Components](/docs/0.1.2/reference/react/components#pricetag).

Renders a choice's or action's price as the `choice-price` part, from the price's `text`, which names its stats and
then plugins' notes such as "until evening".

```ts shape
import { PriceTag } from '@ifloom/react'
const PriceTag: ComponentType<{ price: Price; className?: string; }>
```

Uses: [`Price`](/docs/0.1.2/api/engine#price).

## Reveal

Type. Explained in [Presentation hints](/docs/0.1.2/reference/react/hints#reveal-1).

The value of a block's `ui.reveal` hint, which holds the block back and then brings it in.

```ts shape
import type { Reveal } from '@ifloom/react'
type Reveal = {
  delay?: number
  as?: TransitionName
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `delay` | `number` | yes |  | The wait after the reveal before, or after the scene comes on, in milliseconds. 800 if left out. |
| `as` | [`TransitionName`](#transitionname) | yes |  | The transition the block comes in with. `'fade'` if left out. |

## RevealBeat

Type.

One beat of a run, with its index in the scene's beats and the settled roll its `ui.dice` names, if any.

```ts shape
import type { RevealBeat } from '@ifloom/react'
type RevealBeat = {
  beat: SceneBeat
  index: number
  roll?: Roll
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `beat` | [`SceneBeat`](/docs/0.1.2/api/engine#scenebeat) |  |  | The beat. |
| `index` | `number` |  |  | The beat's index in `view.scene.beats`. |
| `roll` | [`Roll`](/docs/0.1.2/api/engine#roll) | yes |  | The roll the beat's `ui.dice` names, rendered settled, when the roll isn't new. |

## RevealGroup

Type.

A run of a scene's beats with the reveal that holds it back. The first run shows with the screen and has no reveal.

```ts shape
import type { RevealGroup } from '@ifloom/react'
type RevealGroup = {
  reveal: RevealPoint | null
  dice?: Roll
  beats: RevealBeat[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `reveal` | [`RevealPoint`](#revealpoint) `\| null` |  |  | The reveal that holds this run back, or null for the first run, which shows with the screen. |
| `dice` | [`Roll`](/docs/0.1.2/api/engine#roll) | yes |  | The new roll its first beat's `ui.dice` names. Its dice tumble before the run, which waits for them to settle. |
| `beats` | [`RevealBeat[]`](#revealbeat) |  |  | The run's beats, in order. |

## RevealPoint

Type.

A reveal the React UI plays, a point where the body holds back its next run of beats. It gives the run's delay, transition and time.

```ts shape
import type { RevealPoint } from '@ifloom/react'
type RevealPoint = {
  delay: number
  as: TransitionName
  at: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `delay` | `number` |  |  | The time between the run before and this run, in milliseconds. |
| `as` | [`TransitionName`](#transitionname) |  |  | The transition the run comes in with. |
| `at` | `number` |  |  | The time the run comes in, in milliseconds from the screen coming on. |

## RoomActions

Const. Explained in [Components](/docs/0.1.2/reference/react/components#roomactions).

Renders the room's actions from `view.actions`, the game's own and its plugins', such as a location's. Its list is
the `actions` part.

```ts shape
import { RoomActions } from '@ifloom/react'
const RoomActions: ComponentType<{ className?: string; }>
```

## SavesMenu

Const. Explained in [Components](/docs/0.1.2/reference/react/components#savesmenu).

Renders the save and load menu as the `saves` part from `useSaves`. It needs a runner made with `saves`.

It lists every slot newest first, to load, overwrite, delete or export as a file, and each save that can't be read,
to delete. It has buttons for a new slot and for importing a file. While the game's `saveable` refuses saving, the
Save buttons are disabled with the reason. It says when a loaded save was made with packs or plugins this game
doesn't have.

```ts shape
import { SavesMenu } from '@ifloom/react'
const SavesMenu: ComponentType<{ className?: string; onLoaded?: (() => void); }>
```

## SavesState

Type.

The saves and the functions that change them, which `useSaves` returns to a save menu. Each function resolves to true when it worked.

```ts shape
import type { SavesState } from '@ifloom/react'
type SavesState = {
  available: boolean
  saving: SavingView
  slots: SaveMeta[]
  broken: BrokenSave[]
  save: (name?: string) => Promise<boolean>
  overwrite: (slot: string) => Promise<boolean>
  load: (slot: string) => Promise<boolean>
  remove: (slot: string) => Promise<boolean>
  exportFile: (slot: string) => Promise<boolean>
  importFile: (file: File) => Promise<boolean>
  message: string | null
  missingPacks: string[]
  missingPlugins: string[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `available` | `boolean` |  |  | True when the runner has saves. It's false when the runner was made without `saves`, and there's nothing to list. |
| `saving` | [`SavingView`](/docs/0.1.2/api/engine#savingview) |  |  | The game's answer to saving now, from `view.saving`, with the reason when it refuses. Loading is always allowed. |
| `slots` | [`SaveMeta[]`](/docs/0.1.2/api/engine#savemeta) |  |  | Every save that can be read, newest first, from the runner's snapshot. |
| `broken` | [`BrokenSave[]`](/docs/0.1.2/api/engine#brokensave) |  |  | The saves that exist but can't be read, each with the reason. They can only be deleted. |
| `save` | `(name?: string) => Promise<boolean>` |  |  | Saves in a new slot, the next free number, with the player's `name` for it if given. |
| `overwrite` | `(slot: string) => Promise<boolean>` |  |  | Saves over an existing slot. |
| `load` | `(slot: string) => Promise<boolean>` |  |  | Loads a slot. |
| `remove` | `(slot: string) => Promise<boolean>` |  |  | Deletes a slot. When it fails, `message` gives the reason. |
| `exportFile` | `(slot: string) => Promise<boolean>` |  |  | Downloads a slot as a `.json` file the player can keep. When it fails, `message` gives the reason. |
| `importFile` | `(file: File) => Promise<boolean>` |  |  | Loads a save from a file the player kept. |
| `message` | `string \| null` |  |  | The reason the last save, load, delete, export or import failed, or null. |
| `missingPacks` | `string[]` |  |  | The packs the last loaded save was made with that this game doesn't have. |
| `missingPlugins` | `string[]` |  |  | The plugins the last loaded save was made with that this game doesn't have. |

## Say

Type. Explained in [Components](/docs/0.1.2/reference/react/components#uistringkey-words-and-say).

A function that returns a word by its key, with each `{name}` in it filled from `vars`.

```ts shape
import type { Say } from '@ifloom/react'
type Say<K extends string = UiStringKey> = (key: K, vars?: Record<string, string | number>) => string
```

## Scene

Const. Explained in [Components](/docs/0.1.2/reference/react/components#scene).

Renders `view.scene`, the open scene or the room, with its picture, body and choices. While a minigame runs it
renders the panel named by the minigame's id, else `MinigameCard`.

A panel the open scene holds renders in place of its choices.
The picture is the scene's `LayeredPicture` when it has one, else its `image`. When `view.scene.key` changes it plays
the `ui.transition` hints in a `scene-transition` part, which keeps a copy of the scene before for its `out`. It
reveals each block with a `ui.reveal` hint in a `reveal` part, with the choices after the last, and a click or key
press shows the rest at once. The `motion` option or the player's reduced-motion setting turns this off. A speaker
with a `ui.hue` gets their lines in that colour. `useScene` sets the timing, and `SceneHeader` renders the heading.

A block with a `ui.dice` hint gets the `DiceRoll` of the last command's roll under that key, rendered before it, and
a new roll's block waits for its dice to settle. New rolls that no block names show for a moment in a `DiceOverlay`.
A block with a `ui.timer` hint gets a `Countdown` of that timer after it, while the timer runs.

The beats of a body section with any ui hint render together in a `BeatGroup`, and a section with a `ui.fold` hint
has its beats in a `Fold` inside its group. Replace either, or `SceneHeader`, in `components` to restyle that part
and keep the motion.

The inputs on offer while the scene is open (`view.inputs`) render after its body and before its choices, as
`InputField`s in an `inputs` part. The layout's `InputFields` renders only those on offer while no scene is open.

```ts shape
import { Scene } from '@ifloom/react'
const Scene: ComponentType<{ className?: string; }>
```

## SceneHeader

Const. Explained in [Components](/docs/0.1.2/reference/react/components#sceneheader).

Renders the scene's heading from `view.scene`, passed as `scene`, in a `scene-header` part. It holds the speaker's
portrait (`scene-portrait`) when the speaker has a picture, and the title (`scene-title`).

Replace it in `components` to render the heading your own way, and it still comes in with the scene.

```ts shape
import { SceneHeader } from '@ifloom/react'
const SceneHeader: ComponentType<{ scene: { id: string | null; key: string; title: string; body: string; beats: SceneBeat[]; fresh: number; tags: string[]; speaker: SpeakerView | null; image: string | null; picture: PictureView | null; choices: RenderedChoice[]; ui?: Ui<SceneUi>; }; }>
```

Uses: [`SceneBeat`](/docs/0.1.2/api/engine#scenebeat), [`SpeakerView`](/docs/0.1.2/api/engine#speakerview), [`PictureView`](/docs/0.1.2/api/engine#pictureview), [`RenderedChoice`](/docs/0.1.2/api/engine#renderedchoice), [`Ui`](/docs/0.1.2/api/engine#ui), [`SceneUi`](/docs/0.1.2/api/engine#sceneui).

## SceneRolls

Type.

The rolls on screen, both all the last command made and the new ones whose dice tumble.

```ts shape
import type { SceneRolls } from '@ifloom/react'
type SceneRolls = {
  all: readonly Roll[]
  fresh: readonly Roll[]
  at: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `all` | `readonly` [`Roll[]`](/docs/0.1.2/api/engine#roll) |  |  | The rolls the last command made, `view.rolls`. |
| `fresh` | `readonly` [`Roll[]`](/docs/0.1.2/api/engine#roll) |  |  | The new rolls whose dice tumble, made by the command that led here. It's empty for a screen that wasn't new. |
| `at` | `number` |  |  | A count that goes up with each new set of rolls. Key the dice by it, so a new set tumbles again. |

## SceneTiming

Type.

The scene's timing that `useScene` returns and `Scene` renders from, with its transitions, runs of beats, wait and rolls.

```ts shape
import type { SceneTiming } from '@ifloom/react'
type SceneTiming = {
  view: View
  motion: boolean
  transition: ScreenTransition
  leave: { out?: TransitionName; ms?: number }
  groups: RevealGroup[]
  last: number
  pending: boolean
  revealed: boolean
  skip: () => void
  rolls: SceneRolls
  unnamed: readonly Roll[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `view` | [`View`](/docs/0.1.2/api/engine#view) |  |  | The view being rendered. |
| `motion` | `boolean` |  |  | True when transitions, reveals and tumbling dice play. It's the `motion` option, unless the player asks for reduced motion. |
| `transition` | [`ScreenTransition`](#screentransition) |  |  | The transitions this screen comes in and goes out with. Key the screen's element by its `key`. |
| `leave` | `{ out?:` [`TransitionName`](#transitionname)`; ms?: number }` |  |  | The transition the screen before goes out with, from the choice that led here, over that screen's own. |
| `groups` | [`RevealGroup[]`](#revealgroup) |  |  | The scene's beats in runs, first those shown with the screen, then each that waits for a reveal or for dice. It's empty while a minigame runs. |
| `last` | `number` |  |  | The time the last run comes in, in milliseconds from the screen coming on, or 0 with none. The choices come with it. |
| `pending` | `boolean` |  |  | True while runs are still to come. Until then the choices are disabled, and a click or a key calls `skip`. |
| `revealed` | `boolean` |  |  | True once the player skipped the wait or every run has come in. Dice rendered after that show settled. |
| `skip` | `() => void` |  |  | Shows every run at once. |
| `rolls` | [`SceneRolls`](#scenerolls) |  |  | The rolls on screen. |
| `unnamed` | `readonly` [`Roll[]`](/docs/0.1.2/api/engine#roll) |  |  | The new rolls that no beat on screen names, which show for a moment over the scene in a `DiceOverlay`. |

## ScreenTransition

Type.

The transitions of the screen showing, how it comes in and goes out.

```ts shape
import type { ScreenTransition } from '@ifloom/react'
type ScreenTransition = {
  key: string
  in: TransitionName
  out: TransitionName
  ms: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `key` | `string` |  |  | The screen's key, `view.scene.key`. Key the screen's element by it, so a new screen is a new element. |
| `in` | [`TransitionName`](#transitionname) |  |  | The transition the screen comes in with. |
| `out` | [`TransitionName`](#transitionname) |  |  | The transition the screen goes out with. |
| `ms` | `number` |  |  | The length of each transition, in milliseconds. |

## Section

Const. Explained in [Components](/docs/0.1.2/reference/react/components#section).

Renders a titled section of a layout, in the side column or the story, as the `section` part. It hides itself when
its children render nothing, such as a missing plugin or an empty list.

- `collapsible` folds it in place with a button on its title. Each player's
  choice is remembered per `id` in the profile's `ui:sections`.
- `dialog` renders its title, with `badge` if given, as a button that opens
  the children in a dialog. It looks like a folding section's title, with
  its chevron pointing out.
- `when` shows it only while a condition holds.

```ts shape
import { Section } from '@ifloom/react'
const Section: ComponentType<SectionProps>
```

Uses: [`SectionProps`](#sectionprops).

## SectionProps

Type.

The props of `Section`.

```ts shape
import type { SectionProps } from '@ifloom/react'
type SectionProps = {
  id: string
  title: string
  collapsible?: boolean
  dialog?: boolean
  open?: boolean
  when?: Condition
  badge?: ReactNode
  className?: string
  children?: ReactNode
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The section's id, under which the profile keeps whether the player folded it. |
| `title` | `string` |  |  | The section's heading. |
| `collapsible` | `boolean` | yes |  | True to fold the section in place with a button on its title. The profile remembers the player's choice. |
| `dialog` | `boolean` | yes |  | True to render the section as a button that opens its children in a dialog, in place of the children. |
| `open` | `boolean` | yes |  | True to start a folding section open. True if left out, and the player's last choice wins. |
| `when` | [`Condition`](/docs/0.1.2/api/engine#condition) | yes |  | The condition the section shows under, such as `{ 'places/at': { location: 'home' } }`. Always shown if left out. |
| `badge` | `ReactNode` | yes |  | A small mark after the title, such as a count or "new". |
| `className` | `string` | yes |  | Classes added to the `section` part's own. |
| `children` | `ReactNode` | yes |  | The section's contents. |

## SettingsPage

Const. Explained in [Components](/docs/0.1.2/reference/react/components#settingspage).

Renders the settings page from `view.settings`, with a checkbox for a toggle, radio buttons for a choice and a slider
for a range. Its root is the `settings-page` part.

Each change goes through `runner.setSetting`, which writes a UI setting to the profile, and changes a play setting in
the game in play and keeps it in the profile for the next new game. A refusal shows under the list. Each plugin UI's
`settings` follow, such as the unlocks plugin's code box, and with `mods` on, a Mods section with the `ModManager`.

```ts shape
import { SettingsPage } from '@ifloom/react'
const SettingsPage: ComponentType<{ className?: string; }>
```

## Sidebar

Const. Explained in [Components](/docs/0.1.2/reference/react/components#sidebar).

Renders the side column, the `sidebar` part, with its children. Below Tailwind's `md` (48rem) it becomes a drawer
behind a `top-bar` with the game's title, the clock and a `drawer-button`.

The `drawer` is a dialog, so focus stays in it and Escape closes it. It closes after the player chooses something,
unless a dialog it opened is still open.

```ts shape
import { Sidebar } from '@ifloom/react'
const Sidebar: ComponentType<SidebarProps>
```

Uses: [`SidebarProps`](#sidebarprops).

## SidebarProps

Type.

The props of `Sidebar`.

```ts shape
import type { SidebarProps } from '@ifloom/react'
type SidebarProps = {
  className?: string
  children?: ReactNode
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `className` | `string` | yes |  | Classes added to the `sidebar` part's own. |
| `children` | `ReactNode` | yes |  | The side column's contents, such as sections, the stats and plugin spots. |

## SplashCard

Type.

One splash card, shown for `ms` between its transitions in and out. It shows `art`, `title` and `text`, or its own `component`.

```ts shape
import type { SplashCard } from '@ifloom/react'
type SplashCard = {
  id: string
  art?: string
  title?: string
  text?: string
  component?: ComponentType
  ms?: number
  transition?: Transition | TransitionName
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The card's id, which its element carries as `data-splash-card`. |
| `art` | `string` | yes |  | The path of the card's picture, such as a logo. |
| `title` | `string` | yes |  | The card's heading, such as the studio's name. |
| `text` | `string` | yes |  | A line under the heading. |
| `component` | `ComponentType` | yes |  | A component that renders the whole card in place of `art`, `title` and `text`, such as an animated logo. |
| `ms` | `number` | yes |  | The card's hold, in milliseconds between coming in and going out. 2000 if left out. |
| `transition` | [`Transition`](#transition) `\|` [`TransitionName`](#transitionname) | yes |  | The card's transitions in and out, a name or `{ in, out, ms }`. A fade of 600 milliseconds each way if left out. |

## SplashOptions

Type.

The splash cards a game shows as it opens, in `PagesOptions.splash`.

```ts shape
import type { SplashOptions } from '@ifloom/react'
type SplashOptions = {
  cards: SplashCard[]
  skippable?: boolean
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `cards` | [`SplashCard[]`](#splashcard) |  |  | The cards, in the order they show. Leave out `poweredByIFLoom()` to leave out its card. |
| `skippable` | `boolean` | yes |  | False to make the player watch every card. A click, Enter or Space skips one, and Escape skips them all, if left out. |

## SplashPage

Const. Explained in [Components](/docs/0.1.2/reference/react/components#splashpage).

Renders the splash cards from `PagesOptions.splash` one after another, then calls `usePage().endSplash()`.

Each card comes in, holds for its `ms` and goes out by its transition. While they're skippable, a click, Enter or
Space skips a card, and Escape or the Skip button skips them all. With reduced motion the cards hold without
transitions.

```ts shape
import { SplashPage } from '@ifloom/react'
const SplashPage: ComponentType<{ className?: string; }>
```

## StatDisplay

Type. Explained in [Presentation hints](/docs/0.1.2/reference/react/hints#statdisplay).

The value of a stat's `ui.display` hint, which renders it as its number, a bar from `min` to `max`, or pips, one per point.

```ts shape
import type { StatDisplay } from '@ifloom/react'
type StatDisplay = 'number' | 'bar' | 'pips'
```

## StatGauge

Component. Explained in [Plugin UIs and the kit](/docs/0.1.2/reference/react/kit#statgauge).

Renders a stat's value as a bar from its `min` to its `max`, or as one pip per point, by its `ui.display` hint.
`StatList` renders it as the `<dd>` under each stat.

Pips wrap in rows of ten at most, of equal length, set by the `--pips-per-row` custom property on the `stat-pips`
part.

```ts shape
import { StatGauge } from '@ifloom/react'
function StatGauge(props: { stat: StatView }): JSX.Element
```

Uses: [`StatView`](/docs/0.1.2/api/engine#statview).

## StatList

Const. Explained in [Components](/docs/0.1.2/reference/react/components#statlist).

Renders the stats in `view.stats` as the `stats` list, each value formatted by the game. A stat with levels also
shows its level and a bar towards the next one.

A stat whose `ui.display` hint is `'bar'` gets a bar from its `min` to its `max` under it, and one with `'pips'` a
row of pips, one per point, or a bar past 20.

```ts shape
import { StatList } from '@ifloom/react'
const StatList: ComponentType<object>
```

## Story

Const. Explained in [Components](/docs/0.1.2/reference/react/components#story).

Renders the story, the main column, as the `story` part with its children. It fills the width the side column
leaves.

The scene's title, prose, choices, inputs, exits and the people here keep to `--width-prose`, a reading column
centred in the story unless `align` or `--margin-prose` moves it. Pictures and panels take the full width.

```ts shape
import { Story } from '@ifloom/react'
const Story: ComponentType<StoryProps>
```

Uses: [`StoryProps`](#storyprops).

## StoryProps

Type.

The props of `Story`.

```ts shape
import type { StoryProps } from '@ifloom/react'
type StoryProps = {
  align?: 'center' | 'start'
  className?: string
  children?: ReactNode
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `align` | `'center' \| 'start'` | yes |  | The reading column's place when the story is wider than `--width-prose`, `'center'` or `'start'`. The `--margin-prose` token decides if left out, and centres it unless a preset or the game's stylesheet changes it. |
| `className` | `string` | yes |  | Classes added to the `story` part's own. |
| `children` | `ReactNode` | yes |  | The story's contents, such as the scene, the inputs, the room's actions and plugin spots. |

## StyleOptions

Type.

The options that change how the UI looks, part of `UiOptions`. They replace components and restyle parts.

```ts shape
import type { StyleOptions } from '@ifloom/react'
type StyleOptions = {
  components?: Components
  classes?: Classes
  unstyled?: boolean
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `components` | [`Components`](#components) | yes |  | The game's replacements for built-in components, by name. |
| `classes` | [`Classes`](#classes) | yes |  | The game's classes for the UI's parts, by `data-part` name. |
| `unstyled` | `boolean` | yes |  | True to drop every built-in class, keeping the structure and the `data-part`s for your own styles. False if left out. |

## TEXT_SIZES

Const. Explained in [Presentation hints](/docs/0.1.2/reference/react/hints#text_sizes).

The text sizes the React UI's styles size the page for, the values of the `ui.settings.textSize` setting. Another
value needs CSS of the game's own.

```ts shape
import { TEXT_SIZES } from '@ifloom/react'
const TEXT_SIZES: readonly ['small', 'normal', 'large', 'larger']
```

## TextSize

Function. Explained in [Components](/docs/0.1.2/reference/react/components#textsize).

Renders nothing, and copies the setting the game names in `ui.settings.textSize` to `data-text-size` on `<html>`
whenever it changes. The styles size every page from there, the title screen's included.

`GameShell` renders one.

```ts shape
import { TextSize } from '@ifloom/react'
function TextSize(): null
```

## Timers

Const. Explained in [Components](/docs/0.1.2/reference/react/components#timers).

Renders a `Countdown` for every running timer in `view.timers`, in the order they started, and nothing while none runs.

```ts shape
import { Timers } from '@ifloom/react'
const Timers: ComponentType<{ className?: string; }>
```

## Tip

Const. Explained in [Components](/docs/0.1.2/reference/react/components#tip).

Renders a tooltip in prose from `[[tip:key|words]]`, the words as a `tip` button with the note in a `tip-content`
bubble. The bubble shows on hover, keyboard focus or a tap.

Screen readers read the note as the button's description.

```ts shape
import { Tip } from '@ifloom/react'
const Tip: ComponentType<{ text: string; tip: string; className?: string; }>
```

## Title

Const. Explained in [Components](/docs/0.1.2/reference/react/components#title).

Renders the game's title from `view.title`, the `title` part.

```ts shape
import { Title } from '@ifloom/react'
const Title: ComponentType<{ className?: string; }>
```

## TitlePage

Const. Explained in [Components](/docs/0.1.2/reference/react/components#titlepage).

Renders the title screen, with the game's title, the subtitle and art when given, and a button for each page. Its
root is the `title-page` part.

The buttons are Continue (the newest save), New game, New Game+ (once the game is finished, if it carries anything
over), Load, Settings (if the game has any), each added page with `showOnTitle`, and Credits (if given).

```ts shape
import { TitlePage } from '@ifloom/react'
const TitlePage: ComponentType<{ className?: string; }>
```

## Transition

Type. Explained in [Presentation hints](/docs/0.1.2/reference/react/hints#transition-1).

A pair of transitions for a screen coming in and going out, the value of a `ui.transition` hint. A name on its own sets `in`.

```ts shape
import type { Transition } from '@ifloom/react'
type Transition = {
  in?: TransitionName
  out?: TransitionName
  ms?: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `in` | [`TransitionName`](#transitionname) | yes |  | The transition the new screen comes in with. |
| `out` | [`TransitionName`](#transitionname) | yes |  | The transition the screen before goes out with. |
| `ms` | `number` | yes |  | The length of each transition, in milliseconds. 300 if left out. |

## TransitionName

Type. Explained in [Presentation hints](/docs/0.1.2/reference/react/hints#transitionname).

The name of a transition, one of `TRANSITIONS` or one the game adds.

```ts shape
import type { TransitionName } from '@ifloom/react'
type TransitionName = (typeof TRANSITIONS)[number] | (string & {})
```

## TRANSITIONS

Const.

The names of the transitions the React UI's styles play. A game adds its own names in `ui.transitionNames` on the
game, with CSS of its own.

```ts shape
import { TRANSITIONS } from '@ifloom/react'
const TRANSITIONS: readonly ['fade', 'slide-up', 'slide-left', 'zoom', 'none']
```

## UiOptions

Type. Explained in [Components](/docs/0.1.2/reference/react/components#uioptions).

The options that make the React UI a game's own, how it looks and how it behaves. `GameProvider`, `GameShell` and
`mountGame` all take them.

```ts shape
import type { UiOptions } from '@ifloom/react'
type UiOptions = {
  components?: Components
  classes?: Classes
  unstyled?: boolean
  viewer?: boolean
  keys?: boolean | KeyOptions
  motion?: boolean
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `components` | [`Components`](#components) | yes |  | The game's replacements for built-in components, by name. |
| `classes` | [`Classes`](#classes) | yes |  | The game's classes for the UI's parts, by `data-part` name. |
| `unstyled` | `boolean` | yes |  | True to drop every built-in class, keeping the structure and the `data-part`s for your own styles. False if left out. |
| `viewer` | `boolean` | yes |  | True to let the player click a picture or a video in the story to see it large. True if left out. |
| `keys` | `boolean \|` [`KeyOptions`](#keyoptions) | yes |  | The keyboard shortcuts, 1 to 9 for the choices or actions on screen, Escape for the menu and the game's own keys in `map`. Off if left out. A minigame's keys work either way. |
| `motion` | `boolean` | yes |  | True to play scene transitions and prose reveals, the `ui.transition` and `ui.reveal` hints. True if left out, and `false` shows every scene and every line at once. A player whose system asks for reduced motion sees them at once either way. |

## UiProvider

Component. Explained in [Components](/docs/0.1.2/reference/react/components#uiprovider).

Renders its children with a game's `UiOptions`. A provider inside another adds to the outer one's options, so a
screen can restyle its own corner.

`GameProvider` renders one.

```ts shape
import { UiProvider } from '@ifloom/react'
function UiProvider(props: UiOptions & { children: ReactNode }): JSX.Element
```

Uses: [`UiOptions`](#uioptions).

## UiStringKey

Type. Explained in [Components](/docs/0.1.2/reference/react/components#uistringkey-words-and-say).

The key of one of the React UI's own words, such as `'stats'` or `'newGame'`.

```ts shape
import type { UiStringKey } from '@ifloom/react'
type UiStringKey =
  | 'settings'
  | 'stats'
  | 'changes'
  | 'chose'
  | 'close'
  | 'remove'
  | 'newGame'
  | 'dismiss'
  | 'noSaves'
  | 'credits'
  | 'mods'
  | 'notices'
  | 'menu'
  | 'saves'
  | 'backlog'
  | 'zoom'
  | 'load'
  | 'statLevel'
  | 'statProgress'
  | 'allSeen'
  | 'back'
  | 'undo'
  | 'redo'
  | 'save'
  | 'saveNew'
  | 'exportSave'
  | 'importSave'
  | 'brokenSave'
  | 'missingPacks'
  | 'missingPlugins'
  | 'backlogEmpty'
  | 'enter'
  | 'addMod'
  | 'noMods'
  | 'modOn'
  | 'modOff'
  | 'applyMods'
  | 'modsHint'
  | 'modsChanged'
  | 'continue'
  | 'newGamePlus'
  | 'noSettings'
  | 'poweredBy'
  | 'visitIfloom'
  | 'skipSplash'
  | 'titlePage'
  | 'replayVoice'
  | 'closeViewer'
  | 'openSidebar'
  | 'timeLeft'
  | 'timerLeft'
  | 'diceNeeds'
  | 'dicePassed'
  | 'diceFailed'
  | 'diceCriticalMax'
  | 'diceCriticalMin'
  | 'diceRolled'
  | 'diceRolledPassed'
  | 'diceRolledFailed'
  | 'diceDismiss'
  | 'noticesMore'
  | 'noticesFewer'
  | 'unread'
```

## useAudio

Function. Explained in [Components](/docs/0.1.2/reference/react/components#useaudio).

Returns the audio player once it has started, and plays the game's sound with `@ifloom/audio` while mounted. Outside
a `GameProvider` it throws unless you pass `runner`.

`GameShell` and `mountGame` play the game's sound themselves. A `useAudio` beside them takes over from theirs with
its options, so the sound never plays twice. It reads the options once, when the player starts.

```ts shape
import { useAudio } from '@ifloom/react'
function useAudio(options?: AudioOptions & { runner?: Runner }): AudioPlayer | null
```

Uses: [`AudioOptions`](/docs/0.1.2/api/audio#audiooptions), [`Runner`](/docs/0.1.2/api/engine#runner), [`AudioPlayer`](/docs/0.1.2/api/audio#audioplayer).

## useBacklog

Function. Explained in [Components](/docs/0.1.2/reference/react/components#usebacklog).

Returns the backlog's entries from the runner's snapshot, oldest first, and re-renders when they change. It's empty
unless the runner's backlog is on.

```ts shape
import { useBacklog } from '@ifloom/react'
function useBacklog(): readonly BacklogEntry[]
```

Uses: [`BacklogEntry`](/docs/0.1.2/api/engine#backlogentry).

## useClock

Function. Explained in [Components](/docs/0.1.2/reference/react/components#useclock).

Returns the game's time from the running game, as the plugins' `label`s write it in `view.when`. It re-renders with
each new view, and `Clock` renders from it.

```ts shape
import { useClock } from '@ifloom/react'
function useClock(): ClockState
```

Uses: [`ClockState`](#clockstate).

## useGame

Function. Explained in [Components](/docs/0.1.2/reference/react/components#usegame).

Returns the running game, with the runner, its snapshot, the view and `send`. It throws outside a `GameProvider`, and
re-renders with each new snapshot.

```ts shape
import { useGame } from '@ifloom/react'
function useGame(): GameContextValue
```

Uses: [`GameContextValue`](#gamecontextvalue).

## useHolds

Function. Explained in [Components](/docs/0.1.2/reference/react/components#useholds).

Returns true while a condition holds in the running game's state, and re-renders with each new state. It takes any
condition content can write, such as `{ 'places/at': { location: 'home' } }`, and returns true for none.

It only reads, so saves and replays stay as they were. Use it to place a part of a layout by a condition the view
has no field for, as `Section`'s `when` and `When` do. What the story shows belongs in content, where the engine
checks it.

```ts shape
import { useHolds } from '@ifloom/react'
function useHolds(condition: Condition | undefined): boolean
```

Uses: [`Condition`](/docs/0.1.2/api/engine#condition).

## useMinigame

Function. Explained in [Components](/docs/0.1.2/reference/react/components#useminigame).

Returns the running minigame and a `send` for its inputs from the running game, re-rendering with each new view.
With `keys: true` it also maps the keyboard to the inputs, as `MinigameCard` does.

The minigame's timer runs on the game's clock, which `GameProvider` starts.

```ts shape
import { useMinigame } from '@ifloom/react'
function useMinigame(options?: { keys?: boolean }): MinigameControls
```

Uses: [`MinigameControls`](#minigamecontrols).

## useMods

Function. Explained in [Components](/docs/0.1.2/reference/react/components#usemods).

Returns the player's mods and the functions that add, toggle, remove and restart them, for a mod manager of your own.
It needs `mods` on the provider.

```ts shape
import { useMods } from '@ifloom/react'
function useMods(): ModsState
```

Uses: [`ModsState`](#modsstate).

## useMotion

Function. Explained in [Components](/docs/0.1.2/reference/react/components#usemotion).

Returns true when the UI plays transitions and reveals. That's the `motion` option, unless the player's system asks
for reduced motion.

```ts shape
import { useMotion } from '@ifloom/react'
function useMotion(): boolean
```

## usePage

Function. Explained in [Components](/docs/0.1.2/reference/react/components#usepage).

Returns the page the player is on and the functions that move between pages. With `pages` off, `enabled` is false and
the page is always `game`.

```ts shape
import { usePage } from '@ifloom/react'
function usePage(): PageState
```

Uses: [`PageState`](#pagestate).

## usePart

Function. Explained in [Components](/docs/0.1.2/reference/react/components#usepart).

Returns the `data-part` and `className` attributes for one part. `defaults` are its built-in classes, and `extra` is
a caller's `className`, added last.

The game's `classes` for the part go over `defaults`, and `unstyled` drops `defaults`.

```ts shape
import { usePart } from '@ifloom/react'
function usePart(name: PartKey, defaults: string, extra?: string): { 'data-part': PartKey; className: string }
```

Uses: [`PartKey`](#partkey).

## usePicturesShown

Function. Explained in [Components](/docs/0.1.2/reference/react/components#usepicturesshown).

Returns false while the setting the game names in `ui.settings.images` is off, and true otherwise. It's true outside
a game, in a game that names no setting and inside `KeepPicturesOn`.

```ts shape
import { usePicturesShown } from '@ifloom/react'
function usePicturesShown(): boolean
```

## usePluginUis

Function. Explained in [Plugin UIs and the kit](/docs/0.1.2/reference/react/kit#usepluginuis).

Returns the running game's plugin UIs, those whose plugin the game has, in the order of its `plugins` list.

```ts shape
import { usePluginUis } from '@ifloom/react'
function usePluginUis(): readonly PluginUi[]
```

Uses: [`PluginUi`](/docs/0.1.2/api/react-kit#pluginui).

## useProfile

Function. Explained in [Components](/docs/0.1.2/reference/react/components#useprofile).

Returns the value the profile holds in a namespace, and re-renders when it changes. It's undefined without a profile
or before the first read.

```ts shape
import { useProfile } from '@ifloom/react'
function useProfile<T = unknown>(namespace: string): T | undefined
```

## useReducedMotion

Function.

Returns true while the player's system asks for reduced motion, and re-renders when the setting changes.

```ts shape
import { useReducedMotion } from '@ifloom/react'
function useReducedMotion(): boolean
```

## useSaves

Function. Explained in [Components](/docs/0.1.2/reference/react/components#usesaves).

Returns the saves and the functions that save, load, delete, export and import them, for a save menu of your own. It
re-renders when the saves change, and needs a runner made with `saves`.

```ts shape
import { useSaves } from '@ifloom/react'
function useSaves(): SavesState
```

Uses: [`SavesState`](#savesstate).

## useScene

Function. Explained in [Components](/docs/0.1.2/reference/react/components#usescene).

Returns the scene's timing from the running game, which `Scene` renders from. Use it in a scene component of your
own to keep the React UI's motion.

It covers these:

- The transition: the screen's `ui.transition` over the game's, with the
  choice that led here (the runner's `snapshot.pressed`) setting how it
  comes in and, with an `out`, how the screen before goes.
- The runs: the beats shown with the screen, then each block with a
  `ui.reveal`, or a `ui.dice` naming a new roll from the last command,
  and the beats after it, each with when it comes.
- The wait: `pending` until the player clicks or presses a key (the first
  key press after a screen comes on calls `skip`, and does nothing else),
  or until the last run has come in.
- The dice: new rolls (`rolls.fresh`) tumble before their run. Any other
  roll a beat names is on its `roll`, rendered settled, and new rolls no
  beat names are `unnamed`.

With motion off nothing waits, so `pending` is false and every roll is settled.

```ts shape
import { useScene } from '@ifloom/react'
function useScene(): SceneTiming
```

Uses: [`SceneTiming`](#scenetiming).

## useSetting

Function. Explained in [Components](/docs/0.1.2/reference/react/components#usesetting).

Returns a setting's value from the runner's snapshot, and re-renders when it changes. It's undefined for a setting
the game doesn't declare.

A play setting's value comes from the game in play, and a UI setting's from the profile.

```ts shape
import { useSetting } from '@ifloom/react'
function useSetting(id: string): KvValue | undefined
```

Uses: [`KvValue`](/docs/0.1.2/api/engine#kvvalue).

## useTimer

Function. Explained in [Components](/docs/0.1.2/reference/react/components#usetimer-and-usetimers).

Returns one running timer by id from `view.timers`, or null when it isn't running because it hasn't started, has
stopped or has run out.

```ts shape
import { useTimer } from '@ifloom/react'
function useTimer(id: string): TimerView | null
```

Uses: [`TimerView`](/docs/0.1.2/api/engine#timerview).

## useTimers

Function. Explained in [Components](/docs/0.1.2/reference/react/components#usetimer-and-usetimers).

Returns the running timers from `view.timers`, in the order they started, and re-renders with each new view.

```ts shape
import { useTimers } from '@ifloom/react'
function useTimers(): TimerView[]
```

Uses: [`TimerView`](/docs/0.1.2/api/engine#timerview).

## useWords

Function. Explained in [Components](/docs/0.1.2/reference/react/components#usewords).

Returns a `Say` for the running game's UI words, each the game's `ui.<key>` string over the English. Given a
plugin UI's own `words`, it returns those keys too.

```ts shape
import { useWords } from '@ifloom/react'
function useWords(): Say
function useWords<W extends Words>(words: W): Say<(keyof W & string) | UiStringKey>
```

Uses: [`Say`](#say), [`Words`](#words), [`UiStringKey`](#uistringkey).

## Video

Const. Explained in [Components](/docs/0.1.2/reference/react/components#video).

Renders a video clip inline, from a `video` beat, a layered picture's layer or a post. By default it plays like a GIF,
by itself, looping and muted.

It loads nothing until it scrolls into view, starts when it does and pauses when it scrolls out again. A clip with
sound follows the game's audio settings. It's muted while the mute setting is on, and otherwise plays at the `video`
channel's volume setting, else the `sfx` channel's.

```ts shape
import { Video } from '@ifloom/react'
const Video: ComponentType<VideoProps>
```

Uses: [`VideoProps`](#videoprops).

## VideoProps

Type.

The props of `Video`, a `<video>`'s props with the fields a `video` beat gives.

```ts shape
import type { VideoProps } from '@ifloom/react'
type VideoProps = {
  src: string
  poster?: string
  alt?: string
  autoplay: boolean
  loop: boolean
  muted: boolean
  controls: boolean
  // …
}
```

Plugins add fields of their own to it, which their pages list.

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `src` | `string` |  |  | The clip's file, resolved as the art's paths are. |
| `poster` | `string` | yes |  | The picture shown before the clip plays. |
| `alt` | `string` | yes |  | The clip's description for screen readers. |
| `autoplay` | `boolean` |  |  | True to start the clip as soon as it's in view. |
| `loop` | `boolean` |  |  | True to play the clip again when it ends. |
| `muted` | `boolean` |  |  | True to keep the clip silent. False asks for sound, which then follows the game's audio settings. |
| `controls` | `boolean` |  |  | True to show the browser's play, pause and volume controls. |

## ViewerMedia

Type.

A picture or video beat, which the media viewer shows large.

```ts shape
import type { ViewerMedia } from '@ifloom/react'
type ViewerMedia = Extract<SceneBeat, { type: 'image' } | { type: 'video' }>
```

Uses: [`SceneBeat`](/docs/0.1.2/api/engine#scenebeat).

## When

Const. Explained in [Components](/docs/0.1.2/reference/react/components#when).

Renders its children while `condition` holds, and nothing otherwise. `useHolds` does the same as a hook.

```ts shape
import { When } from '@ifloom/react'
const When: ComponentType<{ condition: Condition; children?: ReactNode; }>
```

Uses: [`Condition`](/docs/0.1.2/api/engine#condition).

## WithPages

Component. Explained in [Components](/docs/0.1.2/reference/react/components#withpages).

Renders its children, the game, or with `pages` on, the pages around it, with the game on the `game` page only. It
renders inside a `GameProvider`.

A layout's `Game` region renders one, so a layout of your own needn't.

```ts shape
import { WithPages } from '@ifloom/react'
function WithPages(props: { pages?: boolean | PagesOptions; children: ReactNode }): JSX.Element
```

Uses: [`PagesOptions`](#pagesoptions).

## Words

Type. Explained in [Components](/docs/0.1.2/reference/react/components#words).

A table of words in English by key, such as a plugin UI's `{ buy: 'Buy' }`. A game rewords any of them with
`ui.<key>` in its strings, as it rewords the UI's own.

```ts shape
import type { Words } from '@ifloom/react'
type Words = {
  [key: string]: string
}
```
