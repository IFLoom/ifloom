---
'@ifloom/engine': minor
---

Changed: the `you` effect and `state.you` belong to the player feature, not holdings, and the checker reads its target as a `{ protagonist }` reference, with its own problems: `unknown protagonist "…"` and `"…" can't be played: its kind "…" isn't unique`. The holder reference no longer takes `protagonist`.
