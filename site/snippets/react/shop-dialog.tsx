import { useState } from 'react'
import { Button } from '@ifloom/react'
import { ShopDialog } from '@ifloom/plugin-shop/react'

export function CounterButton() {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <>
      <Button variant="outline" onClick={() => setOpen('counter')}>
        The café counter
      </Button>
      <ShopDialog vendorId={open} onClose={() => setOpen(null)} />
    </>
  )
}
