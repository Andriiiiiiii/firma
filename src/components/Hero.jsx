import React, { useEffect, useRef, useState } from 'react'

export default function Hero() {
  const sectionRef = useRef(null)
  const wheelImgRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  // Порог появления текста/PNG
  const APPEAR_RATIO = 0.6

  // ===== ИНЕРЦИЯ КОЛЕСА (только визуал, скролл не трогаем) =====
  const SPIN_GAIN_DEG_PER_WHEEL = 0.9   // прирост угл. скорости на единицу deltaY (deg/s)
  const SPIN_DECAY_PER_SEC = 3.0        // экспоненциальное затухание скорости (e^{-k t})
  const SPIN_MAX_ABS_VEL = 7200         // кап по |ω| (deg/s)
  const SPIN_EPS_STOP = 5               // если |ω| < 5 deg/s — останавливаем анимацию

  // refs
  const inViewportRef = useRef(false)
  const angleRef = useRef(0)     // угол (deg)
  const angVelRef = useRef(0)    // угловая скорость (deg/s)
  const spinRafRef = useRef(0)
  const lastTsRef = useRef(0)

  useEffect(() => {
    const section = sectionRef.current
    const wheelImg = wheelImgRef.current
    if (!section || !wheelImg) return

    // IntersectionObserver для появления контента
    const thresholds = Array.from({ length: 101 }, (_, i) => i / 100)
    const io = new IntersectionObserver(
      ([entry]) => {
        const r = entry.intersectionRatio
        setIsVisible(r >= APPEAR_RATIO)
        inViewportRef.current = r > 0
      },
      { threshold: thresholds }
    )
    io.observe(section)

    // ------- анимация инерции вращения PNG -------
    const spinStep = (ts) => {
      const prevTs = lastTsRef.current || ts
      const dt = Math.max(0, (ts - prevTs) / 1000) // sec
      lastTsRef.current = ts

      // интегрируем угол
      angleRef.current += angVelRef.current * dt

      // нормализация угла, чтобы не раздувался
      if (Math.abs(angleRef.current) > 1e6) angleRef.current %= 360

      wheelImg.style.transform = `rotate(${angleRef.current}deg)`

      // экспоненциальное затухание скорости
      const decay = Math.exp(-SPIN_DECAY_PER_SEC * dt)
      angVelRef.current *= decay

      if (Math.abs(angVelRef.current) < SPIN_EPS_STOP) {
        angVelRef.current = 0
        spinRafRef.current = 0
        lastTsRef.current = 0
        return
      }
      spinRafRef.current = requestAnimationFrame(spinStep)
    }

    const ensureSpin = () => {
      if (!spinRafRef.current) {
        spinRafRef.current = requestAnimationFrame(spinStep)
      }
    }

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

    // ВНИМАНИЕ: скролл страницы НЕ перехватываем, только задаём инерцию вращения PNG
    const handleWheel = (e) => {
      if (!inViewportRef.current) return
      const deltaY = e.deltaY
      angVelRef.current = clamp(
        angVelRef.current + deltaY * SPIN_GAIN_DEG_PER_WHEEL,
        -SPIN_MAX_ABS_VEL,
        SPIN_MAX_ABS_VEL
      )
      ensureSpin()
      // никакого preventDefault/stopPropagation — нативный скролл везде
    }

    // passive:true — максимально производительно, и мы не блокируем скролл
    window.addEventListener('wheel', handleWheel, { passive: true })

    return () => {
      io.disconnect()
      window.removeEventListener('wheel', handleWheel)
      if (spinRafRef.current) cancelAnimationFrame(spinRafRef.current)
    }
  }, [])

  return (
    <section ref={sectionRef} id="intro" className="hero-section snap-section">
      <div className="container">
        <div className="hero-layout">
          {/* Текст слева */}
          <div className={`hero-content ${isVisible ? 'is-visible' : ''}`}>
            <div className="section-label">/ Введение</div>
            <h1 className="hero-title">
              <span className="title-line">Ускоряем развитие</span>
              <span className="title-line">бизнеса — на годы</span>
              <span className="title-line">вперёд.</span>
            </h1>
            <p className="hero-subtitle">
              Мы — команда профессионалов мирового класса, которая постоянно
              расширяет границы новых технологий.
            </p>
          </div>

          {/* PNG колесо справа */}
          <div className="hero-wheel-wrapper">
            <img
              ref={wheelImgRef}
              src="/wheel.png"
              alt="Wheel"
              className={`hero-wheel-img ${isVisible ? 'visible' : ''}`}
              draggable="false"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
