import React, { useState, useEffect } from 'react'
import CrystalLattice from './DotGrid.jsx'

export default function Cover() {
  const [showAnimation, setShowAnimation] = useState(true)

  useEffect(() => {
    const checkDevice = () => {
      const isMobile = window.innerWidth < 1024 || 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      setShowAnimation(!isMobile)
    }
    checkDevice()
    const handleResize = () => checkDevice()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <section id="cover" className="cover snap-section">
      {showAnimation ? (
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
