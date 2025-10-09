import React from 'react'
export default function Contact() {
  const onSubmit = (e) => { e.preventDefault(); alert('Спасибо! Форма демонстрационная.') }
  return (
    <section id="contact" className="contact snap-section">
      <div className="container">
        <div className="section-label">/ Связаться с нами</div>
        <h2 className="section-title">Начнём работу вместе</h2>
        <div className="contact-content">
          <div className="contact-info">
            <p><strong>Email:</strong><br/><a href="mailto:hello@webflow.solutions">hello@webflow.solutions</a></p><br/>
            <p><strong>Телефон:</strong><br/><a href="tel:+79001234567">+7 (900) 123-45-67</a></p><br/>
            <p><strong>Адрес:</strong><br/>Москва, Тверская улица, 1</p>
          </div>
          <form className="contact-form" onSubmit={onSubmit}>
            <input type="text" placeholder="Ваше имя" required />
            <input type="email" placeholder="Email" required />
            <input type="text" placeholder="Тема сообщения" />
            <textarea placeholder="Расскажите о вашем проекте" required />
            <button type="submit" className="submit-btn">Отправить</button>
          </form>
        </div>
      </div>
    </section>
  )
}
