import React, { useEffect, useRef, useState } from 'react'

export default function About() {
  const sectionRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)
  const [hovered, setHovered] = useState(null) // 'fund' | 'eng' | 'inn' | null
  const [isMobile, setIsMobile] = useState(false)

  // Определяем мобильное устройство
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024 || 
                    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      setIsMobile(mobile)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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

  // Обработчик для мобильных (клик) и десктопа (hover)
  const handleInteraction = (type) => {
    if (isMobile) {
      // На мобильных: toggle при клике
      setHovered(prev => prev === type ? null : type)
    } else {
      // На десктопе: показываем при hover
      setHovered(type)
    }
  }

  return (
    <section
      ref={sectionRef}
      id="about"
      className={`about-section snap-section ${isVisible ? 'is-visible' : ''}`}
    >
      <div className="about-gradient-overlay"></div>

      <div className="container about-content-wrap">
        <div className="section-label fade-text fade-fast">/ О компании</div>
        <h2 className="section-title fade-text fade-fast">Наша миссия</h2>

        <div className="about-content">
          {/* ЛЕВО: быстрый показ + подмена на карточки при взаимодействии */}
          <div className="about-text fade-text fade-fast">
            <div className="about-swap">
              {/* Базовый текст */}
              <div className={`about-swap-inner ${hovered === null ? 'active' : ''}`}>
                <p>
                  Мы создаём цифровые решения, которые помогают бизнесу расти и
                  развиваться в современном мире. Наша команда состоит из опытных
                  разработчиков, дизайнеров и маркетологов, которые объединяют свои
                  знания для создания выдающихся проектов.
                </p>
                <br />
                <p>
                  Каждый проект для нас — это возможность применить новейшие
                  технологии и лучшие практики индустрии. Мы не просто создаём
                  сайты, мы создаём инструменты для достижения бизнес-целей.
                </p>
              </div>

              {/* Фундаментальный подход */}
              <div className={`about-swap-inner ${hovered === 'fund' ? 'active' : ''}`}>
                <div className="about-card">
                  <h4>Фундаментальный подход</h4>
                  <p>
                    Мы — выпускники МФТИ, воспитанные на «системе Физтеха», где фундаментальная
                    наука соединяется с инженерией и реальной исследовательской практикой.
                    Поэтому каждое решение опирается на проверяемые гипотезы, строгие модели
                    и воспроизводимые метрики качества.
                  </p>
                </div>
              </div>

              {/* Инженерная точность */}
              <div className={`about-swap-inner ${hovered === 'eng' ? 'active' : ''}`}>
                <div className="about-card">
                  <h4>Инженерная точность</h4>
                  <p>
                    В прошлом мы работали в ведущих научных организациях страны — в том числе
                    на базах национальных и государственных исследовательских центров. Этот опыт превратился в нашу дисциплину:
                    ясные спецификации, ревью и верификация, нагрузочные испытания и контроль
                    допусков на каждом этапе.
                  </p>
                </div>
              </div>

              {/* Инновационные решения */}
              <div className={`about-swap-inner ${hovered === 'inn' ? 'active' : ''}`}>
                <div className="about-card">
                  <h4>Инновационные решения</h4>
                  <p>
                    Мы переносим в продукты культуру R&amp;D Физтеха: быстро прототипируем,
                    тестируем и доводим технологии до практического эффекта — от современных
                    веб-стеков до ML и сложной интеграции. МФТИ стабильно входит в топ мировых
                    рейтингов по физике и известен Нобелевскими традициями — планка качества
                    для нас задана высоко.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ПРАВО: появляется с задержкой; взаимодействие управляет левым контентом */}
          <div 
            className="stats fade-text fade-delayed"
            onMouseLeave={() => !isMobile && setHovered(null)}
          >
            <div 
              className="stat-item" 
              onMouseEnter={() => !isMobile && handleInteraction('fund')}
              onClick={() => isMobile && handleInteraction('fund')}
              style={{ cursor: isMobile ? 'pointer' : 'default' }}
            >
              <div className="stat-line"></div>
              <div className="stat-label">Фундаментальный подход</div>
            </div>
            <div 
              className="stat-item" 
              onMouseEnter={() => !isMobile && handleInteraction('eng')}
              onClick={() => isMobile && handleInteraction('eng')}
              style={{ cursor: isMobile ? 'pointer' : 'default' }}
            >
              <div className="stat-line"></div>
              <div className="stat-label">Инженерная точность</div>
            </div>
            <div 
              className="stat-item" 
              onMouseEnter={() => !isMobile && handleInteraction('inn')}
              onClick={() => isMobile && handleInteraction('inn')}
              style={{ cursor: isMobile ? 'pointer' : 'default' }}
            >
              <div className="stat-line"></div>
              <div className="stat-label">Инновационные решения</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}