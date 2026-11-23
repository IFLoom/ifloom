import type { ReactNode } from 'react'
import { useSetting } from '@ifloom/react'

// A ui setting does what your UI makes of it: here, Small Town's text size, read with useSetting.
export function TextSize({ children }: { children?: ReactNode }) {
  const size = useSetting('textSize')
  return <div style={{ fontSize: size === 'large' ? '1.25rem' : undefined }}>{children}</div>
}
