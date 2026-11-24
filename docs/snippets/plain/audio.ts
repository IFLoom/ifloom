import { startAudio } from '@ifloom/audio'
import { audioSrc, type RunnerSnapshot } from '@ifloom/engine'
// runner and add, as in the vanilla template's src/main.ts.
import { add, runner } from './runner.ts'

// Once, beside the runner: plays what view.audio asks for, from the player's first click or key press.
// Keep the player it returns to play a file on demand.
const player = startAudio(runner)

/** A Play again button for each spoken line in the scene that has a voice. */
export function drawVoices(parent: HTMLElement, { view }: RunnerSnapshot): void {
  for (const beat of view.scene.beats) {
    if (beat.type !== 'say' || !beat.voice) continue
    // The voice names a track in the game's audio.tracks: a file, or a playlist, which has no one file to play.
    const track = runner.game.audio?.tracks[beat.voice]
    if (track && 'src' in track) add(parent, 'button', 'Play again').onclick = () => player.play(audioSrc(track.src), 'voice', track.volume ?? 1)
  }
}
