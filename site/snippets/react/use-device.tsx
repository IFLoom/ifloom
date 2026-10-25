import { DeviceDialog, useDevice } from '@ifloom/plugin-devices/react'

export function OpenPhone() {
  const { openId, open, close } = useDevice()
  return (
    <>
      <button onClick={() => open('phone')}>Phone</button>
      <DeviceDialog deviceId={openId} onClose={close} />
    </>
  )
}
