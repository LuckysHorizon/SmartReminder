"use client"

import { useEffect, useRef, useState } from "react"

interface SwipeNavigationOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  threshold?: number
  preventScroll?: boolean
}

export function useSwipeNavigation({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  preventScroll = false,
}: SwipeNavigationOptions) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)
  const elementRef = useRef<HTMLElement>(null)

  const minSwipeDistance = threshold

  const onTouchStart = (e: TouchEvent) => {
    setTouchEnd(null)
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    })
  }

  const onTouchMove = (e: TouchEvent) => {
    if (preventScroll && touchStart) {
      const currentTouch = {
        x: e.targetTouches[0].clientX,
        y: e.targetTouches[0].clientY,
      }

      const deltaX = Math.abs(currentTouch.x - touchStart.x)
      const deltaY = Math.abs(currentTouch.y - touchStart.y)

      // If horizontal swipe is more significant than vertical, prevent scroll
      if (deltaX > deltaY && deltaX > 10) {
        e.preventDefault()
      }
    }

    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    })
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distanceX = touchStart.x - touchEnd.x
    const distanceY = touchStart.y - touchEnd.y
    const isLeftSwipe = distanceX > minSwipeDistance
    const isRightSwipe = distanceX < -minSwipeDistance
    const isVerticalSwipe = Math.abs(distanceY) > Math.abs(distanceX)

    // Only trigger horizontal swipes if they're more significant than vertical movement
    if (!isVerticalSwipe) {
      if (isLeftSwipe && onSwipeLeft) {
        // Add haptic feedback for iOS
        if ("vibrate" in navigator) {
          navigator.vibrate(10)
        }
        onSwipeLeft()
      }
      if (isRightSwipe && onSwipeRight) {
        // Add haptic feedback for iOS
        if ("vibrate" in navigator) {
          navigator.vibrate(10)
        }
        onSwipeRight()
      }
    }
  }

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    element.addEventListener("touchstart", onTouchStart, { passive: false })
    element.addEventListener("touchmove", onTouchMove, { passive: false })
    element.addEventListener("touchend", onTouchEnd, { passive: true })

    return () => {
      element.removeEventListener("touchstart", onTouchStart)
      element.removeEventListener("touchmove", onTouchMove)
      element.removeEventListener("touchend", onTouchEnd)
    }
  }, [touchStart, touchEnd, onSwipeLeft, onSwipeRight])

  return elementRef
}
