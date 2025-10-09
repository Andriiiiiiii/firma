import React from 'react'
import CrystalLattice from './DotGrid.jsx' // модель не трогаем

export default function Cover({ progress = 1 }) {
  return (
    <section
      id="cover"
      className="page-section cover"
      style={{
        position: 'relative',
        height: '100vh',
        overflow: 'hidden',
        background: '#000',
      }}
    >
      {/* Решётка */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <CrystalLattice />
      </div>

      {/* Подпись внизу слева */}
      <div
        style={{
          position: 'absolute',
          left: 'clamp(16px, 3vw, 40px)',
          bottom: 'clamp(16px, 3vw, 40px)',
          color: '#c7c7c7',
          fontSize: 14,
          letterSpacing: '0.06em',
          userSelect: 'none',
          pointerEvents: 'none',
          opacity: 0.75,
        }}
      >
        <span>/ 01</span>&nbsp;&nbsp;<span>/ Digital Agency</span>
      </div>
    </section>
  )
}
