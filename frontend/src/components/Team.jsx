import React, { useEffect, useRef, useState, useMemo } from 'react'

// ============================================
// НАСТРОЙКИ АНИМАЦИЙ (можно легко изменить)
// ============================================
const ANIMATION_CONFIG = {
  PHOTO_TRANSITION_DURATION: 400,
  EXPERIENCE_TRANSITION_DURATION: 350,
  GRID_TRANSITION_DURATION: 500,
  CLICK_LOCK_DURATION: 400,
  EASING: 'cubic-bezier(0.4, 0, 0.2, 1)',
}

export default function Team() {
  const sectionRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const [lockedIndex, setLockedIndex] = useState(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [imagesLoaded, setImagesLoaded] = useState(false)

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
    { 
      name: 'Карпенко Богдан', 
      role: 'Product / UX-UI Designer', 
      photo: 'karpenko.webp',
      cropPosition: 0.35,
      exp: [
        '4+ года в продуктовом дизайне и UX-исследованиях',
        'Customer Journey Map, прототипирование в Figma',
        'Дизайн-системы, UI-киты, токены и компоненты',
        'Проводит JTBD-интервью, юзабилити-тесты, A/B'
      ]
    },
    { 
      name: 'Терентьев Андрей', 
      role: 'Tech Lead / Architect', 
      photo: 'terentev.webp',
      cropPosition: 0.5,
      exp: [
        '6+ лет: проектирование высоконагруженных систем',
        'Микросервисы, event-driven, CQRS/ES паттерны',
        'Code review, технические собеседования',
        'Безопасность: OAuth2/OIDC, шифрование, аудит'
      ]
    },
    { 
      name: 'Блохин Олег', 
      role: 'Platform Engineer (DevOps/SRE)', 
      photo: 'blokhin.webp',
      cropPosition: 0.55,
      exp: [
        '5+ лет опыта в DevOps и Site Reliability Engineering',
        'Kubernetes, Helm, GitOps (ArgoCD, Flux)',
        'CI/CD: GitHub Actions, GitLab, Jenkins',
        'Мониторинг: Prometheus, Grafana, Loki, Tempo'
      ]
    },
    { 
      name: 'Щербаков Андрей', 
      role: 'Frontend Engineer', 
      photo: 'shcherbakov.webp',
      cropPosition: 0.33,
      exp: [
        '4+ года во frontend-разработке',
        'React 18, TypeScript, Vite/Webpack',
        'Адаптивная верстка, pixel-perfect реализация',
        'Unit/Integration тесты: Vitest, Testing Library'
      ]
    },
    { 
      name: 'Воронов Егор', 
      role: 'Frontend Engineer (Senior)', 
      photo: 'voronov.webp',
      cropPosition: 0.65,
      exp: [
        '5+ лет: TypeScript, React, Next.js, SSR/SSG',
        'Core Web Vitals: LCP < 2.5s, CLS < 0.1, FID < 100ms',
        'WebGL/Canvas, Three.js, оптимизация рендера',
        'State management: Zustand, Redux Toolkit, Jotai'
      ]
    },
    { 
      name: 'Немировский Георгий', 
      role: 'Backend Engineer', 
      photo: 'nemirovskiy.webp',
      cropPosition: 0.5,
      exp: [
        '4+ года в backend-разработке',
        'Node.js/NestJS, TypeScript, микросервисы',
        'PostgreSQL, Redis, RabbitMQ, Kafka',
        'REST API, GraphQL, tRPC, интеграции с API'
      ]
    },
    { 
      name: 'Панов Дмитрий', 
      role: 'Account / Project Manager', 
      photo: 'panov.webp',
      cropPosition: 0.57,
      exp: [
        '5+ лет в управлении проектами',
        'Agile/Scrum, Kanban, планирование спринтов',
        'Коммуникация с клиентами, сбор требований',
        'Risk management, отчетность, post-mortem'
      ]
    },
    { 
      name: 'Живетьев Кирилл', 
      role: 'QA Engineer', 
      photo: 'zhivetev.webp',
      cropPosition: 0.4,
      exp: [
        '3+ года в тестировании и обеспечении качества',
        'E2E-тестирование: Playwright, Cypress',
        'API-тесты, нагрузочное тестирование (K6)',
        'Test plans, bug tracking, метрики качества'
      ]
    },
  ]

  // Предзагрузка всех изображений при монтировании
  useEffect(() => {
    let loadedCount = 0
    const totalImages = teamMembers.length + 1 // +1 для team.webp
    
    const checkAllLoaded = () => {
      loadedCount++
      if (loadedCount === totalImages) {
        setImagesLoaded(true)
      }
    }

    // Загружаем групповое фото
    const teamImg = new Image()
    teamImg.onload = checkAllLoaded
    teamImg.onerror = checkAllLoaded
    teamImg.src = '/team.webp'

    // Загружаем все фото членов команды
    teamMembers.forEach(member => {
      const img = new Image()
      img.onload = checkAllLoaded
      img.onerror = checkAllLoaded
      img.src = `/${member.photo}`
    })
  }, [])

  // Определяем активного пользователя
  const activeIndex = lockedIndex !== null ? lockedIndex : hoveredIndex
  const hasHover = activeIndex !== null
  const hovered = useMemo(
    () => (hasHover ? teamMembers[activeIndex] : null),
    [hasHover, activeIndex]
  )

  const handleMouseLeave = () => {
    if (lockedIndex === null && !isTransitioning) {
      setHoveredIndex(null)
    }
  }

  const handleMouseMove = (e, index) => {
    if (lockedIndex === null && !isTransitioning) {
      setHoveredIndex(index)
    }
  }

  const handleClick = (index) => {
    if (isTransitioning) return
    setIsTransitioning(true)
    if (lockedIndex === index) {
      setLockedIndex(null)
      setHoveredIndex(null)
    } else {
      setLockedIndex(index)
      setHoveredIndex(index)
    }
    setTimeout(() => setIsTransitioning(false), ANIMATION_CONFIG.CLICK_LOCK_DURATION)
  }

  const handleTitleClick = () => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setLockedIndex(null)
    setHoveredIndex(null)
    setTimeout(() => setIsTransitioning(false), ANIMATION_CONFIG.CLICK_LOCK_DURATION)
  }

  return (
    <section
      ref={sectionRef}
      id="team"
      className={`team-section snap-section ${isVisible ? 'is-visible' : ''}`}
    >
      <div className="container team-container">
        <div className="team-header">
          <div className="section-label fade-text">/ 04 / Команда</div>
          <h2
            className="section-title team-title fade-text"
            onClick={handleTitleClick}
            style={{ cursor: lockedIndex !== null ? 'pointer' : 'default' }}
          >
            Наша команда
          </h2>
        </div>

        <div 
          className={`team-layout ${hasHover ? 'has-hover' : ''}`}
          style={{
            transition: `grid-template-columns ${ANIMATION_CONFIG.GRID_TRANSITION_DURATION}ms ${ANIMATION_CONFIG.EASING}`
          }}
        >
          <div className="team-photo-large fade-text">
            {/* Групповое фото */}
            <img
              src="/team.webp"
              alt="Команда firma'"
              className="team-photo-img"
              style={{ 
                opacity: !hasHover ? 1 : 0,
                transition: `opacity ${ANIMATION_CONFIG.PHOTO_TRANSITION_DURATION}ms ${ANIMATION_CONFIG.EASING}`,
                objectFit: 'cover',
                objectPosition: 'center center'
              }}
              draggable="false"
            />

            {/* Фотографии всех членов команды */}
            {teamMembers.map((member, index) => (
              <img
                key={member.photo}
                src={`/${member.photo}`}
                alt={member.name}
                className="team-photo-img"
                style={{ 
                  opacity: hasHover && activeIndex === index ? 1 : 0,
                  transition: `opacity ${ANIMATION_CONFIG.PHOTO_TRANSITION_DURATION}ms ${ANIMATION_CONFIG.EASING}`,
                  objectFit: 'cover',
                  objectPosition: `${member.cropPosition * 100}% center`
                }}
                draggable="false"
              />
            ))}
            
            {/* Показываем overlay с "9 человек" ТОЛЬКО когда никто не выделен */}
            {!hasHover && (
              <div className="team-photo-overlay">
                <span className="team-count">{teamMembers.length} человек</span>
              </div>
            )}
          </div>

          <div 
            className={`team-experience fade-text`} 
            aria-hidden={!hasHover}
            style={{
              transition: `opacity ${ANIMATION_CONFIG.EXPERIENCE_TRANSITION_DURATION}ms ${ANIMATION_CONFIG.EASING}, 
                           transform ${ANIMATION_CONFIG.EXPERIENCE_TRANSITION_DURATION}ms ${ANIMATION_CONFIG.EASING}, 
                           padding ${ANIMATION_CONFIG.EXPERIENCE_TRANSITION_DURATION}ms ${ANIMATION_CONFIG.EASING}`
            }}
          >
            {hasHover && hovered && (
              <>
                <div className="team-exp-title">{hovered.name}</div>
                <div className="team-exp-role">{hovered.role}</div>
                <div className="team-exp-points">
                  {hovered.exp.map((line, i) => <div key={i}>• {line}</div>)}
                </div>
              </>
            )}
          </div>

          <div
            className="team-members-list fade-text"
            onMouseLeave={handleMouseLeave}
          >
            <ul className="team-names">
              {teamMembers.map((member, i) => (
                <li
                  key={i}
                  className={`team-member-item ${lockedIndex === i ? 'locked' : ''}`}
                  onMouseEnter={(e) => handleMouseMove(e, i)}
                  onMouseMove={(e) => handleMouseMove(e, i)}
                  onClick={() => handleClick(i)}
                  style={{ cursor: 'pointer' }}
                >
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