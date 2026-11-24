---
title: "Add a location"
description: "Add a location the player can walk to, with exits, things to do, opening hours and a scene at the door."
---
Use this when the player should be able to walk somewhere new, such as a park off the high street. You need the [places plugin](/docs/0.1.0/reference/plugins/places) in the game's `plugins` (see [Add a plugin](/docs/0.1.0/how-to/add-a-plugin)). A [location](/docs/0.1.0/reference/glossary#location) is an entity with the `places/location` trait, and `places.location()` writes one.

## Declare the location

Add the location to `entities` with `places.location()`, in the story file for that part of town, such as `src/story/park.ts`:

```ts
import type { Content } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'

export const park: Content = {
  entities: [
    places.location({
      id: 'park',
      name: 'Riverside Park',
      description: 'Small Town',
      exits: ['high-street'],
      body: [{ text: 'The river is slow and brown and full of ducks with opinions.' }],
    }),
  ],
}
```

The `name` is the exit's label, the room's title and the last part of the header. The `description` is the line under the name. The `body` holds the [blocks](/docs/0.1.0/reference/glossary#block) the room shows while no scene is open, the same blocks a scene's body takes. Add `park` to the content list in `src/game.ts`.

## Join it to the map

Exits are one-way, so list the way in and the way back. Add `'park'` to the high street's `exits`, as the park already lists `'high-street'`:

```ts fragment
exits: ['flat', 'cafe', 'park', 'office'],
```

Give a new game a starting location with `places({ start: 'flat' })`. A game with no `start` begins nowhere, and its first scene puts the player on the map with `places.move('flat')`.

## Give it things to do

Add `actions` to the location. The room offers them only while the player is there, before the game's own actions, priced and refused like any [action](/docs/0.1.0/reference/actions#actiondef). This is the showcase café's coffee:

```ts
import { places } from '@ifloom/plugin-places'

export const cafe = places.location({
  id: 'cafe',
  name: 'The Corner Café',
  description: 'Café',
  exits: ['high-street'],
  body: [{ text: 'Six tables, one of them wobbly.' }],
  actions: [
    {
      id: 'coffee',
      label: 'Buy a coffee',
      cost: { stats: { coins: 3 } },
      blocked: [{ when: { kv: 'hadCoffee' }, reason: 'One is enough for today.' }],
      effects: [{ stat: 'energy', by: 15 }, { kv: 'hadCoffee', to: true }],
    },
  ],
})
```

The coffee's button sends `{ type: 'action', id: 'places/coffee' }`. For an action in the content's own `actions` that belongs at one location, such as a phone on the flat's wall, add `places.onlyAt(['flat'], 'The phone is at home.')` to its `blocked`. The room still shows it elsewhere, greyed out with that reason, and `{ hide: true }` as a third argument leaves it off the screen instead.

## Set opening hours

Give the location `blocked` entries written with the [calendar](/docs/0.1.0/reference/plugins/calendar)'s conditions. The showcase's office opens in the day on weekdays:

```ts
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'

export const office = places.location({
  id: 'office',
  name: 'The Office',
  description: 'Work',
  exits: ['high-street'],
  body: [{ text: 'Strip lights, a kettle, a stack of forms that never gets shorter.' }],
  blocked: [
    { when: calendar.weekday(5, 6), reason: 'Shut at weekends.' },
    { when: { all: [calendar.weekday(4), { not: calendar.period('morning', 'afternoon') }] }, reason: 'Closed. Back on Monday.' },
    { when: { not: calendar.period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' },
  ],
})
```

The first entry that holds gives the reason, so put the most particular first. On a Friday evening the exit is greyed out with `Closed. Back on Monday.`, and on a Tuesday evening with `Closed. Opens tomorrow morning.` An entry only stops the player walking in. To send out a player who is inside at closing time, give a [trigger](/docs/0.1.0/reference/triggers) on the same condition a `places.move('high-street')` effect.

## Hide a door until it opens

Give a location a `parent` when it's inside another, and a `blocked` entry with `hide: true` to keep its exit off the screen:

```ts
import { places } from '@ifloom/plugin-places'

export const backRoom = places.location({
  id: 'cafe.back',
  name: 'The back room',
  description: 'Café',
  parent: 'cafe',
  exits: ['cafe'],
  blocked: [{ when: { not: { kv: 'staff' } }, reason: 'Staff only.', hide: true }],
  body: [{ text: 'Sacks of flour, a mop, and a radio tuned to the cricket.' }],
})
```

Add `'cafe.back'` to the café's `exits`. The door shows once the `staff` key is set. While the player is in the back room, `places.within('cafe')` holds and `places.at('cafe')` doesn't.

## Run something on the doorstep

Give the location an `arrive` to apply effects as the player walks in by an exit. Here the ducks come over on the first visit:

```ts
import { places } from '@ifloom/plugin-places'

export const firstVisit = places.location({
  id: 'park',
  name: 'Riverside Park',
  exits: ['high-street'],
  body: [{ text: 'The river is slow and brown and full of ducks with opinions.' }],
  arrive: { when: { not: { kv: 'sawPark' } }, effects: [{ kv: 'sawPark', to: true }, { scene: 'park.ducks' }] },
})
```

`arrive` runs after `places.go` only. For something that should happen however the player got there, a `places.move` included, use a trigger on `places.at('park')`.

## Share a line across locations

The plugin adds no line to every location. Write the shared blocks once, each with a `when`, and spread them into each location's `body`:

```ts
import type { Block } from '@ifloom/engine'
import { calendar } from '@ifloom/plugin-calendar'
import { places, type PlaceDef } from '@ifloom/plugin-places'

const warnings: Block[] = [
  { text: 'Rent is due tomorrow.', when: calendar.weekday(5) },
  { text: 'You can barely keep your eyes open.', when: { stat: 'energy', lt: 10 } },
]

export const location = (def: Omit<PlaceDef, 'body'>, text: string) => places.location({ ...def, body: [{ text }, ...warnings] })
```

For a line that varies, put the same `{ variants: 'street.weather' }` block in each body. The room [draws](/docs/0.1.0/reference/glossary#draw) one member per location each turn and shows the same one each time the player looks in that turn.

## Say who is behind an exit

An exit names the location it leads to, not who is there. To tell the player that Ava is in the café before they walk in, add a block per location to the high street's body, with the [cast](/docs/0.1.0/reference/plugins/cast)'s `cast.at`:

```ts
import type { Block } from '@ifloom/engine'
import { cast } from '@ifloom/plugin-cast'

export const whereAva: Block[] = [
  { text: 'Through the café window, Ava waves.', when: cast.at('ava', 'cafe') },
  { text: 'Ava’s bicycle is chained up by the park gate.', when: cast.at('ava', 'park') },
]
```

To put the names on the exit buttons instead, join the two plugins in your UI. This helper asks the cast's `cast/where` query for each person the player has met, and groups their names by the location they're at:

```ts
import { pluginQuery, type Runner, type View } from '@ifloom/engine'

export function whoIsWhere(runner: Runner, view: View): Map<string, string[]> {
  const where = pluginQuery(runner.game, 'cast/where')
  const found = new Map<string, string[]>()
  for (const person of view.plugins.cast?.people ?? []) {
    const at = where?.(runner.state, { character: person.id })
    if (typeof at === 'string') found.set(at, [...(found.get(at) ?? []), person.name])
  }
  return found
}
```

An exit's `id` is the id of the location it leads to, so look each exit up in the map and print the names after its label. [Render the location and its exits](/docs/0.1.0/how-to/render/world-plugins#render-the-location-and-its-exits) renders the exits in each framework. In the React UI, put your version in place of `Exits` with [`components`](/docs/0.1.0/reference/react/components#components).

## Check it worked

Run `npm run check`. It reports an exit to a location the game doesn't have, a `parent` that leads back round to the location, and anything the body or an action names that the game lacks:

```text
content · trait places/location on location:park · exit to unknown location "lido"
```

Then walk there in `npm run dev`. The room shows the location's name and body, its actions and its exits, and a closed location's exit is greyed out with its reason. To render the location in a UI of your own, see [Render the location and its exits](/docs/0.1.0/how-to/render/world-plugins#render-the-location-and-its-exits).

In the showcase, Small Town, each location is in its own file under [`examples/showcase/src/story/`](https://github.com/IFLoom/ifloom/tree/main/examples/showcase/src/story). For more, see:

- [Places](/docs/0.1.0/reference/plugins/places), with [`PlaceDef`](/docs/0.1.0/reference/plugins/places#placedef), the [`Place`](/docs/0.1.0/reference/plugins/places#place) trait and [`Arrival`](/docs/0.1.0/reference/plugins/places#arrival).
- [Blocked](/docs/0.1.0/reference/actions#blocked) and the calendar's [conditions](/docs/0.1.0/reference/plugins/calendar#conditions).
- [Locations, characters and vendors are entities](/docs/0.1.0/explanation/entities-and-traits#locations-characters-and-vendors-are-entities).
