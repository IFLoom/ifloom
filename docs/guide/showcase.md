# The showcase: Small Town

Small Town is the game in `examples/showcase` of the IFLoom repository: a first week in a new town, small enough to read in an afternoon, built to use the engine's features together. You move into a flat above a launderette with a cat you get to name, meet Ava, who runs the café, and Sam from the flat downstairs, take a photo with your phone and post it, and get a text the next day.

It is the reference game. When a page in these docs says "see it in the showcase", this is the source it means, and its tests play it through every system it uses, so what it shows works.

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

They are the [CLI](/cli/)'s commands, `ifloom dev`, `build`, `check`, `playtest` and `snapshot`, run from the showcase's folder. Open the built `dist/index.html` straight from disk: it is one file beside an `art/` folder, and it runs with no server. `dist-one/index.html` is the same game with its pictures inside it, and nothing beside it.

## The files

| File | What is in it |
|---|---|
| `src/content/town.ts` | All the content, as one [pack](/reference/loader#pack): places, people, stats, items, activities, scenes, triggers, quests, clothes, messages and posts. All of it is data. |
| `src/content/prose.ts` | Every word the player reads, by key. Choice labels are `<scene>#<choice>`, reply labels `<message>#<reply>`. |
| `src/content/custom.ts` | The only code in the content: an effect worked out from the state, and a value the prose prints. |
| `src/game.ts` | The game put together: the pack, the plugins, the phone, the rules, the locks, and the strings it rewords. Also the `start` and `probes` the playtest and the snapshot use. |
| `src/main.tsx` | The page: the player's mods loaded over the town, a [runner](/reference/runner) with undo, a backlog, saves and autosave, drawn by the [base UI](/ui/)'s `GameShell` with its mod manager. |
| `src/styles.css` | The base UI's stylesheet, with a warmer accent and softer corners over it. |
| `public/art/` | The pictures: a portrait for Ava and for Sam, and the two photos the camera takes. Copied into the build as `art/`. |
| `mods/fog-season.json` | An example [mod](/reference/mods), for a player to add. Not part of the game. |
| `vite.config.ts` | The CLI's [Vite preset](/cli/#the-vite-preset), and nothing else. |
| `tests/showcase.test.ts` | The first days, played command by command. |
| `tests/build.test.ts` | `ifloom check`, the build check and the snapshot comparison, as tests. |
| `snapshots/scenes.txt` | Every scene and place in three states, as `ifloom snapshot` last wrote it. Committed. |

## Feature by feature

### Locks

`src/game.ts`, `rules.locks`. Moving day is a [lock](/reference/locks) on the `arrival` phase that denies `'*'` except `choose` and `input`, so the intro only moves through its scene and the box for the cat's name; the `unpack` choice in `town.ts` sets the phase to `open` and the lock lets go. A second lock, `{ when: at('office'), deny: ['devices/*'], reason: 'Not at work.' }`, denies the phone at the office, with the [places](/plugins/places) plugin's [`at()`](/plugins/places#conditions): no phone at work. The test `keeps the phone in the pocket at work` is refused with `Not at work.`

### Inputs, and a value the prose prints

`town.ts`, `inputs`. On moving day the game asks for the cat's name: an [input](/reference/inputs) `catName`, `kind: 'text'`, `maxLength: 16`, offered only while `when: { phase: ['arrival'] }` holds. The base UI draws it under the scene as an [`InputField`](/ui/components#inputfield). What the player types is kept in the variable `catName`, trimmed. `src/content/custom.ts` has a [custom value](/reference/custom#values) of the same name that reads it, or says `The cat` if nothing was typed, and the flat's prose prints it: <code v-pre>{{v:catName}} has claimed the warm spot on the sill.</code> Once the phase is `open`, the input is gone and a value sent anyway is refused with `Not now.`

### Items you use

`town.ts`, the `sandwich` item and the café's `buySandwich` activity. The sandwich costs 4 coins and has a [`use`](/reference/game#itemdef): **Eat the sandwich** spends it and puts 25 energy back. The base UI's [`Inventory`](/ui/components#inventory) lists what the player carries, with that button. The test `names the cat on moving day, and says the name after` buys one, eats it and checks both.

### Mods

`src/main.tsx` and `mods/fog-season.json`. The page keeps the player's [mods](/reference/mods) in IndexedDB, with `mods('small-town', indexedDbDriver({ database: 'small-town-mods' }))`, and before anything else, with a top-level `await`, passes the packs of the ones that are on to `smallTown({ mods })`, which loads them after the town's own pack. `GameShell` gets <code v-pre>mods={{ store, problems, onChange: () => location.reload() }}</code>, so the player's menu has **Mods**: add a file, turn one off, remove it, then **Restart with these mods**.

`mods/fog-season.json` is a mod to try it with. Its pack adds a fourth line to the high street's `street.weather` variants, a fog, and rewrites `place.park`: a later pack's variants are appended and its prose replaces. Add it from the Mods dialog and restart. The test `takes the example mod: fog in the weather, a quieter park, and no problems` loads it through the store and checks both, and that the loader finds nothing wrong.

### Its own art

`public/art/`. Ava and Sam have portraits, `art/character/ava.svg` and `art/character/sam.svg`, and the camera's two photos are `art/photo/ava.svg` and `art/photo/sam.svg`: their initials on a coloured disc, no faces. Vite copies `public/` into the build, so they sit in `dist/art/` beside the page; `npm run build:one-file` puts them inside it instead.

Each character's `portrait` in `town.ts` is set to its `.svg` explicitly. Left out, the [cast](/plugins/cast#characterdef) would draw `art/character/ava.jpg`: [`artSrc`](/reference/prose#artsrc) adds `.jpg` to a path with no extension, and there is no such file. The photos name their `.svg` the same way.

### Saves, the backlog and undo

`src/main.tsx`. The runner is made with `history: { depth: 50 }`, `backlog: { limit: 200 }`, `saves` on `localStorage` and `autosave: { every: 'turn' }`. Each turns on a part of the base UI's [`GameMenu`](/ui/components#gamemenu) in the sidebar: **Undo** and **Redo**, a **Backlog** of every scene shown with the choice made in it, and a **Saves** menu to save, load, export and import. Nothing in the game's content changes for any of it.

### The calendar

`src/game.ts`, `clock`. The town keeps time with the [calendar plugin](/plugins/calendar): `export const clock = calendar({ start: { day: 0, period: 'night' } })`, listed first in `plugins` so every other plugin sees the new day when a turn ends. A turn is a day, the calendar's default, and a new game starts on the night you move in, day 0, a Monday. The header's `Day 1 · Monday night · Your flat` is the calendar's label and then the places plugin's, at [`view.when`](/reference/view#the-clock-and-the-player).

### Places

`src/game.ts` and `town.ts`'s `locations`. The town's map is the [places plugin](/plugins/places): `places({ start: 'flat' })`, listed after `clock` in `plugins` so its label comes after the calendar's. The places themselves are content, in the pack's `data.places.locations`: the flat, the high street, the café, the park and the office, each with its `exits`, and the flat with its **Go to bed** action. Activities that belong somewhere require it with [`onlyAt`](/plugins/places#helpers): `buySandwich` has `requires: [onlyAt(['cafe'])]`, `work` `onlyAt(['office'])`, `jog` `onlyAt(['park'])`. The welcome note is a trigger whose `when` is `at('high-street')`. Walking is the plugin's `go()` command, which the base UI's [`LocationPanel`](/ui/components#locationpanel) sends from each exit.

`town.ts` passes time with the calendar's helpers, imported from `@ifloom/plugin-calendar`: **Wait a while** is `effects: [pass(1)]`, a shift at the office passes two periods with `pass(2)`, a jog one; the flat's **Go to bed** is `command: sleep()`, which moves the clock to the next morning and ends the turn. Buy a coffee or a sandwich and no time passes. A button that passes time carries the calendar's [price note](/plugins/calendar#price-notes), `until evening`; one that would run past dawn carries its warning instead.

### Opening hours

`town.ts`, the `cafe` and `office` locations. Neither has hours of its own: each has a [`locked`](/plugins/places#locationdef) list, with the calendar's conditions and the door's own words. The café is locked `{ when: { not: period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' }`. The office's list is checked in order, so the most particular reason comes first: `weekday(5, 6)`, `Shut at weekends.`; Friday evening on, `{ all: [weekday(4), { not: period('morning', 'afternoon') }] }`, `Closed. Back on Monday.`; and any other evening, `Closed. Opens tomorrow morning.` Any kind of location can be locked this way.

### People and schedules

`town.ts`, the `characters`, and `cast()` in `src/game.ts`. Ava and Sam are the [cast plugin](/plugins/cast)'s characters, in the pack's `data.cast.characters`; `cast()` is listed after `places({ start: 'flat' })`, whose `places/here` it asks to know who is in the room. Ava's [schedule](/plugins/cast#where-people-are) puts her at the café Monday to Saturday, mornings and afternoons — `{ location: 'cafe', when: { all: [weekday(0, 1, 2, 3, 4, 5), period('morning', 'afternoon')] } }` — and the rest of the time she is at `home`, the park. The first entry whose `when` holds says where she is. Sam is on the high street every morning, `{ location: 'high-street', when: period('morning') }`. The café's body has a line that only shows while she is there: `{ text: 'place.cafe/ava', when: here('ava') }`, with the cast's [`here()`](/plugins/cast#conditions). The camera's `photo-ava` and `photo-sam` require it the same way.

### Data scenes, variants and once-a-turn choices

`town.ts`, the scene `ava.hi`, and its words in `prose.ts`. Its [body](/reference/scenes#block) is a line, then `{ variants: 'ava.smalltalk' }`, which deals one of three lines from the pack's `variants`, then a line for a regular, shown once the scene has been seen three times (`{ seen: 'ava.hi', gte: 3 }`). Its [choices](/reference/scenes#choice): `chat` adds 5 to Ava's friendship and is `once: { per: 'turn' }`, so it cannot be farmed; `compliment` needs `charm` at 3; `bye` closes the scene. Talking to her opens it: it is the last of her [`talk`](/plugins/cast#talkoption) options, the one with no `when`.

Ava's greeting is two paragraphs in `prose.ts`, the narration and then her line in quotes, because a paragraph that starts and ends with a quote is drawn as [speech](/reference/prose#speech), narration and all.

Her small talk comes straight after that line, so each of the three is a **named line**, `Ava: "Rain later. The ducks know before the forecast does."`. A bare quote after a character's line is read as the player's answer: written as a bare quote, Ava's small talk would come out in the player's voice.

### Place variants

`town.ts`, the `high-street` place. Its body is the street's line, then `{ variants: 'street.weather' }`: one of three lines about the weather, from the pack's `variants` like Ava's small talk. A room has no choices to record a draw, so the line is picked from the save's seed and the turn alone: dealt afresh each turn (each day, here), and the same every time the player looks in that day. Two days running can deal the same line. See the [`variants` block](/reference/scenes#block).

### Quests

`town.ts`, `data.quests`, and the [quests plugin](/plugins/quests) in `src/game.ts`. `settle` starts when the phase is `open` and has three stages, the last done by the feed plugin's condition `{ custom: 'feed/posted', with: { gte: 1 } }`. `friend` starts off the other with `questActive('settle')` and is tied to Ava's storyline. Its first stage, `close`, is done when she is a friend, `{ stat: 'friendship', of: person('ava'), gte: 25 }`. The UI calls the list **To do**, from the game's strings.

### A stage that waits turns

`town.ts`, the `friend` quest's second stage, `river`. It is done by `{ all: [{ since: 'ava.hi', gte: 3 }, { seen: 'ava.river' }] }`: three whole turns or more — days, in this game — since the player first met Ava, and the evening by the river seen. Friendship says how well the player knows her; [`since`](/reference/conditions#since) says how long, so chatting ten times on the first afternoon does not make a friend by teatime. The test `charges rent on Sundays, and meets Ava by the river once a friendship has had time` plays it to the end.

### Friendship, and who you talk to where

`town.ts`, `stats` and Ava's `talk`. Friendship is a stat the game declares on the cast's kind, `{ id: 'friendship', label: 'Friendship', of: 'character' }`, so each character keeps their own ([entity stats](/reference/stats#entity-stats)). Scenes change it with `{ kind: 'stat', key: 'friendship', by: 5, of: person('ava') }`, with the cast's [`person`](/plugins/cast#helpers).

Talking to Ava opens the first of her [`talk`](/plugins/cast#talkoption) options whose `when` holds. The first is `{ scene: 'ava.river', when: { all: [at('park'), { stat: 'friendship', of: '$', gte: 25 }] } }`: the player in the park (the park is her `home`, where she is after the café shuts), with the places plugin's [`at()`](/plugins/places#conditions), and her friendship 25 or more, where `'$'` is Ava herself. Otherwise it is `ava.hi`. Ava by the river in the evening is a different conversation from Ava at the till. Its one choice, `stay`, adds 5 friendship.

### Wardrobe

`src/game.ts` declares the [wardrobe](/plugins/wardrobe)'s two slots, `coat` and `neck`, and starts the player in the raincoat; `town.ts` has the clothes in `data.wardrobe` and the items they are. The café notices the raincoat with a body line on `wearing('raincoat')`. The scarf is bought on the high street with the `buyScarf` activity. The base UI's [`WardrobePanel`](/ui/components#wardrobepanel), at the foot of the sidebar, shows what is on and has the buttons to change it.

### Triggers and notices

`town.ts`, `triggers`. `welcome` [fires](/reference/triggers) the first time the player is on the high street: it raises a [notice](/reference/notices), a note under the door, and files the note in the `notes` collection.

`rent` repeats: it is `once: 'turn'`, and its condition is Sunday from day 6 on, `{ all: [weekday(6), day({ gte: 6 })] }` with the calendar's conditions, so it fires on the first command of every Sunday. It takes 30 coins and raises the notice `Rent paid: 30 coins` with the fixed id `rent`, so each week's notice replaces the last rather than piling up. It is there because the first playtest showed coins only ever climbing: the town had nothing to spend them on.

### Collections

`town.ts` declares `notes`; the phone kit declares `gallery`. The camera's `photo-ava` and `photo-sam` activities [`collect`](/reference/effects#collect) a photo into the gallery, each `requires` the person to be here, and `post` needs a photo first, with the [condition](/reference/conditions#collection) `{ collection: 'gallery' }`. See [Collections](/reference/collections).

### The phone kit, with its own apps

`src/game.ts`, `kit`. [`phone`](/plugins/phone#phone) builds the stock Messages, Social, Contacts and Gallery apps, and two of the game's own in `apps`: a **Camera** whose section is three buttons sending activities, and **Notes**, a section over the `notes` collection. The game passes on both halves of the kit, `kit.plugins` and `kit.collections`. `openCamera` is the [devices](/plugins/devices) helper `openApp('camera')`, for tests.

### Calls

`town.ts`, Ava's `call`. The player can [call](/plugins/cast#calls) her from anywhere, but only in the evening or at night, `when: period('evening', 'night')`; in the day she is `busy`, and the call is refused with her line. It opens the scene `ava.call`.

### Messages

`town.ts`, `data.messages`. Ava's text arrives in the `texts` channel a turn — a day, here — after you first meet her: `{ all: [{ seen: 'ava.hi' }, { since: 'ava.hi', gte: 1 }] }`. Its two replies are [choices](/plugins/messages#replydef), one adding 5 to her friendship.

### Feeds, and an effect worked out in code

`town.ts`, `data.feed`, has Ava's and Sam's posts, appearing from days 1 and 2 (`when: day({ gte: 1 })`, the calendar's day counting from 0). The player's own post is the `post` activity, whose `{ custom: 'postLatest' }` effect is in `src/content/custom.ts`: a [custom effect](/reference/custom#effects) that takes the newest photo, posts it with the feed plugin's `postTo`, rolls the likes with [`roll`](/reference/random#roll) from the save's seed, and has Ava `react`. It returns plain effects, plugin effects among them, so the same save always gets the same likes.

### Resets each turn

`src/game.ts`, `rules.resets`. `hadCoffee` and `postedToday` go back to `false` at the end of each turn, which in this game is each day, when the player goes to bed ([`resets`](/reference/rules)), so the `coffee` and `post` activities, which `requires` them unset, work once a day. A second coffee is refused with `One is enough for today.`

### The turn rule

`src/game.ts`, `rules.turn`. [`turn`](/reference/rules) returns an effect that puts `energy` back to 100 at the end of each turn — overnight, since a turn is a day here. It runs before the calendar's `turn` hook, so it sees the night, not the new morning.

### Stats

`town.ts`, `stats`. Four [declared stats](/reference/stats): `friendship`, each character's (above); `coins` and `energy` are `spendable`, with a `format` and a `lacking` line, and pay for activities through `cost`; `charm` rises with a jog or a post and opens the `compliment` choice.

### Strings

`src/game.ts`, `strings`. One override, `'ui.quests': 'To do'`, renames the quest list. See [Overriding](/reference/strings#overriding) and the [base UI's words](/ui/#words).

### Debug, in development only

`src/game.ts` takes `withDebug`, and `src/main.tsx` passes `import.meta.env.DEV`: the [debug plugin](/plugins/debug#leave-it-out-of-release-builds) and its panel are there under `ifloom dev` and gone from `ifloom build`. The test `has the debugger only when built with it` holds it to that.

### Playtest and snapshot

`src/game.ts` exports what the [CLI](/cli/)'s two testing commands read. `start` is the state both begin from: `startingState(game)`, moving day, with the seed made from the game's id so every run deals the same. `probes` is three states for [`ifloom snapshot`](/cli/#ifloom-snapshot): `moving-day`; `first-morning`, unpacked, the next morning; and `a-week-in`, the second Monday afternoon, with Ava met four times, her friendship 30 (in `entities.character.ava.stats`), charm 5, the cat named Biscuit and the raincoat off. The clock is the calendar's, so each probe writes it with `clock.write(state, { day, period })` and sets `turn` to match: `clock.write({ ...start(game), phase: 'open', sceneId: null, turn: 1 }, { day: 1, period: 'morning' })`. Pick probes like these, far enough apart that the content's conditions come out differently in each.

`package.json` has `"playtest": "ifloom playtest --turns 7 --out playtest/week.txt"` and `"snapshot": "ifloom snapshot"`. The playtest uses the [explorer](/cli/#explorer): read its week before and after changing a price or a gate. The snapshot is committed in `snapshots/scenes.txt`, and `tests/build.test.ts` compares it on every run, so changing how any scene or place reads fails the tests until you look: `npm run snapshot -w @ifloom/showcase -- --update`, then read the diff before committing.

### The build

`vite.config.ts` is `defineConfig(ifloom())`; `package.json`'s scripts are the [CLI](/cli/)'s five commands, and `build:one-file`, which is `ifloom build --inline-assets --out dist-one`: [one file, pictures and all](/cli/#one-file-pictures-and-all). `src/game.ts`'s default export is a function returning the release build, which is what `ifloom check` loads. `tests/build.test.ts` runs [`checkGame`](/cli/#checkgame) on it and, once the showcase has been built, [`checkBuild`](/cli/#checkbuild) on `dist/`.

## What it doesn't show yet

Very little. What's left:

- **Pictures of places.** Each place names its art, `place/<id>`, and the places plugin's [view](/plugins/places#the-view) passes it on as `location.art`, but there is no `art/place/` yet, and the base UI does not draw a place's art: a game that wants a picture of the room draws it with a component of its own in its [layout](/ui/#layouts).
- **A patch.** The example mod adds prose and variants; no mod patches a choice into one of the town's scenes. See [Patches](/reference/loader#patches).
