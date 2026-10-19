---
title: "Community plugins"
description: "Plugins other people have written for IFLoom, how a plugin gets listed here, and how to submit yours."
---
These plugins are written and kept by people outside the IFLoom project. Each one is a package of its own on npm, and you add it to a game the same way as a [first-party plugin](/docs/plugins#adding-one): install the package and put it in the game's `plugins`.

::community-plugins[../../../community-plugins.json]

The IFLoom column is the range of `@ifloom/engine` versions the plugin says it works with. Check it against the version your game uses before you install.

## How listing works

Every plugin on this page was read by a person before it went on the list. There's no automatic listing. A plugin is listed when it meets these criteria:

- **It uses only the public API.** The plugin imports from `@ifloom/engine` and nothing inside it (no `@ifloom/engine/src/...` paths), and it doesn't reach into another plugin's state. To work with another plugin, it names it in `cooperates` and asks it through conditions, effects and `query`, as the [first-party plugins](/docs/plugins#how-they-are-built) do.
- **It needs no UI of its own.** A plugin gives the game state, conditions, effects, commands and a [view](/docs/reference/plugins#the-view), and any UI draws that view. A plugin can ship a component for a particular UI as an extra, but the plugin has to work in a game with no UI package at all, such as one drawn with the `vanilla` template.
- **`@ifloom/engine` is a peer dependency**, named with `^` and a version, so a game keeps one copy of the engine.
- **It has tests** that play it in a small game, and they pass.
- **It follows the content rules.** Content it reads lives in your content's `data`, so a mod can add to it. Its conditions, effects and commands are named the way the [naming rules](/docs/reference/plugins#naming) say.
- **It has an open-source licence**, such as MIT, in its repository and its `package.json`.
- **It's on npm**, with a README that says what it adds and how to use it.

A listing can be taken down if the plugin stops working with the IFLoom versions it claims, or its repository goes away.

## Submit your plugin

Open a [plugin submission](https://github.com/IFLoom/ifloom/issues/new?template=plugin-submission.yml) on GitHub. The form asks for the repository, the npm package, a sentence on what it adds, the licence and the IFLoom versions it works with, and has a checklist of the criteria above. Someone reads the plugin, and if it fits, it's added to the list.

## Writing one

`npm create ifloom@latest ifloom-plugin-<name> -- --template plugin` starts a plugin package with the engine as a peer dependency, a condition, an effect and a command, a test, and a README with these criteria. See [A plugin package](/docs/reference/plugins#a-plugin-package). [Writing a plugin](/docs/reference/plugins) explains every part a plugin can have.
