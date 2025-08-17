"use client"

import { useState, useEffect } from "react"
import { useTheme } from "@/components/theme-provider"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { TasksTab } from "@/components/tasks-tab"
import { ResourcesTab } from "@/components/resources-tab"
import { PerformanceTab } from "@/components/performance-tab"
import { SiriShortcuts } from "@/components/siri-shortcuts"
import { useSwipeNavigation } from "@/hooks/use-swipe-navigation"
import { useHapticFeedback } from "@/hooks/use-haptic-feedback"
import {
  startNotificationScheduler,
  requestNotificationPermission,
  stopNotificationScheduler,
} from "@/lib/notifications"
import { getUserProfile, createDefaultProfile, saveUserProfile, updateUserStats } from "@/lib/profile"
import Image from "next/image"

export default function SmartReminderApp() {
  const { theme, setTheme } = useTheme()
  const { triggerHaptic } = useHapticFeedback()
  const [userName, setUserName] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showSiriShortcuts, setShowSiriShortcuts] = useState(false)
  const [tempName, setTempName] = useState("")
  const [activeTab, setActiveTab] = useState<"tasks" | "resources" | "performance">("tasks")

  const tabs = ["tasks", "resources", "performance"] as const
  const currentTabIndex = tabs.indexOf(activeTab)

  const navigateToTab = (direction: "left" | "right") => {
    const newIndex =
      direction === "left" ? (currentTabIndex + 1) % tabs.length : (currentTabIndex - 1 + tabs.length) % tabs.length

    setActiveTab(tabs[newIndex])
    triggerHaptic("light")
  }

  const swipeRef = useSwipeNavigation({
    onSwipeLeft: () => navigateToTab("left"),
    onSwipeRight: () => navigateToTab("right"),
    threshold: 75,
    preventScroll: true,
  })

  useEffect(() => {
    const handleURLParams = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const action = urlParams.get("action")

      switch (action) {
        case "create-task":
          setActiveTab("tasks")
          // Could trigger voice input or task form here
          break
        case "view-tasks":
          setActiveTab("tasks")
          break
        case "add-resource":
          setActiveTab("resources")
          break
        case "view-progress":
          setActiveTab("performance")
          break
      }

      // Clear URL parameters after handling
      if (action) {
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }

    handleURLParams()

    // Check for user profile
    const profile = getUserProfile()
    if (profile) {
      setUserName(profile.name)
      // Apply user's preferred theme
      if (profile.preferences.theme !== theme) {
        setTheme(profile.preferences.theme)
      }
    } else {
      // Check legacy storage
      const legacyName = localStorage.getItem("smart-reminder-user-name")
      if (legacyName) {
        // Migrate to new profile system
        const newProfile = createDefaultProfile(legacyName)
        saveUserProfile(newProfile)
        setUserName(legacyName)
        localStorage.removeItem("smart-reminder-user-name")
      } else {
        setShowOnboarding(true)
      }
    }

    const initNotifications = async () => {
      // Request notification permission
      await requestNotificationPermission()

      // Start the notification scheduler
      startNotificationScheduler()
    }

    initNotifications()

    return () => {
      stopNotificationScheduler()
    }
  }, [theme, setTheme])

  const handleOnboardingComplete = () => {
    if (tempName.trim()) {
      const profile = createDefaultProfile(tempName.trim())
      saveUserProfile(profile)
      setUserName(tempName.trim())
      setShowOnboarding(false)
      setTempName("")

      // Update stats for joining
      updateUserStats({ tasksCreated: 0 })

      triggerHaptic("success")
    }
  }

  const getGreeting = () => {
    const profile = getUserProfile()
    const hour = new Date().getHours()
    const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
    const name = userName || "there"

    // Check if motivational messages are enabled
    if (profile?.preferences.motivationalMessages === false) {
      return `${timeGreeting}, ${name}!`
    }

    return `${timeGreeting}, ${name}!`
  }

  const getMotivationalMessage = () => {
    const profile = getUserProfile()

    // Check if motivational messages are disabled
    if (profile?.preferences.motivationalMessages === false) {
      return "Let's get productive!"
    }

    const messages = [
      "Ready to conquer today?",
      "Let's make progress together!",
      "Your future self will thank you!",
      "Every step counts towards success!",
      "Time to level up your preparation!",
      "Focus on progress, not perfection!",
      "Small steps lead to big achievements!",
      "You've got this! Stay consistent!",
    ]

    // Personalized messages based on streak
    if (profile?.stats.currentStreak > 0) {
      messages.push(`Amazing ${profile.stats.currentStreak}-day streak! Keep it going!`)
    }

    if (profile?.stats.currentStreak >= 7) {
      messages.push("You're building an incredible habit! 🔥")
    }

    return messages[Math.floor(Math.random() * messages.length)]
  }

  return (
    <div className="min-h-screen bg-background" ref={swipeRef}>
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md ios-safe-top">
        <div className="flex items-center justify-between px-4 py-3 ios-safe-left ios-safe-right">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="LuckysHorizon Logo" width={32} height={32} className="rounded-lg" />
            <div>
              <h1 className="text-lg font-bold">SmartReminder</h1>
              <p className="text-xs text-muted-foreground">by LuckysHorizon</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowSiriShortcuts(true)} className="text-xs">
              🎤 Siri
            </Button>

            <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
              {(["light", "dark", "cinematic"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTheme(t)
                    triggerHaptic("light")
                    // Update user preference
                    const profile = getUserProfile()
                    if (profile) {
                      const updatedProfile = {
                        ...profile,
                        preferences: { ...profile.preferences, theme: t },
                      }
                      saveUserProfile(updatedProfile)
                    }
                  }}
                  className={`touch-target px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                    theme === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "cinematic" ? "App theme" : t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex border-t border-border relative">
          {/* Swipe indicator */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-accent/30 to-transparent opacity-50"></div>

          {[
            { id: "tasks", label: "Tasks", icon: "✓" },
            { id: "resources", label: "Resources", icon: "📚" },
            { id: "performance", label: "Stats", icon: "📊" },
          ].map((tab, index) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any)
                triggerHaptic("light")
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-all duration-200 touch-target relative ${
                activeTab === tab.id
                  ? "text-accent border-b-2 border-accent scale-105"
                  : "text-muted-foreground hover:text-foreground hover:scale-102"
              }`}
            >
              <span className={`transition-transform duration-200 ${activeTab === tab.id ? "scale-110" : ""}`}>
                {tab.icon}
              </span>
              {tab.label}

              {/* Active tab indicator */}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-accent rounded-full"></div>
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-6 ios-safe-left ios-safe-right ios-safe-bottom">
        {/* Greeting Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-1">{getGreeting()}</h2>
          <p className="text-muted-foreground">{getMotivationalMessage()}</p>
        </div>

        <div className="space-y-4 slide-in-up">
          {activeTab === "tasks" && <TasksTab />}
          {activeTab === "resources" && <ResourcesTab />}
          {activeTab === "performance" && <PerformanceTab />}
        </div>
      </main>

      <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
        <DialogContent className="sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Image src="/logo.png" alt="LuckysHorizon Logo" width={40} height={40} className="rounded-lg" />
              Welcome to SmartReminder!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">Let's personalize your experience. What should we call you?</p>
            <Input
              placeholder="Enter your name"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleOnboardingComplete()}
              className="text-base" // Prevent zoom on iOS
            />
            <Button
              onClick={handleOnboardingComplete}
              disabled={!tempName.trim()}
              className="w-full btn-primary touch-target"
            >
              Get Started
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSiriShortcuts} onOpenChange={setShowSiriShortcuts}>
        <DialogContent className="sm:max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Siri Integration & Voice Features</DialogTitle>
          </DialogHeader>
          <SiriShortcuts />
        </DialogContent>
      </Dialog>
    </div>
  )
}
