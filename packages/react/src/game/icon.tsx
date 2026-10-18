import { ArrowLeftIcon, ChevronDownIcon, Maximize2Icon, MenuIcon, TriangleAlertIcon, Volume2Icon, XIcon } from 'lucide-react'
import { overridable } from './overrides.tsx'

/** The icons the UI draws, by what they're for. */
export type IconName = 'close' | 'back' | 'warning' | 'voice' | 'zoom' | 'menu' | 'chevron'

const ICONS = {
  close: XIcon,
  back: ArrowLeftIcon,
  warning: TriangleAlertIcon,
  voice: Volume2Icon,
  zoom: Maximize2Icon,
  menu: MenuIcon,
  chevron: ChevronDownIcon,
}

function IconImpl({ name, label }: { name: IconName; label?: string }) {
  const Glyph = ICONS[name]
  return <Glyph aria-label={label} aria-hidden={label ? undefined : true} />
}

/** One of the UI's icons. Replace it in `components` to use your own set everywhere. */
export const Icon = overridable('Icon', IconImpl)
