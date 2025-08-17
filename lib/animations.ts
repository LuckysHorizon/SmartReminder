export function createParallaxEffect(element: HTMLElement, intensity = 0.5) {
  const handleScroll = () => {
    const scrolled = window.pageYOffset
    const rate = scrolled * -intensity
    element.style.transform = `translateY(${rate}px)`
  }

  window.addEventListener("scroll", handleScroll, { passive: true })

  return () => {
    window.removeEventListener("scroll", handleScroll)
  }
}

export function createAdvancedParallaxEffect(
  elements: { element: HTMLElement; speed: number; direction?: "up" | "down" | "left" | "right" }[],
) {
  let ticking = false

  const updateParallax = () => {
    const scrolled = window.pageYOffset
    const windowHeight = window.innerHeight
    const documentHeight = document.documentElement.scrollHeight

    elements.forEach(({ element, speed, direction = "up" }) => {
      const rect = element.getBoundingClientRect()
      const elementTop = rect.top + scrolled
      const elementHeight = rect.height

      // Only animate elements that are visible or near viewport
      if (elementTop < scrolled + windowHeight && elementTop + elementHeight > scrolled) {
        const progress = (scrolled - elementTop + windowHeight) / (windowHeight + elementHeight)
        const clampedProgress = Math.max(0, Math.min(1, progress))

        let transform = ""
        switch (direction) {
          case "up":
            transform = `translateY(${scrolled * speed}px)`
            break
          case "down":
            transform = `translateY(${-scrolled * speed}px)`
            break
          case "left":
            transform = `translateX(${scrolled * speed}px)`
            break
          case "right":
            transform = `translateX(${-scrolled * speed}px)`
            break
        }

        element.style.transform = transform
        element.style.opacity = `${0.3 + clampedProgress * 0.7}`
      }
    })

    ticking = false
  }

  const handleScroll = () => {
    if (!ticking) {
      requestAnimationFrame(updateParallax)
      ticking = true
    }
  }

  window.addEventListener("scroll", handleScroll, { passive: true })

  return () => {
    window.removeEventListener("scroll", handleScroll)
  }
}

export function getTaskUrgencyGradient(dueDate?: string, isCompleted?: boolean): string {
  if (isCompleted) return "task-gradient-completed"
  if (!dueDate) return "task-gradient-low"

  const due = new Date(dueDate)
  const now = new Date()
  const timeDiff = due.getTime() - now.getTime()
  const hoursDiff = timeDiff / (1000 * 60 * 60)

  if (timeDiff < 0) return "task-gradient-overdue"
  if (hoursDiff < 1) return "task-gradient-critical"
  if (hoursDiff < 6) return "task-gradient-high"
  if (hoursDiff < 24) return "task-gradient-medium"
  if (hoursDiff < 72) return "task-gradient-normal"
  return "task-gradient-low"
}

export function triggerMicroAnimation(element: HTMLElement, animation = "micro-bounce") {
  element.classList.add(animation)

  // Add physics-based timing based on animation type
  const durations = {
    "micro-bounce": 400,
    "pulse-glow": 600,
    shake: 300,
    "slide-in": 350,
    "scale-pop": 250,
    "rotate-flip": 500,
  }

  const duration = durations[animation as keyof typeof durations] || 300

  setTimeout(() => {
    element.classList.remove(animation)
  }, duration)
}

export function createConfetti(options?: {
  colors?: string[]
  count?: number
  duration?: number
  spread?: number
  origin?: { x: number; y: number }
}) {
  const {
    colors = ["#e50914", "#f6121d", "#fbbf24", "#22c55e", "#3b82f6", "#8b5cf6"],
    count = 50,
    duration = 3000,
    spread = 60,
    origin = { x: 0.5, y: 0.5 },
  } = options || {}

  const container = document.createElement("div")
  container.className = "confetti"
  document.body.appendChild(container)

  for (let i = 0; i < count; i++) {
    const piece = document.createElement("div")
    piece.className = "confetti-piece"

    // Random properties
    const color = colors[Math.floor(Math.random() * colors.length)]
    const size = Math.random() * 8 + 4
    const startX = origin.x * window.innerWidth + (Math.random() - 0.5) * spread
    const startY = origin.y * window.innerHeight
    const endX = startX + (Math.random() - 0.5) * 200
    const rotation = Math.random() * 720
    const delay = Math.random() * 500

    piece.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      left: ${startX}px;
      top: ${startY}px;
      border-radius: ${Math.random() > 0.5 ? "50%" : "0"};
      animation: confetti-fall ${duration}ms ease-out ${delay}ms forwards;
      transform: rotate(${rotation}deg);
    `

    container.appendChild(piece)
  }

  setTimeout(() => {
    container.remove()
  }, duration + 1000)
}

export function createParticleEffect(element: HTMLElement, type: "sparkle" | "glow" | "ripple" | "float" = "sparkle") {
  const rect = element.getBoundingClientRect()
  const container = document.createElement("div")
  container.className = "particle-container"
  container.style.cssText = `
    position: absolute;
    top: ${rect.top + window.scrollY}px;
    left: ${rect.left + window.scrollX}px;
    width: ${rect.width}px;
    height: ${rect.height}px;
    pointer-events: none;
    z-index: 1000;
  `

  document.body.appendChild(container)

  const particleCount = type === "ripple" ? 1 : 12

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement("div")
    particle.className = `particle particle-${type}`

    if (type === "sparkle") {
      const x = Math.random() * rect.width
      const y = Math.random() * rect.height
      particle.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        width: 4px;
        height: 4px;
        background: radial-gradient(circle, #fff 0%, transparent 70%);
        border-radius: 50%;
        animation: sparkle 1s ease-out forwards;
        animation-delay: ${i * 100}ms;
      `
    } else if (type === "glow") {
      particle.style.cssText = `
        position: absolute;
        left: 50%;
        top: 50%;
        width: 20px;
        height: 20px;
        background: radial-gradient(circle, rgba(229, 9, 20, 0.6) 0%, transparent 70%);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        animation: glow-pulse 2s ease-in-out infinite;
        animation-delay: ${i * 200}ms;
      `
    } else if (type === "ripple") {
      particle.style.cssText = `
        position: absolute;
        left: 50%;
        top: 50%;
        width: 0;
        height: 0;
        border: 2px solid rgba(229, 9, 20, 0.5);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        animation: ripple-expand 1s ease-out forwards;
      `
    } else if (type === "float") {
      const x = Math.random() * rect.width
      const y = rect.height + Math.random() * 20
      particle.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        width: 6px;
        height: 6px;
        background: linear-gradient(45deg, #e50914, #f6121d);
        border-radius: 50%;
        animation: float-up 3s ease-out forwards;
        animation-delay: ${i * 300}ms;
      `
    }

    container.appendChild(particle)
  }

  setTimeout(() => {
    container.remove()
  }, 3000)
}

export function createThemeTransition(fromTheme: string, toTheme: string) {
  const overlay = document.createElement("div")
  overlay.className = "theme-transition-overlay"
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.8) 100%);
    z-index: 9999;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
  `

  document.body.appendChild(overlay)

  // Fade in
  requestAnimationFrame(() => {
    overlay.style.opacity = "1"
  })

  // Fade out after theme change
  setTimeout(() => {
    overlay.style.opacity = "0"
    setTimeout(() => {
      overlay.remove()
    }, 300)
  }, 150)
}

export function createCinematicBackground() {
  const canvas = document.createElement("canvas")
  canvas.className = "cinematic-background"
  canvas.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: -1;
    pointer-events: none;
    opacity: 0.1;
  `

  document.body.appendChild(canvas)

  const ctx = canvas.getContext("2d")
  if (!ctx) return

  const resizeCanvas = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }

  resizeCanvas()
  window.addEventListener("resize", resizeCanvas)

  const particles: Array<{
    x: number
    y: number
    vx: number
    vy: number
    size: number
    opacity: number
  }> = []

  // Create particles
  for (let i = 0; i < 50; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.1,
    })
  }

  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    particles.forEach((particle) => {
      particle.x += particle.vx
      particle.y += particle.vy

      // Wrap around edges
      if (particle.x < 0) particle.x = canvas.width
      if (particle.x > canvas.width) particle.x = 0
      if (particle.y < 0) particle.y = canvas.height
      if (particle.y > canvas.height) particle.y = 0

      // Draw particle
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(229, 9, 20, ${particle.opacity})`
      ctx.fill()
    })

    requestAnimationFrame(animate)
  }

  animate()

  return () => {
    canvas.remove()
    window.removeEventListener("resize", resizeCanvas)
  }
}

export function createLoadingSpinner(container: HTMLElement, theme: "light" | "dark" | "cinematic" = "cinematic") {
  const spinner = document.createElement("div")
  spinner.className = "loading-spinner"

  const colors = {
    light: "#000",
    dark: "#fff",
    cinematic: "#e50914",
  }

  spinner.style.cssText = `
    width: 40px;
    height: 40px;
    border: 3px solid rgba(${theme === "light" ? "0,0,0" : "255,255,255"}, 0.1);
    border-top: 3px solid ${colors[theme]};
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 20px auto;
  `

  container.appendChild(spinner)

  return () => {
    spinner.remove()
  }
}
