import React, { useEffect, useRef, useState } from 'react'

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

  const teamMembers = [
    'Анна Сергеева',
    'Иван Петров',
    'Мария Ким',
    'Дмитрий Орлов',
    'Елена Волкова',
    'Алексей Соколов',
    'Ольга Морозова',
    'Сергей Новиков',
    'Татьяна Лебедева',
    'Михаил Козлов'
  ]

  return (
    <section
      ref={sectionRef}
      id="team"
      className="team-section snap-section"
    >
      <div className="container team-container">
        <div className="team-header">
          <div className="section-label">/ Команда</div>
          <h2 className="section-title team-title">Наша команда</h2>
        </div>

        <div className="team-layout">
          {/* Большое общее фото команды */}
          <div className="team-photo-large" aria-hidden="true">
            <div className="team-photo-overlay">
              <span className="team-count">{teamMembers.length} человек</span>
            </div>
          </div>

          {/* Список участников команды */}
          <div className="team-members-list">
            <h3 className="team-members-title">Участники</h3>
            <ul className="team-names">
              {teamMembers.map((name, i) => (
                <li key={i} className="team-member-name">
                  <span className="member-number">{String(i + 1).padStart(2, '0')}</span>
                  <span className="member-name">{name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}