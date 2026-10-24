import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * The story's reading column: capped at `--width-prose` and placed by
 * `--margin-prose` (centred by default; `Story`'s `align` sets it). Prose,
 * choices, inputs, the scene's title, exits and the people here use it;
 * pictures and panels keep the whole column.
 */
export const PROSE = 'w-full max-w-(--width-prose) mx-(--margin-prose)'

/**
 * The classes a list entry with buttons of its own starts from, as a vendor's
 * goods do: a bordered `row`, a column on a phone and the buttons beside the
 * words from Tailwind's `sm` up; the `body` with the words; and the
 * `actions`, a column of buttons. A plugin's UI uses them so its entries look
 * like the rest, with classes the UI's stylesheet already has.
 */
export const ENTRY_CLASSES = {
  row: 'flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-start',
  body: 'flex min-w-0 flex-1 flex-col gap-1',
  actions: 'flex flex-col gap-1.5 sm:w-44 sm:shrink-0',
} as const

/** Join class names, letting a later Tailwind class win over an earlier one. shadcn/ui's `cn`. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
