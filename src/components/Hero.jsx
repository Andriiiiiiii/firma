import React from 'react'

/**
 * progress — общий прогресс входа секции (0..1)
 * spin     — локальный прогресс прокрутки внутри секции (0..1 на один экран)
 * textDelay — задержка появления текста (доля 0..1). По умолчанию 0.15
 * turns    — обороты wheel.png за «пролёт» секции (по умолчанию 1)
 */
export default function Hero({ progress = 0, spin = 0, textDelay = 0.15, turns = 3 }) {
  const clamp01 = (v) => Math.max(0, Math.min(1, v))
  const p = clamp01(progress)
  const s = clamp01(spin)

  // откладываем старт появления текста
  const delayed = clamp01((p - textDelay) / Math.max(0.0001, 1 - textDelay))
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)
  const o = easeOutCubic(delayed)
  const ty = (1 - o) * 26
  const angle = s * 360 * turns

  return (
    <section
      className="page-section hero"
      id="intro"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background: '#000',
        color: '#e8e6e1',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        className="container"
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 clamp(20px, 6vw, 80px)',
          opacity: o,
          transform: `translateY(${ty}px)`,
          willChange: 'opacity, transform',
        }}
      >
        <div
          className="section-label"
          style={{
            color: '#9c9b97',
            fontSize: 14,
            letterSpacing: '0.1em',
            marginBottom: 20,
            userSelect: 'none',
          }}
        >
          / Введение
        </div>

        <h1
          className="hero-title"
          style={{
            fontSize: 'clamp(32px, 6vw, 68px)',
            lineHeight: 1.05,
            margin: 0,
            color: '#f2f2f2',
          }}
        >
          Ускоряем развитие<br />бизнеса — на годы вперёд.
        </h1>

        <p
          className="hero-subtitle"
          style={{
            marginTop: 20,
            maxWidth: 780,
            fontSize: 'clamp(16px, 2.2vw, 22px)',
            lineHeight: 1.5,
            color: '#cfcfcf',
          }}
        >
          Мы — команда профессионалов мирового класса, которая постоянно расширяет границы новых технологий.
        </p>
      </div>

      {/* вращающееся колесо */}
      <div
        className="hero-wheel"
        aria-hidden
        style={{
          position: 'absolute',
          right: 'clamp(20px, 6vw, 100px)',
          bottom: 'clamp(20px, 6vw, 90px)',
          width: 'clamp(90px, 12vw, 180px)',
          height: 'auto',
          opacity: Math.max(0, Math.min(1, 0.85 * o)),
          transform: `rotate(${angle}deg)`,
          transformOrigin: '50% 50%',
          willChange: 'transform',
          pointerEvents: 'none',
          filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.4))',
        }}
      >
        <img
          src="/wheel.png"
          alt=""
          decoding="async"
          fetchpriority="high"
          style={{ display: 'block', width: '100%', height: 'auto' }}
        />
      </div>
    </section>
  )
}
