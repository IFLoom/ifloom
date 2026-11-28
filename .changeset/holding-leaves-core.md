---
'@ifloom/engine': minor
---

Removed: holding is no longer the engine's (ADR 0016). `state.held`, `view.held`, an entity's `at`, the `entity` and `move` effects, `at` and ranges on the `entity` condition, `at` on a `Select` and `units` on `count`, `create`'s `at`, `carryOver.held`, and the exports `give`, `take`, `move`, `holding`, `heldBy`, `heldCount`, `holderOf`, `canHold`, `Holder`, `Placement` and `HeldView` are gone. A game keeps things in kv keys, or with a plugin that keeps them, such as the inventory or the wardrobe.
