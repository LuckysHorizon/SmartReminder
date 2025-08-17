export interface UserProfile {
  name: string
  email?: string
  avatar?: string
  joinedAt: number
  preferences: UserPreferences
  stats: UserStats
}

export interface UserPreferences {
  defaultReminderTime: string // e.g., "09:00"
  theme: "light" | "dark" | "cinematic"
  notificationSound: boolean
  weekStartsOn: 0 | 1 // 0 = Sunday, 1 = Monday
  timeFormat: "12h" | "24h"
  motivationalMessages: boolean
}

export interface UserStats {
  tasksCompleted: number
  tasksCreated: number
  currentStreak: number
  longestStreak: number
  totalStudyTime: number // in minutes
  resourcesUploaded: number
  lastActiveDate: string // YYYY-MM-DD format
  weeklyGoal: number
  achievements: Achievement[]
  xp: number
  level: number
  xpToNextLevel: number
  weeklyInsights: WeeklyInsight[]
  productivityScore: number
  focusTime: number // total focused minutes
  perfectDays: number // days with 100% goal completion
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlockedAt: number
  category: "tasks" | "streak" | "resources" | "time"
}

export interface WeeklyInsight {
  weekStart: string // YYYY-MM-DD format
  tasksCompleted: number
  averageCompletionTime: number
  mostProductiveDay: string
  streakDays: number
  focusTime: number
  topCategories: string[]
}

const PROFILE_KEY = "smart-reminder-profile"
const DAILY_STATS_KEY = "smart-reminder-daily-stats"

export function getUserProfile(): UserProfile | null {
  try {
    const stored = localStorage.getItem(PROFILE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export function saveUserProfile(profile: UserProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export function createDefaultProfile(name: string): UserProfile {
  return {
    name,
    joinedAt: Date.now(),
    preferences: {
      defaultReminderTime: "09:00",
      theme: "cinematic",
      notificationSound: true,
      weekStartsOn: 1,
      timeFormat: "12h",
      motivationalMessages: true,
    },
    stats: {
      tasksCompleted: 0,
      tasksCreated: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalStudyTime: 0,
      resourcesUploaded: 0,
      lastActiveDate: new Date().toISOString().split("T")[0],
      weeklyGoal: 7,
      achievements: [],
      xp: 0,
      level: 1,
      xpToNextLevel: 100,
      weeklyInsights: [],
      productivityScore: 0,
      focusTime: 0,
      perfectDays: 0,
    },
  }
}

export function calculateXPForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1))
}

export function calculateLevelFromXP(xp: number): { level: number; xpToNextLevel: number } {
  let level = 1
  let totalXPForLevel = 0

  while (totalXPForLevel <= xp) {
    const xpForThisLevel = calculateXPForLevel(level)
    if (totalXPForLevel + xpForThisLevel > xp) {
      break
    }
    totalXPForLevel += xpForThisLevel
    level++
  }

  const xpForCurrentLevel = calculateXPForLevel(level)
  const xpInCurrentLevel = xp - totalXPForLevel
  const xpToNextLevel = xpForCurrentLevel - xpInCurrentLevel

  return { level, xpToNextLevel }
}

export function awardXP(action: string, multiplier = 1): number {
  const xpRewards: Record<string, number> = {
    task_complete: 25,
    task_complete_early: 35,
    task_complete_overdue: 15,
    streak_day: 50,
    resource_upload: 20,
    perfect_day: 100,
    week_goal_complete: 150,
  }

  const baseXP = xpRewards[action] || 10
  return Math.floor(baseXP * multiplier)
}

export function updateUserStats(updates: Partial<UserStats>): void {
  const profile = getUserProfile()
  if (!profile) return

  const today = new Date().toISOString().split("T")[0]
  let xpGained = 0

  if (updates.tasksCompleted !== undefined && updates.tasksCompleted > profile.stats.tasksCompleted) {
    const tasksCompleted = updates.tasksCompleted - profile.stats.tasksCompleted
    xpGained += awardXP("task_complete") * tasksCompleted
  }

  if (updates.resourcesUploaded !== undefined && updates.resourcesUploaded > profile.stats.resourcesUploaded) {
    const resourcesAdded = updates.resourcesUploaded - profile.stats.resourcesUploaded
    xpGained += awardXP("resource_upload") * resourcesAdded
  }

  const updatedProfile = {
    ...profile,
    stats: {
      ...profile.stats,
      ...updates,
      lastActiveDate: today,
      xp: profile.stats.xp + xpGained,
    },
  }

  const levelInfo = calculateLevelFromXP(updatedProfile.stats.xp)
  updatedProfile.stats.level = levelInfo.level
  updatedProfile.stats.xpToNextLevel = levelInfo.xpToNextLevel

  if (updates.tasksCompleted !== undefined) {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split("T")[0]

    if (profile.stats.lastActiveDate === yesterdayStr || profile.stats.lastActiveDate === today) {
      updatedProfile.stats.currentStreak = profile.stats.currentStreak + 1
      xpGained += awardXP("streak_day")
      updatedProfile.stats.xp += awardXP("streak_day")
    } else if (profile.stats.lastActiveDate !== today) {
      updatedProfile.stats.currentStreak = 1
    }

    if (updatedProfile.stats.currentStreak > updatedProfile.stats.longestStreak) {
      updatedProfile.stats.longestStreak = updatedProfile.stats.currentStreak
    }
  }

  updatedProfile.stats.productivityScore = calculateProductivityScore(updatedProfile.stats)

  checkAndUnlockAchievements(updatedProfile)

  if (updatedProfile.stats.level > profile.stats.level) {
    showLevelUpNotification(updatedProfile.stats.level)
  }

  saveUserProfile(updatedProfile)
}

function calculateProductivityScore(stats: UserStats): number {
  const completionRate = stats.tasksCreated > 0 ? (stats.tasksCompleted / stats.tasksCreated) * 100 : 0
  const streakBonus = Math.min(stats.currentStreak * 2, 50)
  const consistencyBonus = stats.perfectDays * 5

  return Math.min(Math.floor(completionRate + streakBonus + consistencyBonus), 100)
}

function checkAndUnlockAchievements(profile: UserProfile): void {
  const achievements: Achievement[] = [
    {
      id: "first-task",
      name: "Getting Started",
      description: "Complete your first task",
      icon: "🎯",
      category: "tasks",
      unlockedAt: Date.now(),
    },
    {
      id: "task-master",
      name: "Task Master",
      description: "Complete 10 tasks",
      icon: "🏆",
      category: "tasks",
      unlockedAt: Date.now(),
    },
    {
      id: "week-warrior",
      name: "Week Warrior",
      description: "Maintain a 7-day streak",
      icon: "🔥",
      category: "streak",
      unlockedAt: Date.now(),
    },
    {
      id: "resource-collector",
      name: "Resource Collector",
      description: "Upload 5 study resources",
      icon: "📚",
      category: "resources",
      unlockedAt: Date.now(),
    },
    {
      id: "dedicated-learner",
      name: "Dedicated Learner",
      description: "Complete 50 tasks",
      icon: "🌟",
      category: "tasks",
      unlockedAt: Date.now(),
    },
    {
      id: "level-5",
      name: "Rising Star",
      description: "Reach level 5",
      icon: "⭐",
      category: "tasks",
      unlockedAt: Date.now(),
    },
    {
      id: "level-10",
      name: "Expert",
      description: "Reach level 10",
      icon: "💎",
      category: "tasks",
      unlockedAt: Date.now(),
    },
    {
      id: "month-streak",
      name: "Consistency King",
      description: "Maintain a 30-day streak",
      icon: "👑",
      category: "streak",
      unlockedAt: Date.now(),
    },
    {
      id: "perfect-week",
      name: "Perfect Week",
      description: "Complete 7 perfect days",
      icon: "💯",
      category: "tasks",
      unlockedAt: Date.now(),
    },
    {
      id: "productivity-master",
      name: "Productivity Master",
      description: "Achieve 90+ productivity score",
      icon: "🚀",
      category: "tasks",
      unlockedAt: Date.now(),
    },
  ]

  const newAchievements: Achievement[] = []

  achievements.forEach((achievement) => {
    const alreadyUnlocked = profile.stats.achievements.some((a) => a.id === achievement.id)
    if (alreadyUnlocked) return

    let shouldUnlock = false

    switch (achievement.id) {
      case "first-task":
        shouldUnlock = profile.stats.tasksCompleted >= 1
        break
      case "task-master":
        shouldUnlock = profile.stats.tasksCompleted >= 10
        break
      case "week-warrior":
        shouldUnlock = profile.stats.currentStreak >= 7
        break
      case "resource-collector":
        shouldUnlock = profile.stats.resourcesUploaded >= 5
        break
      case "dedicated-learner":
        shouldUnlock = profile.stats.tasksCompleted >= 50
        break
      case "level-5":
        shouldUnlock = profile.stats.level >= 5
        break
      case "level-10":
        shouldUnlock = profile.stats.level >= 10
        break
      case "month-streak":
        shouldUnlock = profile.stats.currentStreak >= 30
        break
      case "perfect-week":
        shouldUnlock = profile.stats.perfectDays >= 7
        break
      case "productivity-master":
        shouldUnlock = profile.stats.productivityScore >= 90
        break
    }

    if (shouldUnlock) {
      newAchievements.push(achievement)
    }
  })

  if (newAchievements.length > 0) {
    profile.stats.achievements.push(...newAchievements)
    newAchievements.forEach((achievement) => {
      showAchievementNotification(achievement)
    })
  }
}

function showAchievementNotification(achievement: Achievement): void {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Achievement Unlocked!", {
      body: `${achievement.icon} ${achievement.name}: ${achievement.description}`,
      icon: "/logo.png",
    })
  }
}

function showLevelUpNotification(level: number): void {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Level Up!", {
      body: `🎉 Congratulations! You've reached level ${level}!`,
      icon: "/logo.png",
    })
  }
}

export function updateUserPreferences(preferences: Partial<UserPreferences>): void {
  const profile = getUserProfile()
  if (!profile) return

  const updatedProfile = {
    ...profile,
    preferences: {
      ...profile.preferences,
      ...preferences,
    },
  }

  saveUserProfile(updatedProfile)
}

export function getDailyStats(): { date: string; tasksCompleted: number; studyTime: number } {
  const today = new Date().toISOString().split("T")[0]
  const stored = localStorage.getItem(`${DAILY_STATS_KEY}-${today}`)
  return stored ? JSON.parse(stored) : { date: today, tasksCompleted: 0, studyTime: 0 }
}

export function updateDailyStats(updates: { tasksCompleted?: number; studyTime?: number }): void {
  const today = new Date().toISOString().split("T")[0]
  const current = getDailyStats()
  const updated = { ...current, ...updates }
  localStorage.setItem(`${DAILY_STATS_KEY}-${today}`, JSON.stringify(updated))
}

export function generateWeeklyInsight(): WeeklyInsight | null {
  const profile = getUserProfile()
  if (!profile) return null

  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay() + (profile.preferences.weekStartsOn === 1 ? 1 : 0))

  return {
    weekStart: weekStart.toISOString().split("T")[0],
    tasksCompleted: profile.stats.tasksCompleted,
    averageCompletionTime: 45, // minutes
    mostProductiveDay: "Tuesday",
    streakDays: profile.stats.currentStreak,
    focusTime: profile.stats.focusTime,
    topCategories: ["Study", "Work", "Personal"],
  }
}

export function getMotivationalMessage(stats: UserStats): string {
  const messages = {
    streak: [
      `🔥 ${stats.currentStreak} days strong! Keep the momentum going!`,
      `Amazing streak of ${stats.currentStreak} days! You're unstoppable!`,
      `${stats.currentStreak} days in a row - you're building incredible habits!`,
    ],
    level: [
      `🌟 Level ${stats.level} achieved! Your dedication is paying off!`,
      `You're at level ${stats.level} - every task brings you closer to mastery!`,
      `Level ${stats.level} unlocked! Your growth is inspiring!`,
    ],
    productivity: [
      `💪 ${stats.productivityScore}% productivity score - you're crushing it!`,
      `Your ${stats.productivityScore}% productivity shows real commitment!`,
      `${stats.productivityScore}% productivity - excellence in action!`,
    ],
    general: [
      "Every task completed is a step toward your goals! 🎯",
      "Your consistency is building something amazing! ✨",
      "Progress, not perfection - you're doing great! 🚀",
      "Small steps daily lead to big changes yearly! 🌱",
    ],
  }

  if (stats.currentStreak >= 7) {
    return messages.streak[Math.floor(Math.random() * messages.streak.length)]
  } else if (stats.level >= 5) {
    return messages.level[Math.floor(Math.random() * messages.level.length)]
  } else if (stats.productivityScore >= 70) {
    return messages.productivity[Math.floor(Math.random() * messages.productivity.length)]
  } else {
    return messages.general[Math.floor(Math.random() * messages.general.length)]
  }
}
