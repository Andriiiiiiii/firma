import React from 'react'
export default function About() {
  return (
    <section id="about" className="about snap-section">
      <div className="container">
        <div className="section-label">/ О компании</div>
        <h2 className="section-title">Наша миссия</h2>
        <div className="about-content">
          <div className="about-text">
            <p>Мы создаём цифровые решения, которые помогают бизнесу расти и развиваться в современном мире. Наша команда состоит из опытных разработчиков, дизайнеров и маркетологов, которые объединяют свои знания для создания выдающихся проектов.</p>
            <br />
            <p>Каждый проект для нас — это возможность применить новейшие технологии и лучшие практики индустрии. Мы не просто создаём сайты, мы создаём инструменты для достижения бизнес-целей.</p>
          </div>
          <div className="stats">
            <div className="stat-item"><div className="stat-number">200+</div><div className="stat-label">Реализованных проектов</div></div>
            <div className="stat-item"><div className="stat-number">50+</div><div className="stat-label">Довольных клиентов</div></div>
            <div className="stat-item"><div className="stat-number">8</div><div className="stat-label">Лет на рынке</div></div>
          </div>
        </div>
      </div>
    </section>
  )
}
