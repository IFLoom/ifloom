import { useState } from 'react'
import { Button } from '@ifloom/react'
import { DeviceDialog } from '@ifloom/plugin-devices/react'

export function PhoneButton() {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <>
      <Button onClick={() => setOpen('phone')}>Phone</Button>
      <DeviceDialog deviceId={open} onClose={() => setOpen(null)} />
    </>
  )
}
