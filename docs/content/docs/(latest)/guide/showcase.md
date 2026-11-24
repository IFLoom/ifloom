---
title: "The showcase: Small Town"
description: A tour of Small Town, the example game in examples/showcase that uses every feature, with where each feature lives in its source and the test that plays it.
---
Small Town is the game in `examples/showcase` of the IFLoom repository. It's a first week in a new town, small enough to read in an afternoon, and it uses the engine's features together. You move into a flat above a launderette with a cat you get to name. You meet Ava, who runs the café, and Sam from the flat downstairs, take a photo with your phone and post it, and get a text the next day.

When a page in these docs says "see it in the showcase", this is the source it means. Its tests play it through every system it uses.

To start a game of your own from a copy of it, run `npm create ifloom@latest my-town -- --template town` (see [`ifloom new`](/docs/cli#ifloom-new)).

## Run it

In a copy made with `--template town`, or in `examples/showcase` of a [clone of the repository](/docs/guide/from-the-repository):

```sh
npm run dev               # play it in a browser, with the debug card
npm run build             # build dist/index.html
npm run check             # list any problem in its content
npm run playtest          # play a week unattended, into playtest/week.txt
npm run snapshot          # compare every scene with snapshots/scenes.txt
npm run build:one-file    # build dist-one/index.html, the pictures inside it
```

These are the [CLI](/docs/cli)'s commands, `ifloom dev`, `build`, `check`, `playtest` and `snapshot`. A copy leaves out the tests, the recorded snapshots and the example mod, so its first `snapshot` records the scenes afresh. Open the built `dist/index.html` straight from disk. It's one file beside an `art/` folder, and it runs with no server. `dist-one/index.html` is the same game with its pictures inside it and nothing beside it.

## The files

| File | What's in it |
|---|---|
| `src/world/` | What the whole town shares, one file of [content](/docs/reference/content#content) per kind: `stats.ts`, `things.ts` (the things you carry and wear, and notes, as entities), `cast.ts` (Ava and Sam, and their storylines), `settings.ts`, `actions.ts` (waiting, offered everywhere), `phone.ts` (the phone: its device, its apps, the texts channel, the social feed and the `photo` kind), `strings.ts` (the engine's words it rewords), `achievements.ts` and `cheats.ts`. |
| `src/story/` | The story, one file per place or arc: `moving-day.ts`, `ava.ts`, `flat.ts`, `high-street.ts`, `cafe.ts`, `park.ts`, `office.ts` and `sam.ts`. Each holds its scenes, its actions, its locks and resets, its slice of the plugins' content (the place, its vendor, its jobs), and their words, written in place. The lines read by key (variants, tooltips, Ava's small talk by text) are in each file's `prose`, and Ava's are in `ava.prose.ts` beside her arc. All of it is data. |
| `src/rules.ts` | The game's own code, its [`rules`](/docs/reference/rules): energy back overnight, an effect worked out from the state, and a value the prose prints. |
| `src/place.ts` | A small helper each place's file uses, which fills in the place's tag, picture and words. |
| `src/game.ts` | The game put together: the content in order, with the phone's first, the plugins and the rules. Its default export is the [game module](/docs/cli#the-game-module): the release build, and the `probes` the snapshot reads. |
| `src/unlocks/supporter.ts` | The supporter content: one scene, which `ifloom build` encrypts into the page under the supporter code. The page never imports it. |
| `.env` | The supporter code, `IFLOOM_UNLOCK_SUPPORTER`. It's public so anyone can build the showcase; a real game keeps its codes in `.env.local`, out of git. |
| `src/main.tsx` | The page. It opens the supporter content the player's code unlocked, loads it and the player's mods over the town, makes a [runner](/docs/reference/runner) with undo, a backlog, saves, a profile and autosave, and draws it with the [React UI](/docs/react)'s `GameShell`, its title screen, its mod manager and its code box. |
| `src/styles.css` | The React UI's stylesheet with the `storybook` [preset](/docs/react/customising#1-pick-a-theme-preset), and a sea-blue accent of its own. |
| `public/art/` | The pictures: a portrait each for Ava and Sam, and the two photos the camera takes. Copied into the build as `art/`. |
| `mods/fog-season.json` | An example [mod](/docs/reference/mods) for a player to add. It isn't part of the game. |
| `vite.config.ts` | The CLI's [Vite preset](/docs/cli#the-vite-preset), and nothing else. |
| `tests/showcase.test.ts` | The first days, played command by command. |
| `tests/build.test.ts` | `ifloom check`, the build check and the snapshot comparison, as tests. |
| `snapshots/scenes.txt` | Every scene and place in three states, as `ifloom snapshot` last wrote it. It's committed. |

The other examples start with one call to [`mountGame`](/docs/react#mountgame) in `src/main.ts`. Small Town writes `src/main.tsx` by hand instead, because it has to load the supporter content and the player's mods before it can make the game.

## Feature by feature

### Locks

`story/moving-day.ts`, `locks`. The game starts with the kv key `phase` at `arrival`, from the file's starting `kv: { phase: 'arrival' }`. Moving day is a [lock](/docs/reference/locks) while `{ kv: 'phase', is: ['arrival'] }` holds. It denies `'*'` except `choose` and `input`, so the intro only moves through its scene and the box for the cat's name. The `unpack` choice sets the phase to `open` with `{ kv: 'phase', to: 'open' }`, and the lock lets go.

A second lock, in `story/office.ts`, `{ id: 'no-phone', when: places.at('office'), deny: ['devices/*'], reason: 'Not at work.' }`, keeps the phone away at the office. It uses the [places](/docs/reference/plugins/places) plugin's [`places.at()`](/docs/reference/plugins/places#conditions). In the test `keeps the phone in the pocket at work`, opening the camera there is refused with `Not at work.`

### Inputs, and a value the prose prints

`story/moving-day.ts`, `inputs`. On moving day the game asks for the cat's name with an [input](/docs/reference/inputs): `catName`, `type: 'text'`, `maxLength: 16`, offered only while `when: { kv: 'phase', is: ['arrival'] }` holds. The React UI draws it under the scene as an [`InputField`](/docs/react/components#inputfield). What the player types is kept, trimmed, in the kv key `catName`.

`src/rules.ts` has a [value](/docs/reference/custom#values) of the same name. It reads the kv key, or says `The cat` if nothing was typed, and the flat's prose prints it: `{{catName}} has claimed the warm spot on the sill.` Once the phase is `open`, the input is gone, and a value sent anyway is refused with `Not now.`

### Things you use

`world/things.ts`, the `item:sandwich` entity, the café's `buy-sandwich` action in `story/cafe.ts` and the café counter's sandwich (see [The café counter](#the-café-counter)). The things you carry are [entities](/docs/reference/entities) of two kinds: `clothing`, where each is one particular thing, and `item`, which stack. The sandwich has the [inventory](/docs/reference/plugins/inventory)'s `usable` trait and the shop's `sellable` one, 4 coins. Its button, "Eat the sandwich", spends it and puts 25 energy back. The inventory plugin's [`InventoryCard`](/docs/reference/plugins/inventory#inventorycard) lists what you hold, with that button and a **Drop** button each. What you drop lies where you dropped it: each place is an entity that [holds things](/docs/reference/plugins/places#things-lying-in-a-place), and the [`LocationCard`](/docs/reference/plugins/places#locationcard) lists it with a **Pick up** button. The test `names the cat on moving day, and says the name after` buys one, eats it and checks both, and `leaves the paper where you drop it` drops the newspaper in the flat and picks it up again.

### Mods

`src/main.tsx` and `mods/fog-season.json`. The page keeps the player's [mods](/docs/reference/mods) in IndexedDB, with `mods('small-town', indexedDbDriver({ database: 'small-town-mods' }))`. Before anything else, with a top-level `await`, it passes the packs of the mods that are turned on to `smallTown({ mods })`, which loads them over the town's content.

`GameShell` gets `mods={{ store: modStore, problems, onChange: () => location.reload() }}`, so the player's menu has a Mods dialog. There the player can add a file, turn a mod off or remove it, then restart with the mods they've chosen.

`mods/fog-season.json` is a mod to try it with. Its pack adds a fourth line, a fog, to the high street's `street.weather` variants, and rewrites `place.park`, the one line of the park the town reads by key so that a mod can. A pack's variants are appended, and its prose replaces the town's.

`mods/french.json` is the start of a translation: one pack with a [`words` table](/docs/reference/words) over moving day, the flat and the first quest, the tooltip's prose and a string. The test `takes the French mod` loads it and checks that every key names a field. See [Translating a game](/docs/recipes/translating). Add it from the Mods dialog and restart. The test `takes the example mod: fog in the weather, a quieter park, and no problems` loads it through the store, checks both changes, and checks that the loader finds nothing wrong.

### Its own art

`public/art/`. Ava and Sam have portraits, `art/character/ava.svg` and `art/character/sam.svg`, and the camera's two photos are `art/photo/ava.svg` and `art/photo/sam.svg`. Each is their initials on a coloured disc, with no face. Vite copies `public/` into the build, so they sit in `dist/art/` beside the page. `npm run build:one-file` puts them inside it instead.

Each character's `image` in `world/cast.ts` names its `.svg` file. If it were left out, the [cast](/docs/reference/plugins/cast#person) would draw `art/character/ava.jpg`, because [`artSrc`](/docs/reference/prose#artsrc) adds `.jpg` to a path with no extension, and there's no such file. The photos name their `.svg` the same way.

### Saves, the backlog and undo

`src/main.tsx`. The runner is made with `history: { depth: 50 }`, `backlog: { limit: 200 }`, `saves` on `localStorage` and `autosave: { every: 'turn' }`. Each one turns on a part of the React UI's [`GameMenu`](/docs/react/components#gamemenu) in the sidebar:

- Undo and Redo buttons
- a Backlog of every scene shown, with the choice made in it
- a Saves menu to save, load, export and import

None of it needs any change to the game's content.

### The title screen and settings

`src/main.tsx` and the `settings` in `world/settings.ts`. `GameShell` gets `pages` with a subtitle and two lines of credits, so the game opens on a title screen. The runner gets a [profile](/docs/reference/profile), which keeps the player's settings between games.

The town declares two [settings](/docs/reference/settings). `hints` is a play setting, on by default, and the high street shows a hint line only `when: { setting: 'hints' }`. `textSize` is a ui setting with the options `normal` and `large`. Its `ui.settings` hint names it, so the React UI copies it to `data-text-size` on the page's `<html>`, now and whenever it changes, and its styles make the root font bigger for `large`. [The title screen and settings](/docs/recipes/title-screen) explains both.

### Transitions and reveals

`intro` in `story/moving-day.ts` and `ava.river` in `story/ava.ts`, written as the React UI's [presentation hints](/docs/react/hints). The moving-day scene has `ui: { transition: { in: 'fade', out: 'fade', ms: 500 } }`, so it fades in from the title page, and its second block has `ui: { reveal: { delay: 1200 } }`, so the line about the cat comes a moment after the first. Its Unpack choice has `ui: { transition: { in: 'slide-up', ms: 400 } }`, and the flat rises into view. By the river, the scene fades, and Ava's answer is a block of its own, `ava.river.2`, revealed with `slide-up`. The rest of the town swaps screens at once. See [Transitions](/docs/recipes/transitions).

### Stat bars and speakers' colours

`world/stats.ts` and `world/cast.ts`. Energy has `ui: { display: 'bar' }` and charm `ui: { display: 'pips' }`, so the sidebar draws a bar and a row of pips under them. Ava has `ui: { hue: 20 }` and Sam `ui: { hue: 200 }`, so their lines come in their own colours. The tests run [`checkUiHints`](/docs/react/hints#checkuihints) over the whole town.

### Actions and tooltips in the text

`story/moving-day.ts` and `story/flat.ts`. The moving-day prose has `[[tip:intro.launderette|launderette]]`, a tooltip whose note is the prose line `intro.launderette`. The flat's body has a second block, shown while Ava's text has come and hasn't been read. It says "Your phone buzzes on the sill: a message. [[act:read-text|Check it]].", and `read-text` is one of the flat's `actions`, with the command `devices.open('texts')`. So Check it is a link in the line that opens the phone's messages, and it isn't a button under the text as well. See [Actions and tooltips in the text](/docs/recipes/inline-actions).

### The calendar

`src/game.ts`, `clock`. The town keeps time with the [calendar plugin](/docs/reference/plugins/calendar), `export const clock = calendar({ start: { day: 0, period: 'night' } })`. It's listed first in `plugins`, so every other plugin sees the new day when a turn ends. A turn is a day, which is the calendar's default, and a new game starts on the night you move in, day 0, a Monday. The header, `Day 1 · Monday night · Your flat`, is the calendar's label followed by the places plugin's, at [`view.when`](/docs/reference/view#the-clock-and-the-player).

### Places

`src/game.ts` and the `locations`, one in each place's file in `story/`. The town's map is the [places plugin](/docs/reference/plugins/places), `places({ start: 'flat' })`, listed after `clock` in `plugins` so its label comes after the calendar's. The places themselves are entities, each written with the plugin's [`places.location()`](/docs/reference/plugins/places#location) in its file's `entities`: the flat, the high street, the café, the park and the office. Each has its `exits` and its own `actions`, the buttons offered there: the flat's Go to bed, the café's coffee and sandwich, the office's shift and the park's jog. A button sends its action with the plugin's id in front, such as `{ type: 'action', id: 'places/coffee' }`, and an action that isn't the room's is refused. The welcome note is a trigger whose `when` is `places.at('high-street')`. Walking is the plugin's `places.go()` command, which the places plugin's React UI sends from each exit, under its [`LocationCard`](/docs/reference/plugins/places#locationcard).

The files in `story/` pass time with the calendar's helpers, imported from `@ifloom/plugin-calendar`:

- Wait a while is `effects: [calendar.pass(1)]`.
- A shift at the office passes two periods with `calendar.pass(2)`, and a jog passes one.
- The flat's Go to bed is `command: calendar.sleep()`, which moves the clock to the next morning and ends the turn.

Buying a coffee or a sandwich takes no time. A button that passes time carries the calendar's [price note](/docs/reference/plugins/calendar#price-notes), such as `until evening`, and one that would run past dawn carries a warning instead.

### Opening hours

`story/cafe.ts` and `story/office.ts`, the `cafe` and `office` locations. Each keeps its hours with a [`blocked`](/docs/reference/plugins/places#the-location-trait) list, using the calendar's conditions and its own words. The café is locked with `{ when: { not: calendar.period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' }`.

The office's list is checked in order, so the most particular reason comes first:

1. `calendar.weekday(5, 6)` gives `Shut at weekends.`
2. From Friday evening, `{ all: [calendar.weekday(4), { not: calendar.period('morning', 'afternoon') }] }` gives `Closed. Back on Monday.`
3. Any other evening gives `Closed. Opens tomorrow morning.`

Any kind of location can be locked this way.

### A picture with a hotspot

`story/cafe.ts`, the `cafe` location's `picture`. While Ava is on shift, the café shows her photo, `art/photo/ava.svg`, as a [layered picture](/docs/reference/plugins/places#the-picture)'s layer, with a hotspot on her that sends the cast's `cast.talk('ava')`:

```ts fragment
picture: {
  aspect: '16/10',
  layers: [{ id: 'counter', src: 'photo/ava.svg', when: cast.here('ava') }],
  hotspots: [{ id: 'ava', rect: [36, 22, 28, 44], label: 'Talk to Ava', command: cast.talk('ava'), layer: 'counter' }],
},
```

The layer has a `when`, and the hotspot names the layer, so both go when Ava does. With no layer left the café has no picture, and the [`LocationCard`](/docs/reference/plugins/places#locationcard) draws none. While a scene is open the hotspot is left out, so the player finishes the scene first.

### People and schedules

`world/cast.ts`, and `cast()` in `src/game.ts`. Ava and Sam are the [cast plugin](/docs/reference/plugins/cast)'s characters, entities written with [`cast.person()`](/docs/reference/plugins/cast#person) in that file's `entities`: each one's name, a line about them (`description`) and portrait (`image`), with the cast's schedule, talk and call beside them. `cast()` is listed after `places({ start: 'flat' })`, and asks it through `places/here` to find out who is in the room.

Ava's [schedule](/docs/reference/plugins/cast#where-people-are) puts her at the café Monday to Saturday, mornings and afternoons:

```ts fragment
{ location: 'cafe', when: { all: [calendar.weekday(0, 1, 2, 3, 4, 5), calendar.period('morning', 'afternoon')] } }
```

The rest of the time she's at her `home`, the park. The first entry whose `when` holds says where she is. Sam is on the high street every morning, `{ location: 'high-street', when: calendar.period('morning') }`.

The café's body has a line that only shows while Ava is there, `{ text: 'Ava is behind the counter, flour to the elbows, and nods you in.', when: cast.here('ava') }`, with the cast's [`cast.here()`](/docs/reference/plugins/cast#conditions). The camera's `photo-ava` and `photo-sam` actions use the same condition, in a `blocked` entry that refuses the photo while the person isn't here.

### Data scenes, variants and once-a-turn choices

`story/ava.ts`, the scene `ava.hi`, and its small talk in `story/ava.prose.ts`. Its [body](/docs/reference/scenes#block) is a line, then `{ variants: 'ava.smalltalk' }`, which deals one of three lines from the file's `variants`, then a line for a regular. That last line shows once the scene has been seen three times (`{ seen: 'ava.hi', gte: 3 }`).

Its [choices](/docs/reference/scenes#choice) are:

- `chat`, which adds 5 to Ava's friendship and is `once: { per: 'turn' }`, so the player can't farm it
- `compliment`, which needs `charm` at 3
- `bye`, which closes the scene

Talking to Ava opens it, because it's the last of her [`talk`](/docs/reference/plugins/cast#talkoption) options, the one with no `when`.

Ava's greeting is two paragraphs in one `text()` block, the narration and then her line in quotes. A paragraph that starts and ends with a quote is drawn as [speech](/docs/reference/prose#speech), so the narration has to be a paragraph of its own.

Her small talk comes straight after that line, so each of the three lines is written under her id, such as `@ava: "Rain later. The ducks know before the forecast does."`. The view shows it under her name, from her entity. A bare quote after a character's line is read as the player's answer, so written that way, Ava's small talk would come out in the player's voice.

### Place variants

`story/high-street.ts`, the `high-street` place. Its body is the street's line, then `{ variants: 'street.weather' }`, which is one of three lines about the weather from the file's `variants`, like Ava's small talk. A room has no choices to record a draw, so the line is picked from the save's seed and the turn alone. It's dealt afresh each turn (each day, here), and it's the same every time the player looks in that day. Two days running can deal the same line. See the [`variants` block](/docs/reference/scenes#block).

### Sit a while at the café

`story/cafe.ts`, the `sit` action and the four `cafe.*` scenes. The café has a "Sit a while" button, a room action whose one effect draws a [storylet](/docs/reference/storylets):

```ts fragment
{ id: 'sit', label: 'Sit a while', effects: [{ scene: { from: 'cafe', otherwise: 'cafe.quiet' } }] }
```

Three scenes name `'cafe'` in their `drawnFrom`, each with a weight and a `when`:

- `cafe.window`, the window seat, weight 3, until it's been seen twice (`{ not: { seen: 'cafe.window', gte: 2 } }`)
- `cafe.break`, Ava's five minutes off, weight 2, only while she's there (`cast.here('ava')`), which adds 2 to her friendship
- `cafe.crossword`, the man doing the crossword, weight 1, once (`{ not: { seen: 'cafe.crossword' } }`), which adds 1 charm

Each time the player sits down, one of the scenes whose `when` holds is drawn by weight, from the save's seed, the turn and how many times they've sat down before. Once the window has been seen twice, the crossword done and Ava isn't on shift, there's nothing left to draw, and the button opens `cafe.quiet`, "A quiet table", instead. No list of the café's storylets exists anywhere, so a mod adds one by declaring a scene with `drawnFrom: ['cafe']`.

The test `draws something to happen when you sit a while at the café, and a quiet table when nothing can` sits down with twenty seeds, checks that more than one scene comes up, and then plays a Sunday afternoon with everything seen.

### Quests

`story/moving-day.ts` and `story/ava.ts`, `data.quests`, and the [quests plugin](/docs/reference/plugins/quests) in `src/game.ts`. `settle` starts when the phase is `open`, `{ kv: 'phase', is: ['open'] }`, and has three stages. The last is done by the feed plugin's condition `{ 'feed/posted': { gte: 1 } }`.

`friend` starts once the other is active, with `quests.active('settle')`, and is tied to Ava's storyline. Its first stage, `close`, is done when she's a friend, `{ stat: 'friendship', of: cast.character('ava'), gte: 25 }`. The UI calls the quest list "To do", from the game's strings.

### A stage that waits turns

`story/ava.ts`, the `friend` quest's second stage, `river`. It's done by `{ all: [{ since: 'ava.hi', gte: 3 }, { seen: 'ava.river' }] }`. That's three whole turns or more since the player first met Ava (days, in this game), and the evening by the river seen.

Friendship says how well the player knows her, and [`since`](/docs/reference/conditions#since) says for how long, so chatting ten times on the first afternoon doesn't make a friend by teatime. The test `charges rent on Sundays, and meets Ava by the river once a friendship has had time` plays it to the end.

### Friendship, and who you talk to where

`world/stats.ts` and Ava's `talk` in `world/cast.ts`. Friendship is a stat the game declares on the cast's kind, `{ id: 'friendship', label: 'Friendship', of: 'character' }`, so each character keeps their own ([entity stats](/docs/reference/stats#entity-stats)). Scenes change it with `{ stat: 'friendship', by: 5, of: cast.character('ava') }`, using the cast's [`person`](/docs/reference/plugins/cast#helpers).

Talking to Ava opens the first of her [`talk`](/docs/reference/plugins/cast#talkoption) options whose `when` holds. The first one is:

```ts fragment
{ scene: 'ava.river', when: { all: [places.at('park'), { stat: 'friendship', of: '$', gte: 25 }] } }
```

It holds when the player is in the park, which is Ava's `home` and where she goes after the café shuts, and her friendship is 25 or more. `'$'` stands for Ava herself. Otherwise the talk opens `ava.hi`, so Ava by the river in the evening is a different conversation from Ava at the till. The river scene's one choice, `stay`, adds 5 friendship.

### Wardrobe

`src/game.ts` adds the [wardrobe](/docs/reference/plugins/wardrobe). `world/things.ts` has its two slots, `coat` and `neck`, in `data.wardrobe`, with the player starting in the raincoat, and the raincoat and the scarf as `clothing` entities with the `wearable` trait. The café notices the raincoat with a body line on `wardrobe.wearing('clothing:raincoat')`. The scarf is given on the high street by the `scarf` action, with the engine's `give`. The React UI's [`WardrobeCard`](/docs/reference/plugins/wardrobe#wardrobecard), at the foot of the sidebar, shows what's on and has the buttons to change it.

### Timed statuses

`story/cafe.ts`, the `coffee` action and `data.statuses`, and `statuses()` in `src/game.ts`. A coffee applies the [statuses plugin](/docs/reference/plugins/statuses)'s `caffeinated` with `statuses.apply('caffeinated')`. It adds 10 to energy for two turns (the rest of the day and the next) through a [stat modifier](/docs/reference/plugins#stat-modifiers), so `state.stats.energy` keeps its own value and only what it reads goes up. The React UI's [status list](/docs/reference/plugins/statuses#statuslist) shows it under the stats with its turns left. While it lasts, the café has an extra line, `{ text: 'Your knee won’t stop jiggling under the table. …', when: statuses.active('caffeinated') }`. The test `leaves you caffeinated after a coffee, for the rest of the day and the next` plays it.

### The café counter

`story/cafe.ts`, its `shop.vendor()` entity, and `shop()` in `src/game.ts`. The counter is a [shop](/docs/reference/plugins/shop) vendor at the café, an entity written with [`shop.vendor()`](/docs/reference/plugins/shop#vendor), open in the morning and afternoon. It sells sandwiches for 4 coins, which never run out, flapjacks for 2, two a day that the counter holds, baked fresh each morning (`stock: 2, restock: 'day'`), and the newspaper for 2. The prices are each thing's `sellable` trait. Each day one of them is half price, drawn from the save's seed, and Ava takes an unopened sandwich back for half. The café's "Go to the counter" action has one effect, `shop.open('counter')`. That opens the counter in a [panel](/docs/reference/panels), which the React UI draws as a dialog with each good's price, stock and discount, greyed out with `Sold out.` or `Closed.`, to buy and sell back. The café keeps its plain "Buy a sandwich" button, the `buy-sandwich` action with a `cost` of 4 coins and no plugin, so you can compare the two ways: the action is always the same price and never sells out. The tests `sells a sandwich at the café as a plain action too, beside the counter` and `sells from the café counter: two flapjacks a day, half off one thing, and half back on a sandwich` play them, and `draws the plugins' defaults` in `tests/shell.test.tsx` opens the counter.

### A job at the café

`story/cafe.ts` and `story/park.ts`, `data.jobs`, and `jobs()` in `src/game.ts`. Talking to Ava and choosing "Ask about weekend work" closes her scene and opens the [job board](/docs/reference/plugins/jobs#jobboard) in a panel with `jobs.open()`. It lists the weekend job and a dog-walking job in the park. The weekend job's Apply button is greyed out with "Ava doesn't know you well enough yet." until Ava's friendship is 10 or more, and then the player is taken on as weekend help, a [job](/docs/reference/plugins/jobs). The shift is Saturday mornings at the café (`days: [5]`, `hours: ['morning']`), costs 25 energy, takes the morning and pays 12 coins. The board shows the next shift and a "Work a shift" button. After three shifts the player is promoted to barista, at 16. Missing two Saturdays loses the job. The test `takes you on at the café for Saturday mornings once Ava knows you, and pays for each shift` plays a first shift.

You start with a newspaper. Its `usable` trait, "Read the job ads", opens the board with only the paper's ad on it, `jobs.open(['dogs'])`. It's kept (`keep: true`), so you can read it again. `opens the newspaper's job ads` in `tests/shell.test.tsx` reads it.

### Visitors in the park

`story/park.ts`, `kinds`, the `visitors` trigger, `data.generators`, and `generators()` in `src/game.ts`. The park has visitors, entities of the game's own kind `visitor`, made by the [generators](/docs/reference/plugins/generators) plugin. The first time each day the player is in the park, the trigger removes yesterday's visitors with an `each` and makes two more with `generators.generate('visitor', 2)`. Each one's name is picked from the `first-names` pool, and its `with` kv key from `company`, where a dog is four times as likely as a pushchair. The park has an extra line while any visitor is about, `{ count: 'visitor', gte: 1 }`. The test `fills the park with two new visitors each day, drawn from the town’s pools` plays two days.

### Skimming stones

`story/park.ts`, the `skim` action and the `ducks` trigger. The park's prose has a line with an inline action, `[[act:skim|Try to skim a stone]]`. The action rolls `2d6` against 8 with the [`roll` effect](/docs/reference/effects#roll), and three blocks after the line say how it went, read with the [`roll` condition](/docs/reference/conditions#roll): a double six, a pass, or a stone that sinks. They show only on the day you skim, through a `skimmed` kv key the park's `resets` put back each day. Each carries `ui: { dice: 'skim' }`, so the React UI draws the dice above the line and holds the line back until they settle. A trigger also rolls `1d6+2` ducks as you arrive, printed with `{{ducks}}`, and with no line hinting it the React UI shows those dice for a moment over the scene. The test `skims a stone at the park on two dice against 8, and counts the ducks as you come in` plays both. See [Dice rolls and checks](/docs/recipes/dice).

### Ava's call

`story/flat.ts`, the `flat.ring` timer, scene and trigger. An evening at home, from the day after you've answered Ava's text, the trigger opens the `flat.ring` scene and starts the `flat.ring` [timer](/docs/reference/timers) in the same effects. The line that says the phone is ringing carries `ui: { timer: 'flat.ring' }`, so the React UI draws a ten-second countdown under it. "Answer it" stops the timer with `to: null` and opens Ava's call. "Let it ring" stops it too and closes the scene. If neither is chosen in time, the tick that runs it out runs its effects: the scene closes, `missedAva` is set and a "Missed call: Ava" notice comes in. It rings once. The test `rings the phone at home one evening once her text is answered: answer within ten seconds, or miss the call` plays both ways with ticks. See [Timed choices and countdowns](/docs/recipes/timers).

### Achievements

`world/achievements.ts` and `story/ava.ts`, `data.achievements`, and `achievements()` in `src/game.ts`. The town has two [achievements](/docs/reference/plugins/achievements). "Nest egg" has no condition, only `progress: { value: 'coins', target: 100 }`, so the list shows the coins on hand out of 100 and it's earned when they reach 100. "Dusk by the river" is `secret`, so it reads `???` until `{ seen: 'ava.river' }` holds. The title screen and the sidebar's Achievements button open the React UI's [achievements page](/docs/reference/plugins/achievements#achievementspage), with a bar for the coins. The test `charges rent on Sundays, and meets Ava by the river once a friendship has had time` checks both, and the notice it raises.

### Triggers and notices

`story/moving-day.ts`, `triggers`. `welcome` [fires](/docs/reference/triggers) the first time the player is on the high street. It raises a [notice](/docs/reference/notices), a note under the door, and gives the player the note itself, `note:welcome`, with the engine's `give`.

`rent` repeats, because it's `once: { per: 'turn' }`. Its condition is Sunday from day 6 on, `{ all: [calendar.weekday(6), calendar.day({ gte: 6 })] }` with the calendar's conditions, so it fires on the first command of every Sunday. It takes 30 coins and raises the notice `Rent paid: 30 coins` with the fixed id `rent`, so each week's notice replaces the last one rather than piling up. It's the town's one bill, so the coins the player earns have somewhere to go.

### Notes and photos

Notes and photos are [things the player holds](/docs/reference/entities#notes-photos-and-other-things-made-in-play). `world/things.ts` declares the `note` kind, `story/moving-day.ts` the welcome note, and `world/phone.ts` the `photo` kind. The camera's `photo-ava` and `photo-sam` actions, in `world/phone.ts`, make a photo with [`create`](/docs/reference/effects#create), with its name and picture, and give it to the player. Each is blocked while that person isn't here. `post` needs a photo first, with the [condition](/docs/reference/conditions#count) `{ count: { of: 'photo', at: 'player' } }`, and the game's `postLatest` effect, in `rules.ts`, posts the newest one. The inventory lists only clothing, items and keepsakes (its `data.inventory.kinds`), so notes and photos stay in the phone.

### The phone, with its own apps

`world/phone.ts`, and `devices()`, `messages()` and `feed()` in `src/game.ts`. The phone is plain content, first in the content list, put together as [A phone](/docs/recipes/phone) shows. It declares the `photo` kind, the phone itself on the sidebar, the texts channel and the social feed, and six apps: Messages and Social, each with an unread badge and a section the messages or feed plugin draws, Contacts, a Gallery of the photos you hold, a Camera whose section is three actions, and Notes, a section listing the `note` things you hold. `openCamera` is the [devices](/docs/reference/plugins/devices) helper `devices.open('camera')`, for tests.

### Calls

`world/cast.ts`, Ava's `call`. The player can [call](/docs/reference/plugins/cast#calls) her from anywhere, but only in the evening or at night, `when: calendar.period('evening', 'night')`. In the day the call is refused with her `busy` line. It opens the scene `ava.call`.

### Messages

`story/ava.ts`, `data.messages`. Ava's text arrives in the `texts` channel a turn (a day, here) after you first meet her, with `{ all: [{ seen: 'ava.hi' }, { since: 'ava.hi', gte: 1 }] }`. Its two replies are [choices](/docs/reference/plugins/messages#replydef), and one adds 5 to her friendship.

### Feeds, and an effect worked out in code

`story/ava.ts` and `story/sam.ts`, `data.feed`, have Ava's and Sam's posts. They appear from days 1 and 2 (`when: calendar.day({ gte: 1 })`, with the calendar's day counting from 0).

The player's own post is the camera's `post` action. Its `{ 'game/postLatest': true }` effect is one of the game's own [macros](/docs/reference/custom#macros), in `src/rules.ts`. It takes the newest photo, posts it with the feed plugin's `feed.post`, rolls the likes with its context's [`roll`](/docs/reference/custom#customcontext), drawn from the save's seed, and has Ava `react`. It returns plain effects, including plugin effects, so the same save always gets the same likes.

### Resets each turn

`resets` in `story/cafe.ts` and `world/actions.ts`. `hadCoffee` and `postedToday` go back to `false` at the end of each turn ([`resets`](/docs/reference/rules#resets)). Each file that sets a key resets it, so the coffee's is with the café. In this game a turn is each day, when the player goes to bed. The `coffee` and `post` actions are blocked while they're set, so each works once a day, and a second coffee is refused with `One is enough for today.`

### The turn rule

`src/rules.ts`, `rules.onTurn`. [`onTurn`](/docs/reference/rules#onturn) applies an effect that puts `energy` back to 100 at the end of each turn, which is overnight here, since a turn is a day. It runs before the calendar's `onTurn` hook, so it sees the night, not the new morning.

### Stats

`world/stats.ts`, `stats`. There are four [declared stats](/docs/reference/stats):

- `friendship`, which each character keeps (see above)
- `coins` and `energy`, which are `spendable`, with a `format` and a `lacking` line, and pay for actions through `cost`
- `charm`, which goes up with a jog, a post or the café's crossword, and opens the `compliment` choice

### Strings

`src/game.ts`, `strings`. One override, `'ui.quests': 'To do'`, renames the quest list. See [Overriding](/docs/reference/strings#overriding) and the [React UI's words](/docs/react#words).

### Cheats and the supporter code

`world/cheats.ts`, `data.cheats` and `data.unlocks`, and `cheats()` and `unlocks()` in `src/game.ts`. The town has two [cheats](/docs/reference/plugins/cheats). "+20 coins" is free for everyone. "Full energy", in the Supporters group, is refused with `For supporters.` until the [unlock](/docs/reference/plugins/unlocks) `supporter` is recorded. The sidebar's Cheats button opens them. The test `offers a free cheat on moving day, and keeps the supporter one greyed out until the unlock is recorded` checks that a cheat works during moving day's lock and passes no time.

The unlock holds the hash of the code `SMALL-TOWN-SUPPORTER`, which is in `.env` and public on purpose. Its content, `src/unlocks/supporter.ts`, is one more of the café's storylets, "The back room". `ifloom build` encrypts it into the page, and `src/main.tsx` opens it with `unlockedPacks` once the player has the code. Enter the code on the settings page: the cheat opens at once, and "Restart to add it" reloads the page with the scene, which "Sit a while" at the café can then draw. The test `unlocks the supporter edition with the code in .env` plays that, and replays it exactly. [Supporter content and cheats](/docs/recipes/supporter-content) explains what this protects and what it doesn't.

### Debug, in development only

`src/game.ts` takes `withDebug`, and `src/main.tsx` passes `import.meta.env.DEV`. So the [debug plugin](/docs/reference/plugins/debug#leave-it-out-of-release-builds) and its panel are there under `ifloom dev` and gone from `ifloom build`. The test `has the debugger only when built with it` holds it to that.

### Playtest and snapshot

`src/game.ts`'s default export is its [game module](/docs/cli#the-game-module), what the [CLI](/docs/cli)'s commands read. It has no `start`, so both testing commands begin from `startingState(game)`. That's moving day, with the seed made from the game's id, so every run deals the same.

`probes` is three states for [`ifloom snapshot`](/docs/cli#ifloom-snapshot), each made with [`probe`](/docs/cli#probe) by playing from the start:

- `moving-day`, the start
- `first-morning`: unpack, then go to bed, played as commands
- `a-week-in`: six more days from there, with Ava's hello played on four of them, then the second Monday afternoon set with `calendar/set`, the raincoat taken off with the wardrobe's `takeOff` command, and the cat named Biscuit, charm at 5, Ava's friendship at 30 and a coffee's status applied as effects

The days go by with the `turn` effect, so the calendar, the turn count and every plugin's turn (Ava's text arriving, the rent) agree. Pick probes like these, far enough apart that the content's conditions come out differently in each.

`package.json` has `"playtest": "ifloom playtest --turns 7 --out playtest/week.txt"` and `"snapshot": "ifloom snapshot"`. The playtest uses the [explorer](/docs/cli#explorer). Read its week before and after you change a price or a condition.

The snapshot is committed in `snapshots/scenes.txt`, and `tests/build.test.ts` compares it on every run. If you change how any scene or place reads, the tests fail until you look. Run `npm run snapshot -w @ifloom/showcase -- --update`, then read the diff before committing.

### The build

`vite.config.ts` is `export default ifloom()`. The scripts in `package.json` are the [CLI](/docs/cli)'s five commands, and `build:one-file`, which is `ifloom build --inline-assets --out dist-one` ([one file, pictures and all](/docs/cli#one-file-pictures-and-all)).

The game module's `build` returns the release build, `smallTown({ unlocked })`, and that's what `ifloom check` loads. `tests/build.test.ts` runs [`checkGame`](/docs/cli#checkgame) on it, and once the showcase has been built, [`checkBuild`](/docs/cli#checkbuild) on `dist/`.

## What it doesn't show yet

- **Pictures of places.** Each place names its art, `place/<id>`, and the places plugin's [view](/docs/reference/plugins/places#the-view) passes it on as `location.art`. But there's no `art/place/` yet, and the React UI doesn't draw a place's art. The café's [layered picture](#a-picture-with-a-hotspot) is the one picture of a place, drawn from a photo the town already has.
- **Video and layers.** Small Town has no video and no picture with transparent parts, so its one layered picture has a single layer. [Media](/docs/reference/media) shows one with a clip layered over a picture.
- **A patch.** The example mods add prose, variants and words, but no mod patches a choice into one of the town's scenes. See [Patches](/docs/reference/content#patch).
