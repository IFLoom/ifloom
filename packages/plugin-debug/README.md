# @ifloom/plugin-debug

Debug commands for IFLoom: set a stat or variable, jump to a scene, set the time, go anywhere. Leave it out of release builds. It is part of [IFLoom](https://ifloom.dev), an interactive fiction engine whose games build to one HTML file that opens from disk.

## Install

```sh
npm install @ifloom/plugin-debug
```

It needs `@ifloom/engine` as a peer, which npm 7 and later installs for you. Its React UI is the `@ifloom/plugin-debug/react` subpath, for a game that renders with `@ifloom/react`.

## Docs

- [Debug](https://ifloom.dev/docs/reference/plugins/debug) explains the plugin, its content and its view.
- [API](https://ifloom.dev/docs/api/plugin-debug) lists every export with its signature and fields.

## Licence

MIT. See [LICENSE](./LICENSE).
