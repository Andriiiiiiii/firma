import React, { useEffect, useRef, useState } from 'react'

export default function Team() {
  const sectionRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting && entry.intersectionRatio >= 0.5)
      },
      { threshold: [0, 0.5, 1] }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const members = [
    { 
      role: 'Frontend', 
      name: 'Анна Сергеева', 
      desc: 'Инженер интерфейсов. Любит минимализм, типографику и аккуратные сетки.', 
      tags: ['React', 'Vite', 'Accessibility'] 
    },
    { 
      role: 'Backend',  
      name: 'Иван Петров',   
      desc: 'Проектирует надёжные API и масштабируемую архитектуру под высокую нагрузку.', 
      tags: ['Node.js', 'PostgreSQL', 'gRPC'] 
    },
    { 
      role: 'Design',   
      name: 'Мария Ким',     
      desc: 'Отвечает за визуальный язык, прототипы и систему компонентов.',           
      tags: ['UI Kit', 'Motion', 'Figma'] 
    },
    { 
      role: 'PM',       
      name: 'Дмитрий Орлов', 
      desc: 'Ведёт проекты от пресейла до запуска. Синхронизирует команду и цели.',     
      tags: ['Agile', 'Roadmap', 'QA'] 
    }
  ]

  return (
    <section 
      ref={sectionRef}
      id="team" 
      className={`team-section snap-section ${isVisible ? 'is-visible' : ''}`}
    >
      <div className="container">
        <div className="section-label">/ Команда</div>
        <h2 className="section-title">Наша команда</h2>
        
        <div className="team-grid">
          {members.map((member, i) => (
            <div className="team-card fade-text" key={i}>
              <div className="team-photo" aria-hidden="true" />
              <div className="team-role">{member.role}</div>
              <h3 className="team-name">{member.name}</h3>
              <p className="team-description">{member.desc}</p>
              <div className="team-tags">
                {member.tags.map((tag) => (
                  <span className="tag" key={tag}>{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}