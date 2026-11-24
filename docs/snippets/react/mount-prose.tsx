import { mountGame, type InlineProps } from '@ifloom/react'
import module from './game.ts'

// The React UI renders bold, italics, inline actions and tooltips itself, and the UI pieces modal and image.
// A piece of your own, [[ui:stamp|Paid|red]], is a component by its name in `inline`.
function Stamp({ text, args }: InlineProps) {
  return <span style={{ color: args[0] ?? 'inherit', border: '2px solid', padding: '0 4px' }}>{text}</span>
}

mountGame(module.build(), { inline: { stamp: Stamp } })
