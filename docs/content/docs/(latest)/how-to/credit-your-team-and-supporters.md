---
title: "Credit your team and supporters"
description: "List the people and sources behind your game, such as the team, patrons, photographs and models, on a credits page."
---
Use this to thank the people and sources behind your game on a credits page. You declare the credits once as content, and every UI reads them. The fields are on the [Credits](/docs/reference/credits) reference page.

## Add the credits file

Add a file with a `credits` list of groups, each with an `id`, a `title` and its `credits`. This one credits the team, the patrons, a photograph and the model in it:

```ts
import type { Content } from '@ifloom/engine'

export const credits: Content = {
  credits: [
    { id: 'team', title: 'Team', credits: [{ name: 'Ada Park', role: 'Writer' }, { name: 'Bo Reyes', role: 'Art', href: 'https://example.com/bo' }] },
    { id: 'patrons', title: 'Patrons', description: 'With thanks to everyone on Patreon', credits: [{ name: 'Kit Moss', role: 'Gold patron' }] },
    {
      id: 'photography',
      title: 'Photography',
      credits: [
        { name: 'Sam Lee', role: 'Cover photograph', licence: 'CC BY 4.0', href: 'https://example.com/sam' },
        { name: 'Jo Hart', role: 'Model, cover photograph' },
      ],
    },
  ],
}
```

Add the file to the content you pass to `loadGame`. Groups show in the order you declare them, and a group with no credits yet doesn't show.

## Keep a long list in its own file

Split a long list, such as your patrons, into a file of its own with the same group `id`. `loadGame` adds its credits after the ones already in that group, so a script can write the patrons file each month without touching the rest.

```ts
import type { Content } from '@ifloom/engine'

export const patrons: Content = {
  credits: [{ id: 'patrons', title: 'Patrons', credits: [{ name: 'Lee Grant' }, { name: 'Mo Adebayo' }] }],
}
```

## Show the credits page

The React UI's title screen shows a Credits button once the game credits someone, with `pages` turned on in `mountGame`. [Add a title screen](/docs/how-to/add-a-title-screen) sets that up. In your own UI, render [`creditsOf(game)`](/docs/reference/credits#creditsof), which lists the groups that have credits.

## Let a mod credit itself

A mod's pack can hold `credits` too. A new group id adds a group after the game's, so a mod can credit its own authors without changing yours. [Let players add mods](/docs/how-to/let-players-add-mods) covers packs.
