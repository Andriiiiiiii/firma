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
  const [isVisible, setIsVisible] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [scrollRotation, setScrollRotation] = useState({ yaw: 0, pitch: 0 })

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

  useEffect(() => {
    if (!isMobile) return

    let lastScrollY = window.scrollY

    const handleScroll = () => {
      const scrollSpeed = Math.abs(window.scrollY - lastScrollY)
      lastScrollY = window.scrollY

      setScrollRotation(prev => ({
        yaw: prev.yaw + scrollSpeed * 0.05,
        pitch: prev.pitch + scrollSpeed * 0.03
      }))
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isMobile])

  const params =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams('')
  const SPIN_Y = Number(params.get('spin')) || (isMobile ? scrollRotation.yaw : 0.9)
  const SPIN_X = Number(params.get('spinX')) || (isMobile ? scrollRotation.pitch : 0.9)

  useEffect(() => {
    const node = sectionRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting && entry.intersectionRatio >= 0.5)
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      // Отправка в Telegram Bot
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
      {isVisible && (
        <SphericalLattice
          pointsPerRow={25}
          pointsPerCol={70}
          rotationSpeed={SPIN_Y}
          rotationSpeedX={SPIN_X}
          initialYawVel={isMobile ? scrollRotation.yaw : 20}
          initialPitchVel={isMobile ? scrollRotation.pitch : 20}
          rotFriction={0.1}
          rotSpring={0.8}
          pullToTarget={false}
        />
      )}

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
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
      </div>
    </section>
  )
}