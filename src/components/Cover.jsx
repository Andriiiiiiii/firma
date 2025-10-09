import React, { useRef } from 'react'
import DotGrid from './DotGrid.jsx'
import logoUrl from '../assets/logo.svg'

export default function Cover() {
  const sectionRef = useRef(null)

  return (
    <section id="cover" className="cover snap-section" ref={sectionRef}>
      <div className="cover-inner">
        <DotGrid attachTo={sectionRef} />
        <div className="cover-logo">
          <img src={logoUrl} alt="WebFlow Solutions" />
        </div>
        <div className="container" aria-hidden />
      </div>
    </section>
  )
}
