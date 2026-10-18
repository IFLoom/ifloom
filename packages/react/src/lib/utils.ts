import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * The story's reading column: capped at `--width-prose` and placed by
 * `--margin-prose` (centred by default; `Story`'s `align` sets it). Prose,
 * choices, inputs, the scene's title, exits and the people here use it;
 * pictures and panels keep the whole column.
 */
export const PROSE = 'w-full max-w-(--width-prose) mx-(--margin-prose)'

/** Join class names, letting a later Tailwind class win over an earlier one. shadcn/ui's `cn`. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
