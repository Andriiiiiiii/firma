import React, { useState, useEffect, useRef } from 'react'
import SphericalLattice from './SphericalLattice.jsx'

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })

  const sectionRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  // Регулировка стартовой скорости через URL:
  //   ?spin=0.9&spinX=0.9
  const params =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams('')
  const SPIN_Y = Number(params.get('spin')) || 0.9
  const SPIN_X = Number(params.get('spinX')) || 0.9

  useEffect(() => {
    const node = sectionRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Секция считается активной, когда видна хотя бы наполовину
        setIsVisible(entry.isIntersecting && entry.intersectionRatio >= 0.5)
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    alert('Спасибо! Это демо-форма, сообщение не отправляется на сервер.')
  }

  return (
    <section
      id="contact"
      ref={sectionRef}
      className={`contact-section snap-section ${isVisible ? 'is-visible' : ''}`}
      style={{ position: 'relative', overflow: 'hidden', background: '#000' }}
    >
      {/* Диагональный «колёсный» поворот при входе в секцию */}
      {isVisible && (
        <SphericalLattice
          rotationSpeed={SPIN_Y}    // целевая ω вокруг Y
          rotationSpeedX={SPIN_X}   // целевая ω вокруг X (диагональ)

          initialYawVel={20}      // стартовая по Y
          initialPitchVel={20}    // стартовая по X
            // трение + быстрая утяжка к нулю (оставьте как в примере)
          rotFriction={0.1}
          rotSpring={0.8}
          // важное: НЕ подтягивать к rotationSpeed -> сфера остановится
          pullToTarget={false}
        />
      )}

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-label fade-text">/ Связаться с нами</div>
        <h2 className="section-title fade-text">Начнём работу вместе</h2>

        <div className="contact-wrapper">
          <div className="contact-info fade-text">
            <div className="info-item">
              <h3 className="info-label">Email</h3>
              <a href="mailto:hello@webflow.solutions" className="info-link">
                hello@webflow.solutions
              </a>
            </div>
            <div className="info-item">
              <h3 className="info-label">Телефон</h3>
              <a href="tel:+79001234567" className="info-link">
                +7 (900) 123-45-67
              </a>
            </div>
            <div className="info-item">
              <h3 className="info-label">Адрес</h3>
              <p className="info-text">Москва, Тверская улица, 1</p>
            </div>
          </div>

          <form className="contact-form fade-text" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <input
                  type="text"
                  name="name"
                  className="form-input"
                  placeholder=" "
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
                <label className="form-label">Ваше имя</label>
              </div>

              <div className="form-group">
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  placeholder=" "
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                <label className="form-label">Email</label>
              </div>

              <div className="form-group form-group-full">
                <input
                  type="text"
                  name="subject"
                  className="form-input"
                  placeholder=" "
                  value={formData.subject}
                  onChange={handleChange}
                />
                <label className="form-label">Тема сообщения</label>
              </div>

              <div className="form-group form-group-full">
                <textarea
                  name="message"
                  className="form-textarea"
                  placeholder=" "
                  rows="4"
                  value={formData.message}
                  onChange={handleChange}
                  required
                />
                <label className="form-label">Расскажите о вашем проекте</label>
              </div>
            </div>

            <button type="submit" className="submit-button">
              <span>Отправить</span>
              <span className="button-arrow">→</span>
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
