---
'@ifloom/plugin-inventory': minor
---

Changed: the inventory keeps who holds what in its own state and receives things (ADR 0016). A thing starts held with `inventory.at('player')` or `inventory.at({ player: 2, 'place:larder': 6 })`. Added the `inventory/move` and `inventory/set` effects, the `inventory/count` value, `inventory({ carryOver })` for a New Game+, and `heldBy`, `heldCount`, `holderOf` and `canHold`, which were the engine's. A dropped thing lies where the player is through `places/put`. Its React UI draws its own sidebar section, with the words and parts the engine's core list had.
