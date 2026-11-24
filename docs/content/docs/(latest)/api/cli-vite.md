---
title: "@ifloom/cli/vite"
description: "Every export of @ifloom/cli/vite, the Vite preset: its signature and its fields."
---
Generated from the source of `@ifloom/cli/vite` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

- Functions: [`ifloom`](#ifloom)
- Types: [`IfloomViteOptions`](#ifloomviteoptions)

## ifloom

Function.

```ts fragment
function ifloom(options?: IfloomViteOptions): UserConfig
```

Uses: [`IfloomViteOptions`](#ifloomviteoptions).

## IfloomViteOptions

Type. Explained in [The CLI](/docs/cli#ifloomviteoptions).

```ts fragment
type IfloomViteOptions = {
  singleFile?: boolean
  vite?: UserConfig | undefined
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `singleFile` | `boolean` | yes |  | Put everything in the one HTML file, or leave the JS and CSS beside it. One file if left out. |
| `vite` | `UserConfig \| undefined` | yes |  | Merged over the preset: the game's framework plugin and anything else it needs go in `vite.plugins`. |
