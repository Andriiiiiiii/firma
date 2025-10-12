import React, { useEffect, useRef, useState } from 'react'

export default function Services() {
  const sectionRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting && entry.intersectionRatio >= 0.5)
      },
      { threshold: [0, 0.5, 1] }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  const services = [
    { n: '01', t: 'Разработка сайтов', d: 'Создаём современные веб-сайты с уникальным дизайном и безупречной функциональностью для вашего бизнеса.' },
    { n: '02', t: 'Лендинг пейджи', d: 'Разрабатываем целевые страницы с высокой конверсией для ваших маркетинговых кампаний и продуктов.' },
    { n: '03', t: 'Интернет-магазины', d: 'Создаём функциональные e-commerce решения с удобными системами оплаты и управления товарами.' },
    { n: '04', t: 'Веб-приложения', d: 'Разрабатываем сложные веб-приложения и SaaS-платформы с интуитивным интерфейсом.' },
    { n: '05', t: 'UI/UX дизайн', d: 'Проектируем пользовательские интерфейсы, которые радуют глаз и обеспечивают отличный опыт использования.' },
    { n: '06', t: 'Поддержка и развитие', d: 'Обеспечиваем техническую поддержку, обновления и развитие ваших веб-проектов.' }
  ]

  return (
    <section
      ref={sectionRef}
      id="services"
      className="services-section snap-section"
      style={{ position: 'relative', overflow: 'hidden', background: '#1a1a1a' }}
    >
      {/* Контент без фоновой анимации */}
      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-label">/ Наши услуги</div>
        <h2 className="section-title">Что мы делаем</h2>

        <div className="services-grid">
          {services.map((service) => (
            <div className="service-card" key={service.n}>
              <div className="service-number">{service.n}</div>
              <h3 className="service-title">{service.t}</h3>
              <p className="service-description">{service.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}