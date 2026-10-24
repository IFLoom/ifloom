// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'

afterEach(cleanup)

describe('Picture', () => {
  it('gives a new picture its own chance after one failed', async () => {
    const { Picture } = await import('../src/index.ts')
    const { rerender, container } = render(<Picture src="art/missing.jpg" alt="" />)
    act(() => void fireEvent.error(container.querySelector('img')!))
    expect(container.querySelector('img')).toBeNull()
    rerender(<Picture src="art/next.jpg" alt="" />)
    expect(container.querySelector('img')?.getAttribute('src')).toBe('art/next.jpg')
  })
})

describe('assetUrl', () => {
  it('finds a picture inlined into the page, and leaves any other path alone', async () => {
    const { assetUrl } = await import('../src/index.ts')
    ;(globalThis as { __ifloomAssets?: Record<string, string> }).__ifloomAssets = { 'art/a.png': 'data:image/png;base64,AA' }
    expect(assetUrl('art/a.png')).toBe('data:image/png;base64,AA')
    expect(assetUrl('./art/a.png')).toBe('data:image/png;base64,AA')
    expect(assetUrl('art/b.png')).toBe('art/b.png')
    delete (globalThis as { __ifloomAssets?: unknown }).__ifloomAssets
  })
})
