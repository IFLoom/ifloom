import { Game, Scene, Sidebar, Story, Timers, useTimer } from '@ifloom/react'

// Scene renders a Countdown under a block whose `timer` hint names a timer. A layout of your own can put them anywhere.
export function Layout() {
  return (
    <Game>
      <Sidebar>
        {/* A countdown for every running timer. */}
        <Timers />
        <RingingPhone />
      </Sidebar>
      <Story>
        <Scene />
      </Story>
    </Game>
  )
}

// One timer your own way: the phone fades as it rings out.
export function RingingPhone() {
  const ringing = useTimer('flat.ring')
  if (!ringing) return null
  return <span style={{ opacity: 0.4 + (0.6 * ringing.left) / ringing.total }}>☎</span>
}
