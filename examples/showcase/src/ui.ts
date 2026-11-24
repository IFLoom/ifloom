/**
 * The plugin UIs Small Town is drawn with, each from its plugin's `/react`.
 * They bring the shop's and the jobs' panels, the achievements page, the code
 * box, a channel and a feed in the phone's apps, and the plugins' words. The
 * layout in `layout.tsx` places the plugins' parts by hand; with the default
 * layout, they'd go where each UI says, in this order.
 */
import type { PluginUi } from '@ifloom/react/kit'
import { achievementsUi } from '@ifloom/plugin-achievements/react'
import { calendarUi } from '@ifloom/plugin-calendar/react'
import { castUi } from '@ifloom/plugin-cast/react'
import { cheatsUi } from '@ifloom/plugin-cheats/react'
import { debugUi } from '@ifloom/plugin-debug/react'
import { devicesUi } from '@ifloom/plugin-devices/react'
import { feedUi } from '@ifloom/plugin-feed/react'
import { inventoryUi } from '@ifloom/plugin-inventory/react'
import { jobsUi } from '@ifloom/plugin-jobs/react'
import { messagesUi } from '@ifloom/plugin-messages/react'
import { placesUi } from '@ifloom/plugin-places/react'
import { questsUi } from '@ifloom/plugin-quests/react'
import { shopUi } from '@ifloom/plugin-shop/react'
import { statusesUi } from '@ifloom/plugin-statuses/react'
import { unlocksUiWith, type UnlocksUiOptions } from '@ifloom/plugin-unlocks/react'
import { wardrobeUi } from '@ifloom/plugin-wardrobe/react'

/** Every plugin UI the town uses. `unlocks` is what the code box shows and does: what couldn't be opened, and how to restart. */
export function townUi(unlocks: UnlocksUiOptions = {}): PluginUi[] {
  return [
    calendarUi,
    placesUi,
    castUi,
    statusesUi,
    questsUi,
    inventoryUi,
    wardrobeUi,
    achievementsUi,
    cheatsUi,
    devicesUi,
    messagesUi,
    feedUi,
    shopUi,
    jobsUi,
    unlocksUiWith(unlocks),
    debugUi,
  ]
}
