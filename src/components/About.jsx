import React, { useEffect, useRef, useState } from 'react'

export default function About() {
  const sectionRef = useRef(null)
  const canvasRef = useRef(null)

  const [isVisible, setIsVisible] = useState(false)

  // =========================
  // НАСТРОЙКИ КОЛЕЦ (ВЯЗКАЯ СРЕДА)
  // =========================
  const CONFIG = useRef({
    emitIntervalMs: 14,     // минимальный интервал между кольцами при движении
    ringInitialSpeed: 320,  // начальная скорость радиального роста (px/сек)
    viscosity: 0.2,         // КЛЮЧЕВОЕ: вязкость (1/сек). Больше — сильнее тормозит
    fadePerSec: 1.0,       // скорость затухания альфа-канала (больше — быстрее исчезают)
    startAlpha: 0.5,        // начальная непрозрачность
    lineWidth: 1,           // толщина окружности (CSS-пиксели)
    maxRings: 160,          // максимум активных колец
    dprMax: 2,              // ограничение devicePixelRatio (производительность)
    minSpeed: 2,            // нижний порог скорости (px/сек), чтобы не дрожали на месте
  })

  // Рабочие рефы
  const ringsRef = useRef([])        // [{x, y, r, a, v}]
  const rafRef = useRef(null)
  const lastTRef = useRef(0)
  const lastEmitRef = useRef(0)
  const rectRef = useRef({ width: 0, height: 0, maxRadius: 0 })
  const runningRef = useRef(false)

  // Включаем/выключаем анимацию по видимости секции
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Навешиваем события и первичную инициализацию
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // === Генерация кольца ===
  function emitRing(x, y) {
    const cfg = CONFIG.current
    if (ringsRef.current.length >= cfg.maxRings) ringsRef.current.shift()
    ringsRef.current.push({
      x, y,
      r: 0,
      a: cfg.startAlpha,
      v: cfg.ringInitialSpeed, // стартовая скорость расширения
    })
  }

  // === Канвас + DPI ===
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

  // === Цикл анимации ===
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
    const dt = Math.min((now - lastTRef.current) / 1000, 0.05) // сек
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

      // --- вязкое торможение скорости: v(t) = v0 * exp(-viscosity * t)
      ring.v *= Math.exp(-cfg.viscosity * dt)
      if (ring.v < cfg.minSpeed) ring.v = cfg.minSpeed

      // рост радиуса зависит от текущей скорости
      ring.r += ring.v * dt

      // затухание прозрачности
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
      className={`about-section snap-section ${isVisible ? 'is-visible' : ''}`}
    >
      {/* Канвас с окружностями */}
      <canvas ref={canvasRef} className="about-ripples-canvas" />

      {/* Контент поверх канваса */}
      <div className="container about-content-wrap">
        <div className="section-label">/ О компании</div>
        <h2 className="section-title">Наша миссия</h2>

        <div className="about-content">
          <div className="about-text fade-text">
            <p>
              Мы создаём цифровые решения, которые помогают бизнесу расти и
              развиваться в современном мире. Наша команда состоит из опытных
              разработчиков, дизайнеров и маркетологов, которые объединяют свои
              знания для создания выдающихся проектов.
            </p>
            <br />
            <p>
              Каждый проект для нас — это возможность применить новейшие
              технологии и лучшие практики индустрии. Мы не просто создаём
              сайты, мы создаём инструменты для достижения бизнес-целей.
            </p>
          </div>

          <div className="stats fade-text">
            <div className="stat-item">
              <div className="stat-number">200+</div>
              <div className="stat-label">Реализованных проектов</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">50+</div>
              <div className="stat-label">Довольных клиентов</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">8</div>
              <div className="stat-label">Лет на рынке</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
