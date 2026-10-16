import type { Metadata } from 'next'
import { PreviewFrame } from '@/editor/components/PreviewFrame'

export const metadata: Metadata = { title: 'Preview', robots: { index: false } }

export default function PreviewPage() {
  return <PreviewFrame />
}
