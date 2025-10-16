import React, { useState, useEffect, useRef } from 'react'
import SphericalLattice from './SphericalLattice.jsx'

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState(null)

  const sectionRef = useRef(null)
  const hasBeenVisibleRef = useRef(false)
  const [isVisible, setIsVisible] = useState(false)
  const [shouldRenderGlobe, setShouldRenderGlobe] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkDevice = () => {
      const mobile = window.innerWidth < 1024 || 
                      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      setIsMobile(mobile)
    }

    checkDevice()
    
    const handleResize = () => checkDevice()
    window.addEventListener('resize', handleResize)
    
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const params =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams('')
  const SPIN_Y = Number(params.get('spin')) || 0.35
  const SPIN_X = Number(params.get('spinX')) || 0.22

  useEffect(() => {
    const node = sectionRef.current
    if (!node) return
    const appearThreshold = 0.45
    const observer = new IntersectionObserver(
      ([entry]) => {
        const ratio = entry.intersectionRatio
        const visible = ratio >= appearThreshold
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
      const botToken = '7977655823:AAE3OKlJbK4sOpxfhqJBBLQpPYf_-MjVMYY'
      const chatId = '893081997'
      const message = `🔔 Новая заявка с сайта:\n\n👤 Имя: ${formData.name}\n📧 Контакт: ${formData.contact}\n💬 Сообщение: ${formData.message}`

      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        })
      })

      if (response.ok) {
        setSubmitStatus('success')
        setFormData({ name: '', contact: '', message: '' })
      } else {
        setSubmitStatus('error')
      }
    } catch (error) {
      console.error('Error:', error)
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
        <div style={{ 
          opacity: isVisible ? 1 : 0, 
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none'
        }}>
          <SphericalLattice
            pointsPerRow={25}
            pointsPerCol={70}
            rotationSpeed={SPIN_Y}
            rotationSpeedX={SPIN_X}
            initialYawVel={2}
            initialPitchVel={2}
            rotFriction={0.35}
            rotSpring={0.5}
            pullToTarget={false}
          />
        </div>
      )}

      <div className="container contact-container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-label fade-text">/ 06 / Связаться с нами</div>
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
                  disabled={isSubmitting}
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
                />
                <label className="form-label">Расскажите о вашем проекте</label>
              </div>
            </div>

            {submitStatus === 'success' && (
              <p className="submit-message success">Спасибо! Ваше сообщение отправлено.</p>
            )}
            {submitStatus === 'error' && (
              <p className="submit-message error">Ошибка отправки. Попробуйте позже.</p>
            )}

            <button type="submit" className="submit-button" disabled={isSubmitting}>
              <span>{isSubmitting ? 'Отправка...' : 'Отправить'}</span>
            </button>
          </form>
        </div>

        <footer className="contact-footer">
          <p className="contact-footer-text">© 2025 фирма́. Все права защищены.</p>
        </footer>
      </div>
    </section>
  )
}