# @ifloom/engine

The IFLoom engine: state, commands, scenes, stats, entities, conditions, effects and saves, in plain TypeScript with no DOM. It is part of [IFLoom](https://ifloom.dev), an interactive fiction engine whose games build to one HTML file that opens from disk.

## Install

```sh
npm install @ifloom/engine
```

Most games start from `npm create ifloom@latest my-game` instead, which lists the engine for you.

## Example

```ts
import { createRunner, startingState } from '@ifloom/engine'
import module from './game.ts'

const { game } = module.build()
const runner = createRunner(game, startingState(game))
console.log(runner.view().scene.title)
```

## Docs

- [Reference](https://ifloom.dev/docs/reference) explains every part of the engine.
- [API](https://ifloom.dev/docs/api/engine) lists every export of `@ifloom/engine`, with [`/plugin`](https://ifloom.dev/docs/api/engine-plugin) and [`/testing`](https://ifloom.dev/docs/api/engine-testing).
- [Run a game in code](https://ifloom.dev/docs/how-to/run-a-game-in-code) plays a game with no UI.

## Licence

MIT. See [LICENSE](./LICENSE).
