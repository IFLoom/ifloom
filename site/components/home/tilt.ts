'use client'
import { useCallback } from 'react'

// Leans a card a few degrees toward the cursor. Only with a mouse or trackpad,
// and never when the reader asks for less motion. It only sets `transform`.
const MAX = 3

/** A ref for the element to tilt. */
export function useTilt<T extends HTMLElement>() {
  return useCallback((el: T | null) => {
    if (!el) return
    const ok = matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!ok) return
    let frame = 0
    const move = (event: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const box = el.getBoundingClientRect()
        const x = (event.clientX - box.left) / box.width - 0.5
        const y = (event.clientY - box.top) / box.height - 0.5
        el.style.transform = `perspective(1200px) rotateX(${(-y * MAX).toFixed(2)}deg) rotateY(${(x * MAX).toFixed(2)}deg)`
      })
    }
    const leave = () => {
      cancelAnimationFrame(frame)
      el.style.transform = ''
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    }
  }, [])
}
