import React, { useEffect, useRef, useState } from 'react'
import TurbulenceBackground from './TurbulenceBackground.jsx'

export default function Team() {
  const sectionRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting && entry.intersectionRatio >= 0.3)
      },
      { threshold: [0, 0.3, 0.5, 1] }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  const members = [
    { role: 'Frontend', name: 'Анна Сергеева',
      desc: 'Инженер интерфейсов. Любит минимализм, типографику и аккуратные сетки.',
      tags: ['React', 'Vite', 'Accessibility'] },
    { role: 'Backend', name: 'Иван Петров',
      desc: 'Проектирует надёжные API и масштабируемую архитектуру под высокую нагрузку.',
      tags: ['Node.js', 'PostgreSQL', 'gRPC'] },
    { role: 'Design', name: 'Мария Ким',
      desc: 'Отвечает за визуальный язык, прототипы и систему компонентов.',
      tags: ['UI Kit', 'Motion', 'Figma'] },
    { role: 'PM', name: 'Дмитрий Орлов',
      desc: 'Ведёт проекты от пресейла до запуска. Синхронизирует команду и цели.',
      tags: ['Agile', 'Roadmap', 'QA'] },
  ]

  return (
    <section
      ref={sectionRef}
      id="team"
      className={`team-section snap-section ${isVisible ? 'is-visible' : ''}`}
      style={{
        position: 'relative',
        background: '#000',
        color: '#e8e6e1',
        overflow: 'hidden',
      }}
    >
      {/* Интерактивный фон */}
      <TurbulenceBackground
        active={isVisible}
        // Можно тонко настроить поведение под железо/дизайн:
        // speedThreshold={1300}
        // particlesPerBurst={90}
        // burstRadius={24}
        // curlAmp={950}
        // drag={0.986}
        // strokeAlpha={0.12}
        // fadeRate={0.2}
        // maxParticles={3200}
        // quality={0.9}
      />

      {/* Контент поверх */}
      <div className="container" style={{ position: 'relative', zIndex: 1, pointerEvents: 'none' }}>
        <div className="section-label" style={{ opacity: 1, pointerEvents: 'auto' }}>/ Команда</div>
        <h2 className="section-title" style={{ opacity: 1, pointerEvents: 'auto' }}>Наша команда</h2>

        <div className="team-grid" style={{ opacity: 1, pointerEvents: 'auto' }}>
          {members.map((m, i) => (
            <div
              className={`team-card ${isVisible ? 'fade-text' : ''}`}
              key={i}
              style={{
                opacity: isVisible ? undefined : 1,
                transform: isVisible ? undefined : 'translateY(0)'
              }}
            >
              <div className="team-photo" aria-hidden="true" />
              <div className="team-role">{m.role}</div>
              <h3 className="team-name">{m.name}</h3>
              <p className="team-description">{m.desc}</p>
              <div className="team-tags">
                {m.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
