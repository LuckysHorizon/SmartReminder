"use client"

export type HapticType = "light" | "medium" | "heavy" | "success" | "warning" | "error"

export function useHapticFeedback() {
  const triggerHaptic = (type: HapticType = "light") => {
    // Check if device supports haptic feedback
    if ("vibrate" in navigator) {
      switch (type) {
        case "light":
          navigator.vibrate(10)
          break
        case "medium":
          navigator.vibrate(20)
          break
        case "heavy":
          navigator.vibrate([30, 10, 30])
          break
        case "success":
          navigator.vibrate([10, 5, 10])
          break
        case "warning":
          navigator.vibrate([20, 10, 20, 10, 20])
          break
        case "error":
          navigator.vibrate([50, 25, 50])
          break
        default:
          navigator.vibrate(10)
      }
    }

    // For iOS devices with haptic engine (iOS 10+)
    if ("Taptic" in window || "webkit" in window) {
      try {
        // Try to use iOS haptic feedback if available
        const impact = (window as any).TapticEngine?.impact
        if (impact) {
          switch (type) {
            case "light":
              impact("light")
              break
            case "medium":
              impact("medium")
              break
            case "heavy":
              impact("heavy")
              break
            default:
              impact("light")
          }
        }
      } catch (error) {
        // Fallback to vibration
        console.log("Haptic feedback not available")
      }
    }
  }

  return { triggerHaptic }
}
