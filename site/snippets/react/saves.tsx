import { SavesMenu, Section, useSaves } from '@ifloom/react'

// The game menu (GameMenu) opens the saves menu. To place it yourself, in a section that opens a dialog:
export function Saves() {
  return (
    <Section id="saves" title="Saves" dialog>
      <SavesMenu />
    </Section>
  )
}

// Or a button of your own, from useSaves.
export function QuickSave() {
  const saves = useSaves()
  if (!saves.available || !saves.saving.visible) return null
  return (
    <button disabled={!saves.saving.allowed} title={saves.saving.reason ?? undefined} onClick={() => void saves.save('Before the park')}>
      Quick save
    </button>
  )
}
