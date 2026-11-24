---
title: "Add a character with a schedule"
description: "How-to for adding a character with the cast plugin: declare them with a talk scene and a friendship stat, give them a schedule, change what they say as the story moves, let the player call them and name them."
---
Use this for someone the player meets around town, such as a neighbour who walks a dog in the park. You need the [cast plugin](/docs/reference/plugins/cast), and for anyone to be here with the player, the [places plugin](/docs/reference/plugins/places) too (see [Add a plugin](/docs/how-to/add-a-plugin)). Schedules by time of day also need the [calendar](/docs/reference/plugins/calendar). A [character](/docs/reference/glossary#character) is an entity with the `cast/person` trait, and `cast.person()` writes one.

## Declare the character

Add the character to `entities` with `cast.person()`, in `src/world/cast.ts`. Give them a `home` location and the scene that talking to them opens:

```ts
import type { Content } from '@ifloom/engine'
import { cast } from '@ifloom/plugin-cast'

export const people: Content = {
  storylines: [{ id: 'sam', name: 'Sam' }],
  entities: [
    cast.person({
      id: 'sam',
      name: 'Sam',
      description: 'Neighbour',
      image: 'art/character/sam.svg',
      ui: { hue: 200 },
      home: 'park',
      talk: 'sam.hi',
      storyline: 'sam',
    }),
  ],
}
```

The `name` shows over their lines, on their card and in refusals such as `Sam is not here.` The `storyline` names their [storyline](/docs/reference/storylines), and while it's closed they won't talk. The React UI colours their lines with `ui.hue`.

## Write the scene they open

Write the talk scene with the character as its `speaker`. A friendship is a stat the game declares on the kind `character`, so each character keeps their own:

```ts
import type { Content } from '@ifloom/engine'
import { cast } from '@ifloom/plugin-cast'

export const sam: Content = {
  stats: [{ id: 'friendship', label: 'Friendship', of: 'character' }],
  scenes: [
    {
      id: 'sam.hi',
      title: 'Sam',
      speaker: 'sam',
      body: [{ text: 'Sam is walking a dog that is clearly not theirs. "Dog-sitting," they say. "He’s in charge."' }],
      choices: [{ id: 'bye', label: 'Pat the dog and go', effects: [{ stat: 'friendship', by: 5, of: cast.character('sam') }, { scene: null }] }],
    },
  ],
}
```

While Sam is at the location the player is at, the cast's view lists Sam among the people here, with a Talk button that sends `cast.talk('sam')`. `cast.character('sam')` writes Sam's entity reference, `'character:sam'`.

## Give them a schedule

Add `schedule` entries, each a `location` and a `when`. The character is at the location of the first entry whose `when` holds, and at `home` when none does:

```ts fragment
schedule: [{ location: 'high-street', when: calendar.period('morning') }],
```

Sam is on the high street every morning and in the park the rest of the day. Put an exception above the rule it breaks, such as a Sunday entry above an every-day one. A character with no `home` and no entry that holds is [`AWAY`](/docs/reference/plugins/cast#away), and a schedule entry can name `AWAY` for time out of town:

```ts
import { calendar } from '@ifloom/plugin-calendar'
import { AWAY, type Person } from '@ifloom/plugin-cast'

export const schedule: Person['schedule'] = [
  { location: AWAY, when: calendar.weekday(6) },
  { location: 'high-street', when: calendar.period('morning') },
]
```

## Change what they say

Give `talk` a list of [talk options](/docs/reference/plugins/cast#talkoption). Talking opens the scene of the first option whose `when` holds, so put the particular ones first. Inside the character's own conditions, `'$'` stands for them. Ava, by the river once she's a friend:

```ts
import { places } from '@ifloom/plugin-places'
import type { TalkOption } from '@ifloom/plugin-cast'

export const talk: TalkOption[] = [
  { scene: 'ava.river', when: { all: [places.at('park'), { stat: 'friendship', of: '$', gte: 25 }] }, label: 'Sit with Ava' },
  { scene: 'ava.hi' },
]
```

`label` goes on the Talk button, which reads `Talk` without one.

## Let the player call them

Give the character a `call` to make them reachable from anywhere with `cast.call('ava')`. A call opens a scene without moving the player. Ava picks up only in the evening and at night:

```ts fragment
call: { scene: 'ava.call', when: calendar.period('evening', 'night'), busy: 'She’s busy at the counter. Try her this evening.' },
```

While `when` doesn't hold, the call is refused with `busy`. The view adds no call button, so put one where it fits: an action with `command: cast.call('ava')`, or a phone's contacts. `call: {}` makes someone callable at any time, into their talk scene.

## Say when the player has met them

A character counts as met once the player has seen one of their `talk` scenes or their `call.scene`. The view lists only people the player has met. For someone met another way, such as a speaker in another character's scene, give them a `met` condition:

```ts fragment
met: { kv: 'introduced', of: '$' },
```

Read it anywhere with `cast.met('sam')`.

## Let the player name them

Ask for the name with an [input](/docs/reference/inputs), and give the character a `name` that prints the input's key, with words after the `|` for before the player has typed:

```ts
import type { Content } from '@ifloom/engine'
import { cast } from '@ifloom/plugin-cast'

export const friend: Content = {
  inputs: [{ id: 'friendName', label: 'Your oldest friend is called', type: 'text', maxLength: 16 }],
  entities: [cast.person({ id: 'sam', name: '{{friendName|Your oldest friend}}', home: 'park', talk: 'sam.hi' })],
}
```

Once the player types `Robin`, every place that shows Sam's name shows `Robin`. Without the fallback, Sam has no name until then. [Ask the player for a name](/docs/how-to/ask-for-a-name) has the input.

## Check it worked

Run `npm run check`. It reports a talk or call scene the game doesn't have, a `home` or schedule location places doesn't know, and a call that opens no scene:

```text
content · trait cast/person on character:sam · talk: opens unknown scene "sam.hello"
```

Then play in `npm run dev`. Walk to where the schedule puts the character, and their card shows among the people here with a Talk button. Walk away, and the card goes. To render them in a UI of your own, see [Render the people](/docs/how-to/render/world-plugins#render-the-people).

In the showcase, Small Town, Ava and Sam are in [`examples/showcase/src/world/cast.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/world/cast.ts) and their scenes in `src/story/ava.ts` and `src/story/sam.ts`. For more, see:

- [Cast](/docs/reference/plugins/cast), with [`PersonDef`](/docs/reference/plugins/cast#persondef), the [`Person`](/docs/reference/plugins/cast#person) trait and the [`cast/talk`](/docs/reference/plugins/cast#casttalk) and [`cast/call`](/docs/reference/plugins/cast#castcall) commands.
- [Build a friendship in stages](/docs/how-to/build-friendships-in-stages), to pace what happens between them and the player.
- [Locations, characters and vendors are entities](/docs/explanation/entities-and-traits#locations-characters-and-vendors-are-entities).
