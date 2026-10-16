import type { Metadata } from 'next'
import { Home } from '@/components/home/Home'

export const metadata: Metadata = {
  title: { absolute: 'IFLoom | An interactive fiction engine for any shape of game' },
  description: 'Write a linear novel, a management game or a life sim in TypeScript, on one small core with plugins for the rest.',
}

export default function HomePage() {
  return <Home />
}
