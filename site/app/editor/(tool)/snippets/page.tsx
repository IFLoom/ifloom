import type { Metadata } from 'next'
import { Snippets } from '@/editor/components/Snippets'

export const metadata: Metadata = {
  title: 'Snippets',
  description: 'Build a condition, effects, a stat, an item, a setting or prose markup, and copy the TypeScript.',
}

export default function SnippetsPage() {
  return <Snippets />
}
