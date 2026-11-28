---
title: "Credits"
description: "Credits are the people and sources a game thanks, in groups such as the team, patrons and image sources, which every UI and mod reads the same way."
---
Credits are the people and sources a game thanks: the team, its patrons, the photographs it uses and the models in them. Your content declares them in `credits` as groups, each with a title and a list of credits, and the engine merges and checks them. A UI renders them on a credits page, and the React UI's [`CreditsPage`](/docs/0.1.2/reference/react/components#creditspage) does it for you. [Credit your team and supporters](/docs/0.1.2/how-to/credit-your-team-and-supporters) walks through adding them.

In the showcase: `examples/showcase/src/world/credits.ts`.

```ts
import { creditsOf, type Credit, type CreditGroup } from '@ifloom/engine'
```

## CreditGroup

A group of credits under one heading, such as the team or the patrons. Every field is in [`CreditGroup`](/docs/0.1.2/api/engine#creditgroup).

Groups merge by `id`. A file or pack that names an id already declared adds its credits after that group's, and its `title` or `description` replaces the earlier one. A new id adds a group after the others, so the groups keep the order each was first declared in. A mod can add a group of its own, or add its people to one of the game's.

```ts
import type { Content } from '@ifloom/engine'

export const credits: Content = {
  credits: [
    { id: 'team', title: 'Team', credits: [{ name: 'Ada Park', role: 'Writer' }] },
    { id: 'patrons', title: 'Patrons', description: 'With thanks to everyone on Patreon', credits: [{ name: 'Kit Moss', role: 'Gold patron' }] },
  ],
}
```

## Credit

One credit in a group: a person, a studio or a source. Only `name` is needed. Every field is in [`Credit`](/docs/0.1.2/api/engine#credit).

| Field | Meaning |
|---|---|
| `name` | The person, studio or source, as the credits page shows it. A translation leaves names alone, because the words table doesn't list them. |
| `role` | What they did or gave, such as `Writer`, `Cover photograph` or `Gold patron`. A translation can reword it. |
| `description` | A line more about the credit, such as where a photograph came from. A translation can reword it. |
| `href` | A link to them or to the source. It must start with `http://`, `https://` or `mailto:`. |
| `licence` | The licence a work is used under, such as `CC BY 4.0`, shown as written. |
| `art` | A picture beside the credit, such as a portrait or the credited image itself, a path in `art/` or a URL. |

This group credits a photograph and the model in it:

```ts
import type { CreditGroup } from '@ifloom/engine'

export const images: CreditGroup = {
  id: 'images',
  title: 'Photography',
  credits: [
    { name: 'Sam Lee', role: 'Cover photograph', description: 'The high street at dawn', licence: 'CC BY 4.0', href: 'https://example.com/sam' },
    { name: 'Jo Hart', role: 'Model, cover photograph', art: 'credits/jo.png' },
  ],
}
```

## Functions

### creditsOf

Returns the game's credit groups that have at least one credit, in order. It returns an empty list for a game that credits no one, which a UI reads as no credits page. Its signature is in [`creditsOf`](/docs/0.1.2/api/engine#creditsof).

```ts given
import { creditsOf } from '@ifloom/engine'

for (const group of creditsOf(game)) console.log(group.title, group.credits.map((credit) => credit.name).join(', '))
```

## Checks

The [content checker](/docs/0.1.2/reference/checks) reports these problems in `credits`:

| Problem | Cause |
|---|---|
| `a credit group needs its title` | A group's `title` is missing or blank. |
| `credits must be a list` | A group's `credits` isn't a list. |
| `a credit needs its name` | A credit's `name` is missing or blank. |
| `href must start with http://, https:// or mailto:` | A credit's link uses another scheme, such as `javascript:`. |

A credit's `art` is listed among the files the game names, so `ifloom check` reports a missing picture.
