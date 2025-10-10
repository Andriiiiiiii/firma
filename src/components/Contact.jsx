import React, { useState } from 'react'
import DropletBackground from './DropletBackground.jsx'

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' })

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value })
  const handleSubmit = (e) => { e.preventDefault(); alert('Спасибо за сообщение! Форма демонстрационная.') }

  return (
    <section id="contact" className="contact-section snap-section"
      style={{ position: 'relative', overflow: 'hidden', background: '#000' }}>
      <DropletBackground />

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-label">/ Связаться с нами</div>
        <h2 className="section-title">Начнём работу вместе</h2>

        <div className="contact-wrapper">
          <div className="contact-info">
            <div className="info-item">
              <h3 className="info-label">Email</h3>
              <a href="mailto:hello@webflow.solutions" className="info-link">hello@webflow.solutions</a>
            </div>
            <div className="info-item">
              <h3 className="info-label">Телефон</h3>
              <a href="tel:+79001234567" className="info-link">+7 (900) 123-45-67</a>
            </div>
            <div className="info-item">
              <h3 className="info-label">Адрес</h3>
              <p className="info-text">Москва, Тверская улица, 1</p>
            </div>
          </div>

          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <input type="text" name="name" className="form-input" placeholder=" " value={formData.name} onChange={handleChange} required />
                <label className="form-label">Ваше имя</label>
              </div>
              <div className="form-group">
                <input type="email" name="email" className="form-input" placeholder=" " value={formData.email} onChange={handleChange} required />
                <label className="form-label">Email</label>
              </div>
              <div className="form-group form-group-full">
                <input type="text" name="subject" className="form-input" placeholder=" " value={formData.subject} onChange={handleChange} />
                <label className="form-label">Тема сообщения</label>
              </div>
              <div className="form-group form-group-full">
                <textarea name="message" className="form-textarea" placeholder=" " rows="4" value={formData.message} onChange={handleChange} required></textarea>
                <label className="form-label">Расскажите о вашем проекте</label>
              </div>
            </div>
            <button type="submit" className="submit-button">
              <span>Отправить</span><span className="button-arrow">→</span>
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
