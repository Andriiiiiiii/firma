import React, { useEffect } from 'react'

export default function OverlayMenu({ open, onClose, onNav }) {
  // Закрытие по ESC
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const Item = ({ id, children, sub }) => (
    <div className="menu-item">
      <a href={`#${id}`} onClick={(e)=>{e.preventDefault(); onNav(id)}}>
        <span className="menu-text">{children}</span>
        {sub ? <sup className="menu-sup">{sub}</sup> : null}
      </a>
    </div>
  )

  return (
    <div className={`menu-overlay ${open ? 'open' : ''}`} aria-hidden={!open}>
      {/* Верхняя строка с логотипом и кнопкой закрытия */}
      <div className="menu-top">
        <div className="menu-logo">WebFlow Solutions</div>
        <button aria-label="Закрыть меню" className="menu-close" onClick={onClose}>
          <span className="bar" />
          <span className="bar" />
        </button>
      </div>

      {/* Крупные пункты меню — как на fleava (2 строки) */}
      <div className="menu-center">
        <div className="menu-grid">
          <Item id="cover" sub="01">Главная</Item>
          <Item id="intro" sub="02">Введение</Item>
          <Item id="services" sub="03">Услуги</Item>
          <Item id="team" sub="04">Команда</Item>
          <Item id="about" sub="05">О&nbsp;нас</Item>
          <Item id="contact" sub="06">Контакты</Item>
        </div>
      </div>
    </div>
  )
}
