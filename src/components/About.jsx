import React, { useEffect, useRef, useState } from 'react'

export default function About() {
  const sectionRef = useRef(null)
  const canvasRef = useRef(null)

  const [isVisible, setIsVisible] = useState(false)

  const CONFIG = useRef({
    emitIntervalMs: 14,
    ringInitialSpeed: 320,
    viscosity: 0.2,
    fadePerSec: 1.0,
    startAlpha: 0.5,
    lineWidth: 1,
    maxRings: 160,
    dprMax: 2,
    minSpeed: 2,
  })

  const ringsRef = useRef([])
  const rafRef = useRef(null)
  const lastTRef = useRef(0)
  const lastEmitRef = useRef(0)
  const rectRef = useRef({ width: 0, height: 0, maxRadius: 0 })
  const runningRef = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.isIntersecting && entry.intersectionRatio >= 0.5
        setIsVisible(visible)
        if (visible) startAnimation()
        else stopAnimation()
      },
      { threshold: [0, 0.5, 1] }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const sec = sectionRef.current
    if (!sec) return

    const onPointerMove = (e) => {
      const now = performance.now()
      if (now - lastEmitRef.current < CONFIG.current.emitIntervalMs) return
      lastEmitRef.current = now

      const rect = sec.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      emitRing(x, y)
    }

    const onPointerEnter = (e) => {
      const rect = sec.getBoundingClientRect()
      emitRing(e.clientX - rect.left, e.clientY - rect.top)
    }

    const onResize = () => resizeCanvas()

    resizeCanvas()
    sec.addEventListener('pointermove', onPointerMove, { passive: true })
    sec.addEventListener('pointerenter', onPointerEnter, { passive: true })
    window.addEventListener('resize', onResize)

    return () => {
      sec.removeEventListener('pointermove', onPointerMove)
      sec.removeEventListener('pointerenter', onPointerEnter)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  function emitRing(x, y) {
    const cfg = CONFIG.current
    if (ringsRef.current.length >= cfg.maxRings) ringsRef.current.shift()
    ringsRef.current.push({
      x, y,
      r: 0,
      a: cfg.startAlpha,
      v: cfg.ringInitialSpeed,
    })
  }

  function resizeCanvas() {
    const sec = sectionRef.current
    const canvas = canvasRef.current
    if (!sec || !canvas) return

    const rect = sec.getBoundingClientRect()
    rectRef.current.width = rect.width
    rectRef.current.height = rect.height
    rectRef.current.maxRadius = Math.hypot(rect.width, rect.height)

    const dpr = Math.min(window.devicePixelRatio || 1, CONFIG.current.dprMax)
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`
    canvas.width = Math.floor(rect.width * dpr)
    canvas.height = Math.floor(rect.height * dpr)

    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  function startAnimation() {
    if (runningRef.current) return
    runningRef.current = true
    lastTRef.current = performance.now()
    rafRef.current = requestAnimationFrame(tick)
  }

  function stopAnimation() {
    runningRef.current = false
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, rectRef.current.width, rectRef.current.height)
    }
  }

  function tick(now) {
    if (!runningRef.current) return
    const dt = Math.min((now - lastTRef.current) / 1000, 0.05)
    lastTRef.current = now
    draw(dt)
    rafRef.current = requestAnimationFrame(tick)
  }

  function draw(dt) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { width, height, maxRadius } = rectRef.current
    const cfg = CONFIG.current

    ctx.clearRect(0, 0, width, height)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = cfg.lineWidth

    const next = []
    for (let i = 0; i < ringsRef.current.length; i++) {
      const ring = ringsRef.current[i]

      ring.v *= Math.exp(-cfg.viscosity * dt)
      if (ring.v < cfg.minSpeed) ring.v = cfg.minSpeed

      ring.r += ring.v * dt
      ring.a -= cfg.fadePerSec * dt

      if (ring.a > 0 && ring.r < maxRadius) {
        ctx.globalAlpha = Math.max(0, Math.min(1, ring.a))
        ctx.beginPath()
        ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2)
        ctx.stroke()
        next.push(ring)
      }
    }

    ringsRef.current = next
    ctx.globalAlpha = 1
  }

  return (
    <section
      ref={sectionRef}
      id="about"
      className="about-section snap-section"
    >
      <canvas ref={canvasRef} className="about-ripples-canvas" />

      <div className="container about-content-wrap">
        <div className="section-label">/ О компании</div>
        <h2 className="section-title">Выпускники МФТИ</h2>

        <div className="about-content">
          <div className="about-main-text">
            <p className="about-intro">
              Мы — молодая команда разработчиков из Московского физико-технического института. 
              Объединив фундаментальные знания в математике, физике и computer science, 
              мы создаём технологические решения нового уровня.
            </p>
            
            <div className="about-goal">
              <h3 className="about-goal-title">Наша цель</h3>
              <p className="about-goal-text">
                Применить научный подход и инженерную точность для создания веб-продуктов, 
                которые решают реальные бизнес-задачи. Мы не просто пишем код — 
                мы проектируем системы, используя алгоритмическое мышление и глубокое понимание технологий.
              </p>
            </div>
          </div>

          <div className="about-values-box">
            <h3 className="about-values-title">Наши принципы</h3>
            <div className="about-values-list">
              <div className="value-item">
                <span className="value-icon">→</span>
                <span className="value-text">Фундаментальный подход</span>
              </div>
              <div className="value-item">
                <span className="value-icon">→</span>
                <span className="value-text">Инженерная точность</span>
              </div>
              <div className="value-item">
                <span className="value-icon">→</span>
                <span className="value-text">Инновационные решения</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}