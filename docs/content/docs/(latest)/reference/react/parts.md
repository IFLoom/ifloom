---
title: "React UI parts"
description: "Every data-part the React UI and the plugins' React UIs render, with its data attributes, for a stylesheet, the classes option or a test."
---
`@ifloom/react`, the optional React UI, renders these parts, so everything here is React only. To render a game in plain DOM, Vue or React by hand, see [Start your own UI](/docs/how-to/render/start).

Every element the React UI renders carries a `data-part` attribute that names what it is, such as `choice` or `stat-value`. Each name is a [`PartKey`](/docs/reference/react/components#partkey), which is also a key of the [`classes`](/docs/reference/react/components#classes) option, and a stylesheet selects it as `[data-part="choice"]`. [Theme the React UI](/docs/how-to/react/theme-the-react-ui) styles parts, and [Rearrange or replace the React UI's parts](/docs/how-to/react/replace-parts) replaces the components that render them. The four presets in `packages/react/src/themes/` style these parts.

## Identity attributes

Beside its `data-part`, an element that is one of several carries a `data-*` attribute that says which one it is, holding an id or a state. A stylesheet or a test can select it, such as `[data-part="stat"][data-stat="energy"]`.

| Key | Meaning |
|---|---|
| `data-sidebar` | The side column ([`Sidebar`](/docs/reference/react/components#sidebar)) carries it. |
| `data-has-sidebar` | The page carries it when the layout has a side column. |
| `data-scene` | The scene ([`Scene`](/docs/reference/react/components#scene)) carries the scene's id. |
| `data-beat`, `data-who` | Each beat carries its type, and a spoken line carries `character` or `player` in `data-who`. |
| `data-choice` | Each choice or action button carries the choice's id. |
| `data-exit`, `data-person` | Each exit carries its id, and each person here or met carries their id. |
| `data-stat`, `data-kind`, `data-entity` | Each stat row, entity table and entity row carries its id. |
| `data-thing`, `data-slot-id` | Each thing you hold carries its reference, and each wardrobe slot its id. |
| `data-input` | Each input field carries the input's id. |
| `data-notice`, `data-quest`, `data-status` | Each notice, active quest and active status carries its id. |
| `data-achievement`, `data-earned`, `data-secret` | Each achievement carries its id, and `data-earned` once earned or `data-secret` while it's a secret not yet earned. |
| `data-vendor`, `data-closed`, `data-good` | Each vendor's counter carries the vendor's id, and `data-closed` while it's closed, and each good carries its id. |
| `data-job`, `data-hired`, `data-fired` | Each job on the board carries its id, and `data-hired` or `data-fired` while the player holds it or was let go. |
| `data-device`, `data-open-app`, `data-app`, `data-entry` | Each device button, app icon, open app and entry in an app's list carries its id. |
| `data-frame`, `data-icon`, `data-face` | A device's dialog carries its frame, an app icon its icon name, and an [`InlineProp`](/docs/reference/react/components#inlineprop) its face, for a stylesheet to dress. |
| `data-from` | Each message bubble carries `them` or `player`. |
| `data-channel`, `data-thread`, `data-post`, `data-feed` | Each messages channel, thread, post and feed carries its id. |
| `data-save-slot`, `data-backlog`, `data-mod` | Each save slot carries its slot, each backlog entry its scene's id, and each mod its id. |
| `data-inventory`, `data-menu`, `data-saves`, `data-mods` | A whole panel carries one, and a plugin's UI marks its own the same way, such as `data-quests`. |

The tables below list each part's own attributes beside it.

## The page

These parts frame the page: the regions a layout is made of, its sections, and the drawer that holds the side column on a phone.

| Key | Meaning |
|---|---|
| `page` | The whole page, rendered by [`Game`](/docs/reference/react/components#game). Carries `data-has-sidebar` when there's a side column. |
| `sidebar` | The side column, an `<aside>`. On a phone it's inside the `drawer`. |
| `story` | The `<main>` that holds the story's parts. It carries `data-align` when `Story` has `align`. |
| `overlay` | The box after the story that sticks to the bottom of the window, holding the notices by default. It's hidden while it's empty. |
| `title` | The game's title. |
| `clock` | Where the game is in time. |
| `section` | A [`Section`](/docs/reference/react/components#section). Carries `data-section` with its id, `data-open` (`true` or `false`) when it folds, and `data-dialog` when it opens in a dialog. |
| `section-title` | A section's title. |
| `section-toggle` | The button that folds a section (with `aria-expanded`), or opens its dialog. |
| `section-body` | What's in a section. It has `hidden` while the section is folded. |
| `section-badge` | The section's `badge`, after its title. |
| `top-bar` | On a phone, the bar across the top with the title, the clock and the drawer button. |
| `top-bar-title` | The game's title in the top bar. |
| `drawer-button` | The button in the top bar that opens the drawer. |
| `drawer` | The side column on a phone, a dialog that slides in from the left. |
| `drawer-overlay` | The shade behind the drawer. |

## Stats

[`StatList`](/docs/reference/react/components#statlist) renders these parts for the stats in the side column, and [`StatGauge`](/docs/reference/react/kit#statgauge) renders the bars and pips.

| Key | Meaning |
|---|---|
| `stats` | The list of stats. |
| `stat` | One stat's row. Carries `data-stat`. |
| `stat-label` | A stat's label. |
| `stat-value` | A stat's value, as the game formats it. |
| `stat-level` | A levelled stat's level, its name from `levels.names` or else `ui.statLevel` ("Level 2"), inside its label. Carries `data-level`. |
| `stat-progress` | A levelled stat's bar towards its next level, a `progressbar` holding one `<span>` as wide as the progress, labelled with `ui.statProgress`. Not rendered at the top level. The `paper` preset hides it, so a stat there shows only its level. |
| `stat-bar` | A stat with the hint `ui: { display: 'bar' }`: a `meter` holding one `<span>` as wide as the value is from `min` to `max`. |
| `stat-pips` | A stat with `ui: { display: 'pips' }`: a `meter` holding a pip for each point. |
| `stat-pip` | One pip. Carries `data-filled` when it's filled. |

## Scenes

[`Scene`](/docs/reference/react/components#scene) renders these parts for the scene or the room, its beats and the pieces inside its prose.

| Key | Meaning |
|---|---|
| `scene-transition` | Holds the scene while it changes, and the copy of the scene before (`data-leaving`) while it goes. |
| `scene` | The scene, an `<article>`. Carries `data-scene`, `data-transition-in` with how it comes in, and `data-minigame` while a minigame runs. |
| `scene-header` | The row with the speaker's portrait and the title. |
| `scene-portrait` | The speaker's portrait. |
| `scene-title` | The scene's title. |
| `scene-image` | The scene's `image`, above the text, when it has no layered picture. |
| `beats` | The scene's text, holding every beat. |
| `beat` | One beat. Carries `data-beat` with its kind, and a `say` beat carries `data-who`. |
| `speaker-name` | The name over a spoken line: the speaker's, or the player's on their own lines. Not rendered on a line that names no one. Each preset styles it, and `display: none` hides it. |
| `line` | A spoken line with its speaker's picture: the `line-portrait` beside the line's `beat`. Carries `data-who`. Only a line whose speaker has a picture has one, and none while the [`portraits`](/docs/reference/react/hints#portraits) hint is `false`. |
| `line-portrait` | The speaker's picture beside a spoken line, round, `size-10`. |
| `reveal` | The beats from a block with a [`reveal`](/docs/reference/react/hints#reveal) hint, which wait for it. Carries `data-reveal` with its transition. The choices waiting for the last reveal are one too, with `data-reveal-choices`. |
| `group` | The beats of a section with any ui hint, rendered together. Carries a `data-*` attribute for each hint that's a string, a number or true/false, such as `data-card="result"`. [Add panels, sections, components and hints](/docs/how-to/react/extend-the-react-ui) declares one of your own. |
| `fold` | A section with a [`fold`](/docs/reference/react/hints#fold) hint, as a `<details>`, inside its `group`. |
| `fold-summary` | The words a fold opens by. |
| `fold-beats` | A fold's beats. |
| `inline-mail` | A letter, from `[[ui:mail\|…]]`. |
| `mail-header` | One header line of a letter. |
| `mail-body` | A letter's body. |
| `inline-prop` | A note, from `[[ui:prop\|…]]`. Carries `data-face`. |
| `inline-mono` | Words in a monospace face, from `[[ui:mono\|…]]`. |
| `voice-replay` | The button after a spoken line that plays its voice again. |
| `inline-action` | An [inline action](/docs/reference/react/components#inlineaction) in the prose, a button inside the line. Carries `data-choice`, and `data-disabled` while it's greyed out (it stays focusable, with `aria-disabled`). Each preset styles it as its own kind of link. |
| `tip` | A [tooltip](/docs/reference/react/components#tip)'s words in the prose, a button underlined with dots. |
| `tip-content` | The bubble with a tooltip's note, or an inline action's reason. It's put in the page's `body`, with `role="tooltip"`, and carries `data-open` while it shows. |
| `inline-ui` | The words of an [inline piece](/docs/reference/react/hints#inlineui), `[[ui:modal\|…]]` or `[[ui:image\|…]]`, a button inside the line. Carries `data-ui` with the piece's name, `aria-haspopup="dialog"` and `aria-expanded`. Each preset styles it apart from inline actions and tooltips. |
| `inline-modal` | The text inside the dialog a `modal` piece opens, below the `dialog-title`. |
| `bold` | Words in [bold](/docs/reference/prose#bold-and-italics) in the prose, a `<strong>`. The presets give it their own weight or colour, and the terminal preset makes it glow. |
| `italic` | Words in [italics](/docs/reference/prose#bold-and-italics) in the prose, an `<em>`. |

## Pictures, videos and layered pictures

These parts hold the pictures and clips in the story and the viewer that opens them large.

| Key | Meaning |
|---|---|
| `video` | A video clip, rendered by [`Video`](/docs/reference/react/components#video). A video beat's carries `data-beat="video"`. |
| `picture` | A [`LayeredPicture`](/docs/reference/react/components#layeredpicture)'s box, with the picture's `aspect-ratio`. |
| `picture-layer` | One layer in it, a picture or a video. Carries `data-layer` with the layer's id. |
| `hotspot` | A hotspot button over the picture. Carries `data-hotspot`, and `aria-disabled` when it's greyed out. |
| `hotspot-warning` | The warning icon in a hotspot's corner. |
| `viewer-open` | The button around a picture or a clip in the story that opens the viewer. |
| `viewer` | The [`MediaViewer`](/docs/reference/react/components#mediaviewer) dialog, holding the picture or the clip. |
| `viewer-close` | The viewer's close button. |

## Choices and buttons

These parts make up the buttons a scene, the room and the menus render.

| Key | Meaning |
|---|---|
| `choices` | A scene's list of choices, or an app's. |
| `actions` | The room's and the game's buttons, when no scene is open. |
| `choice` | One choice or action button. Carries `data-choice`, and `data-choice-key` with its number when [keys](/docs/reference/react/components#keyoptions) are on. |
| `choice-key` | The number key that picks a choice, a `<kbd>` at the start of its label. Only with keys on. |
| `choice-label` | The button's label, with the warning icon. |
| `choice-warning` | The warning written under a button that can be pressed but would be refused. |
| `choice-price` | What the choice costs. |
| `choice-irreversible` | The line that says a choice can't be undone. |
| `choice-reason` | Why a button is greyed out. |
| `button` | Any other button: in the saves menu, the mod manager, the quest log, the wardrobe, inputs, message threads, feeds and the debug card. |
| `badge` | A count or a **New** badge in the quest log, or a count in the notice strip. |

## The notices

[`Notices`](/docs/reference/react/components#notices) and [`NoticeStrip`](/docs/reference/react/components#noticestrip) render these parts.

| Key | Meaning |
|---|---|
| `notices` | The list of notices. Carries `data-collapsed` while a phone shows only the newest. |
| `notices-more` | The button under the notices on a phone that shows the rest, or hides them again. Carries `aria-expanded`. |
| `notice` | One notice. Carries `data-notice`. |
| `notice-image` | Its picture. |
| `notice-title` | Its title. |
| `notice-text` | Its text. |
| `notice-dismiss` | Its dismiss button. |
| `notice-strip` | The [`NoticeStrip`](/docs/reference/react/components#noticestrip), a `<nav>` of unread counts. |
| `notice-strip-item` | One count in it, a button. Carries `data-strip`: `notices`, or the device and app as `phone/texts`. |

## Minigames

[`MinigameCard`](/docs/reference/react/components#minigamecard) renders these parts while a minigame runs.

| Key | Meaning |
|---|---|
| `minigame` | The [`MinigameCard`](/docs/reference/react/components#minigamecard), a `<section>`. Carries `data-minigame` and `data-state`. |
| `minigame-title` | The minigame's title. |
| `minigame-state` | The running state's words. |
| `minigame-timer` | The countdown bar, a `progressbar` holding one `<span>` scaled with `transform: scaleX()`. Only while the state has a timer. |
| `minigame-inputs` | The row of input buttons. |
| `minigame-input` | One input button. Carries `data-input`. |

## What changed

[`Changes`](/docs/reference/react/components#changes) renders these parts for what the last command moved.

| Key | Meaning |
|---|---|
| `changes` | [`Changes`](/docs/reference/react/components#changes), the list of what the last command moved. |
| `change` | One [`ChangeItem`](/docs/reference/react/components#changeitem). Carries `data-stat`, `data-of` for an entity's stat, and `data-dir` (`up` or `down`). |
| `change-text` | The change in the stat's format, signed: `+30 coins`. |
| `change-label` | The entity's name, or the stat's label unless its format has words in it. |

## The timers

[`Countdown`](/docs/reference/react/components#countdown) and [`Timers`](/docs/reference/react/components#timers) render these parts for the running timers.

| Key | Meaning |
|---|---|
| `timers` | [`Timers`](/docs/reference/react/components#timers), a list of every running timer's countdown. |
| `timer` | One [`Countdown`](/docs/reference/react/components#countdown). Carries `data-timer` (its id) and `data-urgent` with a quarter or less left. |
| `timer-label` | The timer's label. |
| `timer-bar` | The bar, a `progressbar` holding one `<span>` scaled with `transform: scaleX()`. Carries `data-urgent`. Left out with motion off. |
| `timer-left` | The seconds left, a `timer` region. Carries `data-urgent`. |

## Dice rolls

[`DiceRoll`](/docs/reference/react/components#diceroll) and [`DiceOverlay`](/docs/reference/react/components#diceoverlay) render these parts.

| Key | Meaning |
|---|---|
| `dice` | One [`DiceRoll`](/docs/reference/react/components#diceroll). Carries `data-roll` (its key), `data-state` (`rolling` or `settled`), and once settled `data-passed` and `data-critical`. |
| `dice-label` | The dice thrown, such as `2d6`. |
| `dice-faces` | The row of faces. |
| `dice-face` | One die. Carries `data-rolling` while it tumbles, and `data-high` or `data-low` on its top face or on 1. |
| `dice-plus` | What was added, such as `+2`. |
| `dice-total` | The total, once the dice settle. |
| `dice-outcome` | Passed or Failed, and what it needed. Carries `data-passed`. |
| `dice-critical` | Critical! or Fumble. |
| `dice-overlay` | The [`DiceOverlay`](/docs/reference/react/components#diceoverlay) over the scene, for rolls no block names. |
| `dice-dismiss` | The overlay's close button. |

## The menu and its dialogs

The [`GameMenu`](/docs/reference/react/components#gamemenu) and the dialogs it opens render these parts.

| Key | Meaning |
|---|---|
| `menu` | The player's menu, the row of buttons. |
| `menu-button` | Each button in it: Saves, Backlog, Mods, Undo and Redo. With keys on, Escape opens the same buttons in a dialog. |
| `dialog` | A dialog box: the menu's, a device's, the notice strip's, the shop's, the cheats' or the achievements'. A device's carries `data-frame`. Each is in the preset's body font, no taller than the window, and scrolls inside. |
| `dialog-overlay` | The dimmed page behind a dialog. |
| `dialog-title` | A dialog's title. |
| `dialog-close` | A dialog's close button. |
| `saves` | The saves menu. |
| `saves-actions` | The row with **Save in a new slot** and **Import a save file**. |
| `save-slot` | One save slot. Carries `data-save-slot`. |
| `save-name` | The slot's name. |
| `save-details` | When it was saved. |
| `saves-message` | Why a load or an import failed, or which packs and plugins a save was missing. |
| `saves-blocked` | Why saving is refused now, under the greyed-out Save buttons. |
| `saves-empty` | The line shown when there are no saves. |
| `file-button` | The label that opens a file picker, in the saves menu and the mod manager. |
| `backlog` | The backlog's scrolling list. |
| `backlog-entry` | One scene in it. Carries `data-backlog`. |
| `backlog-title` | The scene's title. |
| `backlog-choice` | The **You chose** line. |
| `backlog-empty` | The line shown when the backlog is empty. |
| `mods` | The mod manager. |
| `mod` | One mod. Carries `data-mod`. |
| `mod-name` | Its name. |
| `mod-version` | Its version. |
| `mod-state` | Its **On** or **Off** button. |
| `mod-text` | Its description. |
| `mod-problem` | A problem the loader found in it. |
| `mods-message` | Why a mod file couldn't be added. |
| `mods-empty` | The line shown when no mods are added. |
| `mods-restart` | The line and button that appear once a mod has changed. |
| `mods-changed` | The line saying a restart applies the change. |

## The entities and inputs

[`EntityTable`](/docs/reference/react/components#entitytable) and the [inputs](/docs/reference/react/components#inputfield) render these parts. What the player carries is the [inventory plugin](#inventory-plugin)'s.

| Key | Meaning |
|---|---|
| `entities` | The entity tables, all kinds. |
| `entity-table` | One kind's table. |
| `entity-heading` | The kind's heading. |
| `entity-columns` | The table's header row. |
| `entity-column` | One column heading. |
| `entity-row` | One entity's row. Carries `data-entity`. |
| `entity-name` | The entity's name, with its picture and description inside. |
| `entity-image` | Its picture, when it has one. |
| `entity-desc` | Its description, when it has one. |
| `entity-value` | One of its stats. |
| `inputs` | The inputs on offer: in a scene, between its words and its choices, or outside one from `InputFields`. |
| `input` | One input. Carries `data-input`. |
| `input-label` | Its label. |
| `input-field` | The text or number box. |
| `input-options` | The row of options for a `choice` input. |
| `input-submit` | The **Enter** button. |
| `input-error` | Why the value was refused. |

## The plugins' parts

Each plugin's React UI, from its `/react` subpath, renders parts of its own when the game lists it in `plugins` ([Show plugins in the React UI](/docs/how-to/react/show-plugin-uis)). Importing that subpath adds its parts to `PartKey` through [`PartNames`](/docs/reference/react/components#overridablecomponents-and-partnames), so `classes` takes them typed. A part that is like one of the kit's also carries `data-kit` with its [`KitPart`](/docs/reference/react/kit#kitpart), and the presets style the kit's parts, never a plugin's by name.

### Places

From [`@ifloom/plugin-places/react`](/docs/reference/plugins/places#react-ui).

| Key | Meaning |
|---|---|
| `location` | The location card: the place's picture, name and tag. |
| `location-name` | The location's name. |
| `location-text` | The location's tag, under its name. |
| `location-things` | The list of things lying here. |
| `location-thing` | One of them, with its Pick up button. Carries `data-thing`. |
| `location-thing-name` | Its name, with how many when there's more than one. |
| `location-thing-pick` | Its **Pick up** button, greyed out with the reason when it can't be picked up. |
| `exits` | The row of exit buttons. |
| `exit` | One exit button. Carries `data-exit`. |

### Cast

From [`@ifloom/plugin-cast/react`](/docs/reference/plugins/cast#react-ui).

| Key | Meaning |
|---|---|
| `people` | The list of people here. |
| `person` | One person. Carries `data-person`. |
| `person-portrait` | Their portrait. |
| `person-name` | Their name. |
| `person-desc` | Their `description`, under the name, such as `Runs the café`. |
| `person-actions` | Their buttons. |
| `relationships` | Everyone the player has met, in [`Relationships`](/docs/reference/plugins/cast#relationships). |
| `relationship` | One of them. Carries `data-person`. Their portrait, name and description use the `person-` parts. |
| `relationship-header` | The row with their portrait, name and description. |
| `relationship-stats` | The stats the game keeps on them, each with the `stat-` parts. |

### Quests

From [`@ifloom/plugin-quests/react`](/docs/reference/plugins/quests#react-ui).

| Key | Meaning |
|---|---|
| `quests` | The quest log. |
| `quests-title` | Its heading. Kit part: `heading`. |
| `quest` | One active quest. Carries `data-quest`. Kit part: `card`. |
| `quest-title` | The quest's title. Kit part: `title`. |
| `quest-stage` | How far it has got (`2 of 3`). Kit part: `note`. |
| `quest-summary` | Its summary. Kit part: `note`. |
| `quest-hint` | The hint for what to do next. |
| `quests-done` | The list of finished quests. |
| `quest-done` | One finished quest. |

### Inventory plugin

From [`@ifloom/plugin-inventory/react`](/docs/reference/plugins/inventory#react-ui).

| Key | Meaning |
|---|---|
| `inventory` | What the player carries. |
| `inventory-title` | Its heading. |
| `thing` | One thing you hold, carrying `data-thing` and `data-at`. |
| `thing-name` | Its name. |
| `thing-count` | How many, when there's more than one. |
| `thing-text` | Its description. |
| `thing-drop` | Its drop button, with `drop` on. |

### Wardrobe

From [`@ifloom/plugin-wardrobe/react`](/docs/reference/plugins/wardrobe#react-ui).

| Key | Meaning |
|---|---|
| `wardrobe` | The wardrobe card. |
| `wardrobe-title` | Its heading. Kit part: `heading`. |
| `wardrobe-slot` | One slot. Carries `data-slot-id`, and `data-worn` with what's in it. |
| `wardrobe-slot-name` | The slot's label. Kit part: `label`. |
| `wardrobe-worn` | What's in the slot. |

### Statuses

From [`@ifloom/plugin-statuses/react`](/docs/reference/plugins/statuses#react-ui).

| Key | Meaning |
|---|---|
| `statuses` | The list of active statuses. |
| `statuses-title` | Its heading. Kit part: `heading`. |
| `status` | One status. Carries `data-status`. Kit part: `item`. |
| `status-label` | Its label, with the stacks and the turns left. Kit part: `title`. |
| `status-stacks` | How many stacks (`×2`), when there's more than one. |
| `status-turns` | The turns left. Kit part: `note`. |
| `status-summary` | Its summary. Kit part: `note`. |
| `status-modifiers` | What it does to the stats (`+10 Energy`). |

### Achievements

From [`@ifloom/plugin-achievements/react`](/docs/reference/plugins/achievements#react-ui).

| Key | Meaning |
|---|---|
| `achievements-button` | The sidebar's **Achievements** button, with the count on a `badge`. Kit part: `opener`. |
| `achievements` | The achievement list, in the page or the dialog. |
| `achievements-title` | Its heading, when it has one. Kit part: `heading`. |
| `achievements-count` | How many are earned, in the heading. |
| `achievements-empty` | What it says when the game has none. |
| `achievement` | One achievement. Carries `data-achievement`, and `data-earned` or `data-secret`. Kit part: `card`. |
| `achievement-image` | Its picture. Kit part: `thumb`. |
| `achievement-title` | Its title, or `???`, with the **Earned** badge. Kit part: `title`. |
| `achievement-earned` | The **Earned** badge. Kit part: `badge`. |
| `achievement-text` | Its description. Kit part: `note`. |
| `achievement-progress` | The progress bar. Fill it with `> span`. Kit part: `meter`. |
| `achievement-progress-text` | The count under it (`5 of 20`). |

### Cheats

From [`@ifloom/plugin-unlocks/react`](/docs/reference/plugins/unlocks#react-ui).

| Key | Meaning |
|---|---|
| `cheats-button` | The sidebar's **Cheats** button. Kit part: `opener`. |
| `cheats` | The cheat panel, in its dialog. Kit part: `commands`. |
| `cheats-group` | One group of cheats. Carries `data-cheats-group`, empty for the cheats with no group. |
| `cheats-group-title` | The group's heading. Kit part: `heading`. |
| `cheat` | One cheat: its `choice` button, its description and how often it was used. Carries `data-cheat`, and `data-used` once it has been used. Kit part: `card`. |
| `cheat-text` | Its description. Kit part: `note`. |
| `cheat-used` | How many times this save has used it, on a badge. Kit part: `badge`. |

### Unlocks

From [`@ifloom/plugin-unlocks/react`](/docs/reference/plugins/unlocks#react-ui).

| Key | Meaning |
|---|---|
| `unlocks` | The code box and the list of unlocks. |
| `unlocks-title` | Its **Enter a code** heading. Kit part: `heading`. |
| `unlock-form` | The text box and the **Unlock** button. Kit part: `form`. |
| `unlock-input` | The text box. Kit part: `input`. |
| `unlocks-message` | Why the last code didn't work. |
| `unlocks-entered` | What the last code unlocked. |
| `unlock-problem` | Content the profile remembers that couldn't be opened. |
| `unlocks-list` | The list of unlocks. |
| `unlock` | One unlock. Carries `data-unlock`, and `data-unlocked` once it's unlocked. Kit part: `card`. |
| `unlock-name` | Its label, with its badge. Kit part: `title`. |
| `unlock-state` | The **Locked** or **Unlocked** badge. Kit part: `badge`. |
| `unlock-text` | Its description. Kit part: `note`. |

### Shop

From [`@ifloom/plugin-shop/react`](/docs/reference/plugins/shop#react-ui).

| Key | Meaning |
|---|---|
| `shop` | A vendor's counter, in its dialog. Carries `data-vendor`, and `data-closed` while it's closed. |
| `shop-closed` | Why it's closed. |
| `shop-empty` | What it says when nothing is on offer. |
| `goods` | The list of goods. |
| `good` | One good. Carries `data-good`. Kit part: `card`. |
| `good-image` | Its picture, when the thing has one. Kit part: `thumb`. |
| `good-name` | Its name. Kit part: `title`. |
| `good-desc` | Its description, when it has one. Kit part: `note`. |
| `good-details` | The line under it: the discount, the full price, the stock and how many the player has. |
| `good-off` | Today's discount (`50% off`). Kit part: `badge`. |
| `good-full-price` | The price before it, struck out. |
| `good-stock` | How many are left. |
| `good-owned` | How many the player has. |
| `good-actions` | The **Buy** and **Sell** buttons, each a `choice`. Kit part: `commands`. |

### Jobs

From [`@ifloom/plugin-jobs/react`](/docs/reference/plugins/jobs#react-ui).

| Key | Meaning |
|---|---|
| `jobs` | The job board. |
| `jobs-title` | Its heading. Kit part: `heading`. |
| `job` | One job. Carries `data-job`, and `data-hired` or `data-fired`. Kit part: `card`. |
| `job-title` | Its title, with the rank and **Let go** badges. Kit part: `title`. |
| `job-rank` | The rank held. Kit part: `badge`. |
| `job-fired` | The **Let go** badge. Kit part: `badge`. |
| `job-text` | Its description. Kit part: `note`. |
| `job-details` | The lines about pay, the next shift and the next rank. |
| `job-pay` | What a shift pays. |
| `job-shift` | When the next shift is. |
| `job-next` | The next rank, and how far off it is. Kit part: `note`. |
| `job-record` | The shifts worked and missed. Kit part: `note`. |
| `job-actions` | The **Apply** or **Work a shift** button (a `choice`) and **Quit** (a `button`). Kit part: `commands`. |

### Devices

From [`@ifloom/plugin-devices/react`](/docs/reference/plugins/devices#react-ui).

| Key | Meaning |
|---|---|
| `devices` | The row of device buttons. |
| `device-button` | One device's button. Carries `data-device`. Kit part: `opener`. |
| `device-badge` | The badge on it. |
| `device-screen` | An open device, inside its dialog. |
| `app` | An open app. Carries `data-app`. |
| `app-header` | The row with the back button and the app's name. |
| `app-title` | The app's name. |
| `app-back` | The back button. |
| `app-launcher` | The home screen's grid of apps, with the wallpaper. |
| `app-button` | One app on the home screen. Carries `data-open-app`. |
| `app-icon` | Its icon square. Carries `data-icon`. |
| `app-badge` | Its badge. |
| `app-prose` | A `prose` section of an app. |
| `app-entries` | A `list` section of an app. |
| `app-entry` | One entry in it. Carries `data-entry`. Kit part: `card`. |
| `app-entry-image` | The entry's picture. Kit part: `thumb`. |
| `app-entry-title` | Its title. Kit part: `title`. |
| `app-entry-text` | Its text. Kit part: `note`. |

### Messages

From [`@ifloom/plugin-messages/react`](/docs/reference/plugins/messages#react-ui).

| Key | Meaning |
|---|---|
| `channel` | A messages channel. Carries `data-channel`. |
| `conversations` | The conversation list, one row a thread. |
| `conversation` | One thread in the list, a button that opens it. Carries `data-thread`, and `data-unread` with the count while any is unread. |
| `conversation-portrait` | The sender's portrait in the list. |
| `conversation-name` | The sender's name in the list. |
| `conversation-last` | The thread's last line, or that they're typing. |
| `conversation-unread` | The unread dot. |
| `messages-empty` | The line a channel with nothing in it shows. |
| `thread` | An open thread. Carries `data-thread`. |
| `thread-back` | The button back to the list. |
| `thread-title` | The thread's heading, with the sender's name. |
| `thread-portrait` | The sender's portrait. |
| `message` | One message with the reply under it. |
| `bubble` | A message bubble. Carries `data-from`, `them` or `player`. The message's beats are inside it. The typing bubble carries `data-typing` too. |
| `typing` | The three dots in the typing bubble. |

### Feed

From [`@ifloom/plugin-feed/react`](/docs/reference/plugins/feed#react-ui).

| Key | Meaning |
|---|---|
| `feed` | A feed. Carries `data-feed`. |
| `post` | One post. Carries `data-post`. Kit part: `card`. |
| `post-author` | The poster's name and portrait. |
| `post-portrait` | The poster's portrait. |
| `post-image` | The post's picture. |
| `post-text` | Its words, as beats. |
| `post-meta` | Its likes. Kit part: `note`. |
| `post-comment` | One comment. |
| `post-comment-name` | The commenter's name. |

### Debug

From [`@ifloom/plugin-debug/react`](/docs/reference/plugins/debug#react-ui).

| Key | Meaning |
|---|---|
| `debug` | The whole card. |
| `debug-header` | The row with the heading, the seed and the undo buttons. |
| `debug-title` | The heading. |
| `debug-seed` | The seed. |
| `debug-form` | One of the **Set** tab's forms. |
| `debug-label` | A form's label. |
| `debug-field` | A box in a form. |
| `debug-error` | Why a form's command was refused. |
| `debug-section` | One tab's content. |
| `debug-heading` | A heading in the **Why not** tab. |
| `debug-list` | A list in the **Why not** tab. |
| `debug-state` | The game state as JSON. |
| `debug-log` | The command log. |

## The pages

These are rendered only when `pages` is on. See [Pages](/docs/reference/react/components#pages).

| Key | Meaning |
|---|---|
| `title-page` | The title screen. Carries `data-page="title"`. |
| `title-art` | Its picture, when `art` is given. |
| `title-name` | The game's title. |
| `title-subtitle` | The line under it, when `subtitle` is given. |
| `title-buttons` | The column of buttons. |
| `title-button` | Each button in it. Carries `data-title-button` with what it does: `continue`, `new`, `new-game-plus`, `load`, `settings`, `achievements`, `credits`, or the id of a page of your own. |
| `page-heading` | The heading of the settings, load, credits and achievements pages. |
| `page-back` | Their Back button. |
| `settings-page` | The settings page. |
| `settings` | Its list of settings. |
| `setting` | One setting. Carries `data-setting` with its id and `data-affects` with `play` or `ui`. |
| `setting-label` | The setting's label. |
| `setting-control` | Its checkbox, radio buttons or slider. |
| `setting-value` | A slider's value, beside it. |
| `settings-empty` | The line shown when the game has no settings. |
| `settings-message` | Why the last change to a setting was refused. |
| `settings-mods` | The settings page's Mods section, when the game has mods. Carries `data-settings-mods`. |
| `mods-title` | Its heading. |
| `mods-hint` | The line under the heading. |
| `load-page` | The load page. Its slots use the saves menu's parts, `save-slot` and the rest. |
| `credits-page` | The credits page. |
| `credits` | Its groups. |
| `credit-group` | One group. Carries `data-credit-group` with the group's id. |
| `credit-group-title` | A group's heading. |
| `credit-group-description` | The line under a group's heading. |
| `credit-list` | A group's credits. |
| `credit` | One credit. |
| `credit-art` | A credit's picture. |
| `credit-name` | A credit's name, when it has no link. |
| `credit-link` | A credit's name as a link, when it has an `href`. |
| `credit-role` | A credit's role, after its name. |
| `credit-meta` | A credit's description and licence, under its name. |
| `achievements-page` | The achievements page, in a game with the achievements plugin. Its list uses the `achievements` parts. |
| `gate-page` | The gate, before the title screen. |
| `gate-title` | Its title. |
| `gate-text` | Its paragraphs. |
| `gate-buttons` | The row with its buttons. |
| `gate-confirm` | The button that moves on. |
| `gate-decline` | The button that doesn't. A link when it has an `href`. |
| `splash-page` | The splash cards' page, before the gate and the title screen. |
| `splash-card` | The card on show. Carries `data-splash-card` with its id, and the transition attributes while it comes in and goes out. |
| `splash-art` | A card's picture, or the IFLoom mark. |
| `splash-title` | A card's heading. |
| `splash-text` | The line under it, or `Powered by` on the IFLoom card. |
| `splash-link` | The IFLoom card's link to ifloom.dev. |
| `splash-skip` | The button that skips every card. |

Each of the four presets gives the title screen its own look: a centred column with a large title, and buttons in the preset's style.
