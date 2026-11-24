/**
 * The kit's parts: what a part is like, whatever drew it, and how each looks
 * until a preset or a game restyles it. A plugin's UI marks its parts with
 * them, so a card from any plugin looks like a card from any other, and adds
 * only its own layout.
 */
import { badgeVariants } from '../components/ui/badge.tsx'
import { buttonVariants } from '../components/ui/button.tsx'
import { usePart, type PartKey } from './overrides.tsx'

/**
 * The kit's parts, the sorts of part any component can mark itself as with `data-kit` beside its own `data-part`. A
 * vendor's goods, a job and an achievement are all `card`s.
 *
 * The presets style these and the theme's tokens, never a plugin's own parts. So a plugin's UI looks right in each
 * preset without a stylesheet of its own, and a game's stylesheet can restyle every card at once. The parts are these:
 *
 * - `card`: a boxed entry in a list, such as a vendor's good, a job or an achievement.
 * - `item`: an entry in a list without a box, such as a status.
 * - `title`: an entry's name. `heading`: a list's heading.
 * - `note`: a line about an entry, quieter than its title.
 * - `meter`: a progress bar, with a `<span>` inside as wide as the progress.
 * - `commands`: a group of buttons for a plugin's commands, rather than a scene's choices.
 * - `opener`: a button that opens something over the page, such as a dialog.
 * - `form` and `input`: a form and its field for the player to type in, such as a code.
 * - `badge`: a small label on an entry. `thumb`: a small picture of it.
 * - `label`: a short word beside a value, such as a slot's name.
 *
 * An entry that can be done sets `data-state` to `"done"`, or to `"open"` while it isn't yet. An entry the player
 * hasn't found yet carries `data-secret`.
 */
export const KIT_PARTS = ['card', 'item', 'title', 'heading', 'note', 'meter', 'commands', 'opener', 'form', 'input', 'badge', 'thumb', 'label'] as const

/** The name of a kit part in `KIT_PARTS`. */
export type KitPart = (typeof KIT_PARTS)[number]

/**
 * The Tailwind classes each kit part has with no preset, in the theme's tokens, which `useKitPart` starts from. A preset
 * restyles them by `data-kit`, and a game by `classes` or its own CSS.
 *
 * A card is boxed, edged in the primary colour once done and dashed while still open. It's never faded, so its words
 * keep their contrast. A note is small and muted, a meter is a thin bar and an opener is a small outlined button.
 */
export const KIT_LOOKS: Readonly<Record<KitPart, string>> = {
  card: 'flex flex-col gap-2 rounded-lg border p-3 data-[state=done]:border-primary data-[state=open]:border-dashed',
  item: 'flex flex-col gap-0.5',
  title: 'flex flex-wrap items-center gap-2 font-medium',
  heading: 'flex items-center gap-2 font-heading font-semibold',
  note: 'text-sm text-muted-foreground',
  meter: 'h-1.5 overflow-hidden rounded-full bg-muted [&>span]:block [&>span]:h-full [&>span]:bg-primary',
  commands: 'flex flex-col gap-1.5',
  opener: `${buttonVariants({ size: 'sm', variant: 'outline' })} self-start`,
  form: 'flex flex-wrap items-center gap-2',
  input: 'h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm',
  badge: `${badgeVariants({ variant: 'secondary' })} w-fit`,
  thumb: 'size-12 shrink-0 rounded-md object-cover',
  label: 'text-muted-foreground',
}

/**
 * The layout classes the React UI's built stylesheet always has, for laying out a plugin's parts. A class not listed
 * here may be missing from `styles.min.css`.
 *
 * A UI that needs an unlisted class ships its own stylesheet.
 *
 * They cover flex and grid, gaps, alignment, growing and shrinking, text sizes and weights, and an entry's buttons
 * beside its words from Tailwind's `sm` up. With these, the kit's looks, `buttonVariants`, `badgeVariants`, `PROSE`
 * and `useDialogParts`, a plugin's UI needs no stylesheet.
 */
export const KIT_LAYOUT = [
  'flex',
  'inline-flex',
  'grid',
  'contents',
  'hidden',
  'flex-col',
  'flex-row',
  'flex-wrap',
  'flex-1',
  'shrink-0',
  'min-w-0',
  'w-full',
  'items-start',
  'items-center',
  'items-end',
  'justify-between',
  'justify-end',
  'self-start',
  'self-end',
  'self-center',
  'gap-0.5',
  'gap-1',
  'gap-1.5',
  'gap-2',
  'gap-3',
  'gap-4',
  'text-left',
  'text-right',
  'text-xs',
  'text-sm',
  'font-normal',
  'font-medium',
  'tabular-nums',
  'truncate',
  'sm:flex-row',
  'sm:items-start',
  'sm:w-44',
  'sm:shrink-0',
] as const

/**
 * Returns the `data-part`, `data-kit` and `className` attributes for a part marked as one of the kit's. The game's
 * `unstyled` option drops the kit's look and `layout`, as it drops every built-in class.
 *
 * The classes are the kit part's look from `KIT_LOOKS`, then `layout`, then the game's `classes` for the part, then
 * `className`. `useKitPart('card', 'job')` is a card, and a list entry with its buttons beside it is
 * `useKitPart('card', 'good', 'sm:flex-row sm:items-start')`.
 */
export function useKitPart(kit: KitPart, name: PartKey, layout?: string, className?: string): { 'data-part': PartKey; 'data-kit': KitPart; className: string } {
  const look = layout ? `${KIT_LOOKS[kit]} ${layout}` : KIT_LOOKS[kit]
  return { ...usePart(name, look, className), 'data-kit': kit }
}
