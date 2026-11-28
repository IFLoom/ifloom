---
'@ifloom/plugin-places': minor
---

Changed: places keeps what lies in each location in its own state (ADR 0016). A thing starts lying somewhere with `places.lies('kitchen')`, and `places.lies(at, { when, onFind, onPickUp })` hides it until a condition holds, runs `onFind` the first time it's found and `onPickUp` when it's taken. Picking up hands the thing over with `receive`. Added the `places/put` effect and `places({ onPickUp })`. Removed the `places/holder` query.
