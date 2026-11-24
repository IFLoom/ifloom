---
title: "Community plugins"
description: "Reference list of the plugins other people have written for IFLoom, the criteria a plugin meets to be listed, and how to submit one."
---
People outside the IFLoom project write and keep these plugins. Each is a package of its own on npm, which a game installs and lists in its `plugins` as it does a first-party plugin, as [Add a plugin](/docs/how-to/add-a-plugin) shows. [Write a plugin](/docs/how-to/write-a-plugin) starts one of your own.

::community-plugins[../../../../community-plugins.json]

The IFLoom column is the range of `@ifloom/engine` versions the plugin says it works with. Check it against the version your game uses before you install.

## Listing criteria

A person reads every plugin before it goes on the list, and nothing is listed automatically. A plugin is listed when it meets these criteria:

- **It uses only the public API.** It imports from `@ifloom/engine` and `@ifloom/engine/plugin`, never a path inside them, and never reaches into another plugin's state. It works with another plugin by naming it in [`cooperates`](/docs/reference/plugin-queries#cooperates) and asking it through conditions, effects and [queries](/docs/reference/plugin-queries#queries).
- **It needs no UI of its own.** It gives the game state, calls and a [view](/docs/reference/plugin-views#view) that any UI renders, and works in a game with no UI package, such as one made from the `vanilla` template. It may ship a UI for one UI package as an extra, as the first-party plugins ship theirs for the React UI in a `/react` subpath ([Write a plugin's React UI](/docs/how-to/react/write-a-plugins-react-ui)).
- **`@ifloom/engine` is a peer dependency**, named with `^` and a version, so a game keeps one copy of the engine.
- **It has tests** that play it in a small game, and they pass.
- **It follows the content rules.** The content it reads is in the game's `data`, so a mod can add to it, and its calls are named by the [naming rules](/docs/reference/plugin-api#id).
- **It has an open-source licence**, such as MIT, in its repository and its `package.json`.
- **It's on npm**, with a README that says what it adds and how to use it.

A listing comes down when the plugin stops working with the IFLoom versions it claims, or its repository goes away.

## Submitting a plugin

Open a [plugin submission](https://github.com/IFLoom/ifloom/issues/new?template=plugin-submission.yml) on GitHub. The form asks for the repository, the npm package, a sentence on what the plugin adds, the licence and the IFLoom versions it works with, and holds a checklist of the criteria above. Someone reads the plugin and adds it to the list if it meets them.

A release that changes what content writes for the plugin, such as an argument's name or a field in its `data`, gives a step in `contentMigrations` and bumps `contentVersion`, so packs written for the last release still load. A renamed command also gets a step in `commandMigrations`, so old command logs still replay. [Plugin migrations](/docs/reference/plugin-migrations) documents both.
