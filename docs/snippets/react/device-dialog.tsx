import { Button } from '@ifloom/react/kit'
import { DeviceDialog, useDevice } from '@ifloom/plugin-devices/react'

// Without devicesUi in `plugins`, place the dialog yourself: it shows the device that's out, and closing it puts it away.
export function PhoneButton() {
  const { open } = useDevice()
  return (
    <>
      <Button onClick={() => open('phone')}>Phone</Button>
      <DeviceDialog />
    </>
  )
}
