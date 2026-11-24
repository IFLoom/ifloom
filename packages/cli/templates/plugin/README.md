# {{title}}

A plugin for [IFLoom](https://ifloom.dev). TODO: say what it adds, in a sentence or two.

## Use it in a game

```sh
npm install {{name}}
```

Add it to the game's `plugins`, and give it content in `data.__id__.entries`:

```ts
import { loadGame, type Content } from '@ifloom/engine'
import { __camel__ } from '{{name}}'

const town: Content = {
  actions: [{ id: 'shop', label: 'Buy bread', effects: [__camel__.mark('bread')] }],
  data: { '__id__': { entries: [{ id: 'bread', label: 'A loaf of bread' }] } },
}

const { game } = loadGame([town], { id: 'my-game', title: 'My Game', plugins: [__camel__()] })
```

| Name | Used as | What it does |
|---|---|---|
| `__id__/marked` (`__camel__.marked`) | condition | `{ '__id__/marked': { entry } }` holds once the entry is marked. |
| `__id__/mark` (`__camel__.mark`) | effect | `{ '__id__/mark': { entry } }` marks the entry. |
| `__id__/mark` (`__camel__.markCommand`) | command | `{ '__id__/mark': { id } }` marks the entry `id`, or says why not. |

A UI reads `view.plugins.__id__`, typed as `__Pascal__View` through the `ViewRegistry` entry in `src/index.ts`.

## Its React UI

A game drawn with [`@ifloom/react`](https://ifloom.dev/docs/react) lists the plugin's React UI, from the `{{name}}/react` subpath:

```tsx
import { mountGame } from '@ifloom/react'
import { __camel__Ui } from '{{name}}/react'

mountGame(game, { plugins: [__camel__Ui] })
```

It puts the entries in the side column. A game can draw them itself instead, from `use__Pascal__()` or `view.plugins.__id__`, and a game with another UI never loads `{{name}}/react`: React and `@ifloom/react` are optional peers. It's built only from `@ifloom/react`'s exports, declared once with `pluginKit` and read with `usePlugin`, and styled by the kit's parts and theme tokens, so it looks right in every preset with no stylesheet. [Plugin UIs and the kit](https://ifloom.dev/docs/react/kit) explains each part.

## What it exports

| Export | What it is |
|---|---|
| `__camel__` | The plugin's factory, with its helpers: `__camel__.marked`, `__camel__.mark` and `__camel__.markCommand`. |
| `entriesOf`, `entryOf` | The game's entries, and one by id. |
| `__Pascal__Entry`, `__Pascal__State`, `__Pascal__View` | An entry as content writes it, what the plugin keeps in a save, and what a UI reads. |
| `__camel__Ui` | From `{{name}}/react`: the React UI, for `mountGame`'s `plugins`. |
| `use__Pascal__`, `__Pascal__Controls` | From `{{name}}/react`: the hook that reads the view in a React UI, and what it returns. |
| `__Pascal__List`, `__Pascal__Section` | From `{{name}}/react`: the list of entries, which a game can replace, and the section it sits in. |
| `__CONSTANT___WORDS` | From `{{name}}/react`: the React UI's words, for a game to reword. |

## Work on it

```sh
npm install
npm test            # vitest: the plugin's test, its React UI's, and its contract test
npm run typecheck   # tsc --noEmit
npm run build       # dist/, what npm publish packs
```

[Writing a plugin](https://ifloom.dev/docs/reference/plugin-api) explains every part a plugin can have: hooks, guards, prices, the view, migrations, the profile and checks.

## Getting it listed

The docs list plugins other people have written on [Community plugins](https://ifloom.dev/docs/reference/plugins/community). A plugin is listed after someone has read it, when:

- it imports only the public API of `@ifloom/engine`, and reaches other plugins only by name (`cooperates`, their conditions, effects and `query`);
- its engine side needs no UI: it gives a view, and works in a game with no UI package. A React UI, if it has one, is its `/react` subpath, built only from `@ifloom/react`'s public exports;
- `@ifloom/engine` is a peer dependency, named with `^` and a version;
- it has tests that play it in a small game, and they pass;
- content it reads lives in `data`, and its conditions, effects and commands follow the [naming rules](https://ifloom.dev/docs/reference/plugin-api#id);
- it has an open-source licence, in its repository and `package.json`;
- it's on npm, with this README saying what it adds and how to use it.

To submit it, open a [plugin submission](https://github.com/IFLoom/ifloom/issues/new?template=plugin-submission.yml).
