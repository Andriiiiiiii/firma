import React, { useEffect } from 'react'

export default function OverlayMenu({ open, onClose, onNav }) {
  // Закрытие по ESC
  useEffect(() => {
    if (!open) return
    
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  const menuItems = [
    { id: 'cover', label: 'Главная', number: '01' },
    { id: 'intro', label: 'Введение', number: '02' },
    { id: 'services', label: 'Услуги', number: '03' },
    { id: 'team', label: 'Команда', number: '04' },
    { id: 'about', label: 'О нас', number: '05' },
    { id: 'contact', label: 'Контакты', number: '06' }
  ]

  const handleItemClick = (id) => {
    onNav(id)
  }

  return (
    <div className={`menu-overlay ${open ? 'open' : ''}`} aria-hidden={!open}>
      {/* Верхняя строка с логотипом и кнопкой закрытия */}
      <div className="menu-top">
        <div className="menu-logo">firma'</div>
        <button 
          aria-label="Закрыть меню" 
          className="menu-close" 
          onClick={onClose}
        >
          <span className="close-line"></span>
          <span className="close-line"></span>
        </button>
      </div>

      {/* Центральная часть с крупными пунктами меню */}
      <div className="menu-center">
        <nav className="menu-content">
          <div className="menu-grid">
            {menuItems.map((item, index) => (
              <div 
                key={item.id}
                className="menu-item"
                style={{ transitionDelay: open ? `${0.1 + index * 0.05}s` : '0s' }}
              >
                <a 
                  href={`#${item.id}`}
                  onClick={(e) => {
                    e.preventDefault()
                    handleItemClick(item.id)
                  }}
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