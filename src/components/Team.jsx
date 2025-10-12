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
    { name: 'Карпенко Богдан', role: 'Fullstack разработчик' },
    { name: 'Блохин Олег', role: 'ML Engineer' },
    { name: 'Щербаков Андрей', role: 'UI/UX дизайнер' },
    { name: 'Воронов Егор', role: 'Frontend разработчик' },
    { name: 'Немировский Георгий', role: 'Backend разработчик' },
    { name: 'Панов Дмитрий', role: 'DevOps инженер' },
    { name: 'Козлов Даниил', role: 'Product Manager' },
    { name: 'Живетьев Кирилл', role: 'Data Scientist' }
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
          {/* Фото команды */}
          <div className="team-photo-large">
            <img 
              src="/team.webp" 
              alt="Команда firma'" 
              className="team-photo-img"
            />
            <div className="team-photo-overlay">
              <span className="team-count">{teamMembers.length} человек</span>
            </div>
          </div>

          {/* Список участников команды */}
          <div className="team-members-list">
            <h3 className="team-members-title">Участники</h3>
            <ul className="team-names">
              {teamMembers.map((member, i) => (
                <li key={i} className="team-member-item">
                  <span className="member-number">{String(i + 1).padStart(2, '0')}</span>
                  <div className="member-info">
                    <span className="member-name">{member.name}</span>
                    <span className="member-role">{member.role}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}