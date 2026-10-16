import type { Metadata } from 'next'
import { Home } from '@/components/home/Home'

export const metadata: Metadata = {
  title: { absolute: 'IFLoom | An interactive fiction engine for any shape of game' },
  description: 'Interactive fiction in TypeScript: typed content, saves that survive updates, a checker that catches mistakes before players do, and a UI that looks like your game.',
}

export default function HomePage() {
  return <Home />
}
