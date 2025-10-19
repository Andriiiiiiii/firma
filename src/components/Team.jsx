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

  // Текущая отображаемая фотография - всегда начинаем с фото команды
  const [currentPhoto, setCurrentPhoto] = useState('/team.webp')
  const [photoOpacity, setPhotoOpacity] = useState(1)
  
  // Ref для отслеживания желаемой фотографии (source of truth)
  const desiredPhotoRef = useRef('/team.webp')
  
  // Таймеры
  const transitionTimerRef = useRef(null)
  const fadeOutTimerRef = useRef(null)
  
  // Кэш для предзагруженных изображений
  const imageCache = useRef(new Map())
  
  // Флаг процесса смены фото
  const isChangingPhotoRef = useRef(false)

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
    { name: 'Карпенко Богдан', role: 'Fullstack разработчик', photo: 'karpenko.jpg',
      exp: [
        '5+ лет: Node.js, React, PostgreSQL, Redis, WebSocket',
        'Микросервисы с CQRS/ES, GraphQL Federation',
        'Оптимизация LCP до < 2.0s, cold-start контейнеров'
      ]},
    { name: 'Терентьев Андрей', role: 'Tech Lead', photo: 'terentev.jpg',
      exp: [
        '8+ лет: архитектура распределённых систем',
        'Kubernetes, Kafka, event-driven architecture',
        'Code review, tech interviews, team mentoring'
      ]},
    { name: 'Блохин Олег', role: 'ML Engineer', photo: 'blokhin.jpg',
      exp: [
        'CV/NLP модели: PyTorch → ONNX/TensorRT',
        'MLOps: DVC, Kubeflow, мониторинг метрик',
        'Онлайн-инференс < 40ms на GPU/CPU'
      ]},
    { name: 'Щербаков Андрей', role: 'UI/UX дизайнер', photo: 'shcherbakov.jpg',
      exp: [
        'Design System: токены, Figma Variables',
        'Исследования: JTBD, глубинные интервью, A/B',
        'Анимации, микровзаимодействия, доступность'
      ]},
    { name: 'Воронов Егор', role: 'Frontend разработчик', photo: 'voronov.jpg',
      exp: [
        'React/Vite, SSR/SSG, Zustand/RTK',
        'Оптимизация WebGL/Canvas, OffscreenCanvas, Workers',
        'Метрики: TBT, INP, CLS; профилирование Performance'
      ]},
    { name: 'Немировский Георгий', role: 'Backend разработчик', photo: 'nemirovskiy.jpg',
      exp: [
        'Golang/Java, gRPC, Kafka, ClickHouse',
        'p99 < 100ms, горизонтальное масштабирование',
        'OAuth2/OIDC, политики секретов/ротации'
      ]},
    { name: 'Панов Дмитрий', role: 'DevOps инженер', photo: 'panov.jpg',
      exp: [
        'K8s/Helm, GitOps (ArgoCD), IaC (Terraform)',
        'Observability: Prometheus, Loki, Tempo, SLO/SLI',
        'Zero-downtime релизы: canary/blue-green'
      ]},
    { name: 'Козлов Даниил', role: 'Product Manager', photo: 'kozlov.jpg',
      exp: [
        'Roadmap/Backlog, North Star/Activation/Retention',
        'Юнит-экономика, ценностные гипотезы, price-tests',
        'GTM запуск, когортный анализ, growth-циклы'
      ]},
    { name: 'Живетьев Кирилл', role: 'Data Scientist', photo: 'zhivetev.jpg',
      exp: [
        'Фичеинжиниринг, причинные модели, uplift-анализ',
        'Временные ряды: Prophet, SARIMAX, MLForecast',
        'Эксперименты: CUPED, sequential testing'
      ]},
  ]

  // Предзагрузка всех изображений при монтировании компонента
  useEffect(() => {
    const preloadImages = () => {
      // Предзагружаем групповое фото (приоритет!)
      const teamImg = new Image()
      teamImg.onload = () => {
        imageCache.current.set('/team.webp', true)
      }
      teamImg.src = '/team.webp'
      
      // Предзагружаем фото всех членов команды
      teamMembers.forEach(member => {
        const img = new Image()
        img.onload = () => {
          imageCache.current.set(`/${member.photo}`, true)
        }
        img.src = `/${member.photo}`
      })
    }
    
    preloadImages()
    
    return () => {
      // Очищаем все таймеры при размонтировании
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current)
      }
      if (fadeOutTimerRef.current) {
        clearTimeout(fadeOutTimerRef.current)
      }
    }
  }, [])

  // Определяем активного пользователя
  const activeIndex = lockedIndex !== null ? lockedIndex : hoveredIndex
  const hasHover = activeIndex !== null
  const hovered = useMemo(
    () => (hasHover ? teamMembers[activeIndex] : null),
    [hasHover, activeIndex]
  )

  // Универсальная функция безопасной отмены перехода (восстанавливает видимость)
  const cancelTransitionSafely = () => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current)
      transitionTimerRef.current = null
    }
    if (fadeOutTimerRef.current) {
      clearTimeout(fadeOutTimerRef.current)
      fadeOutTimerRef.current = null
    }
    isChangingPhotoRef.current = false
    // КРИТИЧЕСКО: если отменили — возвращаем непрозрачность,
    // чтобы не было «серого прямоугольника»
    setPhotoOpacity(1)
  }

  // Функция для смены фотографии с проверкой актуальности
  const changePhotoSafely = (targetPhotoSrc) => {
    // Если уже меняем фото или это та же фотография, выходим
    if (isChangingPhotoRef.current || currentPhoto === targetPhotoSrc) {
      return
    }

    // Отменяем все предыдущие операции
    cancelTransitionSafely()

    isChangingPhotoRef.current = true

    // Проверяем, загружено ли изображение
    const isImageCached = imageCache.current.has(targetPhotoSrc)
    
    if (isImageCached) {
      // Изображение загружено - делаем плавный переход
      setPhotoOpacity(0)
      
      fadeOutTimerRef.current = setTimeout(() => {
        // Финальная проверка перед сменой фото
        if (desiredPhotoRef.current === targetPhotoSrc) {
          setCurrentPhoto(targetPhotoSrc)
          
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // Еще одна проверка перед fade-in
              if (desiredPhotoRef.current === targetPhotoSrc) {
                setPhotoOpacity(1)
              } else {
                // Отменили по дороге — вернуть видимость текущего фото
                setPhotoOpacity(1)
              }
              isChangingPhotoRef.current = false
            })
          })
        } else {
          // Цель изменилась — отменяем и возвращаем видимость
          isChangingPhotoRef.current = false
          setPhotoOpacity(1)
        }
      }, ANIMATION_CONFIG.PHOTO_TRANSITION_DURATION)
    } else {
      // Изображение не в кэше - загружаем его
      const img = new Image()
      
      img.onload = () => {
        imageCache.current.set(targetPhotoSrc, true)
        
        // Проверяем актуальность после загрузки
        if (desiredPhotoRef.current === targetPhotoSrc) {
          // Плавно поменяем
          setPhotoOpacity(0)
          
          fadeOutTimerRef.current = setTimeout(() => {
            if (desiredPhotoRef.current === targetPhotoSrc) {
              setCurrentPhoto(targetPhotoSrc)
              
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  if (desiredPhotoRef.current === targetPhotoSrc) {
                    setPhotoOpacity(1)
                  } else {
                    // Отменили по дороге — вернуть видимость
                    setPhotoOpacity(1)
                  }
                  isChangingPhotoRef.current = false
                })
              })
            } else {
              // Пока грузили — цель сменилась
              isChangingPhotoRef.current = false
              setPhotoOpacity(1)
            }
          }, ANIMATION_CONFIG.PHOTO_TRANSITION_DURATION)
        } else {
          // Пока грузили — цель уже другая; просто выходим и восстанавливаем видимость
          isChangingPhotoRef.current = false
          setPhotoOpacity(1)
        }
      }
      
      img.onerror = () => {
        console.error(`Failed to load image: ${targetPhotoSrc}`)
        isChangingPhotoRef.current = false
        // Возвращаемся к групповому фото и гарантируем видимость
        if (targetPhotoSrc !== '/team.webp') {
          desiredPhotoRef.current = '/team.webp'
          setPhotoOpacity(1)
          changePhotoSafely('/team.webp')
        } else {
          setPhotoOpacity(1)
        }
      }
      
      img.src = targetPhotoSrc
    }
  }

  // Отслеживание изменения hover состояния - ОСНОВНАЯ ЛОГИКА
  useEffect(() => {
    // КРИТИЧЕСКИ ВАЖНО: Если никто не выделен (ни hover, ни lock), показываем фото команды
    let newDesiredPhoto
    
    if (!hasHover || !hovered) {
      // Никто не выделен - ВСЕГДА фото команды
      newDesiredPhoto = '/team.webp'
    } else {
      // Кто-то выделен - показываем его фото
      newDesiredPhoto = `/${hovered.photo}`
    }
    
    // Обновляем желаемую фотографию
    desiredPhotoRef.current = newDesiredPhoto
    
    // Если фото нужно сменить
    if (newDesiredPhoto !== currentPhoto) {
      changePhotoSafely(newDesiredPhoto)
    }
  }, [hasHover, hovered, currentPhoto])

  const handleMouseLeave = () => {
    if (lockedIndex === null && !isTransitioning) {
      setHoveredIndex(null)
      // Подстраховка: мгновенно возвращаем видимость
      setPhotoOpacity(1)
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
      // Разлочиваем - возвращаемся к фото команды
      setLockedIndex(null)
      setHoveredIndex(null)
    } else {
      // Лочим выбранного человека
      setLockedIndex(index)
      setHoveredIndex(index)
    }
    setTimeout(() => setIsTransitioning(false), ANIMATION_CONFIG.CLICK_LOCK_DURATION)
  }

  const handleTitleClick = () => {
    if (isTransitioning) return
    setIsTransitioning(true)
    // Сброс - возвращаемся к фото команды
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
            <img
              src={currentPhoto}
              alt={hasHover ? hovered?.name : "Команда firma'"}
              className="team-photo-img"
              style={{ 
                opacity: photoOpacity,
                transition: `opacity ${ANIMATION_CONFIG.PHOTO_TRANSITION_DURATION}ms ${ANIMATION_CONFIG.EASING}`
              }}
              draggable="false"
            />
            
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
