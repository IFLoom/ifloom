---
'@ifloom/plugin-devices': minor
'@ifloom/plugin-generators': minor
'@ifloom/plugin-debug': minor
---

Changed: holding left the engine (ADR 0016). A devices section's `things` is `{ of, where? }`, `where` a condition with `'$'` as each thing, such as `{ owned: '$' }`. A generators template runs `effects` after it creates, such as `[{ receive: '$' }]`, in place of `at`. Debug's `held` sets a thing's count through `receive` and `release`, and shows only in a game with a plugin that keeps things.
