import React, { useEffect } from 'react'

export default function OverlayMenu({ open, onClose, onNav }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const menuItems = [
    { id: 'cover',    label: 'Главная',   number: '01' },
    { id: 'intro',    label: 'Введение',  number: '02' },
    { id: 'services', label: 'Услуги',    number: '03' },
    { id: 'team',     label: 'Команда',   number: '04' },
    { id: 'about',    label: 'О нас',     number: '05' },
    { id: 'contact',  label: 'Контакты',  number: '06' },
  ]

  const handleItemClick = (e, id) => {
    e.preventDefault()
    e.stopPropagation()
    if (onNav) {
      onNav(id)
    }
  }

  return (
    <div className={`menu-overlay ${open ? 'open' : ''}`} aria-hidden={!open}>
      <div className="menu-top">
        <div className="menu-logo">
          <img src="/logo.webp" alt="firma' logo" className="menu-logo-img" />
        </div>
      </div>

      <div className="menu-center">
        <nav className="menu-content">
          <div className="menu-grid-two-rows">
            {menuItems.map((item, index) => (
              <div
                key={item.id}
                className="menu-item"
                style={{ transitionDelay: open ? `${0.1 + index * 0.05}s` : '0s' }}
              >
                <a
                  href={`#${item.id}`}
                  onClick={(e) => handleItemClick(e, item.id)}
                >
                  <span className="menu-text">{item.label}</span>
                  <sup className="menu-sup">{item.number}</sup>
                </a>
              </div>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}