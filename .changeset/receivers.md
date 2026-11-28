---
'@ifloom/engine': minor
---

Added: the `receive` and `release` effects and the `owned` condition, which hand things to the plugins that keep them in the order of the game's new `receivers` list, and do nothing in a game with none: `{ receive: 'clothing:shirt' }`, `{ release: 'food:coffee', by: 2 }`, `{ owned: 'food:coffee', gte: 1 }`. A plugin keeps things with its new `receiver`, and carries its state into a New Game+ with its new `carry`. A `create` runs its own `effects` with `'$'` as the new entity, such as `[{ receive: '$' }]`. `ownedCount`, `receiveThing`, `releaseThing`, `receiversOf`, `Someone`, `Played` and `resolveYou` (which replaces `resolveHolder`) are exported, and `everyEntity` and `hasEntity` from `@ifloom/engine/plugin`. `arg.holder()` is now `arg.someone()`.
