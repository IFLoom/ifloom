# @ifloom/plugin-inventory

An inventory for IFLoom: the things the player and other people carry, kept in the plugin's own state and handed over with the engine's `receive`, with use, drop and give buttons from a usable trait on each thing. It's an optional shortcut over plain kv keys. It is part of [IFLoom](https://ifloom.dev), an interactive fiction engine whose games build to one HTML file that opens from disk.

## Install

```sh
npm install @ifloom/plugin-inventory
```

It needs `@ifloom/engine` as a peer, which npm 7 and later installs for you. Its React UI is the `@ifloom/plugin-inventory/react` subpath, for a game that renders with `@ifloom/react`.

## Docs

- [Inventory](https://ifloom.dev/docs/reference/plugins/inventory) explains the plugin, its content and its view.
- [API](https://ifloom.dev/docs/api/plugin-inventory) lists every export with its signature and fields.

## Licence

MIT. See [LICENSE](./LICENSE).
