---
title: "Examples"
description: "Reference for the three example games, the showcase, The Letter and The Corner Café: how to run each, and which file shows each feature."
---
The IFLoom repository has three example games in `examples/`, each laid out as every game is (see [Organise your game's files](/docs/how-to/organise-your-files)). The showcase, Small Town, uses every feature together, The Letter is a linear novel with no plugins, and The Corner Café is a management game a week at a time. [Three shapes of game](/docs/explanation/shapes-of-game) explains what each shape needs, and the tables below say which file shows each feature.

`ifloom new` copies each one as a game of your own, with `--template town`, `--template novel` or `--template cafe` (see [Create a game](/docs/how-to/create-a-game)). A copy leaves out the tests, the recorded snapshots and the showcase's example mods. To run one inside a clone of the repository, see [Run the examples from the repository](/docs/how-to/work-in-the-repository).

```sh
npm create ifloom@latest my-town -- --template town
```

Each example has the [CLI](/docs/reference/cli)'s scripts in its `package.json`:

| Key | Meaning |
|---|---|
| `npm run dev` | Plays the game in a browser. The showcase adds its debug card. |
| `npm run build` | Builds `dist/index.html`, one file beside an `art/` folder that opens from disk with no server. |
| `npm run check` | Lists every problem in the game's content. |
| `npm run playtest` | Plays the game unattended into a transcript: a week of the showcase into `playtest/week.txt`, the novel into `playtest/read.txt` and a season of the café into `playtest/season.txt`. |
| `npm run snapshot` | Compares every scene of the showcase with `snapshots/scenes.txt`. Only the showcase has it. |
| `npm run build:one-file` | Builds `dist-one/index.html` with the showcase's pictures inside it. Only the showcase has it. |

## The showcase

Small Town, in `examples/showcase`, is a first week in a new town. You move into a flat with a cat you name, meet Ava at the café and Sam from downstairs, take a photo with your phone and post it, and get a text the next day. Its tests in `tests/showcase.test.ts` play it through every system it uses. Every path below is under `examples/showcase/`.

| Key | Meaning |
|---|---|
| [Content layout](/docs/how-to/organise-your-files) | `src/world/` holds what the whole town shares, one file per kind, and `src/story/` holds one file per area, each with its scenes, words, locks, resets and slice of plugin content. `src/game.ts` assembles them into the game module. |
| [Locks](/docs/reference/locks) | `src/story/moving-day.ts` refuses everything but `choose` and `input` while the kv key `phase` is `arrival`. `src/story/office.ts` keeps the phone away at work with `deny: ['devices/*']`. |
| [Inputs](/docs/reference/inputs) | `src/story/moving-day.ts` asks for the cat's name in the input `catName` while moving day lasts. |
| [Values](/docs/reference/custom#values) | `src/rules.ts` declares the value `catName`, which the flat's prose prints as `{{catName}}`, with `The cat` until a name is typed. |
| [Stats](/docs/reference/stats) | `src/world/stats.ts` declares `coins`, `energy` and `charm`, and `friendship` on the kind `character`, so each character keeps their own. |
| [Changes](/docs/reference/changes) | `src/world/stats.ts` lists the stats whose changes the view reports in `changes`. |
| [Settings](/docs/reference/settings) | `src/world/settings.ts` declares the play setting `hints`, which the high street reads, and the ui setting `textSize`. |
| [Data scenes and variants](/docs/reference/scenes) | `src/story/ava.ts` declares `ava.hi`, with a variants block of small talk from `src/story/ava.prose.ts`, a `chat` choice once per turn and a `compliment` that needs charm. |
| [Flowing scenes](/docs/reference/flows) | `src/story/ava.ts` declares `ava.river`, which reads on as the player chooses and loops back to a `point` until they settle. |
| [Storylets](/docs/reference/storylets) | `src/story/cafe.ts` draws one of three scenes from the set `cafe` when the player sits a while, with `cafe.quiet` when none can be drawn. `src/unlocks/supporter.ts` adds a fourth. |
| [Variants in a location](/docs/reference/prose#variantmember) | `src/story/high-street.ts` deals one line of weather each turn from `street.weather`. |
| [Inline actions and tooltips](/docs/reference/prose#inline-actions-and-tooltips) | `src/story/moving-day.ts` puts a tooltip on "launderette", and `src/story/flat.ts` puts the `read-text` action inside a line as `[[act:read-text\|Check it]]`. |
| [UI pieces](/docs/reference/prose#ui-pieces) | `src/story/flat.ts` opens Sam's welcome note with `[[ui:modal\|…]]`, and `src/story/ava.ts` opens Ava's photo with `[[ui:image\|…]]`. |
| [Presentation hints](/docs/reference/ui-hints) | `src/story/moving-day.ts` fades in and reveals its second line, `src/world/stats.ts` shows energy as a bar and charm as pips, and `src/world/cast.ts` gives Ava and Sam a hue each. |
| [Things](/docs/reference/entities) | `src/world/things.ts` declares the `clothing`, `item` and `note` kinds, the sandwich that can be eaten and sold, and the newspaper that opens the job board. |
| [Effects that make entities](/docs/reference/effects#create) | `src/world/phone.ts` makes a photo with `create` when the player uses the camera. |
| [Storylines](/docs/reference/storylines) | `src/world/cast.ts` declares Ava's and Sam's storylines, and the `friend` quest in `src/story/ava.ts` is tied to Ava's. |
| [Triggers](/docs/reference/triggers) and [notices](/docs/reference/notices) | `src/story/moving-day.ts` raises a welcome notice and gives a note the first time the player is on the high street. `src/story/flat.ts` takes the rent every Sunday with a notice of fixed id `rent`. |
| [Rolls](/docs/reference/rolls) | `src/story/park.ts` rolls `2d6` against 8 to skim a stone, and a trigger rolls `1d6+2` ducks as the player arrives. |
| [Minigames](/docs/reference/minigames) | `src/story/park.ts` declares quick feet, `arrows`, played with the kids for coins. |
| [Timers](/docs/reference/timers) | `src/story/flat.ts` rings the phone with the `flat.ring` timer, ten seconds to answer. |
| [Rules](/docs/reference/rules) | `src/rules.ts` puts energy back each night in `onTurn` and posts the newest photo with the macro `postLatest`. `src/story/cafe.ts` and `src/world/actions.ts` reset their once-a-day keys with `resets`. |
| [Conditions on time passed](/docs/reference/conditions#since) | `src/story/ava.ts` finishes the `friend` quest's `river` stage three turns after meeting Ava, with `since`. |
| [Strings](/docs/reference/strings) | `src/world/strings.ts` renames the quest list with `'ui.quests': 'To do'`. |
| [Mods](/docs/reference/mods) | `src/main.tsx` loads the player's mods from IndexedDB. `mods/fog-season.json` adds a line of weather and rewrites the park, and `mods/french.json` is a [words table](/docs/reference/words) over moving day. |
| [Pictures](/docs/reference/media) | `public/art/` holds the portraits and photos, and `src/story/cafe.ts` gives the café a layered picture with a hotspot on Ava. |
| [The runner](/docs/reference/runner) and [saves](/docs/reference/saves) | `src/main.tsx` makes the runner with undo, a backlog, saves, a profile and an autosave each turn. |
| [The React UI](/docs/reference/react) | `src/main.tsx` renders the game with `GameShell` and a title page, `src/layout.tsx` places the plugins' parts by hand, `src/ui.ts` lists the plugin UIs, and `src/styles.css` picks the `storybook` preset. |
| [Calendar](/docs/reference/plugins/calendar) | `src/game.ts` makes a turn a day, starting on the night the player moves in. |
| [Places](/docs/reference/plugins/places) | `src/story/flat.ts`, `high-street.ts`, `cafe.ts`, `park.ts` and `office.ts` each declare a location with `src/place.ts`'s helper, with exits, actions and opening hours. |
| [Cast](/docs/reference/plugins/cast) | `src/world/cast.ts` declares Ava and Sam, with schedules, talk options and Ava's evening call. |
| [Quests](/docs/reference/plugins/quests) | `src/story/moving-day.ts` and `src/story/ava.ts` declare `settle` and `friend`. |
| [Statuses](/docs/reference/plugins/statuses) | `src/story/cafe.ts` makes a coffee give `caffeinated` for two turns. |
| [Achievements](/docs/reference/plugins/achievements) | `src/world/achievements.ts` and `src/story/ava.ts` declare "Nest egg", with progress, and a secret one by the river. |
| [Inventory](/docs/reference/plugins/inventory) | `src/world/things.ts` makes the sandwich usable and lists only clothing, items and keepsakes. |
| [Shop](/docs/reference/plugins/shop) | `src/story/cafe.ts` declares the counter, with stock that restocks each day and a daily discount. |
| [Jobs](/docs/reference/plugins/jobs) | `src/story/cafe.ts` and `src/story/park.ts` declare the weekend job and dog walking. |
| [Generators](/docs/reference/plugins/generators) | `src/story/park.ts` makes two visitors each day from the town's pools. |
| [Wardrobe](/docs/reference/plugins/wardrobe) | `src/world/things.ts` declares the `coat` and `neck` slots, the raincoat and the scarf. |
| [Messages](/docs/reference/plugins/messages), [feed](/docs/reference/plugins/feed) and [devices](/docs/reference/plugins/devices) | `src/world/phone.ts` builds the phone and its apps, and `src/story/ava.ts` and `src/story/sam.ts` hold their texts and posts. |
| [Cheats](/docs/reference/plugins/cheats) and [unlocks](/docs/reference/plugins/unlocks) | `src/world/cheats.ts` declares a free cheat and a supporter one, and the unlock whose code is in `.env`. `src/unlocks/supporter.ts` is the content the code opens. |
| [Debug](/docs/reference/plugins/debug) | `src/game.ts` adds the debug plugin only when `withDebug` is set, which `src/main.tsx` sets in development. |
| [The game module](/docs/reference/cli) | `src/game.ts` exports the release build and three probes, which `ifloom snapshot` renders every scene in. `tests/build.test.ts` runs the check, the build check and the snapshot comparison. |

## The novel

The Letter, in `examples/novel`, is a novel in three chapters about a letter on the mat addressed to someone else. It has no plugins, locations, characters or clock. Its tests are in `tests/novel.test.ts`, and every path below is under `examples/novel/`.

| Key | Meaning |
|---|---|
| [Inputs](/docs/reference/inputs) | `src/story/ch1.ts` asks for the reader's name, and the prose prints it as `{{playerName}}`. |
| [`saveable`](/docs/reference/game#saveable) | `src/story/ch1.ts` refuses a save until the reader has typed a name. |
| [Stats](/docs/reference/stats) | `src/world/stats.ts` declares `courage`, which `src/story/ch3.ts` reads to open the braver ending. |
| [Remembered choices](/docs/reference/conditions#chose) | `src/story/ch2.ts` reads chapter one's choice with `{ chose: 'ch1.mat#open' }`. |
| [Kv counters](/docs/reference/effects#kv) | `src/story/ch2.ts` counts `fibs` with `{ kv: 'fibs', by: 1 }`, and `src/story/ch3.ts` reads the count back as a range. |
| [Turns](/docs/reference/effects#turn) | `src/story/ch1.ts` ends a turn at the end of each chapter. |
| [Endings and New Game+](/docs/how-to/offer-new-game-plus) | `src/story/ch3.ts` declares `finished`, carries `readBefore` over with `carryOver`, and offers Read it again with a `newGame` command. |
| [Save migrations](/docs/upgrading/migrate-your-saves) | `src/game.ts` is version 2, with a step that renames version 1's `lies` to `fibs`, and names each save after the reader with `saveName`. |
| [The React UI](/docs/reference/react) | `src/layout.tsx` is one centred column with no sidebar, and `src/main.ts` opens on a title page. |

## The café

The Corner Café, in `examples/cafe`, is a management game where a turn is a week. Staff and dishes are entities with numbers of their own, and the player hires and loses staff in play. Its tests are in `tests/cafe.test.ts`, and every path below is under `examples/cafe/`.

| Key | Meaning |
|---|---|
| [Kinds and entity stats](/docs/reference/entities#kinddef) | `src/world/staff.ts` declares the unique kind `staff` with skill, morale and wage, and `src/world/menu.ts` the kind `dish` with price and quality. |
| [Entities made in play](/docs/reference/effects#create) | `src/story/hiring.ts` hires Dev or Fen with `create`, each with their own stats. |
| [`each` and `remove`](/docs/reference/effects#each) | `src/world/actions.ts` tires every member of staff at the end of a week, and removes those whose morale runs out. |
| [Actions](/docs/reference/actions) | `src/world/actions.ts` declares the week's buttons, with costs and `blocked` reasons, and ends the turn from one of them. |
| [Macros and values](/docs/reference/custom) | `src/rules.ts` works out the takings and wages as macros and the payroll as a value, and types its calls in `EffectRegistry`. |
| [Stat levels](/docs/reference/stats#statlevels) | `src/world/stats.ts` shows reputation in levels, with a notice when it goes up. |
| [Triggers](/docs/reference/triggers) | `src/world/triggers.ts` watches the till and the staff, and gives a good review once when two of the staff are happy. |
| [The React UI](/docs/reference/react) | `src/layout.tsx` puts the staff and the menu in the story with `EntityTable`. |
| [The game module](/docs/reference/cli) | `src/game.ts` starts the playtest with the opening scene closed, using `probe`. |
