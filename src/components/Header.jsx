import React from 'react'

export default function Header() {
  const handleNav = (e, targetId) => {
    e.preventDefault()
    const container = document.getElementById('snap-root')
    const target = document.getElementById(targetId)
    if (container && target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <header>
      <div className="container">
        <nav>
          <div className="logo">WebFlow Solutions</div>
          <ul className="nav-links">
            <li><a href="#services" onClick={(e)=>handleNav(e,'services')}>Услуги</a></li>
            <li><a href="#team" onClick={(e)=>handleNav(e,'team')}>Команда</a></li>
            <li><a href="#about" onClick={(e)=>handleNav(e,'about')}>О нас</a></li>
            <li><a href="#contact" onClick={(e)=>handleNav(e,'contact')}>Контакты</a></li>
          </ul>
          <div className="menu-icon"></div>
        </nav>
      </div>
    </header>
  )
}
