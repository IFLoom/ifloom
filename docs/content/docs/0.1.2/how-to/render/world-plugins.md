---
title: "Render the calendar, locations and people"
description: "Render the time of day, the location the player is at with its exits, and the people here in a UI of your own."
---
Render the world around the story: the time of day from the [calendar](/docs/0.1.2/reference/plugins/calendar), the [location](/docs/0.1.2/reference/glossary#location) the player is at from [places](/docs/0.1.2/reference/plugins/places), and the people from the [cast](/docs/0.1.2/reference/plugins/cast). Set up the runner first, as [Start your own UI](/docs/0.1.2/how-to/render/start) shows. In the React tabs, each plugin's UI comes from its `/react` subpath and goes in `mountGame`'s `plugins`, as [Show plugins in the React UI](/docs/0.1.2/how-to/react/show-plugin-uis) explains.

## Render the clock

`view.plugins.calendar` holds the time as a [`CalendarView`](/docs/0.1.2/api/plugin-calendar#calendarview), with the day, the weekday, the period and the whole line in `label`, which is also in `view.when`. The React UI's [`CalendarClock`](/docs/0.1.2/api/plugin-calendar#calendarclock), from `calendarUi`, renders in place of the React UI's own `Clock`, in the side column and in the top bar on a phone.

```ts tab="Plain JS" tab-group="framework"
import type { RunnerSnapshot } from '@ifloom/engine'
// add, as in the vanilla template's src/main.ts.
import { add } from './runner.ts'

/** Where the game is in time, with the calendar's pieces on it for a stylesheet, and a nudge at curfew. */
export function drawCalendar(parent: HTMLElement, { view }: RunnerSnapshot): void {
  const calendar = view.plugins.calendar
  if (!calendar) return
  const clock = add(parent, 'p', calendar.label, 'clock')
  Object.assign(clock.dataset, { day: String(calendar.day), weekday: calendar.weekday, period: calendar.period })
  // The last period of the day, with the curfew binding: time for bed.
  if (calendar.curfew) add(parent, 'p', 'It’s late. Time for bed.', 'curfew')
}
```

```tsx tab="React" tab-group="framework"
import { mountGame } from '@ifloom/react'
import { calendarUi } from '@ifloom/plugin-calendar/react'
import module from './game.ts'

// CalendarClock is rendered wherever the React UI’s own Clock is.
mountGame(module.build(), { plugins: [calendarUi] })
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { view } from './runner.ts'

// Where the game is in time, with the calendar's pieces on it for a stylesheet, and a nudge at curfew.
</script>

<template>
  <template v-if="view.plugins.calendar">
    <p class="clock" :data-day="view.plugins.calendar.day" :data-weekday="view.plugins.calendar.weekday" :data-period="view.plugins.calendar.period">
      {{ view.plugins.calendar.label }}
    </p>
    <!-- The last period of the day, with the curfew binding: time for bed. -->
    <p v-if="view.plugins.calendar.curfew" class="curfew">It’s late. Time for bed.</p>
  </template>
</template>
```

Put the day, the weekday and the period on the clock's element as data attributes, so a stylesheet can colour the night. `curfew` is true in the last period of the day while the curfew binds, which is the moment to send the player to bed. `CalendarClock` sets `data-day`, `data-weekday`, `data-period` and `data-curfew` the same way, and [`useCalendar`](/docs/0.1.2/api/plugin-calendar#usecalendar) gives you the calendar's view in a React component of your own.

## Render the location and its exits

`view.plugins.places` holds where the player is as a [`PlacesView`](/docs/0.1.2/api/plugin-places#placesview), with the `location`, its `exits` and the `things` lying there. The React UI's [`LocationCard`](/docs/0.1.2/api/plugin-places#locationcard) and [`Exits`](/docs/0.1.2/api/plugin-places#exits), from `placesUi`, go in the story before the room's actions.

```ts tab="Plain JS" tab-group="framework"
import type { RunnerSnapshot } from '@ifloom/engine'
// add and drawChoices, as in the vanilla template's src/main.ts.
import { add, drawChoices } from './runner.ts'

/** Where you are: the place's name and picture, the ways out, and what lies here to pick up. */
export function drawPlace(parent: HTMLElement, { view }: RunnerSnapshot): void {
  const places = view.plugins.places
  if (!places?.location) return
  const { location } = places
  add(parent, 'h3', location.name)
  if (location.image) Object.assign(add(parent, 'img'), { src: location.image, alt: '' })
  // Each exit is a button like any other, greyed out with why it can't be taken.
  if (places.exits.length) drawChoices(add(parent, 'nav', '', 'exits'), places.exits)
  for (const thing of places.things) {
    const row = add(parent, 'div', '', 'lying')
    add(row, 'span', thing.count > 1 ? `${thing.name} ×${thing.count}` : thing.name)
    drawChoices(row, [thing.pickUp])
  }
}
```

```tsx tab="React" tab-group="framework"
import { mountGame } from '@ifloom/react'
import { placesUi } from '@ifloom/plugin-places/react'
import module from './game.ts'

// The LocationCard and the Exits go in the story, before the room’s actions.
mountGame(module.build(), { plugins: [placesUi] })
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { computed } from 'vue'
import { runner, view } from './runner.ts'

// Where you are: the place's name and picture, the ways out, and what lies here to pick up.
const places = computed(() => view.value.plugins.places)
</script>

<template>
  <template v-if="places?.location">
    <h3>{{ places.location.name }}</h3>
    <img v-if="places.location.image" :src="places.location.image" alt="" />
    <!-- Each exit is a button like any other, greyed out with why it can't be taken. -->
    <nav class="exits">
      <button v-for="exit in places.exits" :key="exit.id" :disabled="Boolean(exit.disabled)" :title="exit.disabled" @click="runner.apply(exit.command)">
        {{ exit.label }}
      </button>
    </nav>
    <div v-for="thing in places.things" :key="thing.ref" class="lying">
      {{ thing.name }}<template v-if="thing.count > 1"> ×{{ thing.count }}</template>
      <button :disabled="Boolean(thing.pickUp.disabled)" @click="runner.apply(thing.pickUp.command)">{{ thing.pickUp.label }}</button>
    </div>
  </template>
</template>
```

Each exit and each thing's `pickUp` is a ready button, a [`RenderedChoice`](/docs/0.1.2/api/engine#renderedchoice), so render it as any other button and send its `command`. An exit the player can't take has its reason in `disabled`, and an exit a lock hides isn't in the view at all. The location's name and words are also the room scene in `view.scene`, and its own actions are in `view.actions`, which [Render the scene and its choices](/docs/0.1.2/how-to/render/scene) renders.

`location` is null while the player is nowhere, so render nothing then. A location with a picture has it in `location.picture`, which [Render pictures and play sound](/docs/0.1.2/how-to/render/pictures-and-sound) renders, and the plugin leaves its hotspots out while a scene is open. [`usePlaces`](/docs/0.1.2/api/plugin-places#useplaces) gives the view with `go` and `pickUp` to a React component of your own.

## Render the people

`view.plugins.cast` holds the people as a [`CastView`](/docs/0.1.2/api/plugin-cast#castview), with who is here in `present` and everyone in `people`, each a [`PersonView`](/docs/0.1.2/api/plugin-cast#personview). The React UI's `castUi` puts [`PeopleHere`](/docs/0.1.2/api/plugin-cast#peoplehere) after the room's actions, and a People section in the side column that opens [`Relationships`](/docs/0.1.2/api/plugin-cast#relationships) in a dialog.

```ts tab="Plain JS" tab-group="framework"
import type { RunnerSnapshot } from '@ifloom/engine'
// add and drawChoices, as in the vanilla template's src/main.ts.
import { add, drawChoices } from './runner.ts'

/** Who's here, each with their face and their Talk button, then everyone you've met. */
export function drawPeople(parent: HTMLElement, { view }: RunnerSnapshot): void {
  const cast = view.plugins.cast
  if (!cast) return
  for (const person of cast.present) {
    const card = add(parent, 'div', '', 'person')
    card.dataset.person = person.ref
    if (person.portrait) Object.assign(add(card, 'img'), { src: person.portrait, alt: '' })
    add(card, 'strong', person.name)
    if (person.description) add(card, 'span', person.description)
    drawChoices(card, person.actions)
  }
  const met = cast.people.filter((person) => person.met)
  if (!met.length) return
  add(parent, 'h3', 'People you know')
  const list = add(parent, 'ul')
  for (const person of met) add(list, 'li', person.here ? `${person.fullName} (here)` : person.fullName)
}
```

```tsx tab="React" tab-group="framework"
import { mountGame } from '@ifloom/react'
import { castUi } from '@ifloom/plugin-cast/react'
import module from './game.ts'

// A People section in the side column opens everyone met, and who’s here goes after the room’s actions.
mountGame(module.build(), { plugins: [castUi] })
```

```vue tab="Vue" tab-group="framework"
<script setup lang="ts">
import { computed } from 'vue'
import { runner, view } from './runner.ts'

// Who's here, each with their face and their Talk button, then everyone you've met.
const cast = computed(() => view.value.plugins.cast)
const met = computed(() => cast.value?.people.filter((person) => person.met) ?? [])
</script>

<template>
  <div v-for="person in cast?.present" :key="person.ref" class="person" :data-person="person.ref">
    <img v-if="person.portrait" :src="person.portrait" alt="" />
    <strong>{{ person.name }}</strong>
    <span v-if="person.description">{{ person.description }}</span>
    <button v-for="talk in person.actions" :key="talk.id" :disabled="Boolean(talk.disabled)" :title="talk.disabled" @click="runner.apply(talk.command)">
      {{ talk.label }}
    </button>
  </div>
  <template v-if="met.length">
    <h3>People you know</h3>
    <ul>
      <li v-for="person in met" :key="person.ref">{{ person.fullName }}<template v-if="person.here"> (here)</template></li>
    </ul>
  </template>
</template>
```

Each person has a name, a portrait, a `description` and their buttons in `actions`, such as **Talk**. `met` says whether the player has met them, and `here` whether they're at the player's location. `present` is empty while a scene is open. A character is an [entity](/docs/0.1.2/reference/glossary#entity) of the cast's kind, so the stats the player can see on them, such as friendship, are on their entry in `view.entities` while the game lists the kind. [`usePeople`](/docs/0.1.2/api/plugin-cast#usepeople) gives the cast's view to a React component of your own.

For more on what these sections render, see:

- [Calendar](/docs/0.1.2/reference/plugins/calendar), [Places](/docs/0.1.2/reference/plugins/places) and [Cast](/docs/0.1.2/reference/plugins/cast).
- [The view](/docs/0.1.2/reference/view).
- [Set up days and times of day](/docs/0.1.2/how-to/set-up-the-clock), [Add a location](/docs/0.1.2/how-to/add-a-location) and [Add a character with a schedule](/docs/0.1.2/how-to/add-a-character).
