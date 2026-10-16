---
description: A tour of Small Town, the example game in examples/showcase that uses every feature, with where each feature lives in its source and the test that plays it.
---

# The showcase: Small Town

Small Town is the game in `examples/showcase` of the IFLoom repository. It's a first week in a new town, small enough to read in an afternoon, and it uses the engine's features together. You move into a flat above a launderette with a cat you get to name. You meet Ava, who runs the café, and Sam from the flat downstairs, take a photo with your phone and post it, and get a text the next day.

When a page in these docs says "see it in the showcase", this is the source it means. Its tests play it through every system it uses.

To start a game of your own from a copy of it, run `npm run new -- my-town --template town` from the root of the checkout (see [`ifloom new`](/cli/#ifloom-new)).

## Run it

From the root of the IFLoom checkout, after `npm install`:

```sh
npm run dev -w @ifloom/showcase     # play it in a browser, with the debug panel
npm run build -w @ifloom/showcase   # build examples/showcase/dist/index.html
npm run check -w @ifloom/showcase   # list any problem in its content
npm run playtest -w @ifloom/showcase  # play a week unattended, into playtest/week.txt
npm run snapshot -w @ifloom/showcase  # compare every scene with snapshots/scenes.txt
npm run build:one-file -w @ifloom/showcase  # build dist-one/index.html, the pictures inside it
```

These are the [CLI](/cli/)'s commands, `ifloom dev`, `build`, `check`, `playtest` and `snapshot`, run from the showcase's folder. Open the built `dist/index.html` straight from disk. It's one file beside an `art/` folder, and it runs with no server. `dist-one/index.html` is the same game with its pictures inside it and nothing beside it.

## The files

| File | What's in it |
|---|---|
| `src/content/town.ts` | All the content, as one [pack](/reference/loader#pack): places, people, stats, items, activities, scenes, triggers, quests, clothes, messages and posts. All of it is data. |
| `src/content/prose.ts` | Every word the player reads, by key. Choice labels are `<scene>#<choice>`, and reply labels are `<message>#<reply>`. |
| `src/content/custom.ts` | The only code in the content: an effect worked out from the state, and a value the prose prints. |
| `src/game.ts` | The game put together: the pack, the plugins, the phone, the rules, the locks and the strings it rewords. It also exports the `start` and `probes` that the playtest and the snapshot use. |
| `src/main.tsx` | The page. It loads the player's mods over the town, makes a [runner](/reference/runner) with undo, a backlog, saves, a profile and autosave, and draws it with the [React UI](/react/)'s `GameShell`, its title screen and its mod manager. |
| `src/styles.css` | The React UI's stylesheet with the `storybook` [preset](/react/customising#_1-pick-a-theme-preset), and a sea-blue accent of its own. |
| `public/art/` | The pictures: a portrait each for Ava and Sam, and the two photos the camera takes. Copied into the build as `art/`. |
| `mods/fog-season.json` | An example [mod](/reference/mods) for a player to add. It isn't part of the game. |
| `vite.config.ts` | The CLI's [Vite preset](/cli/#the-vite-preset), and nothing else. |
| `tests/showcase.test.ts` | The first days, played command by command. |
| `tests/build.test.ts` | `ifloom check`, the build check and the snapshot comparison, as tests. |
| `snapshots/scenes.txt` | Every scene and place in three states, as `ifloom snapshot` last wrote it. It's committed. |

The other examples start with one call to [`mountGame`](/react/#mountgame) in `src/main.ts`. Small Town writes `src/main.tsx` by hand instead, because it has to load the player's mods before it can make the game.

## Feature by feature

### Locks

`src/game.ts`, `rules.locks`. Moving day is a [lock](/reference/locks) on the `arrival` phase. It denies `'*'` except `choose` and `input`, so the intro only moves through its scene and the box for the cat's name. The `unpack` choice in `town.ts` sets the phase to `open`, and the lock lets go.

A second lock, `{ when: at('office'), deny: ['devices/*'], reason: 'Not at work.' }`, keeps the phone away at the office. It uses the [places](/plugins/places) plugin's [`at()`](/plugins/places#conditions). In the test `keeps the phone in the pocket at work`, opening the camera there is refused with `Not at work.`

### Inputs, and a value the prose prints

`town.ts`, `inputs`. On moving day the game asks for the cat's name with an [input](/reference/inputs): `catName`, `kind: 'text'`, `maxLength: 16`, offered only while `when: { phase: ['arrival'] }` holds. The React UI draws it under the scene as an [`InputField`](/react/components#inputfield). What the player types is kept, trimmed, in the variable `catName`.

`src/content/custom.ts` has a [custom value](/reference/custom#values) of the same name. It reads the variable, or says `The cat` if nothing was typed, and the flat's prose prints it: <code v-pre>{{v:catName}} has claimed the warm spot on the sill.</code> Once the phase is `open`, the input is gone, and a value sent anyway is refused with `Not now.`

### Items you use

`town.ts`, the `sandwich` item and the café counter's sandwich (see [The café counter](#the-cafe-counter)). The sandwich costs 4 coins and has a [`use`](/reference/game#itemdef). Its button, "Eat the sandwich", spends it and puts 25 energy back. The React UI's [`Inventory`](/react/components#inventory) lists what the player carries, with that button. The test `names the cat on moving day, and says the name after` buys one, eats it and checks both.

### Mods

`src/main.tsx` and `mods/fog-season.json`. The page keeps the player's [mods](/reference/mods) in IndexedDB, with `mods('small-town', indexedDbDriver({ database: 'small-town-mods' }))`. Before anything else, with a top-level `await`, it passes the packs of the mods that are turned on to `smallTown({ mods })`, which loads them after the town's own pack.

`GameShell` gets <code v-pre>mods={{ store: modStore, problems, onChange: () => location.reload() }}</code>, so the player's menu has a Mods dialog. There the player can add a file, turn a mod off or remove it, then restart with the mods they've chosen.

`mods/fog-season.json` is a mod to try it with. Its pack adds a fourth line, a fog, to the high street's `street.weather` variants, and rewrites `place.park`. A later pack's variants are appended, and its prose replaces the earlier pack's. Add it from the Mods dialog and restart. The test `takes the example mod: fog in the weather, a quieter park, and no problems` loads it through the store, checks both changes, and checks that the loader finds nothing wrong.

### Its own art

`public/art/`. Ava and Sam have portraits, `art/character/ava.svg` and `art/character/sam.svg`, and the camera's two photos are `art/photo/ava.svg` and `art/photo/sam.svg`. Each is their initials on a coloured disc, with no face. Vite copies `public/` into the build, so they sit in `dist/art/` beside the page. `npm run build:one-file` puts them inside it instead.

Each character's `portrait` in `town.ts` names its `.svg` file. If it were left out, the [cast](/plugins/cast#characterdef) would draw `art/character/ava.jpg`, because [`artSrc`](/reference/prose#artsrc) adds `.jpg` to a path with no extension, and there's no such file. The photos name their `.svg` the same way.

### Saves, the backlog and undo

`src/main.tsx`. The runner is made with `history: { depth: 50 }`, `backlog: { limit: 200 }`, `saves` on `localStorage` and `autosave: { every: 'turn' }`. Each one turns on a part of the React UI's [`GameMenu`](/react/components#gamemenu) in the sidebar:

- Undo and Redo buttons
- a Backlog of every scene shown, with the choice made in it
- a Saves menu to save, load, export and import

None of it needs any change to the game's content.

### The title screen and settings

`src/main.tsx` and the `settings` in `town.ts`. `GameShell` gets `pages` with a subtitle and two lines of credits, so the game opens on a title screen. The runner gets a [profile](/reference/profile), which keeps the player's settings between games.

The town declares two [settings](/reference/settings). `hints` is a play setting, on by default, and the high street shows a hint line only `when: { setting: 'hints' }`. `textSize` is a ui setting with the options `normal` and `large`. `main.tsx` copies it from the profile to `data-text-size` on the page's `<html>`, now and whenever it changes, and `styles.css` makes the root font bigger for `large`. [The title screen and settings](/guide/title-screen) explains both.

### The calendar

`src/game.ts`, `clock`. The town keeps time with the [calendar plugin](/plugins/calendar), `export const clock = calendar({ start: { day: 0, period: 'night' } })`. It's listed first in `plugins`, so every other plugin sees the new day when a turn ends. A turn is a day, which is the calendar's default, and a new game starts on the night you move in, day 0, a Monday. The header, `Day 1 · Monday night · Your flat`, is the calendar's label followed by the places plugin's, at [`view.when`](/reference/view#the-clock-and-the-player).

### Places

`src/game.ts` and the `locations` in `town.ts`. The town's map is the [places plugin](/plugins/places), `places({ start: 'flat' })`, listed after `clock` in `plugins` so its label comes after the calendar's. The places themselves are content, in the pack's `data.places.locations`: the flat, the high street, the café, the park and the office. Each has its `exits`, and the flat has its Go to bed action.

Activities that belong somewhere require it with [`onlyAt`](/plugins/places#helpers). `coffee` has `requires: [onlyAt(['cafe'])]`, `work` has `onlyAt(['office'])` and `jog` has `onlyAt(['park'])`. The welcome note is a trigger whose `when` is `at('high-street')`. Walking is the plugin's `go()` command, which the React UI's [`LocationPanel`](/react/components#locationpanel) sends from each exit.

`town.ts` passes time with the calendar's helpers, imported from `@ifloom/plugin-calendar`:

- Wait a while is `effects: [pass(1)]`.
- A shift at the office passes two periods with `pass(2)`, and a jog passes one.
- The flat's Go to bed is `command: sleep()`, which moves the clock to the next morning and ends the turn.

Buying a coffee or a sandwich takes no time. A button that passes time carries the calendar's [price note](/plugins/calendar#price-notes), such as `until evening`, and one that would run past dawn carries a warning instead.

### Opening hours

`town.ts`, the `cafe` and `office` locations. Each keeps its hours with a [`locked`](/plugins/places#locationdef) list, using the calendar's conditions and its own words. The café is locked with `{ when: { not: period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' }`.

The office's list is checked in order, so the most particular reason comes first:

1. `weekday(5, 6)` gives `Shut at weekends.`
2. From Friday evening, `{ all: [weekday(4), { not: period('morning', 'afternoon') }] }` gives `Closed. Back on Monday.`
3. Any other evening gives `Closed. Opens tomorrow morning.`

Any kind of location can be locked this way.

### A stage with a hotspot

`town.ts`, the `cafe` location's `stage`. While Ava is on shift, the café shows her photo, `art/photo/ava.svg`, as a [stage](/plugins/places#the-picture-stage) layer, with a hotspot on her that sends the cast's `talk('ava')`:

```ts
stage: {
  aspect: '16/10',
  layers: [{ id: 'counter', src: 'photo/ava.svg', when: here('ava') }],
  hotspots: [{ id: 'ava', rect: [36, 22, 28, 44], label: 'Talk to Ava', command: talk('ava'), layer: 'counter' }],
},
```

The layer has a `when`, and the hotspot names the layer, so both go when Ava does. With no layer left the café has no stage, and the [`LocationPanel`](/react/components#locationpanel) draws none. While a scene is open the hotspot is left out, so the player finishes the scene first.

### People and schedules

`town.ts`, the `characters`, and `cast()` in `src/game.ts`. Ava and Sam are the [cast plugin](/plugins/cast)'s characters, in the pack's `data.cast.characters`. `cast()` is listed after `places({ start: 'flat' })`, and asks it through `places/here` to find out who is in the room.

Ava's [schedule](/plugins/cast#where-people-are) puts her at the café Monday to Saturday, mornings and afternoons:

```ts
{ location: 'cafe', when: { all: [weekday(0, 1, 2, 3, 4, 5), period('morning', 'afternoon')] } }
```

The rest of the time she's at her `home`, the park. The first entry whose `when` holds says where she is. Sam is on the high street every morning, `{ location: 'high-street', when: period('morning') }`.

The café's body has a line that only shows while Ava is there, `{ text: 'place.cafe/ava', when: here('ava') }`, with the cast's [`here()`](/plugins/cast#conditions). The camera's `photo-ava` and `photo-sam` activities require the person to be here the same way.

### Data scenes, variants and once-a-turn choices

`town.ts`, the scene `ava.hi`, and its words in `prose.ts`. Its [body](/reference/scenes#block) is a line, then `{ variants: 'ava.smalltalk' }`, which deals one of three lines from the pack's `variants`, then a line for a regular. That last line shows once the scene has been seen three times (`{ seen: 'ava.hi', gte: 3 }`).

Its [choices](/reference/scenes#choice) are:

- `chat`, which adds 5 to Ava's friendship and is `once: { per: 'turn' }`, so the player can't farm it
- `compliment`, which needs `charm` at 3
- `bye`, which closes the scene

Talking to Ava opens it, because it's the last of her [`talk`](/plugins/cast#talkoption) options, the one with no `when`.

Ava's greeting is two paragraphs in `prose.ts`, the narration and then her line in quotes. A paragraph that starts and ends with a quote is drawn as [speech](/reference/prose#speech), so the narration has to be a paragraph of its own.

Her small talk comes straight after that line, so each of the three lines is a named line, such as `Ava: "Rain later. The ducks know before the forecast does."`. A bare quote after a character's line is read as the player's answer, so written that way, Ava's small talk would come out in the player's voice.

### Place variants

`town.ts`, the `high-street` place. Its body is the street's line, then `{ variants: 'street.weather' }`, which is one of three lines about the weather from the pack's `variants`, like Ava's small talk. A room has no choices to record a draw, so the line is picked from the save's seed and the turn alone. It's dealt afresh each turn (each day, here), and it's the same every time the player looks in that day. Two days running can deal the same line. See the [`variants` block](/reference/scenes#block).

### Sit a while at the café

`town.ts`, the `sit` activity and the four `cafe.*` scenes after the rest, with their words in `prose.ts`. The café has a "Sit a while" button, a room action that runs the activity `sit`. Its one effect draws a [storylet](/reference/storylets):

```ts
{ id: 'sit', requires: [onlyAt(['cafe'])], effects: [{ kind: 'scene', from: 'cafe', otherwise: 'cafe.quiet' }] }
```

Three scenes name `'cafe'` in their `drawnFrom`, each with a weight and a `when`:

- `cafe.window`, the window seat, weight 3, until it's been seen twice (`{ not: { seen: 'cafe.window', gte: 2 } }`)
- `cafe.break`, Ava's five minutes off, weight 2, only while she's there (`here('ava')`), which adds 2 to her friendship
- `cafe.crossword`, the man doing the crossword, weight 1, once (`{ not: { seen: 'cafe.crossword' } }`), which adds 1 charm

Each time the player sits down, one of the scenes whose `when` holds is drawn by weight, from the save's seed, the turn and how many times they've sat down before. Once the window has been seen twice, the crossword done and Ava isn't on shift, there's nothing left to draw, and the button opens `cafe.quiet`, "A quiet table", instead. No list of the café's storylets exists anywhere, so a mod adds one by declaring a scene with `drawnFrom: ['cafe']`.

The test `draws something to happen when you sit a while at the café, and a quiet table when nothing can` sits down with twenty seeds, checks that more than one scene comes up, and then plays a Sunday afternoon with everything seen.

### Quests

`town.ts`, `data.quests`, and the [quests plugin](/plugins/quests) in `src/game.ts`. `settle` starts when the phase is `open` and has three stages. The last is done by the feed plugin's condition `{ custom: 'feed/posted', with: { gte: 1 } }`.

`friend` starts once the other is active, with `questActive('settle')`, and is tied to Ava's storyline. Its first stage, `close`, is done when she's a friend, `{ stat: 'friendship', of: person('ava'), gte: 25 }`. The UI calls the quest list "To do", from the game's strings.

### A stage that waits turns

`town.ts`, the `friend` quest's second stage, `river`. It's done by `{ all: [{ since: 'ava.hi', gte: 3 }, { seen: 'ava.river' }] }`. That's three whole turns or more since the player first met Ava (days, in this game), and the evening by the river seen.

Friendship says how well the player knows her, and [`since`](/reference/conditions#since) says for how long, so chatting ten times on the first afternoon doesn't make a friend by teatime. The test `charges rent on Sundays, and meets Ava by the river once a friendship has had time` plays it to the end.

### Friendship, and who you talk to where

`town.ts`, `stats` and Ava's `talk`. Friendship is a stat the game declares on the cast's kind, `{ id: 'friendship', label: 'Friendship', of: 'character' }`, so each character keeps their own ([entity stats](/reference/stats#entity-stats)). Scenes change it with `{ kind: 'stat', key: 'friendship', by: 5, of: person('ava') }`, using the cast's [`person`](/plugins/cast#helpers).

Talking to Ava opens the first of her [`talk`](/plugins/cast#talkoption) options whose `when` holds. The first one is:

```ts
{ scene: 'ava.river', when: { all: [at('park'), { stat: 'friendship', of: '$', gte: 25 }] } }
```

It holds when the player is in the park, which is Ava's `home` and where she goes after the café shuts, and her friendship is 25 or more. `'$'` stands for Ava herself. Otherwise the talk opens `ava.hi`, so Ava by the river in the evening is a different conversation from Ava at the till. The river scene's one choice, `stay`, adds 5 friendship.

### Wardrobe

`src/game.ts` declares the [wardrobe](/plugins/wardrobe)'s two slots, `coat` and `neck`, and starts the player in the raincoat. `town.ts` has the clothes in `data.wardrobe`, and the items they are. The café notices the raincoat with a body line on `wearing('raincoat')`. The scarf is bought on the high street with the `buyScarf` activity. The React UI's [`WardrobePanel`](/react/components#wardrobepanel), at the foot of the sidebar, shows what's on and has the buttons to change it.

### Timed effects

`town.ts`, the `coffee` activity and `data.effects`, and `effects()` in `src/game.ts`. A coffee applies the [effects plugin](/plugins/effects)'s `caffeinated` with `applyEffect('caffeinated')`. It adds 10 to energy for two turns (the rest of the day and the next) through a [stat modifier](/reference/plugins#stat-modifiers), so `state.stats.energy` keeps its own value and only what it reads goes up. While it lasts, the café has an extra line, `{ text: 'place.cafe/caffeinated', when: effectActive('caffeinated') }`. The test `leaves you caffeinated after a coffee, for the rest of the day and the next` plays it.

### The café counter

`town.ts`, `data.shop`, the café's actions, and `shop()` in `src/game.ts`. The counter is a [shop](/plugins/shop) vendor at the café, open in the morning and afternoon. It sells sandwiches for 4 coins and flapjacks for 2, two a day, baked fresh each morning (`stock: 2, restock: 'day'`). Each day one of the two is half price, drawn from the save's seed, and Ava takes an unopened sandwich back for half. The café's "Buy a sandwich for later" and "Buy a flapjack" buttons send `buy('counter', 'sandwich')` and `buy('counter', 'flapjack')`, so they show today's price and grey out with `Sold out.` The test `sells from the café counter: two flapjacks a day, half off one thing, and half back on a sandwich` plays it.

### A job at the café

`town.ts`, `data.jobs`, the café's actions, and `jobs()` in `src/game.ts`. Once Ava's friendship is 10 or more, "Ask Ava about weekend work" sends `applyFor('weekend')` and the player is taken on as weekend help, a [job](/plugins/jobs). The shift is Saturday mornings at the café (`days: [5]`, `hours: ['morning']`), costs 25 energy, takes the morning and pays 12 coins. After three shifts the player is promoted to barista, at 16. Missing two Saturdays loses the job. The test `takes you on at the café for Saturday mornings once Ava knows you, and pays for each shift` plays a first shift.

### Achievements

`town.ts`, `data.achievements`, and `achievements()` in `src/game.ts`. The town has two [achievements](/plugins/achievements). "Nest egg" has no condition, only `progress: { value: 'coins', target: 100 }`, so the list shows the coins on hand out of 100 and it's earned when they reach 100. "Dusk by the river" is `secret`, so it reads `???` until `{ seen: 'ava.river' }` holds. The test `charges rent on Sundays, and meets Ava by the river once a friendship has had time` checks both, and the notice it raises.

### Triggers and notices

`town.ts`, `triggers`. `welcome` [fires](/reference/triggers) the first time the player is on the high street. It raises a [notice](/reference/notices), a note under the door, and files the note in the `notes` collection.

`rent` repeats, because it's `once: 'turn'`. Its condition is Sunday from day 6 on, `{ all: [weekday(6), day({ gte: 6 })] }` with the calendar's conditions, so it fires on the first command of every Sunday. It takes 30 coins and raises the notice `Rent paid: 30 coins` with the fixed id `rent`, so each week's notice replaces the last one rather than piling up. It's the town's one bill, so the coins the player earns have somewhere to go.

### Collections

`town.ts` declares `notes`, and the phone kit declares `gallery`. The camera's `photo-ava` and `photo-sam` activities [`collect`](/reference/effects#collect) a photo into the gallery, and each `requires` the person to be here. `post` needs a photo first, with the [condition](/reference/conditions#collection) `{ collection: 'gallery' }`. See [Collections](/reference/collections).

### The phone kit, with its own apps

`src/game.ts`, `kit`. [`phone`](/plugins/phone#phone) builds the stock Messages, Social, Contacts and Gallery apps. It also builds two of the game's own, listed in `apps`: a Camera whose section is three buttons that send activities, and Notes, a section over the `notes` collection. The game passes on both halves of the kit, `kit.plugins` and `kit.collections`. `openCamera` is the [devices](/plugins/devices) helper `openApp('camera')`, for tests.

### Calls

`town.ts`, Ava's `call`. The player can [call](/plugins/cast#calls) her from anywhere, but only in the evening or at night, `when: period('evening', 'night')`. In the day the call is refused with her `busy` line. It opens the scene `ava.call`.

### Messages

`town.ts`, `data.messages`. Ava's text arrives in the `texts` channel a turn (a day, here) after you first meet her, with `{ all: [{ seen: 'ava.hi' }, { since: 'ava.hi', gte: 1 }] }`. Its two replies are [choices](/plugins/messages#replydef), and one adds 5 to her friendship.

### Feeds, and an effect worked out in code

`town.ts`, `data.feed`, has Ava's and Sam's posts. They appear from days 1 and 2 (`when: day({ gte: 1 })`, with the calendar's day counting from 0).

The player's own post is the `post` activity. Its `{ custom: 'postLatest' }` effect is a [custom effect](/reference/custom#effects) in `src/content/custom.ts`. It takes the newest photo, posts it with the feed plugin's `postTo`, rolls the likes with [`roll`](/reference/random#roll) from the save's seed, and has Ava `react`. It returns plain effects, including plugin effects, so the same save always gets the same likes.

### Resets each turn

`src/game.ts`, `rules.resets`. `hadCoffee` and `postedToday` go back to `false` at the end of each turn ([`resets`](/reference/rules)). In this game that's each day, when the player goes to bed. The `coffee` and `post` activities require them to be unset, so each works once a day, and a second coffee is refused with `One is enough for today.`

### The turn rule

`src/game.ts`, `rules.turn`. [`turn`](/reference/rules) returns an effect that puts `energy` back to 100 at the end of each turn, which is overnight here, since a turn is a day. It runs before the calendar's `turn` hook, so it sees the night, not the new morning.

### Stats

`town.ts`, `stats`. There are four [declared stats](/reference/stats):

- `friendship`, which each character keeps (see above)
- `coins` and `energy`, which are `spendable`, with a `format` and a `lacking` line, and pay for activities through `cost`
- `charm`, which goes up with a jog, a post or the café's crossword, and opens the `compliment` choice

### Strings

`src/game.ts`, `strings`. One override, `'ui.quests': 'To do'`, renames the quest list. See [Overriding](/reference/strings#overriding) and the [React UI's words](/react/#words).

### Debug, in development only

`src/game.ts` takes `withDebug`, and `src/main.tsx` passes `import.meta.env.DEV`. So the [debug plugin](/plugins/debug#leave-it-out-of-release-builds) and its panel are there under `ifloom dev` and gone from `ifloom build`. The test `has the debugger only when built with it` holds it to that.

### Playtest and snapshot

`src/game.ts` exports what the [CLI](/cli/)'s two testing commands read. `start` is the state both begin from, `startingState(game)`. That's moving day, with the seed made from the game's id, so every run deals the same.

`probes` is three states for [`ifloom snapshot`](/cli/#ifloom-snapshot):

- `moving-day`
- `first-morning`, unpacked, the next morning
- `a-week-in`, the second Monday afternoon, with Ava met four times, her friendship at 30 (in `entities.character.ava.stats`), charm at 5, the cat named Biscuit and the raincoat off

The clock is the calendar's, so each probe writes it with `clock.write(state, { day, period })` and sets `turn` to match, as in `clock.write({ ...start(game), phase: 'open', sceneId: null, turn: 1 }, { day: 1, period: 'morning' })`. Pick probes like these, far enough apart that the content's conditions come out differently in each.

`package.json` has `"playtest": "ifloom playtest --turns 7 --out playtest/week.txt"` and `"snapshot": "ifloom snapshot"`. The playtest uses the [explorer](/cli/#explorer). Read its week before and after you change a price or a condition.

The snapshot is committed in `snapshots/scenes.txt`, and `tests/build.test.ts` compares it on every run. If you change how any scene or place reads, the tests fail until you look. Run `npm run snapshot -w @ifloom/showcase -- --update`, then read the diff before committing.

### The build

`vite.config.ts` is `export default ifloom()`. The scripts in `package.json` are the [CLI](/cli/)'s five commands, and `build:one-file`, which is `ifloom build --inline-assets --out dist-one` ([one file, pictures and all](/cli/#one-file-pictures-and-all)).

The default export of `src/game.ts` is a function that returns the release build, and that's what `ifloom check` loads. `tests/build.test.ts` runs [`checkGame`](/cli/#checkgame) on it, and once the showcase has been built, [`checkBuild`](/cli/#checkbuild) on `dist/`.

## What it doesn't show yet

- **Pictures of places.** Each place names its art, `place/<id>`, and the places plugin's [view](/plugins/places#the-view) passes it on as `location.art`. But there's no `art/place/` yet, and the React UI doesn't draw a place's art. The café's [stage](#a-stage-with-a-hotspot) is the one picture of a place, drawn from a photo the town already has.
- **Video and layers.** Small Town has no video and no picture with transparent parts, so its one stage has a single layer. [Media](/reference/media) shows a stage with a clip layered over a picture.
- **A patch.** The example mod adds prose and variants, but no mod patches a choice into one of the town's scenes. See [Patches](/reference/loader#patches).
