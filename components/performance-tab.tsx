"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { getUserProfile, updateUserPreferences, type UserProfile, getMotivationalMessage } from "@/lib/profile"
import { getTasks } from "@/lib/db"
import { formatDistanceToNow, startOfWeek, endOfWeek, isWithinInterval } from "date-fns"

export function PerformanceTab() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [weeklyProgress, setWeeklyProgress] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [motivationalMessage, setMotivationalMessage] = useState("")

  useEffect(() => {
    loadPerformanceData()
  }, [])

  const loadPerformanceData = async () => {
    try {
      const userProfile = getUserProfile()
      if (!userProfile) return

      // Calculate weekly progress
      const tasks = await getTasks()
      const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: userProfile.preferences.weekStartsOn })
      const thisWeekEnd = endOfWeek(new Date(), { weekStartsOn: userProfile.preferences.weekStartsOn })

      const thisWeekCompleted = tasks.filter(
        (task) =>
          task.isCompleted &&
          task.completedAt &&
          isWithinInterval(new Date(task.completedAt), { start: thisWeekStart, end: thisWeekEnd }),
      ).length

      setWeeklyProgress((thisWeekCompleted / userProfile.stats.weeklyGoal) * 100)
      setProfile(userProfile)
      setMotivationalMessage(getMotivationalMessage(userProfile.stats))
    } catch (error) {
      console.error("Error loading performance data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStreakMessage = (streak: number) => {
    if (streak === 0) return "Start your streak today!"
    if (streak === 1) return "Great start! Keep it going!"
    if (streak < 7) return "Building momentum!"
    if (streak < 30) return "You're on fire!"
    return "Incredible dedication!"
  }

  const getCompletionRate = () => {
    if (!profile || profile.stats.tasksCreated === 0) return 0
    return Math.round((profile.stats.tasksCompleted / profile.stats.tasksCreated) * 100)
  }

  const getLevelProgress = () => {
    if (!profile) return 0
    const totalXPForLevel = profile.stats.xpToNextLevel + (profile.stats.xp - profile.stats.xpToNextLevel)
    return ((profile.stats.xp - (profile.stats.xp - profile.stats.xpToNextLevel)) / totalXPForLevel) * 100
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
          <div className="h-40 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="text-4xl mb-2">📊</div>
        <p className="text-lg mb-1">No profile data found</p>
        <p className="text-sm">Complete the onboarding to see your stats</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {profile.preferences.motivationalMessages && (
        <Card className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
          <p className="text-center font-medium text-primary">{motivationalMessage}</p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{profile.stats.level}</div>
            <div className="text-sm text-muted-foreground">Level</div>
            <div className="mt-2">
              <Progress value={getLevelProgress()} className="h-2" />
              <div className="text-xs text-muted-foreground mt-1">{profile.stats.xpToNextLevel} XP to next level</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">{profile.stats.currentStreak}</div>
            <div className="text-sm text-muted-foreground">Day Streak</div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{profile.stats.productivityScore}%</div>
            <div className="text-sm text-muted-foreground">Productivity</div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{profile.stats.tasksCompleted}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Weekly Goal</h3>
            <Badge variant="outline">
              {Math.min(Math.round((weeklyProgress / 100) * profile.stats.weeklyGoal), profile.stats.weeklyGoal)} /{" "}
              {profile.stats.weeklyGoal}
            </Badge>
          </div>
          <Progress value={Math.min(weeklyProgress, 100)} className="h-3" />
          <p className="text-sm text-muted-foreground">
            {weeklyProgress >= 100
              ? "🎉 Weekly goal achieved! Great work!"
              : `${Math.round(100 - weeklyProgress)}% to go this week`}
          </p>
        </div>
      </Card>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Current Streak</h3>
            <div className="text-2xl">🔥</div>
          </div>
          <div className="text-center space-y-2">
            <div className="text-3xl font-bold text-accent">{profile.stats.currentStreak} days</div>
            <p className="text-sm text-muted-foreground">{getStreakMessage(profile.stats.currentStreak)}</p>
            <p className="text-xs text-muted-foreground">Longest streak: {profile.stats.longestStreak} days</p>
            <div className="text-xs text-primary">+50 XP per streak day</div>
          </div>
        </div>
      </Card>

      {profile.stats.achievements.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Achievements</h3>
            <Badge variant="secondary">{profile.stats.achievements.length}</Badge>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {profile.stats.achievements.slice(-6).map((achievement) => (
              <div key={achievement.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl">{achievement.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{achievement.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{achievement.description}</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(achievement.unlockedAt, { addSuffix: true })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Profile</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Name</span>
              <span className="font-medium">{profile.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Member since</span>
              <span className="font-medium">{formatDistanceToNow(profile.joinedAt, { addSuffix: true })}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Theme</span>
              <Badge variant="outline" className="capitalize">
                {profile.preferences.theme === "cinematic" ? "App theme" : profile.preferences.theme}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start bg-transparent"
            onClick={() => {
              const newGoal = prompt("Set your weekly goal (number of tasks):", profile.stats.weeklyGoal.toString())
              if (newGoal && !isNaN(Number(newGoal))) {
                const updatedProfile = {
                  ...profile,
                  stats: { ...profile.stats, weeklyGoal: Number(newGoal) },
                }
                setProfile(updatedProfile)
                localStorage.setItem("smart-reminder-profile", JSON.stringify(updatedProfile))
              }
            }}
          >
            🎯 Update Weekly Goal
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start bg-transparent"
            onClick={() => {
              updateUserPreferences({ motivationalMessages: !profile.preferences.motivationalMessages })
              setProfile({
                ...profile,
                preferences: {
                  ...profile.preferences,
                  motivationalMessages: !profile.preferences.motivationalMessages,
                },
              })
            }}
          >
            {profile.preferences.motivationalMessages ? "💬 Disable" : "💬 Enable"} Motivational Messages
          </Button>
        </div>
      </Card>
    </div>
  )
}
