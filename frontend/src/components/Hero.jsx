import { useEffect, useRef, useState } from 'react'

const APPEAR_RATIO = 0.6
const SPIN_GAIN = 0.9
const SPIN_DECAY = 3.0
const SPIN_MAX = 7200
const SPIN_STOP = 5

export default function Hero() {
  const sectionRef = useRef(null)
  const wheelImgRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const angleRef = useRef(0)
  const angVelRef = useRef(0)
  const spinRafRef = useRef(0)
  const lastTsRef = useRef(0)
  const inViewportRef = useRef(false)

  // Определяем мобильное устройство
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024 || 
                    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      setIsMobile(mobile)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const section = sectionRef.current
    const wheelImg = wheelImgRef.current
    if (!section || !wheelImg) return

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

    const spinStep = (ts) => {
      const prevTs = lastTsRef.current || ts
      const dt = Math.max(0, (ts - prevTs) / 1000)
      lastTsRef.current = ts

      angleRef.current += angVelRef.current * dt
      if (Math.abs(angleRef.current) > 1e6) angleRef.current %= 360

      wheelImg.style.transform = `rotate(${angleRef.current}deg)`

      const decay = Math.exp(-SPIN_DECAY * dt)
      angVelRef.current *= decay

      if (Math.abs(angVelRef.current) < SPIN_STOP) {
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

    const handleWheel = (e) => {
      if (!inViewportRef.current || isMobile) return
      const deltaY = e.deltaY
      angVelRef.current = clamp(
        angVelRef.current + deltaY * SPIN_GAIN,
        -SPIN_MAX,
        SPIN_MAX
      )
      ensureSpin()
    }

    const handleScroll = () => {
      if (!isMobile || !inViewportRef.current) return
      const scrollSpeed = Math.abs(window.scrollY - (lastScrollY || 0))
      lastScrollY = window.scrollY
      
      angVelRef.current = clamp(
        angVelRef.current + scrollSpeed * 2,
        -SPIN_MAX,
        SPIN_MAX
      )
      ensureSpin()
    }

    let lastScrollY = window.scrollY

    if (isMobile) {
      window.addEventListener('scroll', handleScroll, { passive: true })
    } else {
      window.addEventListener('wheel', handleWheel, { passive: true })
    }

    return () => {
      io.disconnect()
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('scroll', handleScroll)
      if (spinRafRef.current) cancelAnimationFrame(spinRafRef.current)
    }
  }, [isMobile])

  return (
    <section ref={sectionRef} id="intro" className="hero-section snap-section">
      <div className="container">
        <div className="hero-layout">
          <div className={`hero-content ${isVisible ? 'is-visible' : ''}`}>
            <div className="section-label">/ 02 / Введение</div>
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

          <div className="hero-wheel-wrapper">
            <img
              ref={wheelImgRef}
              src="/wheel.webp"
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