import React, { useState, useEffect, useRef } from 'react'
import CrystalLattice from './DotGrid.jsx'

const FIRST_VISIT_KEY = 'firma_first_visit'

export default function Cover({ isMobile }) {
  const [isVisible, setIsVisible] = useState(false)
  const [shouldAnimate, setShouldAnimate] = useState(true)
  const sectionRef = useRef(null)
  const hasCheckedVisit = useRef(false)

  // Проверяем первый визит для мобильных
  useEffect(() => {
    if (!isMobile || hasCheckedVisit.current) return
    
    hasCheckedVisit.current = true
    
    const isFirstVisit = !localStorage.getItem(FIRST_VISIT_KEY)
    
    if (isFirstVisit) {
      // Первый визит - будет анимация
      setShouldAnimate(true)
      localStorage.setItem(FIRST_VISIT_KEY, 'true')
    } else {
      // Повторный визит - без анимации
      setShouldAnimate(false)
    }
  }, [isMobile])

  // На десктопе анимация всегда работает
  useEffect(() => {
    if (!isMobile) {
      setShouldAnimate(true)
    }
  }, [isMobile])

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
      },
      { threshold: 0.1 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} id="cover" className="cover snap-section">
      {/* Показываем анимацию только если нужно */}
      {isVisible && shouldAnimate ? (
        <div className="cover-background">
          <CrystalLattice />
        </div>
      ) : (
        <div className="cover-background" style={{ background: '#000' }} />
      )}

      <div className="cover-logo">
        <img
          src="/logo.webp"
          alt="firma' logo"
          className="cover-logo-img"
          draggable="false"
        />
      </div>

      <div className="cover-caption">
        <span>/ 01</span>&nbsp;&nbsp;<span>/ Digital Agency</span>
      </div>
    </section>
  )
}