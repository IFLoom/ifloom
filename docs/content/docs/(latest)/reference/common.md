---
title: "Common types"
description: "Reference for the types other pages use before their own: Result, the rules for ids and separators, Range, EntityRef, KvValue and StatKey."
---
These are the types and rules that the rest of the reference uses before it reaches their own feature. Each comes from `@ifloom/engine`. [The glossary](/docs/reference/glossary) defines the words these entries use.

```ts
import type { EntityRef, KvValue, Range, Result, StatKey } from '@ifloom/engine'
```

## Result

The answer of a call that can fail in a way its caller should expect, either `{ ok: true, value }` or `{ ok: false, reason }`. Every field is in [`Result`](/docs/api/engine#result).

The runner, the [save store](/docs/reference/saves#saves), the [mod store](/docs/reference/mods#mods), [`loadState`](/docs/reference/saves#loadstate), [`replay`](/docs/reference/runner#replay) and [`upgradePack`](/docs/reference/content#upgradepack) answer with a `Result`. Each one fails with a `Result` for a refused command, an empty slot, a save from a newer game or a mod for another game, and none of them throws for those. A failed call changes nothing.

On success, `value` holds the answer. On failure, `reason` says why in words a player can read, and `cause` holds the error behind it when one was thrown, such as a save driver's, for a log.

```ts given
const result = runner.apply({ type: 'choose', id: 'chat' })
if (!result.ok) console.warn(result.reason)
```

The engine's [`apply`](/docs/reference/commands#apply) answers in the same shape, with the state on both sides. [`checkGame`](/docs/reference/checks#checkgame) answers differently, because its problems are a report on a game that still runs.

## Ids and separators

Content names things by id, and an id is letters, digits, `-` and `_`, in parts joined by `.`, such as `cafe.counter`. Four separators keep one meaning wherever they appear:

| Key | Meaning |
|---|---|
| `.` | A part of an id, as in the scene `cafe.counter`, the prose key `place.cafe.ava` and the audio track `cafe.murmur`. |
| `/` | A plugin's name, its id and then the name, as in `quests/done`, `{{messages/unread}}` and the string `calendar/period.morning`. |
| `#` | A choice in a scene or a reply to a message, as in `{ chose: 'ch1.mat#open' }`. |
| `:` | A reference with its sort in front, as in the entity `character:ava`, the pack `mod:naps` and the profile's `core:settings`. |

Keep `/`, `#` and `:` out of your own ids and prose keys. The engine looks a name with a `/` up among the plugins first, and a name starting `game/` among the game's own [`rules`](/docs/reference/rules).

## Range

The bounds a condition compares a number with: at least `gte`, above `gt`, at most `lte` and below `lt`. Every field is in [`Range`](/docs/api/engine#range).

A range holds when every bound it gives holds. Each bound is a number or an [`Amount`](/docs/reference/amounts#amount), worked out as the condition is asked, so a bound can be another stat, a kv key or a count. A range with no bounds asks for a number above 0. That's why `{ seen: 'ava.hi' }` means "has seen it at least once".

```ts fragment
{ stat: 'charm', gte: 10 }               // 10 or more
{ stat: 'charm', lt: 10 }                // below 10
{ stat: 'coins', gte: 5, lte: 20 }       // 5 to 20
{ stat: 'energy' }                       // above 0
{ stat: 'coins', gte: { kv: 'rent' } }   // at least the rent
```

[`inRange`](/docs/reference/conditions#inrange) tests a number against a range in a plugin's own code.

## EntityRef

A reference to an [entity](/docs/reference/glossary#entity), its kind and its id joined by `:`, such as `'character:ava'` or `'item:sandwich'`. Its definition is in [`EntityRef`](/docs/api/engine#entityref).

The engine hands back an `EntityRef` wherever it names an entity. The functions that read an entity take any string, since content writes references as plain strings. Inside an [`each`](/docs/reference/effects#each) or a [`count`](/docs/reference/conditions#count)'s `where`, content writes `'$'` for the entity being looked at. [`parseRef`](/docs/reference/entities#parseref) splits a reference into its kind and id.

```ts
import type { EntityRef } from '@ifloom/engine'

export const ava: EntityRef = 'character:ava'
```

## KvValue

A value in a [kv store](/docs/reference/glossary#kv), which is `true` or `false`, a number or text. It's also the value of a `play` [setting](/docs/reference/settings). Its definition is in [`KvValue`](/docs/api/engine#kvvalue).

A key nobody has set reads as 0. [`state.kv`](/docs/reference/state#kv) holds the player's keys.

## StatKey

A stat's id, a plain string, such as `'coins'`. Its definition is in [`StatKey`](/docs/api/engine#statkey). The game declares each stat with a [`StatDef`](/docs/reference/stats#statdef), and [`state.stats`](/docs/reference/state#stats) keeps the player's values by `StatKey`.
