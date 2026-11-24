# @ifloom/react

The React UI for IFLoom games: `mountGame` and components built on shadcn/ui and Tailwind CSS that render the view, for you to use, restyle and extend. A game with another framework, or none, uses the engine directly. It is part of [IFLoom](https://ifloom.dev), an interactive fiction engine whose games build to one HTML file that opens from disk.

## Install

```sh
npm install @ifloom/react
```

It takes `@ifloom/engine`, `@ifloom/audio`, `@ifloom/browser`, `react`, `react-dom` and `tailwindcss` as peers, which npm 7 and later installs for you. `npm create ifloom@latest my-game` makes a game that is already set up with it.

## Example

```ts
import { mountGame } from '@ifloom/react'
import module from './game.ts'

void mountGame(module.build())
```

## Docs

- [The React UI](https://ifloom.dev/docs/reference/react) explains `mountGame`, the components and the kit.
- [Set up the React UI](https://ifloom.dev/docs/how-to/react/set-up-the-react-ui) adds it to a game.
- [API](https://ifloom.dev/docs/api/react) lists every export of `@ifloom/react`, and [`@ifloom/react/kit`](https://ifloom.dev/docs/api/react-kit) those of the kit.

## Licence

MIT. See [LICENSE](./LICENSE).
