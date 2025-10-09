import React from 'react'
export default function Hero() {
  return (
    <section className="hero snap-section" id="intro">
      <div className="container">
        <div className="section-label">/ Введение</div>
        <h1 className="hero-title">Ускоряем развитие<br/>бизнеса — на годы вперёд.</h1>
        <p className="hero-subtitle">
          Мы — команда профессионалов мирового класса, которая постоянно расширяет границы новых технологий.
        </p>
        <div className="starburst" aria-hidden>
          <svg viewBox="0 0 100 100">
            <g stroke="#e8e6e1" strokeWidth="0.5" fill="none">
              <line x1="50" y1="0" x2="50" y2="100"/>
              <line x1="0" y1="50" x2="100" y2="50"/>
              <line x1="15" y1="15" x2="85" y2="85"/>
              <line x1="85" y1="15" x2="15" y2="85"/>
              <line x1="30" y1="5" x2="70" y2="95"/>
              <line x1="70" y1="5" x2="30" y2="95"/>
              <line x1="5" y1="30" x2="95" y2="70"/>
              <line x1="95" y1="30" x2="5" y2="70"/>
              <line x1="7" y1="20" x2="93" y2="80"/>
              <line x1="93" y1="20" x2="7" y2="80"/>
              <line x1="20" y1="7" x2="80" y2="93"/>
              <line x1="80" y1="7" x2="20" y2="93"/>
            </g>
          </svg>
        </div>
      </div>
    </section>
  )
}
