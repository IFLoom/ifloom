# create-ifloom

Starts a new IFLoom game in a folder of its own. It installs nothing itself, and prints the next commands for the package manager you ran it with. It is part of [IFLoom](https://ifloom.dev), an interactive fiction engine whose games build to one HTML file that opens from disk.

## Use

```sh
npm create ifloom@latest my-game
```

With pnpm, yarn or bun, run `pnpm create ifloom my-game`, `yarn create ifloom my-game` or `bun create ifloom my-game`. `--template` picks `react` (the default), `vanilla`, `vue`, `svelte`, `next`, `novel`, `cafe`, `town` or `plugin`, and `--theme` picks the React UI's preset. With npm, put the flags after `--`.

## Docs

- [Create a game](https://ifloom.dev/docs/how-to/create-a-game) explains the templates and the themes.

## Licence

MIT. See [LICENSE](./LICENSE).
