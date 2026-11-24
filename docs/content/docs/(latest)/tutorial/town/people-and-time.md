---
title: "6. Add a person and a clock"
description: "Step 6 of the town tutorial. Installs the calendar and cast plugins, makes a turn one period of the day, and adds Ruth, who keeps the café counter on weekday mornings and afternoons."
---
By the end of this step the game has a clock, and Ruth the baker stands behind the café counter in the morning and goes home in the evening.

## Install the calendar and the cast

The calendar plugin keeps the day and the time of day, and the cast plugin keeps the people. Stop the dev server, install both, and start it again:

```sh
npm install @ifloom/plugin-calendar @ifloom/plugin-cast
npm run dev
```

## Add the baker

A character is an entity too, written with the cast's `cast.person()`. Create `src/world/cast.ts`, which exports `people` because `cast` is the plugin's own name:

::include[../../../../../snippets/tutorial/town/world/cast.ts]

Ruth's `schedule` says where she is. The cast reads it from the top, and the first entry whose `when` holds puts her at that location. `calendar.weekday(0, 1, 2, 3, 4)` holds Monday to Friday, and `calendar.period('morning', 'afternoon')` holds in those two periods of the day. When no entry holds she's away from the map. `talk` names the scene that her **Talk** button opens.

The file also declares a stat, `friendship`, with `of: 'character'`. Every character keeps a friendship of their own, starting at 0, rather than the player keeping one. [Entities, things and traits](/docs/explanation/entities-and-traits#locations-characters-and-vendors-are-entities) says why locations and people are both entities.

Ruth's `image` is her picture, a path in the game's `public/` folder. Create `public/art/character/ruth.svg` with this, her initial on a coloured disc:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><circle cx="48" cy="48" r="48" fill="hsl(30 55% 55%)"/><text x="48" y="62" font-family="Georgia, serif" font-size="44" text-anchor="middle" fill="white">R</text></svg>
```

## Let time pass

The game's own buttons go in `src/world/actions.ts`, which the page shows in every room after the room's own. Create it:

::include[../../../../../snippets/tutorial/town/world/actions.ts]

**Wait a while** passes one period of the day with the calendar's `calendar.pass(1)`. **Go to bed** sends the calendar's sleep command, which the calendar refuses until the evening.

## Give the café its hours and its baker

Replace `src/story/cafe.ts` with this:

::include[../../../../../snippets/tutorial/town/steps/6/cafe.ts]

The café's `blocked` keeps the player out while its condition holds, and tells them why. `{ not: … }` turns the calendar's condition round, so the door is shut outside the morning and the afternoon. The two lines about the counter read the cast's `cast.here('ruth')`, which holds while Ruth is at the location the player is at.

`ruth.talk` is Ruth's scene. Its `speaker` shows the scene as Ruth talking, with her name and picture. Its **Ask how the bread is going** choice adds 5 to her friendship, once a turn, and her second line shows once that friendship reaches 5.

## Put the plugins in the game

Replace `src/game.ts` with this, which lists the two new files and the three plugins:

::include[../../../../../snippets/tutorial/town/game.ts]

`calendar({ turn: 'period' })` makes each period of the day one turn, so **Wait a while** ends a turn and Unpack a box comes back. The calendar comes first in `plugins`, so the plugins after it see the new time when a turn ends. The game starts on day 1, a Monday, in the morning. [Turns, scenes and the room](/docs/explanation/turns-and-time#the-calendar-makes-a-turn-a-period-a-day-or-a-week) explains how the calendar moves turns on.

## Render the people

Ruth's **Talk** button is in the view at `view.plugins.cast.present`, one entry for each person at the player's location.

- **Plain JS.** Replace `src/town.ts`. `src/main.ts` calls it already.
- **React.** Replace `src/main.ts`, which adds the calendar's and the cast's React UIs.
- **Vue.** Replace `src/Town.vue`. `src/Layout.vue` shows it already.

::include[../../../../../snippets/tutorial/town/plain/town.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/tutorial/town/react/main.ts]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/tutorial/town/vue/Town.vue]{meta='tab="Vue" tab-group="framework"'}

The Plain JS and Vue templates show `view.when` in the side column, and the calendar now puts the day and the time of day at the front of it. In React, `calendarUi` shows the clock.

:::tip[Checkpoint]
Start a new game, step outside and walk to the café. The side column reads "Day 1 · Monday morning", and the café says "Ruth is behind the counter, flour to the elbows." Press **Ruth: Talk** (in React, **Talk** under her name), then **Ask how the bread is going**. Back at the counter, press **Wait a while** twice. The clock moves to the afternoon and then the evening, the counter is empty, and Ruth's button has gone.
:::
