# @ifloom/cli

The IFLoom command line, `ifloom`: `new`, `dev`, `build` (one HTML file that opens from disk), `check`, `playtest`, `snapshot` and `words`, with `defineGame` for the game module and the Vite preset. It is part of [IFLoom](https://ifloom.dev), an interactive fiction engine whose games build to one HTML file that opens from disk.

## Install

```sh
npm install -D @ifloom/cli
```

It needs `@ifloom/engine` as a peer, which npm 7 and later installs for you. To start a game, run `npm create ifloom@latest my-game`. The [`ifloom`](https://www.npmjs.com/package/ifloom) package runs this command without installing it, as `npx ifloom help`.

## Docs

- [The CLI](https://ifloom.dev/docs/reference/cli) explains every command.
- [API](https://ifloom.dev/docs/api/cli) lists every export, with [`/game`](https://ifloom.dev/docs/api/cli-game) and [`/vite`](https://ifloom.dev/docs/api/cli-vite).

## Licence

MIT. See [LICENSE](./LICENSE).
