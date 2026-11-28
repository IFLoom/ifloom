---
'@ifloom/plugin-shop': minor
---

Changed: vendors hold nothing (ADR 0016). Buying hands the good over with `receive`, unless the good says `deliver: false` (a purchase that's only its `onBuy`, such as a flag) or names one plugin with `deliver: 'wardrobe'`. A good's `stock` is a number with `restock`, `'unlimited'` (the default) or `'once'`. Selling needs the player to own the thing and runs `release`. Added `onBuy` and `onSell` on a good, a vendor and game-wide in `shop({ … })`.
