# {{title}}

A plugin for [IFLoom](https://ifloom.dev). TODO: say what it adds, in a sentence or two.

## Use it in a game

```sh
npm install {{name}}
```

Add it to the game's `plugins`, and give it content in a pack's `data.__id__.entries`:

```ts
import { loadGame, SCHEMA, type Pack } from '@ifloom/engine'
import { __camel__, mark__Pascal__ } from '{{name}}'

const town: Pack = {
  id: 'town',
  schema: SCHEMA,
  activities: [{ id: 'shop', effects: [mark__Pascal__('bread')] }],
  data: { __id__: { entries: [{ id: 'bread', label: 'A loaf of bread' }] } },
}

const { game } = loadGame([town], { id: 'my-game', title: 'My Game', plugins: [__camel__()] })
```

| Name | Kind | What it does |
|---|---|---|
| `__id__/marked` (`__camel__Marked`) | condition | `{ '__id__/marked': { entry } }` holds once the entry is marked. |
| `__id__/mark` (`mark__Pascal__`) | effect | `{ '__id__/mark': { entry } }` marks the entry. |
| `__id__/mark` (`mark__Pascal__Command`) | command | `{ '__id__/mark': { id } }` marks the entry `id`, or says why not. |

A UI reads `view.plugins.__id__`, typed as `__Pascal__View`, or `__camel__().viewIn(view)`.

## Work on it

```sh
npm install
npm test            # vitest
npm run typecheck   # tsc --noEmit
```

[Writing a plugin](https://ifloom.dev/docs/reference/plugins) explains every part a plugin can have: hooks, guards, prices, the view, migrations, the profile and checks.

## Getting it listed

The docs list plugins other people have written on [Community plugins](https://ifloom.dev/docs/plugins/community). A plugin is listed after someone has read it, when:

- it imports only the public API of `@ifloom/engine`, and reaches other plugins only by name (`cooperates`, their conditions, effects and `query`);
- it needs no UI of its own: it gives a view, and works in a game with no UI package;
- `@ifloom/engine` is a peer dependency, named with `^` and a version;
- it has tests that play it in a small game, and they pass;
- content it reads lives in a pack's `data`, and its conditions, effects and commands follow the [naming rules](https://ifloom.dev/docs/reference/plugins#naming);
- it has an open-source licence, in its repository and `package.json`;
- it's on npm, with this README saying what it adds and how to use it.

To submit it, open a [plugin submission](https://github.com/IFLoom/ifloom/issues/new?template=plugin-submission.yml).
