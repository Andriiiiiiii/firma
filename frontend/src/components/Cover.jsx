import React, { useState, useEffect, useRef } from 'react'
import CrystalLattice from './DotGrid.jsx'

const FIRST_VISIT_KEY = 'firma_first_visit'

export default function Cover({ isMobile }) {
  const [isVisible, setIsVisible] = useState(false)
  const [shouldPlayWave, setShouldPlayWave] = useState(true)
  const sectionRef = useRef(null)
  const hasCheckedVisit = useRef(false)
  const hasPlayedWave = useRef(false)

  // Проверяем первый визит для мобильных ОДИН РАЗ при монтировании
  useEffect(() => {
    if (hasCheckedVisit.current) return
    hasCheckedVisit.current = true
    
    if (isMobile) {
      // На мобильных: проверяем первый визит
      const isFirstVisit = !localStorage.getItem(FIRST_VISIT_KEY)
      
      if (isFirstVisit) {
        // Первый визит - будет начальная волна
        setShouldPlayWave(true)
        hasPlayedWave.current = false
        localStorage.setItem(FIRST_VISIT_KEY, 'true')
      } else {
        // Повторный визит - без начальной волны
        setShouldPlayWave(false)
        hasPlayedWave.current = true
      }
    } else {
      // На десктопе волна всегда запускается
      setShouldPlayWave(true)
      hasPlayedWave.current = false
    }
  }, [isMobile])

  // Отслеживаем видимость секции
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

  // Управляем воспроизведением волны
  useEffect(() => {
    if (!isVisible) return
    
    if (isMobile) {
      // На мобильных: волна играет только если не играла ранее и shouldPlayWave = true
      if (!hasPlayedWave.current && shouldPlayWave) {
        hasPlayedWave.current = true
      }
    } else {
      // На десктопе: волна играет при каждом появлении секции
      hasPlayedWave.current = false
    }
  }, [isVisible, isMobile, shouldPlayWave])

  // Определяем, нужно ли запускать волну для решетки
  const enableWaveForGrid = isMobile 
    ? (isVisible && shouldPlayWave && !hasPlayedWave.current) 
    : (isVisible && shouldPlayWave)

  return (
    <section ref={sectionRef} id="cover" className="cover snap-section">
      {/* Решетка показывается ВСЕГДА когда секция видима */}
      {isVisible ? (
        <div className="cover-background">
          <CrystalLattice enableInitialWave={enableWaveForGrid} />
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