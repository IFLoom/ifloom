import type { ReactNode } from 'react'
import '@/components/home/home.css'

// The homepage fades its sections in. This hides them before the first paint,
// so they don't flash, unless the reader asks for less motion.
const reveal = "if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('ifl-reveal')"

export default function HomeLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: reveal }} />
      {children}
    </>
  )
}
