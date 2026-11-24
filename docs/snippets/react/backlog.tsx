import { Backlog, Section, useGame, useWords } from '@ifloom/react'
import { Button } from '@ifloom/react/kit'

// The game menu (GameMenu) offers the backlog and undo when the runner has them. To place them yourself:
// a section that opens the backlog in a dialog, and an Undo button.
export function History() {
  const words = useWords()
  const { runner, snapshot } = useGame()
  return (
    <>
      <Section id="backlog" title={words('backlog')} dialog>
        <Backlog />
      </Section>
      <Button variant="outline" disabled={!snapshot.canUndo} onClick={() => runner.undo()}>
        Undo
      </Button>
    </>
  )
}
