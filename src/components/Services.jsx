import React from 'react'
export default function Services() {
  return (
    <section id="services" className="services snap-section">
      <div className="container">
        <div className="section-label">/ Наши услуги</div>
        <div className="services-grid">
          {[
            { n: '01', t: 'Разработка сайтов', d: 'Создаём современные веб-сайты с уникальным дизайном и безупречной функциональностью для вашего бизнеса.' },
            { n: '02', t: 'Лендинг пейджи', d: 'Разрабатываем целевые страницы с высокой конверсией для ваших маркетинговых кампаний и продуктов.' },
            { n: '03', t: 'Интернет-магазины', d: 'Создаём функциональные e-commerce решения с удобными системами оплаты и управления товарами.' },
            { n: '04', t: 'Веб-приложения', d: 'Разрабатываем сложные веб-приложения и SaaS-платформы с интуитивным интерфейсом.' },
            { n: '05', t: 'UI/UX дизайн', d: 'Проектируем пользовательские интерфейсы, которые радуют глаз и обеспечивают отличный опыт использования.' },
            { n: '06', t: 'Поддержка и развитие', d: 'Обеспечиваем техническую поддержку, обновления и развитие ваших веб-проектов.' }
          ].map((s) => (
            <div className="service-card" key={s.n}>
              <div className="service-number">{s.n}</div>
              <h3 className="service-title">{s.t}</h3>
              <p className="service-description">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
