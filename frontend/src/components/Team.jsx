import React, { useEffect, useRef, useState, useMemo } from 'react'

const ANIMATION_CONFIG = {
  PHOTO_TRANSITION_DURATION: 400,
  EXPERIENCE_TRANSITION_DURATION: 350,
  GRID_TRANSITION_DURATION: 500,
  CLICK_LOCK_DURATION: 400,
  EASING: 'cubic-bezier(0.4, 0, 0.2, 1)',
}

export default function Team() {
  const sectionRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const [lockedIndex, setLockedIndex] = useState(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [imagesLoaded, setImagesLoaded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)

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

  useEffect(() => {
    const checkMobile = () => {
      const mobile =
        window.innerWidth < 1024 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        )
      setIsMobile(mobile)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
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

  useEffect(() => {
    let loadedCount = 0
    const totalImages = teamMembers.length + 1
    const checkAllLoaded = () => {
      loadedCount++
      if (loadedCount === totalImages) setImagesLoaded(true)
    }

    const teamImg = new Image()
    teamImg.onload = checkAllLoaded
    teamImg.onerror = checkAllLoaded
    teamImg.src = '/team.webp'

    teamMembers.forEach(member => {
      const img = new Image()
      img.onload = checkAllLoaded
      img.onerror = checkAllLoaded
      img.src = `/${member.photo}`
    })
  }, [])

  const activeIndex = lockedIndex !== null ? lockedIndex : hoveredIndex
  const hasHover = activeIndex !== null
  const hovered = useMemo(
    () => (hasHover ? teamMembers[activeIndex] : null),
    [hasHover, activeIndex]
  )

  // ИСПРАВЛЕНО: Отключаем hover на мобильных полностью
  const handleMouseLeave = () => {
    if (!isMobile && lockedIndex === null && !isTransitioning) {
      setHoveredIndex(null)
    }
  }
  
  const handleMouseMove = (_e, index) => {
    if (!isMobile && lockedIndex === null && !isTransitioning) {
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

  const ITEMS_PER_PAGE = 3
  const totalPages = Math.ceil(teamMembers.length / ITEMS_PER_PAGE)

  const handleNext = () => {
    if (currentSlide < totalPages - 1) {
      const next = currentSlide + 1
      setCurrentSlide(next)
      scrollToSlide(next)
    }
  }
  
  const handlePrev = () => {
    if (currentSlide > 0) {
      const prev = currentSlide - 1
      setCurrentSlide(prev)
      scrollToSlide(prev)
    }
  }
  
  const scrollToSlide = (slideIndex) => {
    if (!scrollContainerRef.current) return
    const container = scrollContainerRef.current
    const itemWidthAvg = container.scrollWidth / teamMembers.length
    const scrollPosition = slideIndex * ITEMS_PER_PAGE * itemWidthAvg
    container.scrollTo({ left: scrollPosition, behavior: 'smooth' })
  }

  useEffect(() => {
    if (!isMobile || !scrollContainerRef.current) return
    const container = scrollContainerRef.current
    let scrollTimeout
    const handleScroll = () => {
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        const scrollLeft = container.scrollLeft
        const itemWidth = container.scrollWidth / teamMembers.length
        const newSlide = Math.round(scrollLeft / (ITEMS_PER_PAGE * itemWidth))
        setCurrentSlide(Math.min(newSlide, totalPages - 1))
      }, 150)
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimeout)
    }
  }, [isMobile, teamMembers.length, totalPages])

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
            <img
              src="/team.webp"
              alt="Команда firma'"
              className="team-photo-img"
              style={{ 
                opacity: !hasHover ? 1 : 0,
                transition: isMobile ? 'none' : `opacity ${ANIMATION_CONFIG.PHOTO_TRANSITION_DURATION}ms ${ANIMATION_CONFIG.EASING}`,
                objectFit: 'cover',
                objectPosition: 'center center'
              }}
              draggable="false"
            />

            {teamMembers.map((member, index) => (
              <img
                key={member.photo}
                src={`/${member.photo}`}
                alt={member.name}
                className="team-photo-img"
                style={{ 
                  opacity: hasHover && activeIndex === index ? 1 : 0,
                  transition: isMobile ? 'none' : `opacity ${ANIMATION_CONFIG.PHOTO_TRANSITION_DURATION}ms ${ANIMATION_CONFIG.EASING}`,
                  objectFit: 'cover',
                  objectPosition: `${member.cropPosition * 100}% center`
                }}
                draggable="false"
              />
            ))}
            
            {!hasHover && (
              <div className="team-photo-overlay">
                <span className="team-count">{teamMembers.length} человек</span>
              </div>
            )}
          </div>

          <div 
            className="team-experience fade-text" 
            aria-hidden={!hasHover}
            style={{
              transition: isMobile ? 'none' : `opacity ${ANIMATION_CONFIG.EXPERIENCE_TRANSITION_DURATION}ms ${ANIMATION_CONFIG.EASING}, 
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

          <div className="team-members-list fade-text">
            {isMobile && (
              <div className="team-mobile-navigation">
                <button 
                  className="team-nav-button team-nav-prev"
                  onClick={handlePrev}
                  disabled={currentSlide === 0}
                  aria-label="Предыдущие"
                  style={{ touchAction: 'manipulation' }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                
                <div className="team-pagination">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      className={`team-pagination-dot ${i === currentSlide ? 'active' : ''}`}
                      onClick={() => {
                        setCurrentSlide(i)
                        scrollToSlide(i)
                      }}
                      aria-label={`Страница ${i + 1}`}
                      style={{ touchAction: 'manipulation' }}
                    />
                  ))}
                </div>

                <button 
                  className="team-nav-button team-nav-next"
                  onClick={handleNext}
                  disabled={currentSlide === totalPages - 1}
                  aria-label="Следующие"
                  style={{ touchAction: 'manipulation' }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            )}

            <div 
              ref={scrollContainerRef}
              className={`team-names-wrapper ${isMobile ? 'mobile-scroll' : ''}`}
              onMouseLeave={isMobile ? undefined : handleMouseLeave}
            >
              <ul className="team-names">
                {teamMembers.map((member, i) => (
                  <li
                    key={i}
                    className={`team-member-item ${lockedIndex === i ? 'locked' : ''}`}
                    onMouseEnter={isMobile ? undefined : (e) => handleMouseMove(e, i)}
                    onMouseMove={isMobile ? undefined : (e) => handleMouseMove(e, i)}
                    onClick={() => handleClick(i)}
                    style={{ 
                      cursor: 'pointer',
                      touchAction: 'manipulation'
                    }}
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
      </div>
    </section>
  )
}