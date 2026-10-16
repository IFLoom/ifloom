'use client'
import { useEditor } from '../context'

/** The form for what the outline has selected. */
export function SelectedForm() {
  const { project, selection } = useEditor()
  const value =
    selection.thing === 'project'
      ? { title: project.title, intro: project.intro }
      : selection.thing === 'scene'
        ? project.pack.scenes.find((s) => s.id === selection.id)
        : selection.thing === 'stat'
          ? project.pack.stats.find((s) => s.id === selection.id)
          : selection.thing === 'item'
            ? project.pack.items.find((i) => i.id === selection.id)
            : project.variables.find((v) => v.name === selection.id)
  return <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>
}
