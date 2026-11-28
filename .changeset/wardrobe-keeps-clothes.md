---
'@ifloom/plugin-wardrobe': minor
---

Changed: the wardrobe keeps each body's clothes in its own state and receives things that are worn, so a bought shirt can be worn at once (ADR 0016). Clothes start owned with `wardrobe.owned('player')`. `wardrobe({ claims: false })` leaves clothes to be carried, and a body wears what it owns anywhere. Added `onWear` and `onTakeOff` on a wearable (`wardrobe.wearable(slot, { onWear, onTakeOff })`) and game-wide in `wardrobe({ … })`, the `wardrobe/add`, `wardrobe/remove`, `wardrobe/store` and `wardrobe/takeOut` effects and the `wardrobe/owns` value. Anything whose owned total drops to 0 is taken off.
