import React, { useState, useEffect, useRef } from 'react'
import SphericalLattice from './SphericalLattice.jsx'

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', contact: '', message: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState(null)

  const sectionRef = useRef(null)
  const hasBeenVisibleRef = useRef(false)
  const [isVisible, setIsVisible] = useState(false)
  const [shouldRenderGlobe, setShouldRenderGlobe] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Во время ввода блокируем интеракции со сферой
  const [formActive, setFormActive] = useState(false)

  useEffect(() => {
    const checkDevice = () => {
      const mobile =
        window.innerWidth < 1024 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      setIsMobile(mobile)
    }
    checkDevice()
    const handleResize = () => checkDevice()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const node = sectionRef.current
    if (!node) return
    const appearThreshold = 0.45
    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.intersectionRatio >= appearThreshold
        setIsVisible(visible)
        if (visible && !hasBeenVisibleRef.current) {
          hasBeenVisibleRef.current = true
          setShouldRenderGlobe(true)
        }
      },
      { threshold: [0, 0.05, 0.1, 0.2, 0.3, 0.45, 0.6, 0.75, 1] }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [isMobile])

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus(null)
    try {
      const response = await fetch('http://localhost:3001/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setSubmitStatus('success')
        setFormData({ name: '', contact: '', message: '' })
        setTimeout(() => setSubmitStatus(null), 5000)
      } else {
        setSubmitStatus('error')
        console.error('Ошибка отправки:', data.error)
      }
    } catch (error) {
      console.error('Ошибка сети:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section
      id="contact"
      ref={sectionRef}
      className={`contact-section snap-section ${isVisible ? 'is-visible' : ''}`}
      style={{ position: 'relative', overflow: 'hidden', background: '#000' }}
    >
      {shouldRenderGlobe && (
        <div
          style={{
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.3s ease',
            pointerEvents: 'none',
          }}
        >
          <SphericalLattice
            // механика/параметры НЕ меняем
            pointsPerRow={25}
            pointsPerCol={70}
            rotationSpeed={0.35}
            rotationSpeedX={0.22}
            initialYawVel={2}
            initialPitchVel={2}
            rotFriction={0.35}
            rotSpring={0.5}
            pullToTarget={false}
            // ключ: во время ввода блокируем любое взаимодействие курсора
            interactionEnabled={!formActive}
          />
        </div>
      )}

      <div className="container contact-container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-head">
          <div className="section-label fade-text">/ 06 / Связаться с нами</div>
          <h2 className="section-title fade-text">Начнём работу вместе</h2>
        </div>

        <div className="contact-wrapper">
          <div className="contact-info fade-text">
            <div className="info-item">
              <h3 className="info-label">Email</h3>
              <a href="mailto:zakaz@ne-firma.ru" className="info-link">zakaz@ne-firma.ru</a>
            </div>
            <div className="info-item">
              <h3 className="info-label">Телефон</h3>
              <a href="tel:+79175958184" className="info-link">+7 (917) 595-81-84</a>
            </div>
            <div className="info-item">
              <h3 className="info-label">Реквизиты</h3>
              <p className="info-text">ИП Карпенко Богдан Максимович</p>
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
                  disabled={isSubmitting}
                  maxLength={100}
                  onFocus={() => setFormActive(true)}
                  onBlur={() => setFormActive(false)}
                />
                <label className="form-label">Ваше имя</label>
              </div>

              <div className="form-group">
                <input
                  type="text"
                  name="contact"
                  className="form-input"
                  placeholder=" "
                  value={formData.contact}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  maxLength={100}
                  onFocus={() => setFormActive(true)}
                  onBlur={() => setFormActive(false)}
                />
                <label className="form-label">Email/Telegram</label>
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
                  disabled={isSubmitting}
                  maxLength={1000}
                  onFocus={() => setFormActive(true)}
                  onBlur={() => setFormActive(false)}
                />
                <label className="form-label">Расскажите о вашем проекте</label>
              </div>
            </div>

            {submitStatus === 'success' && (
              <p className="submit-message success">✓ Заявка успешно отправлена! Мы свяжемся с вами в ближайшее время.</p>
            )}
            {submitStatus === 'error' && (
              <p className="submit-message error">✗ Ошибка отправки. Попробуйте позже или свяжитесь с нами напрямую.</p>
            )}

            <button type="submit" className="submit-button" disabled={isSubmitting}>
              <span>{isSubmitting ? 'Отправка...' : 'Отправить'}</span>
            </button>
          </form>
        </div>

        <div className="contact-footer-corner">
          <p className="contact-footer-text">© 2025 фирма́. Все права защищены.</p>
        </div>
      </div>
    </section>
  )
}
