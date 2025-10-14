import React, { useState, useEffect, useRef } from 'react'
import CrystalLattice from './DotGrid.jsx'

export default function Cover() {
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting)
      },
      { threshold: 0.1 }
    )
    
    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }
    
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} id="cover" className="cover snap-section">
      {isVisible ? (
        <div className="cover-background">
          <CrystalLattice />
        </div>
      ) : (
        <div className="cover-background" style={{ background: '#000' }} />
      )}

      {/* Лого из public/logo.svg */}
      <div className="cover-logo">
        <img
          src="/logo.svg"
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