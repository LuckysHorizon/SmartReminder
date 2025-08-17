"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { createThemeTransition, createCinematicBackground } from "@/lib/animations"

type Theme = "light" | "dark" | "cinematic"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "cinematic",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "cinematic",
  storageKey = "smart-reminder-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)
  const [cinematicCleanup, setCinematicCleanup] = useState<(() => void) | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(storageKey) as Theme
    if (stored && ["light", "dark", "cinematic"].includes(stored)) {
      setTheme(stored)
    }
  }, [storageKey])

  useEffect(() => {
    const root = window.document.documentElement
    const currentTheme = root.classList.contains("light")
      ? "light"
      : root.classList.contains("dark")
        ? "dark"
        : root.classList.contains("cinematic")
          ? "cinematic"
          : null

    if (currentTheme && currentTheme !== theme) {
      createThemeTransition(currentTheme, theme)
    }

    // Remove all theme classes
    root.classList.remove("light", "dark", "cinematic")

    // Add current theme class
    root.classList.add(theme)

    const themeColors = {
      light: "#ffffff",
      dark: "#0F1115",
      cinematic: "#0B0B0F",
    }

    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", themeColors[theme])
    }

    if (theme === "cinematic") {
      // Clean up previous cinematic background
      if (cinematicCleanup) {
        cinematicCleanup()
      }

      // Create new cinematic background
      const cleanup = createCinematicBackground()
      setCinematicCleanup(() => cleanup)
    } else {
      // Clean up cinematic background for other themes
      if (cinematicCleanup) {
        cinematicCleanup()
        setCinematicCleanup(null)
      }
    }

    // Store theme
    localStorage.setItem(storageKey, theme)
  }, [theme, storageKey]) // Removed cinematicCleanup from dependencies to prevent infinite loop

  useEffect(() => {
    return () => {
      if (cinematicCleanup) {
        cinematicCleanup()
      }
    }
  }, [cinematicCleanup])

  const value = {
    theme,
    setTheme,
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
