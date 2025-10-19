import React, { useEffect, useRef, useState } from 'react'

export default function About() {
  const sectionRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)
  const [selectedType, setSelectedType] = useState(null)
  const [lockedType, setLockedType] = useState(null)
  const [isMobile, setIsMobile] = useState(false)

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

  const handleMouseEnter = (type) => {
    if (!isMobile && lockedType === null) {
      setSelectedType(type)
    }
  }

  const handleMouseLeave = () => {
    if (!isMobile && lockedType === null) {
      setSelectedType(null)
    }
  }

  const handleStatClick = (type, e) => {
    e.stopPropagation()
    if (lockedType === type) {
      setLockedType(null)
      setSelectedType(null)
    } else {
      setLockedType(type)
      setSelectedType(type)
    }
  }

  const handleTitleClick = () => {
    setLockedType(null)
    setSelectedType(null)
  }

  const handleBackgroundClick = (e) => {
    if (e.target === e.currentTarget || e.target.classList.contains('about-text')) {
      setLockedType(null)
      setSelectedType(null)
    }
  }

  const activeType = lockedType !== null ? lockedType : selectedType

  return (
    <section
      ref={sectionRef}
      id="about"
      className={`about-section snap-section ${isVisible ? 'is-visible' : ''}`}
      onClick={handleBackgroundClick}
    >
      <div className="container about-content-wrap">
        <div className="section-label fade-text fade-fast">/ 05 / О компании</div>
        <h2 
          className="section-title fade-text fade-fast"
          onClick={handleTitleClick}
          style={{ cursor: lockedType !== null ? 'pointer' : 'default' }}
        >
          Наша миссия
        </h2>

        <div className="about-content">
          <div 
            className="about-text fade-text fade-fast"
            onClick={handleBackgroundClick}
          >
            <div className="about-swap">
              <div className={`about-swap-inner ${activeType === null ? 'active' : ''}`}>
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

              <div className={`about-swap-inner ${activeType === 'fund' ? 'active' : ''}`}>
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

              <div className={`about-swap-inner ${activeType === 'eng' ? 'active' : ''}`}>
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

              <div className={`about-swap-inner ${activeType === 'inn' ? 'active' : ''}`}>
                <div className="about-card">
                  <h4>Инновационные решения</h4>
                  <p>
                    Мы переносим в продукты культуру R&amp;D Физтеха: быстро прототипируем,
                    тестируем и доводим технологии до практического эффекта — от современных
                    веб-стеков до ML и сложной интеграции. МФТИ входит в топ мировых
                    рейтингов по физике — планка качества для нас задана высоко.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div 
            className="stats fade-text fade-delayed"
            onMouseLeave={handleMouseLeave}
          >
            <div 
              className={`stat-item ${activeType === 'fund' ? 'active' : ''}`}
              onMouseEnter={() => handleMouseEnter('fund')}
              onClick={(e) => handleStatClick('fund', e)}
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-line"></div>
              <div className="stat-label">Фундаментальный подход</div>
            </div>
            <div 
              className={`stat-item ${activeType === 'eng' ? 'active' : ''}`}
              onMouseEnter={() => handleMouseEnter('eng')}
              onClick={(e) => handleStatClick('eng', e)}
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-line"></div>
              <div className="stat-label">Инженерная точность</div>
            </div>
            <div 
              className={`stat-item ${activeType === 'inn' ? 'active' : ''}`}
              onMouseEnter={() => handleMouseEnter('inn')}
              onClick={(e) => handleStatClick('inn', e)}
              style={{ cursor: 'pointer' }}
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