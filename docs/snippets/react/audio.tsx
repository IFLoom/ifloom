import { useAudio } from '@ifloom/react'

// mountGame plays the game's sound, and Scene puts a replay button on each spoken line with a voice.
// To give the player options, place useAudio once in your layout: it takes over from mountGame's player.
export function SoundLog() {
  // Each thing the player does, as a line in the console.
  useAudio({ log: console.debug })
  return null
}
