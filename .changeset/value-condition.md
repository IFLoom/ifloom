---
'@ifloom/engine': patch
---

Added: a `value` condition, which compares a plugin's or the game's value by name the way `kv` compares a key, with `is`, a range, or neither: `{ value: 'messages/unread', with: { channel: 'texts' }, gte: 1 }`. A value nobody declares never holds.
