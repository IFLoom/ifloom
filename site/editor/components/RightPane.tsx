'use client'
import { useEditor } from './context'

/** The preview and the problems, as two tabs. */
export function RightPane(_props: { playing: { scene: string; nonce: number } | null }) {
  const { problems } = useEditor()
  return <div className="p-3 text-sm">{problems.length} problems</div>
}
