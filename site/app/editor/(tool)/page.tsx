import type { Metadata } from 'next'
import { EditorApp } from '@/editor/components/EditorApp'

export const metadata: Metadata = {
  title: 'Editor',
  description: 'Write scenes, choices, stats and storylets in the browser, play them as you go, and export the pack as TypeScript or JSON.',
}

export default function EditorPage() {
  return <EditorApp />
}
