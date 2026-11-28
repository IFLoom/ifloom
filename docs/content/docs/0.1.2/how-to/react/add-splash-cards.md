---
title: "Add splash cards"
description: "Show your studio, publisher and game logo as cards when the game opens, beside or instead of the Powered by IFLoom card."
---
This how-to is for `@ifloom/react`, the optional React UI. To render a game in plain DOM, Vue or React by hand, see [Start your own UI](/docs/0.1.2/how-to/render/start).

Use this to show cards as the game opens, before the title screen, such as your studio's logo, a publisher's and the game's own. With `pages` on, a game shows the "Powered by IFLoom" card unless you change it. The fields are on the [`SplashPage`](/docs/0.1.2/reference/react/components#splashpage) reference entry.

## Add your own cards

List the cards in `pages.splash.cards`, in the order they show. Put [`poweredByIFLoom()`](/docs/0.1.2/reference/react/components#poweredbyifloom) where the IFLoom card should go:

```tsx
import { mountGame, poweredByIFLoom } from '@ifloom/react'
import module from './game.ts'

mountGame(module.build(), {
  pages: {
    splash: {
      cards: [
        { id: 'studio', art: 'art/studio-logo.png', title: 'Harbour Games', text: 'presents' },
        poweredByIFLoom(),
        { id: 'logo', art: 'art/logo.png' },
      ],
    },
  },
})
```

A card shows its `art`, `title` and `text`, each optional. A card with a `component` renders that component instead, such as an animated logo or a short video.

## Set each card's time and transition

Give a card `ms` for how long it holds, and `transition` for how it comes in and goes out. The transition names are the ones a scene uses, such as `fade`, `zoom` and `slide-up`:

```tsx
import type { SplashCard } from '@ifloom/react'

export const logo: SplashCard = { id: 'logo', art: 'art/logo.png', ms: 3000, transition: { in: 'zoom', out: 'fade', ms: 800 } }
```

A card holds for 2000 milliseconds and fades in and out over 600 milliseconds unless you say otherwise. A player who asks for reduced motion sees each card for its `ms` with no transitions.

## Make the cards unskippable

The player skips a card with a click, Enter or Space, and all of them with Escape or the Skip button. Set `skippable: false` to make every card play out:

```tsx
import { mountGame } from '@ifloom/react'
import module from './game.ts'

mountGame(module.build(), { pages: { splash: { cards: [{ id: 'studio', title: 'Harbour Games' }], skippable: false } } })
```

## Turn the cards off

Set `splash: false` to open straight on the title screen, or on the [gate](/docs/0.1.2/reference/react/components#gatepage) when there is one:

```tsx
import { mountGame } from '@ifloom/react'
import module from './game.ts'

mountGame(module.build(), { pages: { splash: false } })
```

A list of cards without `poweredByIFLoom()` also leaves the IFLoom card out. A game mounted without `pages` shows no splash cards.
