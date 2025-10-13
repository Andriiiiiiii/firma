import React, { useEffect, useRef, useState, useMemo } from 'react'

export default function Team() {
  const sectionRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState(null)

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

  const hasHover = hoveredIndex !== null
  const hovered = useMemo(
    () => (hasHover ? teamMembers[hoveredIndex] : null),
    [hasHover, hoveredIndex, teamMembers]
  )

  return (
    <section
      ref={sectionRef}
      id="team"
      className={`team-section snap-section ${isVisible ? 'is-visible' : ''}`}
    >
      <div className="container team-container">
        <div className="team-header">
          <div className="section-label fade-text">/ 04 / Команда</div>
          <h2 className="section-title team-title fade-text">Наша команда</h2>
        </div>

        <div className={`team-layout ${hasHover ? 'has-hover' : ''}`}>
          {/* ЛЕВАЯ КОЛОНКА — фото команды/участника */}
          <div className="team-photo-large fade-text">
            <img
              src={hasHover ? `/${hovered.photo}` : '/team.webp'}
              alt={hasHover ? hovered.name : "Команда firma'"}
              className="team-photo-img"
              draggable="false"
            />
            {!hasHover && (
              <div className="team-photo-overlay">
                <span className="team-count">{teamMembers.length} человек</span>
              </div>
            )}
          </div>

          {/* ЦЕНТРАЛЬНАЯ КОЛОНКА — опыт (невидима до ховера, с градиентом) */}
          <div className="team-experience fade-text" aria-hidden={!hasHover}>
            {hasHover && (
              <>
                <div className="team-exp-title">{hovered.name}</div>
                <div className="team-exp-role">{hovered.role}</div>
                <div className="team-exp-points">
                  {hovered.exp.map((line, i) => <div key={i}>• {line}</div>)}
                </div>
              </>
            )}
          </div>

          {/* ПРАВАЯ КОЛОНКА — список: фиксированная ширина/высота, внутренний скролл */}
          <div
            className="team-members-list fade-text"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <ul className="team-names">
              {teamMembers.map((member, i) => (
                <li
                  key={i}
                  className="team-member-item"
                  onMouseEnter={() => setHoveredIndex(i)}
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