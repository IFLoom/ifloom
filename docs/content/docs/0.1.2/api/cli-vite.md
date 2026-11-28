---
title: "@ifloom/cli/vite"
description: "Every export of @ifloom/cli/vite, the Vite preset: its signature and its fields."
---
Generated from the source of `@ifloom/cli/vite` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

- Functions: [`ifloom`](#ifloom)
- Types: [`IfloomViteOptions`](#ifloomviteoptions)

## ifloom

Function.

Returns the Vite config every IFLoom game builds with, which writes one HTML file with relative paths. It names no
UI framework, so a game adds its framework's Vite plugin in `vite.plugins`.

The preset's plugins come after the game's. Inside the IFLoom checkout it reads the `@ifloom` packages' source, and
it encrypts a game's `src/unlocks/` packs into the page.

```ts fragment
function ifloom(options?: IfloomViteOptions): UserConfig
```

Uses: [`IfloomViteOptions`](#ifloomviteoptions).

## IfloomViteOptions

Type. Explained in [The CLI](/docs/0.1.2/reference/cli#ifloomviteoptions).

Settings for `ifloom()`, the Vite preset. Each is optional.

```ts fragment
type IfloomViteOptions = {
  singleFile?: boolean
  vite?: UserConfig | undefined
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `singleFile` | `boolean` | yes |  | True to put the JS and CSS inside the one HTML file, rather than beside it. True if left out. |
| `vite` | `UserConfig \| undefined` | yes |  | The game's own Vite config, which the preset builds on. The preset keeps `base` at `'./'` and adds its plugins after the game's `plugins`, where the game's framework plugin goes. |
