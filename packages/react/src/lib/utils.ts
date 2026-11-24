import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * The Tailwind classes for the story's reading column, as wide as `--width-prose` and placed by `--margin-prose`. The
 * column is centred unless `Story`'s `align` moves it.
 *
 * Prose, choices, inputs, the scene's title, exits and the people here use it, while pictures and panels take the
 * story's full width.
 */
export const PROSE = 'w-full max-w-(--width-prose) mx-(--margin-prose)'

/** Returns class names joined into one string, a later Tailwind class winning over an earlier one that conflicts. It's shadcn/ui's `cn`. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
