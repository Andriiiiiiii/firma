import React from 'react'
export default function Team() {
  const members = [
    { role: 'Frontend', name: 'Анна Сергеева', desc: 'Инженер интерфейсов. Любит минимализм, типографику и аккуратные сетки.', tags: ['React', 'Vite', 'Accessibility'] },
    { role: 'Backend',  name: 'Иван Петров',   desc: 'Проектирует надёжные API и масштабируемую архитектуру под высокую нагрузку.', tags: ['Node.js', 'PostgreSQL', 'gRPC'] },
    { role: 'Design',   name: 'Мария Ким',     desc: 'Отвечает за визуальный язык, прототипы и систему компонентов.',           tags: ['UI Kit', 'Motion', 'Figma'] },
    { role: 'PM',       name: 'Дмитрий Орлов', desc: 'Ведёт проекты от пресейла до запуска. Синхронизирует команду и цели.',     tags: ['Agile', 'Roadmap', 'QA'] }
  ]
  return (
    <section id="team" className="team snap-section">
      <div className="container">
        <div className="section-label">/ Команда</div>
        <h2 className="section-title">Наша команда</h2>
        <div className="landings-grid">
          {members.map((m, i) => (
            <div className="landing-card" key={i}>
              <div className="team-photo" aria-hidden />
              <div className="landing-type">{m.role}</div>
              <h3 className="landing-name team-name">{m.name}</h3>
              <p className="landing-description">{m.desc}</p>
              <div className="landing-features">
                {m.tags.map((t) => <span className="feature-tag" key={t}>{t}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
